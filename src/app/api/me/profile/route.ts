import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const schema = z.object({
  email: z.string().email().optional(),
  avatarUrl: z.string().startsWith("data:image/").max(2_500_000).optional(),
  webNotifications: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = schema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (data.email && data.email.toLowerCase() !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
      if (existing && existing.id !== user.id) return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      await prisma.user.update({ where: { id: user.id }, data: { email: data.email.toLowerCase(), emailVerifiedAt: null } });
      return NextResponse.json({ success: true, requiresVerification: true });
    }
    const updated = await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: data.avatarUrl, webNotifications: data.webNotifications } });
    return NextResponse.json({ success: true, user: { avatarUrl: updated.avatarUrl, webNotifications: updated.webNotifications } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid profile data" }, { status: 400 });
    return NextResponse.json({ error: "Could not update profile" }, { status: 500 });
  }
}
