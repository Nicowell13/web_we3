import { expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

it('UI requires server eligibility, checkbox, saved target and idle state; sends boolean', () => {
  const source = readFileSync(new URL('../src/app/old-school/page.tsx', import.meta.url), 'utf8');
  expect(source).toContain('Sudah cek Digiflazz: transaksi gagal dan saldo tidak terpotong/sudah kembali');
  expect(source).toContain('disabled={repayingOrderId !== null || !ord.canRepay || balanceConfirmed[ord.orderId] !== true || currentTargetPhone !== ord.targetUserId}');
  expect(source).toContain('balanceConfirmed: balanceConfirmed[ord.orderId] === true');
  expect(source).toContain('setBalanceConfirmed(previous => ({ ...previous, [ord.orderId]: false }))');
  const route = readFileSync(new URL('../src/modules/admin/admin.routes.ts', import.meta.url), 'utf8');
  expect(route).toContain(".use(requireRole('admin'))");
  expect(route).toContain('repayAdminOrder(params.orderId, payload, user.uid)');
});
