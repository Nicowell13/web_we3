# [AUDIT] Pre-Production Verification: Reliability, Security, and Sustainability

## Objective
Standard pre-production audit and test suite verification before deploying to AWS / VPS infrastructure to ensure the system is resilient, secure, and sustainable on minimal hardware (1-2 vCPU, 1-2 GB RAM).

---

## 1. Reliability (Keandalan & Ketahanan Sistem)
- [ ] **Payment & Webhook Idempotency (DOKU)**:
  - Simulate double webhook delivery (must process once, no duplicate loyalty points or double state transitions).
  - Verify failed/cancelled webhook transitions do not advance to `SUCCESS`.
  - Verify paid amount mismatch rejection.
- [ ] **Supplier Resilience & Margin Defense (Digiflazz)**:
  - Verify supplier timeout/network drop retains `PROCESSING` status with `needsAdminAction = true` (no 500 crashes).
  - Verify negative margin defense: hold order if supplier base price rises above order ceiling, and enforce `max_price`.
  - Verify out-of-balance handling.
- [ ] **PLN Realtime Inquiry & Token Delivery**:
  - Verify 5-minute memory cache prevents supplier rate-limit exhaustion.
  - Verify 20-digit PLN token SN extraction (`XXXX-XXXX-XXXX-XXXX-XXXX`), customer name, power rating, and kWh display.

---

## 2. Security & Data Integrity
- [ ] **Webhook Signature Verification**:
  - Reject tampered or missing signatures on DOKU and Digiflazz endpoints with HTTP 401.
- [ ] **Zero-Secret Leakage**:
  - Audit client bundle build (`.next/static`) to ensure zero exposure of supplier keys, webhook secrets, and database credentials.
- [ ] **RBAC & Authorization Gate**:
  - Ensure administrative routes (`/api/v1/old-school/*`, `/api/v1/supplier/balance`, margin controls) strictly reject non-admin tokens with HTTP 403.
- [ ] **Pre-Checkout Inquiry PLN Guard**:
  - Verify DOKU invoice generation blocks unverified PLN customer numbers.
- [ ] **Input Sanitization**:
  - Validate customer numbers, server IDs, and voucher inputs against injection/malformed strings.

---

## 3. Sustainability & Resource Efficiency
- [ ] **Memory & CPU Profiling**:
  - Verify idle and runtime RAM usage of Bun backend (`:3001`) and Next.js frontend (`:3000`) stays under 400 MB.
  - Verify background schedulers (4-hour price sync, 1-hour status check, midnight sync) do not cause memory leaks.
- [ ] **Database Connection Pooling**:
  - Validate concurrency under multiple simultaneous checkout and status checks without connection pool exhaustion.
- [ ] **Log & Storage Hygiene**:
  - Verify audit trails, logs, and build artifacts are managed without unbounded disk growth.
