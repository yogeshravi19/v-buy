async (page) => {
  const browser = page.context().browser();
  const results = {
    step1_user_placed_order: false,
    step2_staff_received_realtime: false,
    step3_staff_advanced_to_preparing: false,
    step4_user_received_preparing_realtime: false,
    step5_staff_advanced_to_ready: false,
    step6_user_received_ready_realtime: false,
    step7_super_admin_verified: false,
    orderId: null,
    token: null,
    logs: []
  };

  function log(msg) {
    console.log(`[TEST] ${msg}`);
    results.logs.push(`${new Date().toISOString().split('T')[1]} - ${msg}`);
  }

  log('Starting Multi-Device Realtime Sync Test...');

  // Device A is the primary page (User / Student)
  const pageA = page;
  
  // Device B: Separate Context for Shop Staff (Tablet / POS)
  const contextB = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const pageB = await contextB.newPage();

  // Device C: Separate Context for Super Admin (Desktop)
  const contextC = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageC = await contextC.newPage();

  try {
    // 1. Device B (Staff) logs in and stays on Live Orders screen
    log('Context B: Navigating to Staff Login...');
    await pageB.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
    await pageB.waitForTimeout(1000);
    await pageB.getByRole('button', { name: 'Shop Staff (G1)' }).click();
    await pageB.waitForTimeout(1500);
    // Switch to Live Orders tab
    await pageB.getByRole('button', { name: /Live Orders/i }).first().click();
    await pageB.waitForTimeout(1000);
    log('Context B: Staff is live and listening on Live Orders queue.');

    // 2. Device C (Super Admin) logs in and opens Orders tab
    log('Context C: Navigating to Super Admin Login...');
    await pageC.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
    await pageC.waitForTimeout(1000);
    await pageC.getByRole('button', { name: /Super Admin/i }).click();
    await pageC.waitForTimeout(1500);
    await pageC.getByRole('button', { name: /Orders/i }).first().click();
    await pageC.waitForTimeout(1000);
    log('Context C: Super Admin is live and viewing Orders tab.');

    // 3. Device A (User) logs in, adds an item, and places an order
    log('Context A: Navigating to User...');
    await pageA.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
    await pageA.waitForTimeout(1000);
    const userLoginBtn = pageA.getByRole('button', { name: 'User' });
    if (await userLoginBtn.isVisible()) {
      await userLoginBtn.click();
      await pageA.waitForTimeout(1500);
    }

    // Go to Home if needed
    const homeBtn = pageA.getByRole('button', { name: /Home/i }).first();
    if (await homeBtn.isVisible()) {
      await homeBtn.click();
      await pageA.waitForTimeout(500);
    }

    // Add item from Gazebo C1
    log('Context A: Adding item to cart...');
    const addBtn = pageA.getByRole('button', { name: '+ ADD' }).first();
    await addBtn.click();
    await pageA.waitForTimeout(500);

    // Go to Cart
    log('Context A: Opening Cart...');
    await pageA.getByRole('button', { name: /Cart/i }).first().click();
    await pageA.waitForTimeout(1000);

    // Click Pay from Wallet
    log('Context A: Placing order via Wallet...');
    const payBtn = pageA.getByRole('button', { name: /Pay ₹.*from Wallet/i }).first();
    await payBtn.click();
    await pageA.waitForTimeout(2000);

    // Click Orders tab to see active orders tracker
    const ordersTabBtn = pageA.getByRole('button', { name: /Orders/i }).first();
    if (await ordersTabBtn.isVisible()) {
      await ordersTabBtn.click();
      await pageA.waitForTimeout(1000);
    }

    // Extract Order # and Token # from Context A
    const bodyTextA = await pageA.textContent('body');
    const orderMatch = bodyTextA.match(/ORDER #(\d+)/i);
    const tokenMatch = bodyTextA.match(/TOKEN #(\d+)/i);
    results.orderId = orderMatch ? orderMatch[1] : null;
    results.token = tokenMatch ? tokenMatch[1] : null;
    log(`Context A: Order placed successfully! Detected Order #${results.orderId}, Token #${results.token}`);
    results.step1_user_placed_order = !!results.orderId;

    // 4. Verify Context B (Staff) receives the order via Realtime WITHOUT manual refresh
    log('Context B: Waiting for order to appear in Staff Live Orders queue via Supabase Realtime (no refresh)...');
    let orderAppearedInStaff = false;
    const startWaitStaff = Date.now();
    
    while (Date.now() - startWaitStaff < 15000) {
      const staffBody = await pageB.textContent('body');
      if (results.orderId && staffBody.includes(`#${results.orderId}`)) {
        orderAppearedInStaff = true;
        break;
      }
      if (results.token && staffBody.includes(`${results.token}`)) {
        orderAppearedInStaff = true;
        break;
      }
      await pageB.waitForTimeout(1000);
    }

    if (orderAppearedInStaff) {
      log(`Context B: PASS! Order #${results.orderId} (Token #${results.token}) appeared live in Staff queue within ${((Date.now() - startWaitStaff) / 1000).toFixed(1)}s!`);
      results.step2_staff_received_realtime = true;
    } else {
      log(`Context B: FAIL - Order #${results.orderId} did not appear in Staff queue within 15s`);
      results.step2_staff_received_realtime = false;
    }

    // 5. Context B (Staff): Click "Start Prep" to advance to 'preparing'
    log('Context B: Staff clicks "Start Prep"...');
    const startPrepBtn = pageB.getByRole('button', { name: 'Start Prep' }).first();
    if (await startPrepBtn.isVisible()) {
      await startPrepBtn.click();
      await pageB.waitForTimeout(1500);
      results.step3_staff_advanced_to_preparing = true;
      log('Context B: Staff advanced order to "preparing".');
    } else {
      log('Context B: Start Prep button not visible');
    }

    // 6. Verify Context A (User) reflects "PREPARING" / "In Kitchen" live WITHOUT manual refresh
    log('Context A: Waiting for User screen to update to "PREPARING" via Realtime (no refresh)...');
    let userSawPreparing = false;
    const startWaitUserPrep = Date.now();

    while (Date.now() - startWaitUserPrep < 15000) {
      const userText = await pageA.textContent('body');
      if (userText.includes('PREPARING') || userText.includes('In Kitchen') || userText.includes('Cooking')) {
        userSawPreparing = true;
        break;
      }
      await pageA.waitForTimeout(1000);
    }

    if (userSawPreparing) {
      log(`Context A: PASS! User order tracking updated to PREPARING live within ${((Date.now() - startWaitUserPrep) / 1000).toFixed(1)}s!`);
      results.step4_user_received_preparing_realtime = true;
    } else {
      log('Context A: FAIL - User screen did not reflect PREPARING within 15s');
      results.step4_user_received_preparing_realtime = false;
    }

    // 7. Context B (Staff): Advance from 'preparing' to 'ready'
    log('Context B: Staff clicks "Mark Ready"...');
    let readyClicked = false;
    const markReadyBtn = pageB.getByRole('button', { name: /Mark Ready/i }).first();
    if (await markReadyBtn.isVisible()) {
      await markReadyBtn.click();
      readyClicked = true;
    } else {
      // Check Preparing filter tab in Staff dashboard
      const prepFilterBtn = pageB.getByRole('button', { name: /Preparing/i }).first();
      if (await prepFilterBtn.isVisible()) {
        await prepFilterBtn.click();
        await pageB.waitForTimeout(1000);
        const readyBtn = pageB.getByRole('button', { name: /Mark Ready/i }).first();
        if (await readyBtn.isVisible()) {
          await readyBtn.click();
          readyClicked = true;
        }
      }
    }

    if (readyClicked) {
      await pageB.waitForTimeout(1500);
      results.step5_staff_advanced_to_ready = true;
      log('Context B: Staff advanced order to "ready".');
    } else {
      log('Context B: Could not find Mark Ready button');
    }

    // 8. Verify Context A (User) reflects "READY" / "Counter Ready" live WITHOUT manual refresh
    log('Context A: Waiting for User screen to update to "READY" via Realtime (no refresh)...');
    let userSawReady = false;
    const startWaitUserReady = Date.now();

    while (Date.now() - startWaitUserReady < 15000) {
      const userText = await pageA.textContent('body');
      if (userText.includes('READY') || userText.includes('Counter Ready') || userText.includes('Pickup Now')) {
        userSawReady = true;
        break;
      }
      await pageA.waitForTimeout(1000);
    }

    if (userSawReady) {
      log(`Context A: PASS! User order tracking updated to READY live within ${((Date.now() - startWaitUserReady) / 1000).toFixed(1)}s!`);
      results.step6_user_received_ready_realtime = true;
    } else {
      log('Context A: FAIL - User screen did not reflect READY within 15s');
      results.step6_user_received_ready_realtime = false;
    }

    // 9. Verify Context C (Super Admin) sees the order
    log('Context C: Verifying order visibility in Super Admin...');
    const adminText = await pageC.textContent('body');
    if (results.orderId && (adminText.includes(`#${results.orderId}`) || adminText.includes(`${results.token}`))) {
      results.step7_super_admin_verified = true;
      log(`Context C: PASS! Order #${results.orderId} is visible in Super Admin cross-outlet queue.`);
    } else {
      log(`Context C: Super Admin check result: ${adminText.includes(String(results.orderId))}`);
      results.step7_super_admin_verified = adminText.includes(String(results.orderId));
    }

  } catch (err) {
    log(`ERROR: ${err.message}\n${err.stack}`);
  } finally {
    await contextB.close();
    await contextC.close();
  }

  return results;
}
