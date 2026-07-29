import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { prisma } from "@/db/prisma";

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.accessStatus !== "ACTIVE") {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  return NextResponse.json({ ok: true });
}
