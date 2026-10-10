# Start Here: The V FOODS Learning Path

Welcome to V FOODS! This folder is organized as a step-by-step learning guide for anyone completely new to this project. By reading these short guides in order, you will understand how the entire system works from top to bottom, even if you have zero technical background.

V FOODS is a campus food pre-ordering and digital wallet app built specifically for college canteens and food stalls. It is strictly pickup-only (no food delivery drivers), operates primarily on a prepaid digital campus wallet, and serves four distinct types of users: students ordering meals, kitchen cooks preparing food, canteen owners running stalls, and university administrators overseeing campus dining.

> **Reading Note**: Read these guides in order from 01 to 10. Each document builds on the previous one.
> 
> **Looking for the single consolidated master document?**
> - **[V_BUY_MASTER_COMPREHENSIVE_DOCUMENTATION.pdf](V_BUY_MASTER_COMPREHENSIVE_DOCUMENTATION.pdf)** ([Markdown](V_BUY_MASTER_COMPREHENSIVE_DOCUMENTATION.md)): **The Complete 23-Page Single Source of Truth Master Document** consolidating every topic, the 7% pricing formula, all technical comparisons, database schemas, and the full setup/LLP compliance guide.
> - **[PRESENTATION_DECK.pdf](PRESENTATION_DECK.pdf)** ([Markdown](PRESENTATION_DECK.md)): Master Slide Deck & Pitch Presentation explaining the complete idea from start to finish.
> - **[PITCH_DECK.pdf](PITCH_DECK.pdf)** ([Markdown](PITCH_DECK.md)): Executive investor pitch deck.
> - **[V_FOODS_COMPLETE_SYSTEM_GUIDE.pdf](V_FOODS_COMPLETE_SYSTEM_GUIDE.pdf)**: Complete system guide with architecture diagrams.


---

## The Reading Order

Every document is available as both Markdown (`.md`) and a standalone printable PDF (`.pdf`) in this folder:

1. **[01-what-is-vfoods.md](01-what-is-vfoods.md)** ([PDF](01-what-is-vfoods.pdf)): The core idea of V FOODS, the campus problem it solves, and why it is built differently from commercial delivery apps.
2. **[02-the-four-roles.md](02-the-four-roles.md)** ([PDF](02-the-four-roles.pdf)): Who uses the system (Students, Kitchen Staff, Canteen Owners, Super Admins) and what each role can see and do.
3. **[03-how-an-order-works.md](03-how-an-order-works.md)** ([PDF](03-how-an-order-works.pdf)): The complete lifecycle of an order from adding items to kitchen preparation and QR-verified counter pickup.
4. **[04-the-database.md](04-the-database.md)** ([PDF](04-the-database.pdf)): What information the database stores, how stalls are connected, and how built-in security rules keep data safe.
5. **[05-tools-used.md](05-tools-used.md)** ([PDF](05-tools-used.pdf)): The software, services, and tools powering the application, explained in plain English without jargon.
6. **[06-features.md](06-features.md)** ([PDF](06-features.pdf)): A catalog of all active features (reordering, ratings, group carts, scheduled slots, coupons) and retired experiments.
7. **[07-payments-paytm.md](07-payments-paytm.md)** ([PDF](07-payments-paytm.pdf)): A deep dive into the dual payment model (top-up vs direct pay), how Paytm handles confirmations via HMAC-signed webhooks, and the automated three-way split.
8. **[08-running-it-locally.md](08-running-it-locally.md)** ([PDF](08-running-it-locally.pdf)): A practical guide for developers wanting to start the frontend and backend on their local machine.
9. **[09-high-traffic-and-caching.md](09-high-traffic-and-caching.md)** ([PDF](09-high-traffic-and-caching.pdf)): How V FOODS handles 1,000+ students simultaneously (TanStack Query, Stale-While-Revalidate caching, in-memory catalog cache, zero-gateway wallet RPCs).
10. **[10-ui-ux-design-system.md](10-ui-ux-design-system.md)** ([PDF](10-ui-ux-design-system.pdf)): Catalog of UI polish features (Skeleton shimmer screens, Spotlight Search `⌘K`, Live Order Tracker, Mobile Bottom Sheets, Web Haptics, and KDS ticket aging).
11. **[PRESENTATION_DECK.md](PRESENTATION_DECK.md)** ([PDF](PRESENTATION_DECK.pdf)): Complete slide-by-slide master presentation covering business model, technical stack comparisons, and startup registration (LLP vs Pvt Ltd).
12. **[DATABASE.md](DATABASE.md)**: Exhaustive technical database specification with complete SQL schemas, RLS policies, trigger invariants, and forensic audit tables.


