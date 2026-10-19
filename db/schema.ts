import {sqliteTable,text,integer,primaryKey} from 'drizzle-orm/sqlite-core';
export const workspaces=sqliteTable('workspaces',{userId:text('user_id').primaryKey(),revision:integer('revision').notNull().default(0),payload:text('payload').notNull(),updatedAt:text('updated_at').notNull()});
export const files=sqliteTable('files',{id:text('id').primaryKey(),userId:text('user_id').notNull(),name:text('name').notNull(),mime:text('mime').notNull(),size:integer('size').notNull(),createdAt:text('created_at').notNull()});
export const aiUsage=sqliteTable('ai_usage',{userId:text('user_id').notNull(),day:text('day').notNull(),count:integer('count').notNull().default(0)},t=>[primaryKey({columns:[t.userId,t.day]})]);
