import { describe, expect, it } from 'bun:test';
import { maskPlnCustomerName, isValidPlnCustomerNo, inquirePlnCustomer } from '../src/modules/suppliers/pln-inquiry.service';

describe('[FEAT-26] Realtime PLN Inquiry & Privacy Masking Unit Tests', () => {
  it('masks customer names with 2 leading characters and 2 trailing characters', () => {
    expect(maskPlnCustomerName('BUDI SANTOSO')).toBe('BU***SO');
    expect(maskPlnCustomerName('SITI NURHALIZA')).toBe('SI***ZA');
    expect(maskPlnCustomerName('AGUS')).toBe('A***S');
    expect(maskPlnCustomerName('EKO')).toBe('E***O');
    expect(maskPlnCustomerName('')).toBe('***');
  });

  it('validates 11-12 digit PLN meter or IDPEL numbers', () => {
    expect(isValidPlnCustomerNo('14123456789')).toBe(true); // 11 digits
    expect(isValidPlnCustomerNo('512345678901')).toBe(true); // 12 digits
    expect(isValidPlnCustomerNo('51234-5678901')).toBe(true); // with dash cleaned to 12 digits
    expect(isValidPlnCustomerNo('1234567890')).toBe(false); // 10 digits (too short)
    expect(isValidPlnCustomerNo('1234567890123')).toBe(false); // 13 digits (too long)
    expect(isValidPlnCustomerNo('')).toBe(false);
  });

  it('inquirePlnCustomer returns masked name for valid IDPEL', async () => {
    const result = await inquirePlnCustomer('14123456789');
    expect(result.ok).toBe(true);
    expect(result.customerNo).toBe('14123456789');
    expect(result.maskedName).toBeDefined();
    expect(result.maskedName).toContain('***');
  });

  it('inquirePlnCustomer rejects invalid/unknown IDPEL', async () => {
    const shortResult = await inquirePlnCustomer('123');
    expect(shortResult.ok).toBe(false);

    const invalidResult = await inquirePlnCustomer('00000000000');
    expect(invalidResult.ok).toBe(false);
    expect(invalidResult.message).toContain('tidak terdaftar');
  });
});
