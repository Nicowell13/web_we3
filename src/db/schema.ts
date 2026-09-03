import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  numeric,
  boolean,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ----------------------------------------------------
// ENUMS
// ----------------------------------------------------
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'banned']);

export const transactionStatusEnum = pgEnum('transaction_status', [
  'PENDING',
  'PAID',
  'PROCESSING',
  'SUCCESS',
  'FAILED',
  'REFUNDED',
]);

export const discountTypeEnum = pgEnum('discount_type', ['percentage', 'fixed']);
export const voucherTypeEnum = pgEnum('voucher_type', ['new_user', 'promo', 'loyalty_points']);

// ----------------------------------------------------
// 1. USERS & GAMIFICATION
// ----------------------------------------------------
export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(), // Firebase UID or generated ID
    email: text('email').notNull().unique(),
    name: text('name'),
    avatarUrl: text('avatar_url'),
    role: userRoleEnum('role').default('user').notNull(),
    status: userStatusEnum('status').default('active').notNull(),
    bannedAt: timestamp('banned_at', { withTimezone: true }),
    bannedReason: text('banned_reason'),
    points: integer('points').default(0).notNull(),
    streak: integer('streak').default(0).notNull(),
    lastCheckinAt: timestamp('last_checkin_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('users_email_idx').on(table.email),
    index('users_role_idx').on(table.role),
  ]
);

// ----------------------------------------------------
// 2. GAMES CATALOG & PRODUCTS
// ----------------------------------------------------
export const gamesCatalog = pgTable(
  'games_catalog',
  {
    id: text('id').primaryKey(), // slug e.g. 'mobile-legends', 'free-fire'
    name: text('name').notNull(),
    publisher: text('publisher').notNull(),
    category: text('category').notNull(), // 'Game', 'Pulsa', 'PLN', 'Voucher'
    thumbnailUrl: text('thumbnail_url').notNull(),
    bannerUrl: text('banner_url'),
    requiresServerId: boolean('requires_server_id').default(false).notNull(),
    inputPlaceholder: text('input_placeholder').default('User ID').notNull(),
    serverPlaceholder: text('server_placeholder'),
    description: text('description'),
    displayOrder: integer('display_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('games_catalog_category_idx').on(table.category),
    index('games_catalog_active_idx').on(table.isActive),
  ]
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    gameId: text('game_id')
      .notNull()
      .references(() => gamesCatalog.id, { onDelete: 'cascade' }),
    sku: text('sku').notNull().unique(), // Supplier buyer SKU code
    denomination: text('denomination').notNull(), // e.g. '86 Diamonds', '100 Diamond'
    basePrice: numeric('base_price', { precision: 12, scale: 2 }).notNull(), // Modal supplier
    sellPrice: numeric('sell_price', { precision: 12, scale: 2 }).notNull(), // Harga jual
    supplierCode: text('supplier_code').default('digiflazz').notNull(), // Default 'digiflazz'
    supplierProductCode: text('supplier_product_code').notNull(),
    brand: text('brand'),
    productType: text('product_type'),
    marginType: discountTypeEnum('margin_type'),
    marginValue: numeric('margin_value', { precision: 12, scale: 2 }),
    supplierStatus: text('supplier_status').default('available').notNull(),
    syncedAt: timestamp('synced_at', { withTimezone: true }),
    isActive: boolean('is_active').default(true).notNull(),
    displayOrder: integer('display_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('products_game_id_idx').on(table.gameId),
    index('products_sku_idx').on(table.sku),
    index('products_active_idx').on(table.isActive),
    uniqueIndex('products_supplier_sku_idx').on(table.supplierCode, table.supplierProductCode),
  ]
);

// ----------------------------------------------------
// 3. TRANSACTIONS
// ----------------------------------------------------
export const transactions = pgTable(
  'transactions',
  {
    orderId: text('order_id').primaryKey(), // e.g. 'WETRI-20260901-XXXX'
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    targetUserId: text('target_user_id').notNull(), // In-game ID
    targetServerId: text('target_server_id'), // In-game Server/Zone ID
    customerPhone: text('customer_phone'),
    customerEmail: text('customer_email'),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(), // Nominal akhir
    originalAmount: numeric('original_amount', { precision: 12, scale: 2 }).notNull(),
    discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).default('0').notNull(),
    voucherCode: text('voucher_code'),
    pointsUsed: integer('points_used').default(0).notNull(),
    pointsEarned: integer('points_earned').default(0).notNull(),
    status: transactionStatusEnum('status').default('PENDING').notNull(),
    paymentMethod: text('payment_method'), // e.g. 'DOKU_QRIS', 'DOKU_VA'
    paymentInvoiceUrl: text('payment_invoice_url'),
    paymentReference: text('payment_reference'), // DOKU Invoice ID
    supplierReference: text('supplier_reference'), // Digiflazz Trx ID / SN
    supplierSn: text('supplier_sn'), // Serial Number / Token PLN
    metadata: jsonb('metadata'), // flexible extra data
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('transactions_user_id_idx').on(table.userId),
    index('transactions_status_idx').on(table.status),
    index('transactions_created_at_idx').on(table.createdAt),
  ]
);

