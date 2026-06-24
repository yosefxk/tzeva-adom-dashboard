import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const alerts = sqliteTable('alerts', {
  id: text('id').primaryKey(), // Alert ID (Oref numerical string, or generated for Tzofar alerts)
  timestamp: integer('timestamp').notNull(), // Unix timestamp in milliseconds (local time resolved)
  category: integer('category').notNull(), // Numeric category (1 = rockets, 2 = drones, etc.)
  title: text('title').notNull(), // Alert title (Hebrew)
  locations: text('locations').notNull(), // JSON string representing raw location list (Hebrew strings)
  description: text('description'), // Shielding/action instructions (Hebrew)
  isDrill: integer('is_drill').notNull().default(0), // 1 if drill, 0 if active threat
});

export const syncLogs = sqliteTable('sync_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  timestamp: integer('timestamp').notNull(),
  event: text('event').notNull(),
  details: text('details'),
});
