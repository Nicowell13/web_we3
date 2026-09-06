import { describe, expect, it } from 'bun:test';
import { repayAdminOrder } from '../src/modules/admin/order-admin.service';

describe('[ADMIN-23] Order repay and switch supplier SKU', () => {
  it('throws when transaction does not exist', async () => {
    await expect(
      repayAdminOrder('WETRI-NON-EXISTENT')
    ).rejects.toThrow();
  });
});
