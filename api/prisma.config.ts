import { defineConfig } from 'prisma/config';

function getDbUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // Railway injects individual PG* vars when a Postgres plugin is linked
  const { PGUSER, PGPASSWORD, PGHOST, PGPORT, PGDATABASE } = process.env;
  if (PGHOST && PGDATABASE && PGUSER) {
    return `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT ?? 5432}/${PGDATABASE}`;
  }

  return undefined;
}

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: getDbUrl(),
  },
});
