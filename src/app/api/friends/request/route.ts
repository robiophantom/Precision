import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const requestSchema = z.object({
  username: z.string(),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { username } = requestSchema.parse(body);

    if (username.toLowerCase() === session.username.toLowerCase()) {
      return NextResponse.json({ error: "Cannot friend yourself" }, { status: 400 });
    }

    const recipient = await prisma.user.findUnique({
      where: { username },
    });

    if (!recipient) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check existing
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: session.userId, recipientId: recipient.id },
          { requesterId: recipient.id, recipientId: session.userId },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Friendship or request already exists" }, { status: 400 });
    }

    const friendship = await prisma.friendship.create({
      data: {
        requesterId: session.userId,
        recipientId: recipient.id,
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, friendship });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
