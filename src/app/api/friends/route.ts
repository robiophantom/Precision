import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: session.userId },
          { recipientId: session.userId },
        ],
      },
      include: {
        requester: { select: { id: true, username: true, avatarUrl: true } },
        recipient: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    const pendingRequests = friendships
      .filter((f) => f.status === "PENDING" && f.recipientId === session.userId)
      .map((f) => ({
        friendshipId: f.id,
        user: f.requester,
      }));

    const friends = friendships
      .filter((f) => f.status === "ACCEPTED")
      .map((f) => {
        const isRequester = f.requesterId === session.userId;
        return {
          friendshipId: f.id,
          user: isRequester ? f.recipient : f.requester,
        };
      });

    return NextResponse.json({ friends, pendingRequests });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
