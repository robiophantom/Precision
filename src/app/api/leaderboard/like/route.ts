import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const input = z.object({ scoreUserId: z.string(), context: z.enum(["DAILY_GLOBAL", "DAILY_FRIENDS"]), contextId: z.string(), liked: z.boolean() });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to react to scores." }, { status: 401 });
  try {
    const data = input.parse(await req.json());
    const where = { userId: session.userId, scoreUserId: data.scoreUserId, context: data.context, contextId: data.contextId };
    if (data.liked) await prisma.scoreLike.upsert({ where: { userId_scoreUserId_context_contextId: where }, create: { ...data, userId: session.userId }, update: {} });
    else await prisma.scoreLike.deleteMany({ where });
    return NextResponse.json({ likes: await prisma.scoreLike.count({ where: { scoreUserId: data.scoreUserId, context: data.context, contextId: data.contextId } }), liked: data.liked });
  } catch {
    return NextResponse.json({ error: "Could not update reaction." }, { status: 400 });
  }
}