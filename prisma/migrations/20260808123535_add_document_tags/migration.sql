-- AlterTable
ALTER TABLE "GeneratedDocument" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
