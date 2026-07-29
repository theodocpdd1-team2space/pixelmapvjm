"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/db/prisma";
import { clearRateLimit, isRateLimited } from "@/features/auth/rate-limit";
import { clearSession, createSession, isAdminUser, requireUser } from "@/features/auth/session";

export type AuthActionState = {
  error?: string;
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});


async function getRequestFingerprint(email: string) {
  const headerStore = await headers();
  const agent = headerStore.get("user-agent") ?? "unknown-agent";
  return `${email.toLowerCase()}:${agent.slice(0, 128)}`;
}

async function trackDevice(userId: string, email: string) {
  const headerStore = await headers();
  const agent = headerStore.get("user-agent") ?? "Unknown Device";
  const deviceHash = Buffer.from(`${email}:${agent}`).toString("base64url").slice(0, 64);
  const license = await prisma.license.findFirst({ where: { userId, status: "ACTIVE" } });
  const devices = await prisma.device.findMany({
    where: { userId },
    orderBy: { lastSeenAt: "desc" }
  });

  const existing = devices.find((device) => device.deviceHash === deviceHash);

  if (!existing && license && devices.length >= license.maxDevices) {
    return;
  }

  await prisma.device.upsert({
    where: { userId_deviceHash: { userId, deviceHash } },
    update: {
      lastSeenAt: new Date()
    },
    create: {
      userId,
      deviceHash,
      deviceName: agent.includes("Mac") ? "THEOS-MACBOOK-PRO" : "BROWSER DEVICE"
    }
  });
}

export async function loginAction(_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: "Email atau password tidak valid." };
  }

  const fingerprint = await getRequestFingerprint(parsed.data.email);

  if (isRateLimited(fingerprint)) {
    return { error: "Terlalu banyak percobaan login. Coba lagi beberapa menit." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() }
  });

  if (!user || !user.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return { error: "Email, password, atau status akses tidak valid." };
  }

  if (user.accessStatus !== "ACTIVE") {
    return { error: "Email, password, atau status akses tidak valid." };
  }

  clearRateLimit(fingerprint);
  await trackDevice(user.id, user.email);
  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  await createSession({ id: user.id, email: user.email, name: user.name, role: user.role });
  redirect(isAdminUser(user) ? "/admin" : "/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export async function renameAccountAction(formData: FormData) {
  const user = await requireUser();
  const name = z.string().min(2).max(80).parse(formData.get("name"));

  await prisma.user.update({
    where: { id: user.id },
    data: { name }
  });

  redirect("/account");
}
