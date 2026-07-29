"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/db/prisma";
import {
  INVITATION_EXPIRY_DAYS,
  PASSWORD_RESET_EXPIRY_HOURS
} from "@/features/auth/constants";
import { requireAdmin } from "@/features/auth/session";
import { createAccessToken, hashAccessToken } from "@/features/auth/access-utils";
import { sendInvitationEmail, sendPasswordResetEmail } from "@/features/auth/email";

const emailSchema = z.string().trim().toLowerCase().email();
const nameSchema = z.string().trim().min(2).max(80);
const passwordSchema = z.string().min(8).max(128);

export type AccessActionState = {
  error?: string;
  message?: string;
  link?: string;
};

async function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  const headerStore = await headers();
  const host = headerStore.get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${protocol}://${host}`;
}

export async function createInvitationAction(
  _previousState: AccessActionState,
  formData: FormData
): Promise<AccessActionState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({ email: emailSchema, name: nameSchema.optional() })
    .safeParse({
      email: formData.get("email"),
      name: formData.get("name") || undefined
    });

  if (!parsed.success) {
    return { error: "Nama atau email belum valid." };
  }

  const email = parsed.data.email;
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser?.accessStatus === "ACTIVE") {
    return { error: "Email ini sudah memiliki akses aktif." };
  }

  const rawToken = createAccessToken();
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.accessInvitation.updateMany({
      where: { email, status: "PENDING" },
      data: { status: "REVOKED" }
    });
    await tx.accessInvitation.create({
      data: {
        email,
        name: parsed.data.name,
        tokenHash: hashAccessToken(rawToken),
        invitedByAdminId: admin.id,
        expiresAt
      }
    });
    if (existingUser && existingUser.accessStatus !== "ACTIVE") {
      await tx.user.update({
        where: { id: existingUser.id },
        data: { name: parsed.data.name || existingUser.name, accessStatus: "INVITED", passwordHash: null }
      });
    }
  });

  const baseUrl = await getBaseUrl();
  const link = `${baseUrl}/access/setup/${rawToken}`;
  const emailResult = await sendInvitationEmail({ to: email, name: parsed.data.name || email, link });
  revalidatePath("/admin");
  return {
    message: emailResult.sent ? "Invitation dibuat dan email berhasil dikirim." : "Invitation dibuat. Salin link ini dan kirimkan ke customer.",
    link
  };
}

export async function resendInvitationAction(
  _previousState: AccessActionState,
  formData: FormData
): Promise<AccessActionState> {
  const admin = await requireAdmin();
  const invitationId = z.string().min(1).safeParse(formData.get("invitationId"));
  if (!invitationId.success) {
    return { error: "Invitation tidak ditemukan." };
  }

  const invitation = await prisma.accessInvitation.findUnique({ where: { id: invitationId.data } });
  if (!invitation || invitation.status === "ACCEPTED") {
    return { error: "Invitation sudah tidak dapat dikirim ulang." };
  }

  const rawToken = createAccessToken();
  await prisma.$transaction([
    prisma.accessInvitation.update({
      where: { id: invitation.id },
      data: {
        tokenHash: hashAccessToken(rawToken),
        expiresAt: new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        status: "PENDING",
        invitedByAdminId: admin.id
      }
    }),
    prisma.user.updateMany({
      where: { email: invitation.email, accessStatus: { not: "ACTIVE" } },
      data: { accessStatus: "INVITED", passwordHash: null }
    })
  ]);

  const baseUrl = await getBaseUrl();
  const link = `${baseUrl}/access/setup/${rawToken}`;
  const emailResult = await sendInvitationEmail({ to: invitation.email, name: invitation.name || invitation.email, link });
  revalidatePath("/admin");
  return { message: emailResult.sent ? "Invitation baru dibuat dan email berhasil dikirim." : "Invitation baru dibuat.", link };
}

