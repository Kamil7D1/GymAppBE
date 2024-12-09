-- CreateTable
CREATE TABLE "RecurringSession" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "maxParticipants" INTEGER NOT NULL,
    "trainerId" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER,

    CONSTRAINT "RecurringSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RecurringSession" ADD CONSTRAINT "RecurringSession_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringSession" ADD CONSTRAINT "RecurringSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
