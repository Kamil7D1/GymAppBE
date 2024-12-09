-- CreateEnum
CREATE TYPE "TrainingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "description" TEXT,
ADD COLUMN     "pricePerSession" DOUBLE PRECISION,
ADD COLUMN     "specialization" TEXT;

-- CreateTable
CREATE TABLE "PersonalTraining" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "message" TEXT,
    "status" "TrainingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trainerId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,

    CONSTRAINT "PersonalTraining_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PersonalTraining" ADD CONSTRAINT "PersonalTraining_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalTraining" ADD CONSTRAINT "PersonalTraining_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
