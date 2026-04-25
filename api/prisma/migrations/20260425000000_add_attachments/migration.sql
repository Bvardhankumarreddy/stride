CREATE TABLE "Attachment" (
  "id"          TEXT          NOT NULL,
  "issueId"     TEXT          NOT NULL,
  "type"        TEXT          NOT NULL,
  "url"         TEXT          NOT NULL,
  "name"        TEXT          NOT NULL,
  "mimeType"    TEXT,
  "size"        INTEGER,
  "createdById" TEXT,
  "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Attachment_issueId_idx" ON "Attachment"("issueId");

ALTER TABLE "Attachment"
  ADD CONSTRAINT "Attachment_issueId_fkey"
  FOREIGN KEY ("issueId") REFERENCES "Issue"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attachment"
  ADD CONSTRAINT "Attachment_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
