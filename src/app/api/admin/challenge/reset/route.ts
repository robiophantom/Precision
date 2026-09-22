import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true },
  });
  return user?.role === "ADMIN" || session.username === process.env.ADMIN_USERNAME ? session : null;
}

const resetSchema = z.object({
  userId: z.string().min(1),
  challengeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { userId, challengeDate } = resetSchema.parse(await req.json());
    const date = new Date(`${challengeDate}T00:00:00.000Z`);

    const challenge = await prisma.dailyChallenge.findUnique({
      where: { challengeDate: date },
      select: { id: true },
    });
    if (!challenge) return NextResponse.json({ error: "No challenge exists for this date" }, { status: 404 });

    const attempt = await prisma.attempt.findFirst({
      where: { userId, challengeId: challenge.id, mode: "COMPETITIVE" },
      select: { id: true, status: true },
    });
    if (!attempt) return NextResponse.json({ error: "This user has no attempt for that date" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.roundAttempt.deleteMany({ where: { attemptId: attempt.id } });
      await tx.attempt.delete({ where: { id: attempt.id } });

      if (attempt.status === "COMPLETED") {
        const completed = await tx.attempt.findMany({
          where: { userId, mode: "COMPETITIVE", status: "COMPLETED", verified: true },
          select: { challenge: { select: { challengeDate: true } } },
          orderBy: { challenge: { challengeDate: "asc" } },
        });

        let currentStreak = 0;
        let longestStreak = 0;
        let previousDate: Date | null = null;
        for (const entry of completed) {
          const currentDate = entry.challenge.challengeDate;
          const difference = previousDate
            ? Math.round((currentDate.getTime() - previousDate.getTime()) / 86_400_000)
            : 0;
          currentStreak = previousDate && difference === 1 ? currentStreak + 1 : 1;
          longestStreak = Math.max(longestStreak, currentStreak);
          previousDate = currentDate;
        }

        if (completed.length === 0) {
          await tx.streak.deleteMany({ where: { userId } });
        } else {
          await tx.streak.upsert({
            where: { userId },
            create: {
              userId,
              currentStreak,
              longestStreak,
              lastCompletedDate: previousDate,
            },
            update: {
              currentStreak,
              longestStreak,
              lastCompletedDate: previousDate,
            },
          });
        }
      }
    });

    return NextResponse.json({ success: true, message: `Attempt reset for ${challengeDate}` });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid reset request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not reset challenge attempt" }, { status: 500 });
  }
}
