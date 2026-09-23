import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createOpaqueToken, createVerificationEmail, sendTransactionalEmail } from "@/lib/auth/email";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({ identifier: z.string().min(1), password: z.string(), email: z.string().email() });

export async function POST(req: Request) {
  try {
    const { identifier, password, email: rawEmail } = schema.parse(await req.json());
    const email = rawEmail.toLowerCase();
    const user = await prisma.user.findFirst({ where: { OR: [{ username: identifier.toLowerCase() }, { email: identifier.toLowerCase() }] } });
    if (!user || user.emailVerifiedAt || !(await bcrypt.compare(password, user.passwordHash))) return NextResponse.json({ error: "Invalid credentials or email is already verified." }, { status: 400 });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== user.id) return NextResponse.json({ error: "Email already registered to another account." }, { status: 409 });
    const { token, tokenHash } = createOpaqueToken();
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin}/verify?token=${token}`;
    const verificationEmail = createVerificationEmail(verificationUrl, user.username);
    const delivery = await sendTransactionalEmail({ to: email, ...verificationEmail });
    await prisma.$transaction([
      prisma.emailVerificationToken.deleteMany({ where: { userId: user.id, consumedAt: null } }),
      prisma.user.update({ where: { id: user.id }, data: { email, emailVerifiedAt: null } }),
      prisma.emailVerificationToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 86_400_000), lastSentAt: new Date() } }),
    ]);
    return NextResponse.json({ success: true, sent: true, messageId: delivery.messageId, verificationUrl: process.env.NODE_ENV === "production" ? undefined : verificationUrl });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Email could not be sent." }, { status: 502 });
  }
}
