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
  receivedLogo: text('received_logo'),
  codeLogo1: text('code_logo1'),
  thangHoa: text('thang_hoa'),
  productType: text('product_type'),
  logoStatus: text('logo_status'),
  descriptionPU1: text('description_pu1'),
  descriptionFB: text('description_fb'),
  manualCombineId: text('manual_combine_id'),
  hasLogo: integer('has_logo', { mode: 'boolean' }).default(false),
});

export const lineRules = sqliteTable('line_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  lineId: text('line_id').references(() => lines.id),
  ruleType: text('rule_type').notNull().default('BRAND'),
  ruleValue: text('rule_value').notNull(),
  isStrict: integer('is_strict', { mode: 'boolean' }).default(true),
});

export const priorityOrders = sqliteTable('priority_orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: text('order_id').unique().notNull(),
  newFinishDate: text('new_finish_date').notNull(),
  reason: text('reason'),
  exportTime: text('export_time'),
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

export const moldTypes = sqliteTable('mold_types', {
  mold: text('mold').primaryKey(),
  type: text('type').notNull(), // 1k1s, 1k3s, SP
});

export const manualCombines = sqliteTable('manual_combines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: text('order_id').unique().notNull(),
  combineName: text('combine_name').notNull(),
});

export const trackingCarts = sqliteTable('tracking_carts', {
  code: text('code').primaryKey(),
  location: text('location'),
  updatedBy: text('updated_by'),
  updatedAt: text('updated_at'),
});

export const trackingOrders = sqliteTable('tracking_orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderCode: text('order_code').notNull().unique(),
  category: text('category'),
  msnv: text('msnv'),
  station: text('station'),
  location: text('location'),
  updatedAt: text('updated_at'),
});

export const trackingLogs = sqliteTable('tracking_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  timestamp: text('timestamp').notNull(),
  orderCode: text('order_code').notNull(),
  action: text('action'),
  fromStation: text('from_station'),
  toStation: text('to_station'),
  note: text('note'),
});

