-- CreateTable
CREATE TABLE "LlmCall" (
    "id" SERIAL NOT NULL,
    "userId" TEXT,
    "endpoint" TEXT NOT NULL,
    "worstCaseUsd" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LlmCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LlmCall_endpoint_createdAt_idx" ON "LlmCall"("endpoint", "createdAt");

-- CreateIndex
CREATE INDEX "LlmCall_userId_endpoint_createdAt_idx" ON "LlmCall"("userId", "endpoint", "createdAt");

-- CreateIndex
CREATE INDEX "LlmCall_createdAt_idx" ON "LlmCall"("createdAt");
