import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ notifications: [] }, { status: 401 });
  const notifications = await prisma.notification.findMany({ where: { userId: session.userId, readAt: null }, orderBy: { createdAt: "desc" }, take: 20 });
  if (notifications.length) await prisma.notification.updateMany({ where: { id: { in: notifications.map((notification) => notification.id) } }, data: { readAt: new Date() } });
  return NextResponse.json({ notifications });
}
