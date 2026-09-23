import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const challengeSchema = z.object({
  challengeDate: z.string(), // YYYY-MM-DD
  rounds: z.array(z.number().int().min(100).max(10000)).min(1).max(5),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const admin = session
      ? await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } })
      : null;
    if (!session || (admin?.role !== "ADMIN" && session.username !== process.env.ADMIN_USERNAME)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { challengeDate, rounds } = challengeSchema.parse(body);

    const dateObj = new Date(challengeDate);
    dateObj.setUTCHours(0, 0, 0, 0);

    const existing = await prisma.dailyChallenge.findUnique({
      where: { challengeDate: dateObj },
    });

    if (existing) {
      return NextResponse.json({ error: "Challenge for this date already exists" }, { status: 400 });
    }

    const challenge = await prisma.dailyChallenge.create({
      data: {
        challengeDate: dateObj,
        status: "PUBLISHED", // Auto-publish for MVP
        publishedAt: new Date(),
        rounds: {
          create: rounds.map((targetMs, i) => ({
            roundNumber: i + 1,
            targetMs,
          })),
        },
      },
      include: { rounds: true },
    });

    return NextResponse.json({ success: true, challenge });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
