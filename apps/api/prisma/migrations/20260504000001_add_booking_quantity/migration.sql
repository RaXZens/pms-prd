-- AlterTable: add quantity column with default 1, all existing rows get quantity = 1
ALTER TABLE "Booking" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;
