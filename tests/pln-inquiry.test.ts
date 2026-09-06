import { describe, expect, it, beforeEach } from 'bun:test';
import {
  maskPlnCustomerName,
  isValidPlnCustomerNo,
  inquirePlnCustomer,
  clearPlnInquiryCache,
} from '../src/modules/suppliers/pln-inquiry.service';
import type { TopUpProvider } from '../src/modules/suppliers/topupProvider';

function supplierWithInquiry(result: any): TopUpProvider {
  let callCount = 0;
  return {
    checkBalance: async () => ({}),
    inquireAccount: async () => ({}),
    inquirePln: async () => {
      callCount++;
      return typeof result === 'function' ? result(callCount) : result;
    },
    createOrder: async () => ({}),
    checkOrderStatus: async () => ({}),
  };
}

describe('[FEAT-31] Realtime Public PLN Inquiry & Security Pre-Checkout Tests', () => {
  beforeEach(() => {
    clearPlnInquiryCache();
  });

  it('masks customer names correctly with first 2 and last 2 characters', () => {
    expect(maskPlnCustomerName('BUDI SANTOSO')).toBe('BU***SO');
    expect(maskPlnCustomerName('SITI NURHALIZA')).toBe('SI***ZA');
    expect(maskPlnCustomerName('AGUS')).toBe('A***S');
    expect(maskPlnCustomerName('EKO')).toBe('E***O');
    expect(maskPlnCustomerName('')).toBe('***');
  });

  it('validates 11-12 digit PLN meter or IDPEL numbers', () => {
    expect(isValidPlnCustomerNo('14123456789')).toBe(true);
    expect(isValidPlnCustomerNo('512345678901')).toBe(true);
    expect(isValidPlnCustomerNo('51234-5678901')).toBe(true);
    expect(isValidPlnCustomerNo('1234567890')).toBe(false);
    expect(isValidPlnCustomerNo('1234567890123')).toBe(false);
    expect(isValidPlnCustomerNo('')).toBe(false);
  });

  it('accepts only Digiflazz success rc 00 and returns real masked name', async () => {
    const result = await inquirePlnCustomer('14123456789', supplierWithInquiry({
      status: 'Sukses',
      rc: '00',
      customer_no: '14123456789',
      meter_no: '14123456789',
      subscriber_id: '523300817840',
      name: 'DAVID',
      segment_power: 'R1 /000001300',
    }));

    expect(result).toEqual({
      ok: true,
      customerNo: '14123456789',
      maskedName: 'DA***ID',
      meterNo: '14123456789',
      subscriberId: '523300817840',
      segmentPower: 'R1 /000001300',
    });
  });

  it('serves repeated successful inquiry from memory cache without refetching supplier', async () => {
    let supplierCalls = 0;
    const mockSupplier: TopUpProvider = {
      checkBalance: async () => ({}),
      inquireAccount: async () => ({}),
      inquirePln: async () => {
        supplierCalls++;
        return {
          status: 'Sukses',
          rc: '00',
          customer_no: '512345678901',
          name: 'SITI NURHALIZA',
          subscriber_id: '512345678901',
        };
      },
      createOrder: async () => ({}),
      checkOrderStatus: async () => ({}),
    };

    const first = await inquirePlnCustomer('512345678901', mockSupplier);
    expect(first.ok).toBe(true);
    expect(first.maskedName).toBe('SI***ZA');
    expect(supplierCalls).toBe(1);

    const second = await inquirePlnCustomer('512345678901', mockSupplier);
    expect(second.ok).toBe(true);
    expect(second.maskedName).toBe('SI***ZA');
    expect(supplierCalls).toBe(1); // Cached! No 2nd call to supplier
  });

  it('rejects random customer number when Digiflazz returns failed inquiry', async () => {
    const result = await inquirePlnCustomer('14111111111', supplierWithInquiry({
      status: 'Gagal',
      rc: '14',
      customer_no: '14111111111',
      message: 'ID Pelanggan Tidak Ditemukan',
    }));
    expect(result.ok).toBe(false);
    expect(result.message).toBe('ID Pelanggan Tidak Ditemukan');
    expect(result.maskedName).toBeUndefined();
  });

  it('rejects mismatched customer number and missing name even on claimed success', async () => {
    const wrongCustomer = await inquirePlnCustomer('14123456789', supplierWithInquiry({
      status: 'Sukses',
      rc: '00',
      customer_no: '14999999999',
      name: 'WRONG NAME',
    }));
    expect(wrongCustomer.ok).toBe(false);

    const missingName = await inquirePlnCustomer('14123456789', supplierWithInquiry({
      status: 'Sukses',
      rc: '00',
      customer_no: '14123456789',
      name: '',
    }));
    expect(missingName.ok).toBe(false);
  });
});
