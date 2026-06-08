/*
  Warnings:

  - Added the required column `item_description` to the `part_transfer_lines` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "part_transfer_lines" DROP CONSTRAINT "part_transfer_lines_part_id_fkey";

-- AlterTable
ALTER TABLE "part_transfer_lines" ADD COLUMN     "item_description" TEXT NOT NULL,
ALTER COLUMN "part_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "part_transfer_lines" ADD CONSTRAINT "part_transfer_lines_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
