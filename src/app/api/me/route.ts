import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET() {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ user: null }, { status: 200, headers: { "Cache-Control": "no-store" } });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        streak: true,
        email: true,
        emailVerifiedAt: true,
        webNotifications: true,
      }
    });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200, headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({
      user: {
        ...user,
        bestScore: (await prisma.attempt.aggregate({ where: { userId: session.userId, mode: "COMPETITIVE", status: "COMPLETED", verified: true }, _max: { totalScore: true } }))._max.totalScore ?? 0,
        isAdmin: user.role === "ADMIN" || user.username === process.env.ADMIN_USERNAME,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
