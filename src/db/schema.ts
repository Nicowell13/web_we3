import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Initial placeholder schema for bootstrap verification
export const healthchecks = pgTable('healthchecks', {
  id: uuid('id').defaultRandom().primaryKey(),
  status: text('status').notNull(),
  checkedAt: timestamp('checked_at').defaultNow().notNull(),
});
