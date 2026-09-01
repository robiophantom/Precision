import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const respondSchema = z.object({
  friendshipId: z.string(),
  action: z.enum(["ACCEPT", "REJECT"]),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { friendshipId, action } = respondSchema.parse(body);

    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship || friendship.recipientId !== session.userId) {
      return NextResponse.json({ error: "Friendship request not found or unauthorized" }, { status: 404 });
    }

    if (action === "ACCEPT") {
      await prisma.friendship.update({
        where: { id: friendshipId },
        data: { status: "ACCEPTED" },
      });
      return NextResponse.json({ success: true, status: "ACCEPTED" });
    } else {
      await prisma.friendship.delete({
        where: { id: friendshipId },
      });
      return NextResponse.json({ success: true, status: "REJECTED" });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
