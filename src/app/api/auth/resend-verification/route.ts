import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createOpaqueToken, createVerificationEmail, sendTransactionalEmail } from "@/lib/auth/email";
import { z } from "zod";

const schema = z.object({ identifier: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const { identifier } = schema.parse(await req.json());
    const user = await prisma.user.findFirst({ where: { OR: [{ username: identifier.toLowerCase() }, { email: identifier.toLowerCase() }] } });
    if (!user?.email || user.emailVerifiedAt) return NextResponse.json({ success: true });
    const latest = await prisma.emailVerificationToken.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    if (latest?.lastSentAt && Date.now() - latest.lastSentAt.getTime() < 60_000) {
      return NextResponse.json({ error: "Please wait before requesting another link.", retryAfterSeconds: Math.ceil((60_000 - (Date.now() - latest.lastSentAt.getTime())) / 1000) }, { status: 429 });
    }
    const { token, tokenHash } = createOpaqueToken();
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin}/verify?token=${token}`;
    const verificationEmail = createVerificationEmail(verificationUrl, user.username);
    const delivery = await sendTransactionalEmail({ to: user.email, ...verificationEmail });
    await prisma.emailVerificationToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 86_400_000), lastSentAt: new Date() } });
    return NextResponse.json({ success: true, sent: true, messageId: delivery.messageId, verificationUrl: process.env.NODE_ENV === "production" ? undefined : verificationUrl });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Email could not be sent." }, { status: 502 });
  }
}
