import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";

export function createOpaqueToken() {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createVerificationEmail(verificationUrl: string, username?: string) {
  const greeting = username ? `Hi ${username},` : "Hi there,";
  return {
    subject: "Verify your Precision email address",
    text: `${greeting}

Thanks for joining Precision.

Please verify your email address by opening this link:
${verificationUrl}

This link expires in 24 hours and can be used only once. Verification is required before you can sign in and play.

If you did not create or update a Precision account, you can safely ignore this email.

— The Precision team`,
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#111827;color:#f9fafb;font-family:Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
      <div style="border:1px solid #374151;border-radius:16px;background:#1f2937;padding:32px;">
        <p style="margin:0 0 20px;color:#fb923c;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">PRECISION</p>
        <h1 style="margin:0 0 16px;font-size:28px;">Verify your email address</h1>
        <p style="font-size:16px;line-height:1.6;">${greeting}</p>
        <p style="font-size:16px;line-height:1.6;">Thanks for joining Precision. Verify your email address to activate your account and start playing.</p>
        <p style="margin:28px 0;text-align:center;"><a href="${verificationUrl}" style="display:inline-block;border-radius:10px;background:#f97316;color:#111827;padding:14px 24px;font-weight:700;text-decoration:none;">Verify my email</a></p>
        <p style="font-size:14px;line-height:1.6;color:#d1d5db;">This link expires in 24 hours and can be used only once. If the button does not work, copy and paste this URL into your browser:</p>
        <p style="word-break:break-all;font-size:13px;color:#fdba74;">${verificationUrl}</p>
        <p style="font-size:14px;line-height:1.6;color:#9ca3af;">If you did not create or update a Precision account, you can safely ignore this email.</p>
      </div>
    </div>
  </body>
</html>`,
  };
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const user = process.env.GMAIL_USER?.trim().toLowerCase();
  const appPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
  const from = process.env.EMAIL_FROM || user;
  if (!user || !appPassword || !from) {
    throw new Error("Gmail email delivery is not configured. Set GMAIL_USER, GMAIL_APP_PASSWORD, and EMAIL_FROM.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user)) {
    throw new Error("GMAIL_USER must be a valid Gmail address.");
  }
  if (appPassword.length !== 16) {
    throw new Error("GMAIL_APP_PASSWORD must be the 16-character Google App Password, not your normal Gmail password.");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user,
      pass: appPassword,
    },
  });

  let result;
  try {
    result = await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("535-5.7.8")) {
      throw new Error("Gmail rejected the SMTP credentials. Use a Google App Password generated for GMAIL_USER after enabling 2-Step Verification; do not use the normal Gmail password.");
    }
    throw error;
  }
  const accepted = result.accepted.map(String);
  if (!accepted.includes(input.to)) {
    throw new Error("Gmail SMTP did not accept the recipient address.");
  }
  return { messageId: result.messageId, accepted };
}
