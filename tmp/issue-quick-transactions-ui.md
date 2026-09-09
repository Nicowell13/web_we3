## Problem
Quick Transactions UI still makes users scroll after entering target number/customer ID and selecting a product.

## Expected
1. After target input is valid and a product/package is selected, the buyer/checkout button appears above the product grid, directly below the ID dialog/input area.
2. PLN checkout button should only activate after PLN customer inquiry succeeds and customer name is confirmed.
3. Mobile product cards should consistently render as 2 columns, not 1 column, across categories.

## Scope
- Keep existing checkout/DOKU flow.
- Minimal UI-only change in `QuickOrderWidget`.
- Test/build before deploy.
