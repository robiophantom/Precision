-- CreateTable
CREATE TABLE "ScoreLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scoreUserId" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScoreLike_scoreUserId_context_contextId_idx" ON "ScoreLike"("scoreUserId", "context", "contextId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreLike_userId_scoreUserId_context_contextId_key" ON "ScoreLike"("userId", "scoreUserId", "context", "contextId");

-- AddForeignKey
ALTER TABLE "ScoreLike" ADD CONSTRAINT "ScoreLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreLike" ADD CONSTRAINT "ScoreLike_scoreUserId_fkey" FOREIGN KEY ("scoreUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
