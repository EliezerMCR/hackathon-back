-- Add nullable column first so we can backfill existing rows without data loss
ALTER TABLE "Community"
  ADD COLUMN "created_by" INTEGER;

-- Attempt to backfill using current admin members per community
UPDATE "Community" c
SET "created_by" = admin_members.id_user
FROM (
  SELECT DISTINCT ON (cm.id_community)
    cm.id_community,
    cm.id_user
  FROM "Community_Member" cm
  WHERE cm.role = 'ADMIN'
  ORDER BY cm.id_community, cm.created_at
) AS admin_members
WHERE admin_members.id_community = c.id
  AND c."created_by" IS NULL;

-- Fallback: use first member if no admin is registered for the community yet
UPDATE "Community" c
SET "created_by" = any_member.id_user
FROM (
  SELECT DISTINCT ON (cm.id_community)
    cm.id_community,
    cm.id_user
  FROM "Community_Member" cm
  ORDER BY cm.id_community, cm.created_at
) AS any_member
WHERE any_member.id_community = c.id
  AND c."created_by" IS NULL;

-- Enforce column presence and relationship now that data is populated
ALTER TABLE "Community"
  ALTER COLUMN "created_by" SET NOT NULL;

ALTER TABLE "Community"
  ADD CONSTRAINT "Community_created_by_fkey" FOREIGN KEY ("created_by")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
