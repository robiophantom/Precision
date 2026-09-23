import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { setSessionCookie } from "@/lib/auth/session";

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier, password } = loginSchema.parse(body);
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: { OR: [{ username: normalizedIdentifier }, { email: normalizedIdentifier }] },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.status === "BANNED") {
      return NextResponse.json({ error: "Account banned" }, { status: 403 });
    }
    if (!user.email) {
      return NextResponse.json({ error: "Add and verify a Gmail address before playing.", needsEmail: true }, { status: 428 });
    }
    if (!user.emailVerifiedAt) {
      return NextResponse.json({
        error: "Verify your Gmail address before logging in.",
        needsEmail: true,
        needsVerification: true,
        email: user.email,
      }, { status: 403 });
    }

    await setSessionCookie({ userId: user.id, username: user.username });

    return NextResponse.json({ success: true, user: { id: user.id, username: user.username } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
