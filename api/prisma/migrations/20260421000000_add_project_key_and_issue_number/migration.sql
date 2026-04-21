-- Add Project.key (nullable) + Issue.number (nullable)
ALTER TABLE "Project" ADD COLUMN "key" TEXT;
ALTER TABLE "Issue"   ADD COLUMN "number" INTEGER;

-- Backfill Project.key from the project name: first 3 uppercase letters of name.
-- If that produces collisions within an organization, append a counter.
DO $$
DECLARE
  p RECORD;
  base TEXT;
  candidate TEXT;
  suffix INT;
BEGIN
  FOR p IN SELECT id, name, "organizationId" FROM "Project" WHERE "key" IS NULL ORDER BY "createdAt" ASC LOOP
    -- Strip non-alpha, take first 3 chars, uppercase. Default to "PRJ" if empty.
    base := UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(p.name, ''), '[^A-Za-z]', '', 'g') FROM 1 FOR 3));
    IF base = '' THEN base := 'PRJ'; END IF;
    candidate := base;
    suffix := 1;
    WHILE EXISTS (
      SELECT 1 FROM "Project" WHERE "key" = candidate
        AND (("organizationId" IS NULL AND p."organizationId" IS NULL) OR "organizationId" = p."organizationId")
    ) LOOP
      suffix := suffix + 1;
      candidate := base || suffix;
    END LOOP;
    UPDATE "Project" SET "key" = candidate WHERE id = p.id;
  END LOOP;
END $$;

-- Backfill Issue.number: sequential per project, ordered by createdAt ASC.
-- Issues with NULL projectId are left as NULL (no number since no key to prefix).
DO $$
DECLARE
  i RECORD;
  counter INT;
  last_project TEXT;
BEGIN
  last_project := NULL;
  counter := 0;
  FOR i IN SELECT id, "projectId" FROM "Issue" WHERE "projectId" IS NOT NULL ORDER BY "projectId", "createdAt" ASC LOOP
    IF i."projectId" IS DISTINCT FROM last_project THEN
      last_project := i."projectId";
      counter := 0;
    END IF;
    counter := counter + 1;
    UPDATE "Issue" SET "number" = counter WHERE id = i.id;
  END LOOP;
END $$;

-- Unique constraints
CREATE UNIQUE INDEX "Project_organizationId_key_key" ON "Project"("organizationId", "key");
CREATE UNIQUE INDEX "Issue_projectId_number_key"     ON "Issue"("projectId", "number");
