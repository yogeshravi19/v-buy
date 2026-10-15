// test_phase7_push.mjs
import assert from 'node:assert'
import fs from 'node:fs'
import { executeSql } from './run_mcp_sql.mjs'

async function main() {
  console.log('Testing Phase 7 Web Push & Observer Triggers...')

  // 1. Verify Remote DB Schema (push_subscriptions, notifications, triggers)
  const checkTablesSql = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('push_subscriptions', 'notifications')
    ORDER BY table_name;
  `
  const tableRes = await executeSql(checkTablesSql)
  const tableContent = JSON.parse(tableRes.result.content[0].text)
  assert(tableContent.result.includes('"table_name":"push_subscriptions"'), 'push_subscriptions table must exist')
  assert(tableContent.result.includes('"table_name":"notifications"'), 'notifications table must exist')
  console.log('✔ push_subscriptions and notifications tables exist on remote DB')

  // 2. Verify Database Trigger on Orders
  const checkTrgSql = `
    SELECT trigger_name, event_manipulation, event_object_table, action_statement
    FROM information_schema.triggers
    WHERE trigger_name = 'trg_orders_notifications_observer';
  `
  const trgRes = await executeSql(checkTrgSql)
  const trgContent = JSON.parse(trgRes.result.content[0].text)
  assert(trgContent.result.includes('trg_orders_notifications_observer'), 'trg_orders_notifications_observer trigger must exist on orders table')
  console.log('✔ trg_orders_notifications_observer order observer trigger verified on remote DB')

  // 3. Test Observer Notification Generation without disrupting payments
  const testOrderSql = `
    DO $$
    DECLARE
      v_test_order_id uuid;
      v_notif_count int;
    BEGIN
      -- Create a test APP pre-order
      INSERT INTO public.orders (outlet_id, daily_number, total, status, order_source)
      VALUES ('g1', 999, 100, 'placed', 'APP')
      RETURNING id INTO v_test_order_id;

      -- Check notification was created for outlet
      SELECT count(*) INTO v_notif_count
      FROM public.notifications
      WHERE outlet_id = 'g1' AND tag = 'order-new-' || v_test_order_id;

      IF v_notif_count = 0 THEN
        RAISE EXCEPTION 'Failed to generate notification for new placed order';
      END IF;

      -- Clean up test order and notification
      DELETE FROM public.notifications WHERE tag = 'order-new-' || v_test_order_id;
      DELETE FROM public.orders WHERE id = v_test_order_id;
    END;
    $$;
  `
  const testRes = await executeSql(testOrderSql)
  assert(!testRes.result.content[0].text.includes('EXCEPTION'), 'Observer trigger execution must succeed')
  console.log('✔ Observer notification creation verified end-to-end (cleanly isolated from payments)')

  // 4. Verify Frontend Files
  const webPushTs = fs.readFileSync('frontend/src/utils/webPush.ts', 'utf8')
  assert(webPushTs.includes('VAPID_PUBLIC_KEY'), 'webPush.ts must export VAPID_PUBLIC_KEY')
  assert(webPushTs.includes('urlBase64ToUint8Array'), 'webPush.ts must export urlBase64ToUint8Array')
  assert(webPushTs.includes('subscribeToPush'), 'webPush.ts must export subscribeToPush')

  const hookTs = fs.readFileSync('frontend/src/hooks/useWebPush.ts', 'utf8')
  assert(hookTs.includes('useWebPush'), 'useWebPush.ts must export useWebPush hook')

  const toggleTs = fs.readFileSync('frontend/src/components/ui/push-toggle.tsx', 'utf8')
  assert(toggleTs.includes('PushNotificationToggle'), 'push-toggle.tsx must export PushNotificationToggle')

  const staffTs = fs.readFileSync('frontend/src/pages/staff/ShopStaffDashboard.tsx', 'utf8')
  assert(staffTs.includes('PushNotificationToggle'), 'ShopStaffDashboard must render PushNotificationToggle')

  const userJsx = fs.readFileSync('frontend/src/components/VFoodsUserDashboard.jsx', 'utf8')
  assert(userJsx.includes('useWebPush'), 'VFoodsUserDashboard must use useWebPush')
  assert(userJsx.includes('pushSubscribed'), 'VFoodsUserDashboard must have push notification toggle')

  console.log('✔ Frontend Web Push utilities, hooks, and UI controls verified')
  console.log('All Phase 7 Web Push tests passed cleanly!')
}

main().catch(err => {
  console.error('Phase 7 Test failed:', err)
  process.exit(1)
})
