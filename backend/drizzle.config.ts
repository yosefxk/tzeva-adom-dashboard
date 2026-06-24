import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './data/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './data/alerts.db',
  },
});
