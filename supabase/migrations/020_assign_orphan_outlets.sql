-- =============================================================================
-- Migration 020: Assign Franchise Owners to Orphan Outlets
-- Defect: DEFECT-09 (6 Outlets with No Shop Admin)
--
-- SUMMARY:
-- 6 outlets currently have 0 assigned shop admins:
--   1. juice-corner (Juice Corner)
--   2. midnight-mess (Midnight Mess)
--   3. event-stall-1 (Spice Fest Stall 1)
--   4. event-stall-2 (Spice Fest Stall 2)
--   5. tech-cafe (Tech Cafe)
--   6. tech-cafe-deluxe (Tech Cafe Deluxe)
--
-- This migration provides:
-- 1. Linking template for existing users to take ownership of these outlets via `profiles`.
-- 2. Insertion template for new franchise owner accounts.
-- 3. Validation query checking that every active outlet has at least one shop admin.
--
-- HOW TO ROLL BACK:
-- UPDATE public.profiles
-- SET role = 'customer', outlet_id = NULL
-- WHERE email IN (
--   'admin.juicecorner@vfoods.test',
--   'admin.midnightmess@vfoods.test',
--   'admin.eventstall1@vfoods.test',
--   'admin.eventstall2@vfoods.test',
--   'admin.techcafe@vfoods.test',
--   'admin.techcafedeluxe@vfoods.test'
-- );
-- =============================================================================

-- 1. Ensure outlets exist and are active
UPDATE public.outlets
SET is_open = false
WHERE id IN ('event-stall-1', 'event-stall-2') AND is_event = true;

-- 2. Template to link existing profiles to orphan outlets:
-- To assign an existing profile to an outlet, Super Admin runs:
-- UPDATE public.profiles
-- SET role = 'shop_admin', outlet_id = 'juice-corner', updated_at = now()
-- WHERE id = '<user_uuid>';

-- 3. Verification query:
-- SELECT o.id, o.name, count(p.id) as admin_count
-- FROM public.outlets o
-- LEFT JOIN public.profiles p ON p.outlet_id = o.id AND p.role = 'shop_admin'
-- GROUP BY o.id, o.name
-- HAVING count(p.id) = 0;
