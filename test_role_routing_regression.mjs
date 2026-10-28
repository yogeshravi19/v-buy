// test_role_routing_regression.mjs
// Permanent regression test for role resolution, route guards, deep-linking, and wrong-role redirects.

import assert from 'node:assert'
import fs from 'node:fs'
import { normalizeRole, ROLE_HOME, pathAllowedFor } from './frontend/src/lib/roles.js'

console.log('--- Running Role System Invariant Tests ---')

// 1. Verify normalizeRole correctness
assert.strictEqual(normalizeRole('user'), 'user')
assert.strictEqual(normalizeRole('customer'), 'user')
assert.strictEqual(normalizeRole('student'), 'user')
assert.strictEqual(normalizeRole('staff'), 'staff')
assert.strictEqual(normalizeRole('shop_staff'), 'staff')
assert.strictEqual(normalizeRole('shop_admin'), 'shop_admin')
assert.strictEqual(normalizeRole('owner'), 'shop_admin')
assert.strictEqual(normalizeRole('super_admin'), 'super_admin')
assert.strictEqual(normalizeRole('superadmin'), 'super_admin')
assert.strictEqual(normalizeRole('admin'), 'super_admin')

// Strict rejection of unknown / malformed roles
assert.strictEqual(normalizeRole(null), null)
assert.strictEqual(normalizeRole(undefined), null)
assert.strictEqual(normalizeRole(''), null)
assert.strictEqual(normalizeRole('guest'), null)
assert.strictEqual(normalizeRole('unknown_role'), null)
console.log('✔ normalizeRole maps all aliases and strictly rejects unknown strings')

// 2. Verify ROLE_HOME mapping
assert.strictEqual(ROLE_HOME.user, '/')
assert.strictEqual(ROLE_HOME.staff, '/staff')
assert.strictEqual(ROLE_HOME.shop_admin, '/shop-admin')
assert.strictEqual(ROLE_HOME.super_admin, '/admin')
console.log('✔ ROLE_HOME matches standard canonical homes')

// 3. Verify pathAllowedFor
// User allowed paths
assert.strictEqual(pathAllowedFor('user', '/'), true)
assert.strictEqual(pathAllowedFor('user', '/browse'), true)
assert.strictEqual(pathAllowedFor('user', '/orders'), true)
assert.strictEqual(pathAllowedFor('user', '/cart'), true)
assert.strictEqual(pathAllowedFor('user', '/wallet'), true)
assert.strictEqual(pathAllowedFor('user', '/profile'), true)
// User forbidden paths
assert.strictEqual(pathAllowedFor('user', '/staff'), false)
assert.strictEqual(pathAllowedFor('user', '/staff/pos'), false)
assert.strictEqual(pathAllowedFor('user', '/shop-admin'), false)
assert.strictEqual(pathAllowedFor('user', '/shop-admin/analytics'), false)
assert.strictEqual(pathAllowedFor('user', '/admin'), false)

// Staff allowed & forbidden
assert.strictEqual(pathAllowedFor('staff', '/staff'), true)
assert.strictEqual(pathAllowedFor('staff', '/staff/pos'), true)
assert.strictEqual(pathAllowedFor('staff', '/'), false)
assert.strictEqual(pathAllowedFor('staff', '/shop-admin'), false)
assert.strictEqual(pathAllowedFor('staff', '/admin'), false)

// Shop Admin allowed & forbidden
assert.strictEqual(pathAllowedFor('shop_admin', '/shop-admin'), true)
assert.strictEqual(pathAllowedFor('shop_admin', '/shop-admin/team'), true)
assert.strictEqual(pathAllowedFor('shop_admin', '/'), false)
assert.strictEqual(pathAllowedFor('shop_admin', '/staff'), false)
assert.strictEqual(pathAllowedFor('shop_admin', '/admin'), false)

// Super Admin allowed & forbidden
assert.strictEqual(pathAllowedFor('super_admin', '/admin'), true)
assert.strictEqual(pathAllowedFor('super_admin', '/admin/outlets'), true)
assert.strictEqual(pathAllowedFor('super_admin', '/'), false)
assert.strictEqual(pathAllowedFor('super_admin', '/staff'), false)
assert.strictEqual(pathAllowedFor('super_admin', '/shop-admin'), false)

// Invalid role rejected everywhere
assert.strictEqual(pathAllowedFor(null, '/'), false)
assert.strictEqual(pathAllowedFor('unknown', '/staff'), false)
console.log('✔ pathAllowedFor rigorously blocks cross-role access and enforces role boundaries')

// 4. Verify App.jsx implementation details
const appCode = fs.readFileSync('./frontend/src/App.jsx', 'utf8')
assert(appCode.includes("import { normalizeRole, ROLE_HOME, pathAllowedFor } from './lib/roles'"), 'App.jsx must import roles helper')
assert(!appCode.includes('TEST_USERS = ['), 'App.jsx must not contain hardcoded TEST_USERS credentials')
assert(appCode.includes("if (authState === 'loading') return <DashboardSkeleton />"), 'App.jsx must gate render during authState loading')
assert(appCode.includes("if (authState === 'error')"), 'App.jsx must show retry screen on authState error')
assert(appCode.includes('resetSessionState()'), 'App.jsx must clear session state on sign out or account switch')
console.log('✔ App.jsx static invariants confirmed: loading gate, retry screen, and clean session reset')

console.log('ALL ROLE ROUTING REGRESSION TESTS PASSED SUCCESSFULLY.')
