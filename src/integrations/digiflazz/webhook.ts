import { createHmac } from 'crypto';

export type DigiflazzWebhookPayload = {
  data: {
    ref_id: string;
    buyer_sku_code: string;
    customer_no: string;
    status: 'Sukses' | 'Gagal' | 'Pending';
    sn?: string;
    message?: string;
    price?: number;
    tele?: string;
    wa?: string;
  };
};

/**
 * Verifies the HMAC-MD5 signature sent with Digiflazz webhook callbacks.
 * Signature = MD5(username + production_apiKey + ref_id)
 */
export function verifyDigiflazzWebhook(
  payload: DigiflazzWebhookPayload,
  username: string,
  apiKey: string,
  incomingSign: string
): boolean {
  const expected = createHmac('md5', apiKey)
    .update(username + apiKey + payload.data.ref_id)
    .digest('hex');
  return expected === incomingSign;
}
