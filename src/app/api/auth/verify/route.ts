import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashToken } from "@/lib/auth/email";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Verification token is required" }, { status: 400 });
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { select: { emailVerifiedAt: true } } } });
  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "This verification link is invalid or expired." }, { status: 400 });
  }
  if (record.consumedAt) {
    return record.user.emailVerifiedAt
      ? NextResponse.json({ success: true, alreadyVerified: true })
      : NextResponse.json({ error: "This verification link has already been used." }, { status: 400 });
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
  ]);
  return NextResponse.json({ success: true });
}
