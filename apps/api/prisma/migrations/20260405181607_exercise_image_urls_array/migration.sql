/*
  Warnings:

  - You are about to drop the column `image_url` on the `exercises` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "exercises" DROP COLUMN "image_url",
ADD COLUMN     "image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[];
