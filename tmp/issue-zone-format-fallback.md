## Problem
Game with zone_id need 2 customer_no formats across Digiflazz suppliers/sellers.

## Expected
Try format A first: user_id + zone_id (digabung). If supplier rejects due to format/customer number mismatch, retry format B with user and zone separated.

## Scope
- Game with zone_id only.
- Prioritize digabung.
- Fallback only on format-related supplier rejection, not on every failure.
- Keep existing transaction/supplier flow minimal.
