-- CreateTable
CREATE TABLE "_UserRecurringSessions" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_UserRecurringSessions_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserRecurringSessions_B_index" ON "_UserRecurringSessions"("B");

-- AddForeignKey
ALTER TABLE "_UserRecurringSessions" ADD CONSTRAINT "_UserRecurringSessions_A_fkey" FOREIGN KEY ("A") REFERENCES "RecurringSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserRecurringSessions" ADD CONSTRAINT "_UserRecurringSessions_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
