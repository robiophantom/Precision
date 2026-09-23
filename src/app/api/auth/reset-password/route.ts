import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashToken } from "@/lib/auth/email";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({ token: z.string().min(1), password: z.string().min(6) });

export async function POST(req: Request) {
  const { token, password } = schema.parse(await req.json());
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.consumedAt || record.expiresAt < new Date()) return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await bcrypt.hash(password, 10) } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
  ]);
  return NextResponse.json({ success: true });
}
