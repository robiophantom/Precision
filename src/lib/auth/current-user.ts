import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, status: true, email: true, emailVerifiedAt: true, role: true },
  });

  if (!user || user.status === "BANNED") return null;
  return user;
}

export async function getVerifiedUser() {
  const user = await getCurrentUser();
  if (!user || !user.email || !user.emailVerifiedAt) return null;
  return user;
}
