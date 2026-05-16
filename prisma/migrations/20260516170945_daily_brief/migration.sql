-- CreateTable
CREATE TABLE "DailyBrief" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "filterText" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyBrief_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyBrief_userId_date_idx" ON "DailyBrief"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyBrief_userId_date_key" ON "DailyBrief"("userId", "date");

-- AddForeignKey
ALTER TABLE "DailyBrief" ADD CONSTRAINT "DailyBrief_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
