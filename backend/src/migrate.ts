import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { db } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsFolder = path.join(__dirname, '../data/migrations');

console.log('Running Drizzle migrations from:', migrationsFolder);
try {
  migrate(db, { migrationsFolder });
  console.log('Migrations completed successfully!');
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
}
