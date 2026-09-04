import { describe, expect, it } from 'bun:test';
import * as schema from '../src/db/schema';

describe('[FEAT-01] Database Schema Definition & Integrity', () => {
  it('should export all required core tables and enums', () => {
    expect(schema.users).toBeDefined();
    expect(schema.gamesCatalog).toBeDefined();
    expect(schema.products).toBeDefined();
    expect(schema.transactions).toBeDefined();
    expect(schema.vouchers).toBeDefined();
    expect(schema.userVouchers).toBeDefined();
    expect(schema.systemConfigs).toBeDefined();
    expect(schema.auditTrails).toBeDefined();
    expect(schema.articles).toBeDefined();
    expect(schema.articleFaqs).toBeDefined();

    expect(schema.userRoleEnum).toBeDefined();
    expect(schema.articleStatusEnum).toBeDefined();
    expect(schema.transactionStatusEnum).toBeDefined();
    expect(schema.discountTypeEnum).toBeDefined();
    expect(schema.userStatusEnum).toBeDefined();
  });

  it('should support editor role and article editorial fields', () => {
    expect(schema.userRoleEnum.enumValues).toContain('editor');
    expect(schema.articleStatusEnum.enumValues).toEqual(['draft', 'scheduled', 'published', 'archived']);
    expect(Object.keys(schema.articles)).toEqual(expect.arrayContaining(['title', 'slug', 'authorId', 'publishAt']));
    expect(Object.keys(schema.articleFaqs)).toEqual(expect.arrayContaining(['articleId', 'question', 'answer']));
  });

  it('should have correct columns and data types in users table', () => {
    const cols = Object.keys(schema.users);
    expect(cols).toContain('id');
    expect(cols).toContain('email');
    expect(cols).toContain('points');
    expect(cols).toContain('streak');
    expect(cols).toContain('lastCheckinAt');
    expect(cols).toContain('role');
    expect(cols).toContain('status');
  });

  it('should have supplier catalog and pricing columns in products table', () => {
    const cols = Object.keys(schema.products);
    for (const column of ['supplierCode', 'supplierProductCode', 'brand', 'productType', 'marginType', 'marginValue', 'supplierStatus', 'syncedAt', 'isActive', 'sellPrice']) {
      expect(cols).toContain(column);
    }
  });

  it('should have correct columns in transactions table', () => {
    const cols = Object.keys(schema.transactions);
    expect(cols).toContain('orderId');
    expect(cols).toContain('productId');
    expect(cols).toContain('amount');
    expect(cols).toContain('status');
    expect(cols).toContain('pointsEarned');
    expect(cols).toContain('pointsUsed');
  });

  it('should have system_configs and audit_trails tables configured', () => {
    const configCols = Object.keys(schema.systemConfigs);
    expect(configCols).toContain('key');
    expect(configCols).toContain('value');
    expect(configCols).toContain('isActive');

    const auditCols = Object.keys(schema.auditTrails);
    expect(auditCols).toContain('eventType');
    expect(auditCols).toContain('referenceId');
    expect(auditCols).toContain('rawRequest');
    expect(auditCols).toContain('rawResponse');
  });
});
