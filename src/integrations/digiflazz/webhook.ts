import { createHmac } from 'crypto';

export type DigiflazzWebhookPayload = {
  data: {
    ref_id: string;
    buyer_sku_code?: string;
    customer_no?: string;
    status: 'Sukses' | 'Gagal' | 'Pending';
    rc?: string;
    sn?: string;
    message?: string;
    price?: number;
    tele?: string;
    wa?: string;
  };
};

export type PlnTokenDetails = {
  tokenNumber: string;
  customerName?: string;
  tariffPower?: string;
  kwh?: string;
  rawSn: string;
};

/**
 * Verifies Digiflazz Webhook Signature from X-Hub-Signature header (e.g. `sha1=...`).
 * Uses HMAC-SHA1 over raw string payload.
 */
export function verifyDigiflazzWebhookSha1(
  rawBody: string,
  secretKey: string,
  incomingSignature: string
): boolean {
  if (!rawBody || !secretKey || !incomingSignature) return false;
  const cleanedSignature = incomingSignature.startsWith('sha1=')
    ? incomingSignature.slice(5)
    : incomingSignature;

  const computed = createHmac('sha1', secretKey)
    .update(rawBody)
    .digest('hex');

  return computed.toLowerCase() === cleanedSignature.toLowerCase();
}

/**
 * Legacy HMAC-MD5 verifier.
 */
export function verifyDigiflazzWebhook(
  payload: DigiflazzWebhookPayload,
  username: string,
  apiKey: string,
  incomingSign: string
): boolean {
  const expected = createHmac('md5', apiKey)
    .update(username + apiKey + (payload?.data?.ref_id || ''))
    .digest('hex');
  return expected === incomingSign;
}

/**
 * Parses Digiflazz SN format for PLN tokens:
 * Format example:
 * `1234-5678-9012-3456-7890/NUR ROCHMAH/R1/1300VA/12.5KWH`
 * `12345678901234567890/NUR ROCHMAH/R1M/900/10.2`
 */
export function parsePlnToken(sn?: string | null): PlnTokenDetails | null {
  if (!sn || typeof sn !== 'string') return null;
  const trimmed = sn.trim();
  if (!trimmed) return null;

  const parts = trimmed.split('/').map((p) => p.trim());
  const tokenCandidate = parts[0]?.replace(/[^0-9]/g, '') || '';

  // Valid PLN token is 20 numeric digits
  if (tokenCandidate.length !== 20) {
    return null;
  }

  // Format into 4-digit groups (XXXX-XXXX-XXXX-XXXX-XXXX)
  const formattedToken = tokenCandidate.match(/.{1,4}/g)?.join('-') || tokenCandidate;

  return {
    tokenNumber: formattedToken,
    customerName: parts[1] || undefined,
    tariffPower: parts[2] ? (parts[3] && !parts[3].toUpperCase().includes('KWH') ? `${parts[2]}/${parts[3]}` : parts[2]) : undefined,
    kwh: parts.find((p) => p.toUpperCase().includes('KWH')) || (parts[4] ? `${parts[4]} KWH` : undefined),
    rawSn: trimmed,
  };
}
