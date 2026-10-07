-- Existing hashed cache keys have no ownership information. The maintainer
-- approved removing the three pre-ownership rows once; refuse a larger purge.
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM "AiCache") > 3 THEN
        RAISE EXCEPTION 'More than three legacy AI cache rows; review before migration';
    END IF;
    DELETE FROM "AiCache";
END $$;

CREATE TABLE "AiCacheUse" (
    "key" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "AiCacheUse_pkey" PRIMARY KEY ("key","studentId")
);

CREATE INDEX "AiCacheUse_studentId_idx" ON "AiCacheUse"("studentId");

ALTER TABLE "AiCacheUse" ADD CONSTRAINT "AiCacheUse_key_fkey" FOREIGN KEY ("key") REFERENCES "AiCache"("key") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiCacheUse" ADD CONSTRAINT "AiCacheUse_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
