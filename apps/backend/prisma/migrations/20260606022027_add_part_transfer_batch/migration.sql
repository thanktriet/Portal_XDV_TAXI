-- CreateEnum
CREATE TYPE "PartTransferStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVERSED');

-- CreateTable
CREATE TABLE "part_transfer_batches" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "PartTransferStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "created_by_id" TEXT NOT NULL,
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_reason" TEXT,
    "reversed_from_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_transfer_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_transfer_lines" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "part_id" TEXT NOT NULL,
    "from_vehicle_id" TEXT NOT NULL,
    "to_vehicle_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "part_transfer_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "part_transfer_batches_code_key" ON "part_transfer_batches"("code");

-- CreateIndex
CREATE INDEX "part_transfer_batches_status_created_at_idx" ON "part_transfer_batches"("status", "created_at");

-- AddForeignKey
ALTER TABLE "part_transfer_batches" ADD CONSTRAINT "part_transfer_batches_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_transfer_batches" ADD CONSTRAINT "part_transfer_batches_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_transfer_batches" ADD CONSTRAINT "part_transfer_batches_reversed_from_id_fkey" FOREIGN KEY ("reversed_from_id") REFERENCES "part_transfer_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_transfer_lines" ADD CONSTRAINT "part_transfer_lines_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "part_transfer_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_transfer_lines" ADD CONSTRAINT "part_transfer_lines_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_transfer_lines" ADD CONSTRAINT "part_transfer_lines_from_vehicle_id_fkey" FOREIGN KEY ("from_vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_transfer_lines" ADD CONSTRAINT "part_transfer_lines_to_vehicle_id_fkey" FOREIGN KEY ("to_vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
