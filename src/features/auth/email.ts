import { Resend } from "resend";

type EmailDeliveryResult = {
  sent: boolean;
  reason?: "not-configured" | "provider-error";
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character] ?? character);
}

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return null;
  return { apiKey, from, replyTo: process.env.RESEND_REPLY_TO };
}

async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailDeliveryResult> {
  const config = getEmailConfig();
  if (!config) return { sent: false, reason: "not-configured" };

  try {
    const result = await new Resend(config.apiKey).emails.send({
      from: config.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(config.replyTo ? { replyTo: config.replyTo } : {})
    });
    return result.error ? { sent: false, reason: "provider-error" } : { sent: true };
  } catch {
    return { sent: false, reason: "provider-error" };
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
    html: accessEmailHtml({ name: input.name, link: input.link, kind: "invitation" })
  });
}

export function sendPasswordResetEmail(input: { to: string; name: string; link: string }) {
  return sendEmail({
    to: input.to,
    subject: "Reset your PixelMapVJM password",
    html: accessEmailHtml({ name: input.name, link: input.link, kind: "reset" })
  });
}
