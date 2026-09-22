import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
  return user?.role === "ADMIN" || session.username === process.env.ADMIN_USERNAME ? session : null;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, username: true, status: true, role: true, createdAt: true, streak: { select: { currentStreak: true, longestStreak: true } } },
  });
  return NextResponse.json({ users });
}

const updateSchema = z.object({
  userId: z.string(),
  status: z.enum(["ACTIVE", "BANNED"]).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
});

export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = updateSchema.parse(await req.json());
    if (input.userId === session.userId && input.status === "BANNED") {
      return NextResponse.json({ error: "You cannot ban your own account" }, { status: 400 });
    }
    const user = await prisma.user.update({
      where: { id: input.userId },
      data: { ...(input.status ? { status: input.status } : {}), ...(input.role ? { role: input.role } : {}) },
      select: { id: true, username: true, status: true, role: true },
    });
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
}

export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId || userId === session.userId) return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ success: true });
}