export async function activateInvitationAction(
  _previousState: AccessActionState,
  formData: FormData
): Promise<AccessActionState> {
  const token = z.string().min(20).safeParse(formData.get("token"));
  const parsed = z
    .object({ name: nameSchema, password: passwordSchema, confirmPassword: passwordSchema })
    .safeParse({
      name: formData.get("name"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword")
    });

  if (!token.success || !parsed.success) {
    return { error: "Isi nama dan password minimal 8 karakter." };
  }
  if (parsed.data.password !== parsed.data.confirmPassword) {
    return { error: "Konfirmasi password tidak sama." };
  }

  const bcrypt = await import("bcryptjs");
  const tokenHash = hashAccessToken(token.data);
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const invitation = await tx.accessInvitation.findUnique({ where: { tokenHash } });
      if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt.getTime() <= Date.now()) {
        throw new Error("INVITATION_INVALID");
      }

      const user = await tx.user.upsert({
        where: { email: invitation.email },
        update: { name: parsed.data.name, passwordHash, accessStatus: "ACTIVE", role: "USER", lastActiveAt: new Date() },
        create: { name: parsed.data.name, email: invitation.email, passwordHash, accessStatus: "ACTIVE", role: "USER" }
      });
      await tx.accessInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() }
      });
      await tx.license.upsert({
        where: { licenseKey: `PMVJM-${user.id}` },
        update: { status: "ACTIVE" },
        create: { userId: user.id, licenseKey: `PMVJM-${user.id}`, type: "LIFETIME", status: "ACTIVE", maxDevices: 3 }
      });
    });
  } catch (error) {
    return { error: error instanceof Error && error.message === "INVITATION_INVALID" ? "Link undangan sudah tidak berlaku." : "Aktivasi gagal. Coba gunakan link terbaru." };
  }

  return { message: "Akses aktif. Silakan login dengan email dan password baru." };
}

export async function createPasswordResetAction(
  _previousState: AccessActionState,
  formData: FormData
): Promise<AccessActionState> {
  await requireAdmin();
  const userId = z.string().min(1).safeParse(formData.get("userId"));
  if (!userId.success) return { error: "User tidak ditemukan." };
  const user = await prisma.user.findUnique({ where: { id: userId.data } });
  if (!user) return { error: "User tidak ditemukan." };

  const rawToken = createAccessToken();
  await prisma.accessToken.create({
    data: {
      userId: user.id,
      tokenHash: hashAccessToken(rawToken),
      kind: "PASSWORD_RESET",
      expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000)
    }
  });
  const baseUrl = await getBaseUrl();
  const link = `${baseUrl}/access/reset/${rawToken}`;
  const emailResult = await sendPasswordResetEmail({ to: user.email, name: user.name, link });
  return { message: emailResult.sent ? "Link reset dibuat dan email berhasil dikirim." : "Link reset password dibuat.", link };
}

export async function resetPasswordAction(
  _previousState: AccessActionState,
  formData: FormData
): Promise<AccessActionState> {
  const token = z.string().min(20).safeParse(formData.get("token"));
  const password = passwordSchema.safeParse(formData.get("password"));
  const confirmPassword = passwordSchema.safeParse(formData.get("confirmPassword"));
  if (!token.success || !password.success || !confirmPassword.success || password.data !== confirmPassword.data) {
    return { error: "Password minimal 8 karakter dan harus sama." };
  }

  const bcrypt = await import("bcryptjs");
  const tokenHash = hashAccessToken(token.data);
  const passwordHash = await bcrypt.hash(password.data, 12);
  const result = await prisma.$transaction(async (tx) => {
    const accessToken = await tx.accessToken.findUnique({ where: { tokenHash } });
    if (!accessToken || accessToken.kind !== "PASSWORD_RESET" || accessToken.usedAt || accessToken.expiresAt.getTime() <= Date.now()) return false;
    await tx.user.update({ where: { id: accessToken.userId }, data: { passwordHash, accessStatus: "ACTIVE" } });
    await tx.accessToken.update({ where: { id: accessToken.id }, data: { usedAt: new Date() } });
    return true;
  });
  return result ? { message: "Password berhasil diperbarui. Silakan login." } : { error: "Link reset sudah tidak berlaku." };
}

export async function setUserAccessStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = z.string().min(1).parse(formData.get("userId"));
  const status = z.enum(["ACTIVE", "SUSPENDED", "REVOKED"]).parse(formData.get("status"));
  if (userId === admin.id && status !== "ACTIVE") return;
  await prisma.user.updateMany({ where: { id: userId }, data: { accessStatus: status } });
  revalidatePath("/admin");
}
