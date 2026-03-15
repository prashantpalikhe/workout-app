-- AlterTable
ALTER TABLE "programs" ADD COLUMN     "assigned_by" UUID,
ADD COLUMN     "source_program_id" UUID;

-- CreateIndex
CREATE INDEX "programs_source_program_id_idx" ON "programs"("source_program_id");

-- CreateIndex
CREATE INDEX "programs_assigned_by_idx" ON "programs"("assigned_by");

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_source_program_id_fkey" FOREIGN KEY ("source_program_id") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
