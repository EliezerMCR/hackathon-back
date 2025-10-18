-- Optional description for places (matches schema.prisma)
ALTER TABLE "Place"
  ADD COLUMN IF NOT EXISTS "description" TEXT;
