import { createHash, randomBytes } from "node:crypto";
import { ACTIVE_NOW_WINDOW_MS } from "@/features/auth/constants";

export function hashAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createAccessToken() {
  return randomBytes(32).toString("base64url");
}

export function isActiveNow(lastActiveAt: Date | null) {
  return Boolean(lastActiveAt && Date.now() - lastActiveAt.getTime() <= ACTIVE_NOW_WINDOW_MS);
}
