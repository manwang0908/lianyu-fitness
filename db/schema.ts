import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const visitors = sqliteTable('visitors', {
  id: text('id').primaryKey(), tokenHash: text('token_hash').notNull().unique(),
  state: text('state_json').notNull(), revision: integer('revision').notNull().default(1),
  created: integer('created_at').notNull(), updated: integer('updated_at').notNull(),
});
export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(), owner: text('owner_id').notNull().references(()=>visitors.id,{onDelete:'cascade'}),
  name: text('name').notNull(), tag: text('tag').notNull(), body: text('body').notNull(),
  hidden: integer('hidden').notNull().default(0), created: integer('created_at').notNull(),
}, t=>[index('posts_feed_idx').on(t.hidden,t.created),index('posts_owner_idx').on(t.owner,t.created)]);
export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(), post: text('post_id').notNull().references(()=>posts.id,{onDelete:'cascade'}),
  owner: text('owner_id').notNull().references(()=>visitors.id,{onDelete:'cascade'}),
  name: text('name').notNull(), body: text('body').notNull(), created: integer('created_at').notNull(),
},t=>[index('comments_post_idx').on(t.post,t.created),index('comments_owner_idx').on(t.owner,t.created)]);
export const likes = sqliteTable('likes', {
  id: text('id').primaryKey(), post: text('post_id').notNull().references(()=>posts.id,{onDelete:'cascade'}),
  owner: text('owner_id').notNull().references(()=>visitors.id,{onDelete:'cascade'}),
},t=>[uniqueIndex('likes_post_owner_idx').on(t.post,t.owner),index('likes_owner_idx').on(t.owner)]);
export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(), post: text('post_id').notNull().references(()=>posts.id,{onDelete:'cascade'}),
  owner: text('owner_id').notNull().references(()=>visitors.id,{onDelete:'cascade'}),
  reason: text('reason').notNull(), created: integer('created_at').notNull(),
},t=>[uniqueIndex('reports_post_owner_idx').on(t.post,t.owner),index('reports_owner_idx').on(t.owner)]);
export const events = sqliteTable('events', {
  id: text('id').primaryKey(), title: text('title').notNull(), capacity: integer('capacity').notNull(),
  test: integer('is_test').notNull().default(1),
});
export const registrations = sqliteTable('registrations', {
  id: text('id').primaryKey(), event: text('event_id').notNull().references(()=>events.id),
  owner: text('owner_id').notNull().references(()=>visitors.id,{onDelete:'cascade'}),
  status: text('status').notNull(), created: integer('created_at').notNull(),
},t=>[uniqueIndex('registrations_event_owner_idx').on(t.event,t.owner),index('registrations_owner_idx').on(t.owner),index('registrations_capacity_idx').on(t.event,t.status)]);
export const aiRequests = sqliteTable('ai_requests', {
  id: text('id').primaryKey(), owner: text('owner_id').notNull(), requestKey: text('request_key').notNull(),
  period: text('period').notNull(), status: text('status').notNull(), reserve: integer('reserve_micro').notNull(),
  result: text('result_json'), input: integer('input_tokens'), output: integer('output_tokens'), created: integer('created_at').notNull(),
},t=>[uniqueIndex('ai_owner_key_idx').on(t.owner,t.requestKey),index('ai_owner_period_idx').on(t.owner,t.period)]);
