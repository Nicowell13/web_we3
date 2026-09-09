import crypto from 'crypto';

function generateDigest(payload) {
  const payloadString = JSON.stringify(payload).replace(/\r/g, '');
  return crypto.createHash('sha256').update(payloadString).digest('base64');
}

function generateSignature(clientId, secretKey, requestId, timestamp, targetPath, payload) {
  const digest = generateDigest(payload);

  const stringToSign = [
    `Client-Id:${clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${timestamp}`,
    `Request-Target:${targetPath}`,
    `Digest:${digest}`,
  ].join('\n');

  return crypto.createHmac('sha256', secretKey).update(stringToSign).digest('base64');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const DOKU_CLIENT_ID = process.env.DOKU_CLIENT_ID?.trim();
  const DOKU_SECRET_KEY = process.env.DOKU_SECRET_KEY?.trim();

  if (!DOKU_CLIENT_ID || !DOKU_SECRET_KEY) {
    return res.status(500).json({ error: 'Missing DOKU credentials' });
  }

  const targetPath = '/checkout/v2/payment';
  const url = `https://api.doku.com${targetPath}`;

  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  // Ambil payload dari frontend
  const payload = req.body;

  // Validasi minimal
  if (!payload || !payload.order || !payload.order.amount || !payload.order.invoice_number) {
    return res.status(400).json({ error: 'Invalid payload: order.amount and order.invoice_number are required' });
  }

  // PATCH: Hitung amount final dengan diskon
  const rawAmount = Number(payload.order.amount) || 0;
  const discount = Number(payload.order.discount) || 0;
  const finalAmount = rawAmount - discount;

  const order = {
    amount: finalAmount > 0 ? finalAmount : 0, // pastikan tidak negatif
    invoice_number: payload.order.invoice_number,
    ...(payload.order.items ? { items: payload.order.items } : {}),
    ...(discount > 0 ? { discount } : {}),
    ...(payload.order.shipping_cost ? { shipping_cost: payload.order.shipping_cost } : {}),
    ...Object.fromEntries(
      Object.entries(payload.order).filter(
        ([key]) => !['amount', 'invoice_number', 'items', 'discount', 'shipping_cost'].includes(key)
      )
    )
  };

  // Payload final untuk DOKU
  const finalPayload = {
    ...payload,
    order
  };

  const signature = generateSignature(
    DOKU_CLIENT_ID,
    DOKU_SECRET_KEY,
    requestId,
    timestamp,
    targetPath,
    finalPayload
  );

  const digest = generateDigest(finalPayload);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': DOKU_CLIENT_ID,
        'Request-Id': requestId,
        'Request-Timestamp': timestamp,
        'Signature': `HMACSHA256=${signature}`,
        'Digest': `SHA-256=${digest}`,
      },
      body: JSON.stringify(finalPayload),
    });

    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    if (!response.ok) {
      return res.status(response.status).json(json || { error: text });
    }

    return res.status(response.status).json(json);
  } catch (error) {
    console.error('Error sending request to DOKU:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

