import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const username = new URL(req.url).searchParams.get("username")?.trim();
  if (!username || username.length < 3) {
    return NextResponse.json({ error: "Enter at least 3 characters" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      createdAt: true,
      streak: { select: { currentStreak: true, longestStreak: true } },
    },
  });

  if (!user || user.id === session.userId) {
    return NextResponse.json({ error: user ? "You cannot connect with yourself" : "User not found" }, { status: 404 });
  }

  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: session.userId, recipientId: user.id },
        { requesterId: user.id, recipientId: session.userId },
      ],
    },
    select: { status: true, requesterId: true },
  });

  return NextResponse.json({
    user,
    relationship: friendship
      ? { status: friendship.status, outgoing: friendship.requesterId === session.userId }
      : null,
  });
}
