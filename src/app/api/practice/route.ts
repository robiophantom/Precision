import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const createSchema = z.object({ rounds: z.number().int().min(1).max(5), targets: z.array(z.number().int().min(100).max(10000)).min(1).max(5) });
const scoreSchema = z.object({ sessionId: z.string(), scores: z.array(z.number().int().min(0)).max(5) });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if ("scores" in body) {
      const { sessionId, scores } = scoreSchema.parse(body);
      const practice = await prisma.practiceSession.findUnique({ where: { id: sessionId } });
      if (!practice || practice.userId !== session.userId || practice.status !== "IN_PROGRESS") return NextResponse.json({ error: "Practice session not found" }, { status: 404 });
      if (scores.length !== practice.rounds) return NextResponse.json({ error: `Submit exactly ${practice.rounds} round scores.` }, { status: 400 });
      const totalScore = scores.reduce((sum, score) => sum + score, 0);
      const updated = await prisma.practiceSession.update({ where: { id: sessionId }, data: { scores, totalScore, status: "COMPLETED", completedAt: new Date() } });
      return NextResponse.json({ success: true, totalScore: updated.totalScore });
    }
    const { rounds, targets } = createSchema.parse(body);
    const practice = await prisma.practiceSession.create({ data: { userId: session.userId, rounds, targets } });
    return NextResponse.json({ sessionId: practice.id, targets });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid practice data" }, { status: 400 });
    return NextResponse.json({ error: "Could not create practice session" }, { status: 500 });
  }
}
