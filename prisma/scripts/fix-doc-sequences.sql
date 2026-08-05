-- Fix DocumentSequence after fiscalYear null→0 change
-- PostgreSQL UNIQUE constraints treat NULL as distinct, so ON CONFLICT never
-- fired for null fiscalYear, creating duplicate rows per (orgId, prefix).

-- 1. For each (orgId, prefix) with null fiscalYear, keep only the row with
--    the highest nextVal (the actual counter state), delete the rest.
DELETE FROM "DocumentSequence" d
WHERE "fiscalYear" IS NULL
  AND id NOT IN (
    SELECT DISTINCT ON ("organizationId", prefix) id
    FROM "DocumentSequence"
    WHERE "fiscalYear" IS NULL
    ORDER BY "organizationId", prefix, "nextVal" DESC
  );

-- 2. Migrate the remaining null fiscalYear rows to 0.
UPDATE "DocumentSequence" SET "fiscalYear" = 0 WHERE "fiscalYear" IS NULL;
