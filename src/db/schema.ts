import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  articleCode: text('article_code'),
  quantity: integer('quantity'),
  moldInDate: text('mold_in_date'),
  status: text('status').default('PENDING'),
  bom: text('bom'),
  moldType: text('mold_type'),
  moldOutDate: text('mold_out_date'),
  finishDate: text('finish_date'),
  brand: text('brand'),
  rawStatus: text('raw_status'),
  sourceLine: text('source_line'),
  leanlineInDate: text('leanline_in_date'),
  cuttingDie: text('cutting_die'),
});

export const lineRules = sqliteTable('line_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  lineId: text('line_id').references(() => lines.id),
  ruleType: text('rule_type').notNull().default('BRAND'),
  ruleValue: text('rule_value').notNull(),
});

export const priorityOrders = sqliteTable('priority_orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: text('order_id').unique().notNull(),
  newFinishDate: text('new_finish_date').notNull(),
  reason: text('reason'),
});

export const lines = sqliteTable('lines', {
  id: text('id').primaryKey(),
  lineCode: text('line_code').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
});

export const productionJobs = sqliteTable('production_jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: text('order_id').references(() => orders.id),
  lineId: text('line_id').references(() => lines.id),
  status: text('status'),
  createdAt: text('created_at'),
  estimatedEndTime: text('estimated_end_time'),
  actualEndTime: text('actual_end_time'),
});

export const moldTargets = sqliteTable('mold_targets', {
  moldType: text('mold_type').primaryKey(),
  targetPerHour: integer('target_per_hour'),
});

export const lineConfigs = sqliteTable('line_configs', {
  lineId: text('line_id').primaryKey().references(() => lines.id),
  machineCount: integer('machine_count'),
  capabilities: text('capabilities'),
});

export const systemConfig = sqliteTable('system_config', {
  key: text('key').primaryKey(),
  value: text('value'),
});
