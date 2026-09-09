### Title: [FEAT-31] Secure Realtime Public PLN Inquiry via Admin Credentials & Server-Side Pre-Checkout Verification

### Description
#### Objective
Allow unauthenticated guest users on the homepage to safely check PLN Customer IDs in realtime without exposing server Digiflazz credentials to client browsers. Upon successful inquiry verification and user checkout/payment via DOKU, ensure fulfillment executes via authoritative admin supplier credentials with the user's targeted PLN Customer Number.

#### Scope of Work
1. **Public PLN Inquiry Endpoint**:
   - `POST /api/v1/supplier/inquire-pln` accepts `{ customerNo }` from guests.
   - Authoritative server backend retrieves `DIGIFLAZZ_USERNAME` and `DIGIFLAZZ_API_KEY` to construct MD5 signature `md5(username + apiKey + customerNo)`.
   - Call Digiflazz `/inquiry-pln` and return masked customer name (`BU***SO`), meter info, and subscriber ID.
   - Reject invalid/unregistered numbers with localized clear error message.
2. **Frontend Guest Inquiry UX**:
   - Debounced realtime input on Homepage QuickOrder widget (PLN tab).
   - Display masked name and power tariff snapshot upon successful match.
   - Lock/disable the "Beli Sekarang / Checkout" button when customer ID is invalid or unregistered.
3. **Server-Side Pre-Checkout Guard**:
   - Prior to initiating DOKU payment invoice or order creation, verify PLN customer number server-side.
   - Reject checkout creation if customer number is invalid.
4. **Fulfillment & Security**:
   - Keep supplier API credentials exclusively in server runtime.
   - DOKU transactions bound to authenticated user identity; Digiflazz fulfillment dispatched with store supplier credentials.
   - In-memory short cache (5 mins) for inquiry results to avoid rate-limiting.
5. **Testing & Integrity**:
   - Unit & integration tests for inquiry endpoint, signature validation, guest access, error responses, and mock fulfillment.
   - All `bun test` passes.
