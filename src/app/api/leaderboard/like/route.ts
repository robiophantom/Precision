import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const input = z.object({ scoreUserId: z.string(), context: z.enum(["DAILY_GLOBAL", "DAILY_FRIENDS"]), contextId: z.string(), liked: z.boolean() });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to react to scores." }, { status: 401 });
  try {
    const { liked, scoreUserId, context, contextId } = input.parse(await req.json());
    const contexts = ["DAILY_GLOBAL", "DAILY_FRIENDS"] as const;
    await prisma.$transaction(async (tx) => {
      for (const likeContext of contexts) {
        const where = { userId: session.userId, scoreUserId, context: likeContext, contextId };
        if (liked) {
          await tx.scoreLike.upsert({
            where: { userId_scoreUserId_context_contextId: where },
            create: where,
            update: {},
          });
        } else {
          await tx.scoreLike.deleteMany({ where });
        }
      }
    });
    return NextResponse.json({
      likes: await prisma.scoreLike.count({ where: { scoreUserId, context, contextId } }),
      liked,
    });
  } catch {
    return NextResponse.json({ error: "Could not update reaction." }, { status: 400 });
  }
}