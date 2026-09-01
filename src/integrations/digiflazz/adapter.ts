import { createHmac } from 'crypto';
import { TopUpProvider } from '../suppliers/topupProvider';

const BASE_URL = 'https://api.digiflazz.com/v1';

function makeSignature(username: string, apiKey: string, ref: string) {
  return createHmac('md5', apiKey)
    .update(username + apiKey + ref)
    .digest('hex');
}

async function post(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json() as { data: any };
  return json.data ?? json;
}

export class DigiflazzAdapter implements TopUpProvider {
  private username: string;
  private apiKey: string;

  constructor(username: string, apiKey: string) {
    this.username = username;
    this.apiKey = apiKey;
  }

  async checkBalance() {
    const sign = makeSignature(this.username, this.apiKey, 'depo');
    return post('/cek-saldo', {
      cmd: 'deposit',
      username: this.username,
      sign,
    });
  }

  async inquireAccount(targetId: string) {
    // Digiflazz does not have a generic inquire — return targetId as-is
    return { targetId, supported: false };
  }

  async createOrder(productSku: string, targetId: string, _amount?: number) {
    const refId = `WETRI-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const sign = makeSignature(this.username, this.apiKey, refId);
    return post('/transaction', {
      username: this.username,
      buyer_sku_code: productSku,
      customer_no: targetId,
      ref_id: refId,
      sign,
      testing: process.env.DIGIFLAZZ_ENV === 'dev',
    });
  }

  async checkOrderStatus(orderRef: string) {
    const sign = makeSignature(this.username, this.apiKey, orderRef);
    return post('/transaction', {
      username: this.username,
      ref_id: orderRef,
      sign,
    });
  }
}
