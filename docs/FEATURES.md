# Engagement & Queue-Reduction Features

Running catalog of features extending beyond the core order/wallet loop, categorized by architectural impact.

---

## Read-Only Additions (Additive Tables & Reads Only)

- **Item Ratings & Reviews**: Allows students to submit 1-to-5 star ratings on collected orders, aggregating scores on dishes without modifying any payment or order creation logic. *(Read-only addition)*
- **Reorder / "My Usual"**: Provides 1-tap cart prefill from previous orders with live stock/availability verification to alert students before checkout if any item is 86'd. *(Read-only addition)*
- **Loyalty Streak**: Tracks completed order milestones in a dedicated table, automatically unlocking free meal vouchers every 10th order via a post-collection trigger. *(Read-only addition)*
- **Referral Program**: Generates shareable student referral codes and credits both parties with bonus wallet balances upon the referred user's first collected order. *(Read-only addition)*
- **Group Ordering**: Allows multiple students to pool items under a shared group token code (`VBUY-XX`), enabling a single student to pay the aggregated amount while the kitchen receives a grouped prep ticket. *(Read-only addition)*
- **Visual Order Stepper & Smart Search**: Replaces static text with an animated milestone progression line (Placed → Preparing → Ready → Collected) and provides real-time search, veg/non-veg filters, and price/rating sorting. *(Read-only addition)*

---

## Modifies Existing Flow (Extends place_order)

- **Scheduled Pickup Slots**: Adds an optional `p_slot_id` parameter to `place_order_wallet()` to lock in a specific 15-minute pickup window with strict capacity caps, preventing kitchen bottlenecking during peak lunch rush. *(Modifies place_order)*
- **Coupons & Promo Codes**: Adds an optional `p_coupon_code` parameter to `place_order_wallet()` that validates discount criteria and deducts savings from the student's wallet debit while keeping shop payouts intact. *(Modifies place_order)*
