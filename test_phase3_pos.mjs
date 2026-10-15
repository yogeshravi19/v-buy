import { executeSql } from './run_mcp_sql.mjs';

function parseMcpResult(res) {
  const text = res?.result?.content?.[0]?.text;
  if (!text) return null;
  try {
    const outer = JSON.parse(text);
    const contentStr = outer.result || text;
    const match = contentStr.match(/(\[\s*\{[\s\S]*\}\s*\]|\[\s*\])/);
    if (match && match[1]) {
      return JSON.parse(match[1].trim());
    }
  } catch (e) {
    console.warn('Parse error:', e.message);
  }
  return text;
}

async function main() {
  const q = async (sql) => {
    const res = await executeSql(sql);
    return parseMcpResult(res);
  };

  console.log('--- PHASE 3 POS & COUNTER BILLING AUTOMATED TESTS ---');

  // 1. Create a QA menu item
  await q("DELETE FROM menu_items WHERE name LIKE 'QA POS%';");
  const items = await q(`
    INSERT INTO menu_items (outlet_id, name, price, available, is_veg, category, stock_qty)
    VALUES ('g1', 'QA POS Veg Roll', 40, true, true, 'snacks', 25)
    RETURNING id, outlet_id, name, price, stock_qty;
  `);
  console.log('1. Created QA POS item:', items);
  const testItem = items[0];
  const itemId = testItem.id;
  const initialStock = testItem.stock_qty;

  // 2. Call create_pos_order via SQL
  const idempotencyKey = `pos_test_${Date.now()}`;
  console.log('2. Calling create_pos_order function...');
  const orderResult = await q(`
    SELECT * FROM create_pos_order(
      p_outlet_id := 'g1',
      p_items := '[{"item_id": ${itemId}, "qty": 2, "notes": "No onion"}]'::jsonb,
      p_payment_mode := 'CASH',
      p_payment_note := 'Received 100, returned 20',
      p_notes := 'Counter express sale',
      p_customer_name := 'QA POS Student',
      p_is_quick_sale := false,
      p_idempotency_key := '${idempotencyKey}'
    );
  `);
  console.log('Order created result:', orderResult);
  const resObj = orderResult[0].create_pos_order || orderResult[0];
  const orderId = resObj.order_id;
  const orderNumber = resObj.order_number;

  // 3. Inspect order row in DB
  const orderRows = await q(`
    SELECT id, order_number, token, order_source, payment_mode, payment_note, total, user_id, status
    FROM orders
    WHERE id = ${orderId};
  `);
  const orderRow = orderRows[0];
  console.log('3. Verified order row in database:', orderRow);
  if (orderRow.order_source !== 'POS' || orderRow.payment_mode !== 'CASH' || Number(orderRow.total) !== 80) {
    throw new Error('Order row properties do not match expected POS values!');
  }

  // 4. Verify stock adjustment
  const itemAfter = await q(`
    SELECT id, stock_qty FROM menu_items WHERE id = ${itemId};
  `);
  console.log(`4. Stock after POS order: ${itemAfter[0].stock_qty} (Expected: ${initialStock - 2})`);
  if (itemAfter[0].stock_qty !== initialStock - 2) {
    throw new Error('Stock was not properly decremented by 2!');
  }

  const stockAdj = await q(`
    SELECT * FROM stock_adjustments WHERE item_id = ${itemId} ORDER BY id DESC LIMIT 1;
  `);
  console.log('Stock adjustment row:', stockAdj[0]);
  if (stockAdj[0].source !== 'pos' || stockAdj[0].qty_change !== -2) {
    throw new Error('Stock adjustment source should be "pos" and qty_change should be -2!');
  }

  // 5. Verify NO payment_splits exist for this order
  const splits = await q(`
    SELECT * FROM payment_splits WHERE order_id = ${orderId};
  `);
  console.log(`5. Payment splits for POS order:`, splits);
  if (Array.isArray(splits) && splits.length > 0) {
    throw new Error('POS order must never create payment_splits!');
  }
  console.log('Confirmed: 0 payment_splits created for POS order.');

  // 6. Test Idempotency: call again with same idempotency key
  console.log('6. Testing idempotency...');
  const dupResult = await q(`
    SELECT * FROM create_pos_order(
      p_outlet_id := 'g1',
      p_items := '[{"item_id": ${itemId}, "qty": 2}]'::jsonb,
      p_payment_mode := 'CASH',
      p_idempotency_key := '${idempotencyKey}'
    );
  `);
  const dupObj = dupResult[0].create_pos_order || dupResult[0];
  console.log('Idempotent re-call result:', dupObj);
  if (dupObj.order_id !== orderId) {
    throw new Error('Idempotency failed: generated new order instead of returning existing order!');
  }

  // Check stock did not decrement again
  const itemAfterDup = await q(`
    SELECT id, stock_qty FROM menu_items WHERE id = ${itemId};
  `);
  if (itemAfterDup[0].stock_qty !== initialStock - 2) {
    throw new Error('Idempotency failed: stock was decremented a second time!');
  }
  console.log('Idempotency confirmed: stock unchanged on duplicate punch.');

  // 7. Test void_pos_order
  console.log('7. Testing void_pos_order...');
  const voidResult = await q(`
    SELECT * FROM void_pos_order(
      p_order_id := ${orderId},
      p_reason := 'QA customer changed mind before cooking'
    );
  `);
  const voidObj = voidResult[0].void_pos_order || voidResult[0];
  console.log('Void result:', voidObj);

  // Check order status is cancelled
  const orderVoided = await q(`
    SELECT id, status FROM orders WHERE id = ${orderId};
  `);
  console.log('Order status after void:', orderVoided[0].status);
  if (orderVoided[0].status !== 'cancelled') {
    throw new Error('Order status should be cancelled!');
  }

  // Check stock restored
  const itemRestored = await q(`
    SELECT id, stock_qty FROM menu_items WHERE id = ${itemId};
  `);
  console.log(`Stock after void restoration: ${itemRestored[0].stock_qty} (Expected: ${initialStock})`);
  if (itemRestored[0].stock_qty !== initialStock) {
    throw new Error('Stock was not restored to initial level upon void!');
  }

  // 8. Clean up QA item and test order
  console.log('8. Cleaning up QA records...');
  await q(`DELETE FROM order_items WHERE order_id = ${orderId};`);
  await q(`DELETE FROM stock_adjustments WHERE item_id = ${itemId};`);
  await q(`DELETE FROM orders WHERE id = ${orderId};`);
  await q(`DELETE FROM menu_items WHERE id = ${itemId};`);

  console.log('>>> ALL PHASE 3 POS TESTS PASSED WITH 100% SUCCESS <<<');
}

main().catch(e => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
