# School / Community Beta Plan

Goal: validate reliable top-up, trust, and repeat purchase before growth work.

## Launch gates

Do not accept real customer money until:

- latest database migrations are applied;
- DOKU sandbox success, failure, duplicate webhook, and amount mismatch are verified;
- Digiflazz success, pending, failure, timeout, insufficient balance, and reconciliation are verified;
- admin can see stale PENDING, PAID, and PROCESSING orders;
- one operator owns payment/supplier reconciliation during beta;
- support channel and refund/manual-resolution procedure are ready;
- `bun test` and `bun run build` pass on release commit.

Stop beta immediately when any paid order is missing, fulfilled twice, priced incorrectly, or cannot be reconciled.

## Stage 1 — Controlled 10–20 transactions

Participants: owner/team and trusted testers. Use low-value products.

Test matrix:

- successful payment and fulfillment;
- failed/expired payment;
- repeated checkout submit;
- duplicate DOKU webhook;
- supplier pending then reconciliation;
- supplier failure/insufficient balance;
- voucher claim/use;
- points and referral reward once only.

Record per order:

- order ID and timestamps;
- product category and sell amount;
- payment final status;
- supplier final status;
- manual intervention required: yes/no;
- completion duration;
- support issue category;
- expected and actual gross profit.

Pass criteria:

- 100% paid orders reconciled;
- zero duplicate fulfillment;
- zero incorrect amount;
- zero duplicate points/referral reward;
- at least 95% successful orders complete without manual intervention;
- gross profit is non-negative after loyalty/referral cost.

## Stage 2 — 30 real customers

Participants: one school/community cohort. No paid acquisition.

Offer: convenience, trusted support, transparent status. Avoid lowest-price positioning.

Measure:

- unique successful customers;
- payment-to-success conversion;
- median fulfillment time;
- pending/failed rate;
- support contacts per 100 orders;
- gross profit per successful order;
- loyalty plus referral cost as percentage of GMV;
- customer acquisition source.

Pass criteria:

- 30 unique successful customers;
- success rate at least 95%;
- all paid orders reconciled within 24 hours;
- reward cost no more than 2% GMV;
- no unresolved P0/P1 money-flow incident.

## Stage 3 — Repeat-purchase validation

Observation window: 30 days after each customer's first successful order.

Primary metric:

```text
30-day repeat rate = customers with 2+ SUCCESS orders / customers eligible for 30-day observation
```

Secondary metrics:

- average successful orders per customer;
- GMV and gross profit per customer;
- organic referral conversion;
- voucher redemption and incremental repeat purchase;
- support issue recurrence.

Decision rule:

- continue: reliability gates hold and repeat rate reaches agreed target;
- iterate: reliability holds but repeat rate is weak—interview users before changing rewards;
- stop: paid-order reconciliation, unit economics, or trust fails.

## Customer questions

Ask after completed order:

1. What made you choose this service today?
2. Was product selection and account-ID entry clear?
3. Did payment and delivery status feel trustworthy?
4. How does this compare with your usual top-up method?
5. What would stop you from using it again?
6. Would faster support, points, referral reward, or lower price matter most?
7. Would you recommend it to a friend? Why?

Do not collect passwords, payment credentials, supplier details, or unnecessary personal data.

## Operator checklist

Daily during beta:

- review stale payment reconciliation list;
- reconcile PAID/PROCESSING supplier orders;
- compare SUCCESS GMV, supplier cost, gross profit, and reward cost;
- inspect failed orders and support reports;
- record incident owner and resolution.

Weekly:

- review cohort metrics;
- sample-check points/referral ledger;
- summarize interviews;
- decide continue, iterate, or stop.

## Scope guard

No new growth feature, paid promotion, or reward increase until Stage 1 passes. Referral reward remains fixed and reward cost must stay within 2% GMV unless owner explicitly approves a measured experiment.