// ----------------------------------------------------
// 4. VOUCHERS & LOYALTY
// ----------------------------------------------------
export const vouchers = pgTable(
  'vouchers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: text('code').notNull().unique(), // e.g. 'WETRIGLOW10'
    voucherType: voucherTypeEnum('voucher_type').default('promo').notNull(), // 'new_user' | 'promo' | 'loyalty_points'
    discountType: discountTypeEnum('discount_type').notNull(), // 'percentage' | 'fixed'
    discountValue: numeric('discount_value', { precision: 12, scale: 2 }).notNull(),
    minPurchase: numeric('min_purchase', { precision: 12, scale: 2 }).default('0').notNull(),
    maxDiscount: numeric('max_discount', { precision: 12, scale: 2 }), // optional cap
    quota: integer('quota').default(100).notNull(),
    quotaUsed: integer('quota_used').default(0).notNull(),
    dailyLimit: integer('daily_limit'), // limit pemakaian per hari untuk voucher new_user / promo
    pointsRequired: integer('points_required').default(0).notNull(), // poin yang ditukarkan (khusus loyalty_points)
    isPublic: boolean('is_public').default(true).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('vouchers_code_idx').on(table.code),
    index('vouchers_type_idx').on(table.voucherType),
    index('vouchers_active_idx').on(table.isActive),
  ]
);

export const userVouchers = pgTable(
  'user_vouchers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    voucherId: uuid('voucher_id')
      .notNull()
      .references(() => vouchers.id, { onDelete: 'cascade' }),
    isUsed: boolean('is_used').default(false).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    obtainedAt: timestamp('obtained_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('user_vouchers_user_id_idx').on(table.userId),
    index('user_vouchers_is_used_idx').on(table.isUsed),
  ]
);

// ----------------------------------------------------
// 5. SYSTEM CONFIGS & FEATURE FLAGS (Multi-Supplier switcher, Promos)
// ----------------------------------------------------
export const systemConfigs = pgTable(
  'system_configs',
  {
    key: text('key').primaryKey(), // e.g. 'ACTIVE_SUPPLIER', 'ENABLE_DAILY_CHECKIN'
    value: text('value').notNull(), // 'digiflazz', 'true', etc.
    description: text('description'),
    isActive: boolean('is_active').default(true).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('system_configs_active_idx').on(table.isActive),
  ]
);

// ----------------------------------------------------
// 6. AUDIT TRAILS & WEBHOOK LOGS
// ----------------------------------------------------
export const auditTrails = pgTable(
  'audit_trails',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventType: text('event_type').notNull(), // 'DOKU_WEBHOOK', 'DIGIFLAZZ_WEBHOOK', 'STATUS_CHANGE', 'CONFIG_CHANGE'
    referenceId: text('reference_id').notNull(), // orderId, config key, etc.
    rawRequest: jsonb('raw_request'),
    rawResponse: jsonb('raw_response'),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('audit_trails_event_type_idx').on(table.eventType),
    index('audit_trails_reference_id_idx').on(table.referenceId),
    index('audit_trails_created_at_idx').on(table.createdAt),
  ]
);

// ----------------------------------------------------
// RELATIONS
// ----------------------------------------------------
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  vouchers: many(userVouchers),
}));

export const gamesCatalogRelations = relations(gamesCatalog, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  game: one(gamesCatalog, {
    fields: [products.gameId],
    references: [gamesCatalog.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [transactions.productId],
    references: [products.id],
  }),
}));

export const vouchersRelations = relations(vouchers, ({ many }) => ({
  userVouchers: many(userVouchers),
}));

export const userVouchersRelations = relations(userVouchers, ({ one }) => ({
  user: one(users, {
    fields: [userVouchers.userId],
    references: [users.id],
  }),
  voucher: one(vouchers, {
    fields: [userVouchers.voucherId],
    references: [vouchers.id],
  }),
}));
