async (page) => {
  const browser = page.context().browser();
  const results = {
    test1_manual_signup_and_dual_login: false,
    test2_google_signup_mandatory_profile_completion: false,
    test3_google_returning_bypasses_profile_completion: false,
    test4_google_account_dual_login_via_mobile_and_password: false,
    test5_duplicate_mobile_rejected: false,
    test6_wrong_password_shows_generic_error: false,
    test7_forgot_password_neutral_confirmation: false,
    logs: []
  };

  function log(msg) {
    console.log(`[AUTH-TEST] ${msg}`);
    results.logs.push(`${new Date().toISOString().split('T')[1]} - ${msg}`);
  }

  log('Starting Comprehensive V Foods Combined Auth System Verification...');

  // Setup unique test data for this run
  const runId = Date.now().toString().slice(-6);
  const test1User = {
    name: `Ananya Sharma ${runId}`,
    email: `ananya.${runId}@vitstudent.ac.in`,
    mobile: `98${runId}12`, // 10 digits
    password: `TestPassword@${runId}`
  };

  const test2GoogleUser = {
    email: `google.user.${runId}@vitstudent.ac.in`,
    name: `Vikram Google ${runId}`,
    mobile: `97${runId}34`, // 10 digits
    password: `GooglePass@${runId}`
  };

  // Helper function to log out and guarantee fresh login screen
  async function performLogout(pg) {
    await pg.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await pg.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
    await pg.reload({ waitUntil: 'domcontentloaded' });
    await pg.waitForTimeout(1000);
  }

  try {
    // ═════════════════════════════════════════════════════════════════════════
    // TEST 1: MANUAL SIGNUP & DUAL LOGIN (EMAIL + PASSWORD & MOBILE + PASSWORD)
    // ═════════════════════════════════════════════════════════════════════════
    log('--- TEST 1: Manual Signup (Path A) & Dual Login ---');
    await performLogout(page);

    // Switch to Register New Account
    const registerLink = page.getByRole('link', { name: /Register New Account/i });
    await registerLink.waitFor({ state: 'visible', timeout: 10000 });
    await registerLink.click();
    await page.waitForTimeout(600);

    // Fill signup form
    log(`Filling signup: Name="${test1User.name}", Email="${test1User.email}", Mobile="${test1User.mobile}"`);
    await page.locator('#signup-name').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#signup-name').fill(test1User.name);
    await page.locator('#signup-email').fill(test1User.email);
    await page.locator('#signup-mobile').fill(test1User.mobile);
    await page.locator('#signup-password').fill(test1User.password);
    await page.locator('#signup-confirm-password').fill(test1User.password);

    await page.locator('#btn-sign-up').click();
    await page.waitForTimeout(2500);

    // Verify user reached the dashboard
    let bodyText = await page.textContent('body');
    const signedUpReachedDashboard = bodyText.includes('Campus Food Courts') || bodyText.includes('Pre-Order Cart') || bodyText.includes('Browse Outlets');
    log(`Manual signup dashboard reached: ${signedUpReachedDashboard}`);

    if (signedUpReachedDashboard) {
      // 1b. Log out
      log('Logging out of manual account...');
      await performLogout(page);

      // 1c. Log back in using EMAIL + PASSWORD
      log(`Logging in via EMAIL: ${test1User.email}...`);
      await page.locator('#login-identifier').fill(test1User.email);
      await page.locator('#login-password').fill(test1User.password);
      await page.locator('#btn-sign-in').click();
      await page.waitForTimeout(2000);

      bodyText = await page.textContent('body');
      const emailLoginSuccess = bodyText.includes('Campus Food Courts') || bodyText.includes('Pre-Order Cart') || bodyText.includes('Browse Outlets');
      log(`Login via EMAIL success: ${emailLoginSuccess}`);

      // 1d. Log out again
      log('Logging out before Mobile login...');
      await performLogout(page);

      // 1e. Log back in using MOBILE NUMBER + PASSWORD
      log(`Logging in via MOBILE NUMBER: ${test1User.mobile}...`);
      await page.locator('#login-identifier').fill(test1User.mobile);
      await page.locator('#login-password').fill(test1User.password);
      await page.locator('#btn-sign-in').click();
      await page.waitForTimeout(2000);

      bodyText = await page.textContent('body');
      const mobileLoginSuccess = bodyText.includes('Campus Food Courts') || bodyText.includes('Pre-Order Cart') || bodyText.includes('Browse Outlets');
      log(`Login via MOBILE NUMBER success: ${mobileLoginSuccess}`);

      if (emailLoginSuccess && mobileLoginSuccess) {
        results.test1_manual_signup_and_dual_login = true;
        log('TEST 1 PASSED: Manual signup and dual-login (Email + Password and Mobile + Password) confirmed!');
      } else {
        log('TEST 1 FAILED: Could not log in via both methods.');
      }
    } else {
      log('TEST 1 FAILED: Signup did not reach dashboard.');
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TEST 2: GOOGLE SIGNUP — MANDATORY PROFILE COMPLETION
    // ═════════════════════════════════════════════════════════════════════════
    log('--- TEST 2: Google Signup with Mandatory Profile Completion ---');
    await performLogout(page);

    // Simulate Google Sign-up (New user)
    const simGoogleNewBtn = page.locator('#btn-simulate-google-new');
    await simGoogleNewBtn.waitFor({ state: 'visible', timeout: 10000 });
    await simGoogleNewBtn.click();
    await page.waitForTimeout(2500);

    bodyText = await page.textContent('body');
    const profileCompletionAppeared = bodyText.includes('Complete Your Profile') &&
      bodyText.includes('One-Time Profile Setup') &&
      bodyText.includes('without going through Google again');
    log(`"Complete Your Profile" screen appeared: ${profileCompletionAppeared}`);

    // Verify it cannot be skipped (no cancel/skip buttons)
    const hasCancelOrSkip = await page.getByRole('button', { name: /Skip|Cancel|Dismiss/i }).count() > 0;
    log(`Has skip/cancel buttons: ${hasCancelOrSkip} (should be false)`);

    if (profileCompletionAppeared && !hasCancelOrSkip) {
      log(`Filling profile completion: Mobile="${test2GoogleUser.mobile}", Password="${test2GoogleUser.password}"`);
      await page.locator('#complete-mobile').fill(test2GoogleUser.mobile);
      await page.locator('#complete-password').fill(test2GoogleUser.password);
      await page.locator('#complete-confirm-password').fill(test2GoogleUser.password);

      await page.locator('#btn-complete-profile').click();
      await page.waitForFunction(() => !document.body.innerText.includes('Complete Your Profile'), { timeout: 12000 });
      await page.waitForTimeout(1000);

      bodyText = await page.textContent('body');
      const reachedDashboardAfterProfile = bodyText.includes('Campus Food Courts') || bodyText.includes('Pre-Order Cart') || bodyText.includes('Browse Outlets');
      log(`Reached dashboard after completing profile: ${reachedDashboardAfterProfile}`);

      if (reachedDashboardAfterProfile) {
        results.test2_google_signup_mandatory_profile_completion = true;
        log('TEST 2 PASSED: First-time Google user prompted with mandatory profile completion and successfully entered dashboard!');
      } else {
        log('TEST 2 FAILED: Did not reach dashboard after submitting profile completion.');
      }
    } else {
      log('TEST 2 FAILED: Profile completion screen did not appear.');
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TEST 3: GOOGLE RETURNING USER — BYPASSES PROFILE COMPLETION
    // ═════════════════════════════════════════════════════════════════════════
    log('--- TEST 3: Google Returning User Sign-In ---');
    await performLogout(page);

    // Click Google Sign-In (Returning user simulator)
    const simGoogleReturningBtn = page.locator('#btn-simulate-google-returning');
    await simGoogleReturningBtn.waitFor({ state: 'visible', timeout: 10000 });
    await simGoogleReturningBtn.click();
    await page.waitForTimeout(3000);

    bodyText = await page.textContent('body');
    const reachedDirectly = !bodyText.includes('Complete Your Profile') &&
      (bodyText.includes('Campus Food Courts') || bodyText.includes('Pre-Order Cart') || bodyText.includes('Browse Outlets'));
    log(`Returning Google user bypassed profile completion directly to dashboard: ${reachedDirectly}`);

    if (reachedDirectly) {
      results.test3_google_returning_bypasses_profile_completion = true;
      log('TEST 3 PASSED: Returning Google user bypasses setup and lands directly on dashboard!');
    } else {
      log('TEST 3 FAILED: Returning Google user was interrupted by profile completion screen.');
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TEST 4: GOOGLE-ORIGINATED ACCOUNT LOGS IN VIA MOBILE NUMBER + PASSWORD
    // ═════════════════════════════════════════════════════════════════════════
    log('--- TEST 4: Google Account Login via Mobile Number + Password ---');
    await performLogout(page);

    log(`Submitting unified login with Mobile="${test2GoogleUser.mobile}" and password set during Google profile completion...`);
    await page.locator('#login-identifier').fill(test2GoogleUser.mobile);
    await page.locator('#login-password').fill(test2GoogleUser.password);
    await page.locator('#btn-sign-in').click();
    await page.waitForTimeout(2500);

    bodyText = await page.textContent('body');
    const googleAccountMobileLoginSuccess = bodyText.includes('Campus Food Courts') || bodyText.includes('Pre-Order Cart') || bodyText.includes('Browse Outlets');
    log(`Google-originated account logged in via Mobile + Password: ${googleAccountMobileLoginSuccess}`);

    if (googleAccountMobileLoginSuccess) {
      results.test4_google_account_dual_login_via_mobile_and_password = true;
      log('TEST 4 PASSED: Account originated via Google is now fully accessible via Mobile Number + Password!');
    } else {
      log('TEST 4 FAILED: Could not log in using mobile + password on Google account.');
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TEST 5: DUPLICATE MOBILE NUMBER REJECTION (DATABASE-LEVEL CONSTRAINT)
    // ═════════════════════════════════════════════════════════════════════════
    log('--- TEST 5: Duplicate Mobile Number Rejection ---');
    await performLogout(page);

    const regLink2 = page.getByRole('link', { name: /Register New Account/i });
    await regLink2.waitFor({ state: 'visible', timeout: 10000 });
    await regLink2.click();
    await page.waitForTimeout(500);

    // Attempt to register with test1User.mobile which is ALREADY in use
    log(`Attempting signup with ALREADY registered mobile: ${test1User.mobile}...`);
    await page.locator('#signup-name').fill('Imposter User');
    await page.locator('#signup-email').fill(`imposter.${runId}@vitstudent.ac.in`);
    await page.locator('#signup-mobile').fill(test1User.mobile);
    await page.locator('#signup-password').fill('SomePassword123');
    await page.locator('#signup-confirm-password').fill('SomePassword123');

    await page.locator('#btn-sign-up').click();
    await page.waitForTimeout(2500);

    bodyText = await page.textContent('body');
    const duplicateRejected = bodyText.includes('already registered to another account');
    log(`Duplicate mobile rejection detected: ${duplicateRejected}`);

    if (duplicateRejected) {
      results.test5_duplicate_mobile_rejected = true;
      log('TEST 5 PASSED: Duplicate mobile number signup cleanly rejected with clear error message!');
    } else {
      log('TEST 5 FAILED: Duplicate mobile number was not rejected.');
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TEST 6: WRONG PASSWORD SHOWS GENERIC ERROR (NO ENUMERATION)
    // ═════════════════════════════════════════════════════════════════════════
    log('--- TEST 6: Generic Error on Wrong Credentials ---');
    // Switch to Sign In
    const signInLink = page.getByRole('link', { name: /Sign In to Account/i });
    await signInLink.waitFor({ state: 'visible', timeout: 10000 });
    await signInLink.click();
    await page.waitForTimeout(500);

    // Submit wrong password for registered account
    log(`Submitting existing email ${test1User.email} with deliberate WRONG password...`);
    await page.locator('#login-identifier').fill(test1User.email);
    await page.locator('#login-password').fill('WrongPassword123!');
    await page.locator('#btn-sign-in').click();
    await page.waitForTimeout(1500);

    bodyText = await page.textContent('body');
    const showsGenericError = bodyText.includes('Invalid login details');
    const leaksSpecificMessage = bodyText.includes('password is wrong') || bodyText.includes('incorrect password') || bodyText.includes('user not found');
    log(`Shows "Invalid login details": ${showsGenericError}, Leaks specific info: ${leaksSpecificMessage}`);

    if (showsGenericError && !leaksSpecificMessage) {
      results.test6_wrong_password_shows_generic_error = true;
      log('TEST 6 PASSED: Generic "Invalid login details" displayed without revealing credential specifics!');
    } else {
      log('TEST 6 FAILED: Generic error not displayed or leaked credential specifics.');
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TEST 7: FORGOT PASSWORD FLOW
    // ═════════════════════════════════════════════════════════════════════════
    log('--- TEST 7: Forgot Password Flow ---');
    const forgotLink = page.getByRole('link', { name: /Forgot password\?/i });
    await forgotLink.waitFor({ state: 'visible', timeout: 10000 });
    await forgotLink.click();
    await page.waitForTimeout(500);

    log(`Submitting mobile number into Forgot Password form: ${test1User.mobile}...`);
    await page.locator('#forgot-identifier').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#forgot-identifier').fill(test1User.mobile);
    await page.locator('#btn-send-reset').click();
    await page.waitForTimeout(1500);

    bodyText = await page.textContent('body');
    const neutralNoticeShown = bodyText.includes('If an account exists, a reset link has been sent');
    log(`Neutral confirmation notice shown: ${neutralNoticeShown}`);

    if (neutralNoticeShown) {
      results.test7_forgot_password_neutral_confirmation = true;
      log('TEST 7 PASSED: Neutral confirmation message displayed for password reset!');
    } else {
      log('TEST 7 FAILED: Neutral confirmation message not displayed.');
    }

  } catch (err) {
    log(`ERROR: ${err.message}\n${err.stack}`);
  }

  return results;
}
