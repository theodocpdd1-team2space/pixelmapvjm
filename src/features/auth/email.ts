import "server-only";

import { Resend } from "resend";

export type EmailDeliveryResult = {
  sent: boolean;
  emailId?: string;
  error?: string;
};

type EmailType = "invitation" | "password-reset" | "admin-test";

type EmailConfig =
  | {
      ok: true;
      apiKey: string;
      from: string;
      replyTo?: string;
      appUrl: string;
    }
  | {
      ok: false;
      error: string;
    };

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
      })[character] ?? character
  );
}

function getEmailConfig(): EmailConfig {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const replyTo = process.env.RESEND_REPLY_TO;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not configured. Manual invite link is still available." };
  }

  if (!from) {
    return { ok: false, error: "RESEND_FROM_EMAIL is not configured. Email was not sent." };
  }

  return {
    ok: true,
    apiKey,
    from,
    ...(replyTo ? { replyTo } : {}),
    appUrl: appUrl.replace(/\/$/, "")
  };
}

function readProviderError(error: unknown) {
  if (!error) return "Resend provider returned an unknown error.";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Resend provider returned an error.";
}

function logEmail(type: EmailType, recipient: string, result: EmailDeliveryResult) {
  const payload = {
    type,
    recipient,
    sent: result.sent,
    ...(result.emailId ? { emailId: result.emailId } : {}),
    ...(result.error ? { error: result.error } : {})
  };

  if (result.sent) {
    console.info("[PixelMapVJM Email] sent", payload);
  } else {
    console.warn("[PixelMapVJM Email] failed", payload);
  }
}

async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type: EmailType;
}): Promise<EmailDeliveryResult> {
  console.info("[PixelMapVJM Email] send started", { type: input.type, recipient: input.to });

  const config = getEmailConfig();
  if (!config.ok) {
    const result = { sent: false, error: config.error };
    logEmail(input.type, input.to, result);
    return result;
  }

  try {
    const result = await new Resend(config.apiKey).emails.send({
      from: config.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
      ...(config.replyTo ? { replyTo: config.replyTo } : {})
    });

    if (result.error) {
      const delivery = { sent: false, error: readProviderError(result.error) };
      logEmail(input.type, input.to, delivery);
      return delivery;
    }

    const delivery = { sent: true, ...(result.data?.id ? { emailId: result.data.id } : {}) };
    logEmail(input.type, input.to, delivery);
    return delivery;
  } catch (error) {
    const delivery = { sent: false, error: readProviderError(error) };
    logEmail(input.type, input.to, delivery);
    return delivery;
  }
}

function accessEmailHtml(input: { name: string; link: string; kind: "invitation" | "reset" }) {
  const isInvitation = input.kind === "invitation";
  const title = isInvitation ? "Your PixelMapVJM access is ready" : "Reset your PixelMapVJM password";
  const action = isInvitation ? "ACTIVATE ACCESS" : "RESET PASSWORD";
  const description = isInvitation
    ? "An administrator has granted you access to the PixelMapVJM LED pixel mapping workspace."
    : "An administrator created a secure password reset link for your PixelMapVJM workspace.";

  return `<!doctype html><html><body style="margin:0;background:#070707;color:#f4f4f4;font-family:Arial,sans-serif"><div style="max-width:560px;margin:0 auto;padding:40px 24px"><p style="font-size:12px;letter-spacing:2px;color:#ff3030">PIXELMAPVJM / SECURE ACCESS</p><h1 style="font-size:28px;margin:20px 0 12px">${title}</h1><p style="color:#b4b4b4;line-height:1.6">Hi ${escapeHtml(input.name)},</p><p style="color:#b4b4b4;line-height:1.6">${description}</p><a href="${escapeHtml(input.link)}" style="display:inline-block;margin:18px 0;padding:14px 20px;background:#ff3030;color:#070707;text-decoration:none;font-weight:bold;letter-spacing:1px">${action}</a><p style="color:#858585;font-size:12px;line-height:1.6">This link is private and time-limited. If you did not expect this message, you can ignore it.</p><p style="color:#858585;font-size:11px;word-break:break-all">${escapeHtml(input.link)}</p></div></body></html>`;
}

export function sendInvitationEmail(input: { to: string; name: string; link: string }) {
  return sendEmail({
    to: input.to,
    subject: "Your PixelMapVJM access invitation",
    html: accessEmailHtml({ name: input.name, link: input.link, kind: "invitation" }),
    text: `Your PixelMapVJM access is ready. Open this private invitation link: ${input.link}`,
    type: "invitation"
  });
}

export function sendPasswordResetEmail(input: { to: string; name: string; link: string }) {
  return sendEmail({
    to: input.to,
    subject: "Reset your PixelMapVJM password",
    html: accessEmailHtml({ name: input.name, link: input.link, kind: "reset" }),
    text: `Reset your PixelMapVJM password with this private link: ${input.link}`,
    type: "password-reset"
  });
}

export function sendAdminTestEmail(input: { to: string }) {
  return sendEmail({
    to: input.to,
    subject: "PixelMapVJM Email Sender Test",
    html: "<p>PixelMapVJM transactional email is configured correctly.</p>",
    text: "PixelMapVJM transactional email is configured correctly.",
    type: "admin-test"
  });
}
