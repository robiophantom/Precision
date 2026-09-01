import { prisma } from "@/lib/db/prisma";

export async function getTodayPublishedChallenge() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return prisma.dailyChallenge.findFirst({
    where: {
      challengeDate: today,
      status: "PUBLISHED",
    },
    include: {
      rounds: {
        orderBy: { roundNumber: "asc" },
      },
    },
  });
}

export async function generateRandomPracticeRounds() {
  const rounds = [];
  for (let i = 1; i <= 5; i++) {
    // Generate targets between 0.5s and 5.0s
    const targetMs = Math.floor(Math.random() * 4500) + 500;
    rounds.push({ roundNumber: i, targetMs });
  }
  return rounds;
}
