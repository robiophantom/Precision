import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createOpaqueToken, createVerificationEmail, sendTransactionalEmail } from "@/lib/auth/email";

const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username: rawUsername, email: rawEmail, password } = registerSchema.parse(body);
    const username = rawUsername.toLowerCase();
    const email = rawEmail.trim().toLowerCase();

    const existingUser = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });

    if (existingUser) {
      return NextResponse.json({ error: existingUser.username === username ? "Username already taken" : "Email already registered" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let user;
    try {
      user = await prisma.user.create({ data: { username, email, passwordHash } });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Unique constraint")) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
      throw error;
    }

    const { token, tokenHash } = createOpaqueToken();
    await prisma.emailVerificationToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), lastSentAt: new Date() },
    });
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin}/verify?token=${token}`;
    const verificationEmail = createVerificationEmail(verificationUrl, user.username);
    await sendTransactionalEmail({ to: email, ...verificationEmail });

    return NextResponse.json({ success: true, requiresVerification: true, verificationUrl: process.env.NODE_ENV === "production" ? undefined : verificationUrl, user: { id: user.id, username: user.username } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
