-- Ensure password reset columns match Prisma schema mapping
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "password_reset_token" TEXT,
  ADD COLUMN IF NOT EXISTS "password_reset_expires" TIMESTAMP(3);

-- If camelCase columns exist from previous migration, move data then drop them
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'User'
      AND column_name = 'passwordResetToken'
  ) THEN
    EXECUTE 'UPDATE "User" SET "password_reset_token" = "passwordResetToken" WHERE "password_reset_token" IS NULL';
    EXECUTE 'ALTER TABLE "User" DROP COLUMN "passwordResetToken"';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'User'
      AND column_name = 'passwordResetExpires'
  ) THEN
    EXECUTE 'UPDATE "User" SET "password_reset_expires" = "passwordResetExpires" WHERE "password_reset_expires" IS NULL';
    EXECUTE 'ALTER TABLE "User" DROP COLUMN "passwordResetExpires"';
  END IF;
END $$;
