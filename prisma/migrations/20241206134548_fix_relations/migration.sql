/*
  Warnings:

  - You are about to drop the column `userId` on the `RecurringSession` table. All the data in the column will be lost.
  - You are about to drop the column `end` on the `TrainingSession` table. All the data in the column will be lost.
  - You are about to drop the column `start` on the `TrainingSession` table. All the data in the column will be lost.
  - Added the required column `date` to the `TrainingSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endTime` to the `TrainingSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `TrainingSession` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "RecurringSession" DROP CONSTRAINT "RecurringSession_userId_fkey";

-- AlterTable
ALTER TABLE "RecurringSession" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "TrainingSession" DROP COLUMN "end",
DROP COLUMN "start",
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "endTime" TEXT NOT NULL,
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startTime" TEXT NOT NULL;
