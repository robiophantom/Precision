import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const startSchema = z.object({
  challengeId: z.string(),
  mode: z.enum(["COMPETITIVE", "PRACTICE"]).default("COMPETITIVE"),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { challengeId, mode } = startSchema.parse(body);

    if (mode === "COMPETITIVE") {
      // Check for existing competitive attempt
      const existingAttempt = await prisma.attempt.findFirst({
        where: {
          userId: session.userId,
          challengeId,
          mode: "COMPETITIVE",
        },
      });

      if (existingAttempt) {
        return NextResponse.json(
          { error: "You have already started or completed this challenge." },
          { status: 403 }
        );
      }
    }

    const attempt = await prisma.attempt.create({
      data: {
        userId: session.userId,
        challengeId,
        mode,
        status: "IN_PROGRESS",
      },
    });

    return NextResponse.json({ attemptId: attempt.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
