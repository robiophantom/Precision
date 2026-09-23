import { prisma } from "@/lib/db/prisma";

export async function addSocialMetadata<T extends { userId: string }>(entries: T[], context: "DAILY_GLOBAL" | "DAILY_FRIENDS", contextId: string, currentUserId?: string) {
  const ids = entries.map((entry) => entry.userId);
  const [likes, friendships] = await Promise.all([
    prisma.scoreLike.findMany({ where: { scoreUserId: { in: ids }, context, contextId }, select: { scoreUserId: true, userId: true } }),
    currentUserId ? prisma.friendship.findMany({ where: { OR: [{ requesterId: currentUserId, recipientId: { in: ids } }, { recipientId: currentUserId, requesterId: { in: ids } }] }, select: { requesterId: true, recipientId: true, status: true } }) : Promise.resolve([]),
  ]);
  return entries.map((entry) => {
    const relation = friendships.find((friendship) => friendship.requesterId === entry.userId || friendship.recipientId === entry.userId);
    return { ...entry, likes: likes.filter((like) => like.scoreUserId === entry.userId).length, liked: Boolean(currentUserId && likes.some((like) => like.scoreUserId === entry.userId && like.userId === currentUserId)), relationship: relation?.status ?? "NONE" };
  });
}
