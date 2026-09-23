import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createOpaqueToken, sendTransactionalEmail } from "@/lib/auth/email";
import { z } from "zod";

const schema = z.object({ identifier: z.string().min(1) });

export async function POST(req: Request) {
  const { identifier } = schema.parse(await req.json());
  const user = await prisma.user.findFirst({ where: { OR: [{ username: identifier.toLowerCase() }, { email: identifier.toLowerCase() }] } });
  if (!user?.email || !user.emailVerifiedAt) return NextResponse.json({ success: true });
  const { token, tokenHash } = createOpaqueToken();
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin}/reset-password?token=${token}`;
  await sendTransactionalEmail({ to: user.email, subject: "Reset your Precision password", text: `Reset your password here: ${resetUrl}` });
  return NextResponse.json({ success: true, resetUrl: process.env.NODE_ENV === "production" ? undefined : resetUrl });
}
