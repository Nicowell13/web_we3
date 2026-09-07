import { describe, expect, it } from 'bun:test';
import { parsePlnToken, verifyDigiflazzWebhookSha1 } from '../src/integrations/digiflazz/webhook';

describe('[FEAT-32] Digiflazz Webhook & PLN Token Parser', () => {
  it('parses standard 20-digit PLN token from Digiflazz SN string', () => {
    const rawSn = '1234-5678-9012-3456-7890/NUR ROCHMAH/R1/1300VA/12.5KWH';
    const parsed = parsePlnToken(rawSn);

    expect(parsed).not.toBeNull();
    expect(parsed?.tokenNumber).toBe('1234-5678-9012-3456-7890');
    expect(parsed?.customerName).toBe('NUR ROCHMAH');
    expect(parsed?.tariffPower).toContain('R1');
    expect(parsed?.kwh).toBe('12.5KWH');
  });

  it('parses unbroken 20-digit PLN token string correctly', () => {
    const rawSn = '54321098765432109876/BUDI SANTOSO/R1M/900VA/15.0KWH';
    const parsed = parsePlnToken(rawSn);

    expect(parsed).not.toBeNull();
    expect(parsed?.tokenNumber).toBe('5432-1098-7654-3210-9876');
    expect(parsed?.customerName).toBe('BUDI SANTOSO');
  });

  it('returns null for non-PLN or invalid serial numbers', () => {
    expect(parsePlnToken('')).toBeNull();
    expect(parsePlnToken(undefined)).toBeNull();
    expect(parsePlnToken('FREEFIRE123456789')).toBeNull(); // not 20 digits
  });

  it('verifies SHA1 webhook signature correctly', () => {
    const secret = 'test-webhook-secret';
    const rawBody = JSON.stringify({
      data: {
        ref_id: 'TRX-12345',
        status: 'Sukses',
        rc: '00',
        sn: '1234-5678-9012-3456-7890/TEST/R1/1300/10KWH',
      },
    });

    // Compute expected signature
    const crypto = require('crypto');
    const validSignature = 'sha1=' + crypto.createHmac('sha1', secret).update(rawBody).digest('hex');

    expect(verifyDigiflazzWebhookSha1(rawBody, secret, validSignature)).toBe(true);
    expect(verifyDigiflazzWebhookSha1(rawBody, secret, 'sha1=wrongsignature')).toBe(false);
  });
});
