import { Elysia, t } from 'elysia';
import { authenticate } from '../../middleware/auth';
import { createDokuPaymentLink } from '../../integrations/doku/client';
import { handleDokuWebhook, DokuWebhookPayload } from '../../integrations/doku/webhook';
import { verifyDokuWebhook } from '../../integrations/doku/client';
import { db } from '../../db';
import { transactions, products } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

function generateOrderId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `WETRI-${date}-${nanoid(8).toUpperCase()}`;
}

/**
 * DOKU payment routes:
 *   POST /api/v1/payment/create-link   — create payment link (auth required)
 *   POST /api/v1/payment/webhook       — DOKU webhook callback (public, signature-verified)
 *   GET  /api/v1/payment/:orderId      — get transaction status (auth required)
 */
export const paymentRoutes = new Elysia({ prefix: '/api/v1/payment' })

  // ── Create payment link (authenticated user) ─────────────────────────────
  .use(authenticate)
  .post(
    '/create-link',
    async ({ user, body }) => {
      const { productId, targetUserId, targetServerId, customerEmail, customerPhone, voucherCode } =
        body as {
          productId:      string;
          targetUserId:   string;
          targetServerId?: string;
          customerEmail:  string;
          customerPhone?: string;
          voucherCode?:   string;
        };

      // Load product
      const product = await db.query.products.findFirst({
        where: eq(products.id, productId),
      });
      if (!product || !product.isActive) {
        return new Response(JSON.stringify({ message: 'Product not found or inactive' }), { status: 404 });
      }

      const amount      = Math.round(Number(product.sellPrice));
      const orderId     = generateOrderId();
      const description = `${product.denomination} (${product.gameId})`;

      // Insert transaction in PENDING state
      await db.insert(transactions).values({
        orderId,
        userId:          user.uid,
        productId:       product.id,
        targetUserId,
        targetServerId:  targetServerId ?? null,
        customerEmail,
        customerPhone:   customerPhone ?? null,
        amount:          String(amount),
        originalAmount:  String(amount),
        discountAmount:  '0',
        voucherCode:     voucherCode ?? null,
        status:          'PENDING',
      });

      // Create DOKU payment link
      const link = await createDokuPaymentLink({
        orderId,
        amount,
        customerName:  user.name ?? user.email ?? 'Customer',
        customerEmail,
        description,
        expiryMinutes: 60,
      });

      // Store payment reference
      await db
        .update(transactions)
        .set({ paymentInvoiceUrl: link.invoiceUrl, paymentReference: link.paymentReference })
        .where(eq(transactions.orderId, orderId));

      return {
        ok:          true,
        orderId,
        invoiceUrl:  link.invoiceUrl,
        expiresAt:   link.expiresAt,
        amount,
      };
    }
  )

  // ── DOKU Webhook (no auth — signature verified) ───────────────────────────
  // Note: mounted without authenticate so public
  ;

export const webhookRoutes = new Elysia({ prefix: '/api/v1/payment' })
  .post(
    '/webhook',
    async ({ request, body }) => {
      const rawBody          = JSON.stringify(body);
      const requestId        = request.headers.get('Request-Id')        ?? '';
      const requestTimestamp = request.headers.get('Request-Timestamp') ?? '';
      const signature        = request.headers.get('Signature')         ?? '';
      const ip               = request.headers.get('x-forwarded-for')  ?? undefined;

      // Signature verification
      const valid = verifyDokuWebhook(
        '/api/v1/payment/webhook',
        rawBody,
        requestId,
        requestTimestamp,
        signature
      );
      if (!valid) {
        return new Response(JSON.stringify({ message: 'Invalid signature' }), { status: 401 });
      }

      const result = await handleDokuWebhook(body as DokuWebhookPayload, rawBody, ip);
      return { ok: true, ...result };
    }
  );
