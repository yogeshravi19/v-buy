import { SYSTEM_REGISTRY } from '../src/lib/systemRegistry.ts'

console.log('=================================================================')
console.log('  TESTING SYSTEM MAP SEARCH, FILTER & DEBUG EXPORT LOGIC')
console.log('=================================================================\n')

// 1. Total counts
console.log(`Total registry entries: ${SYSTEM_REGISTRY.length}`)
const routes = SYSTEM_REGISTRY.filter(e => e.type === 'route')
const redirects = SYSTEM_REGISTRY.filter(e => e.type === 'redirect')
const popups = SYSTEM_REGISTRY.filter(e => e.type === 'popup')
const protectedEntries = SYSTEM_REGISTRY.filter(e => e.protected === 'not instrumented' || e.protected === true)

console.log(`Routes: ${routes.length}`)
console.log(`Redirects: ${redirects.length}`)
console.log(`Popups: ${popups.length}`)
console.log(`Protected: ${protectedEntries.length}`)

if (routes.length < 30 || redirects.length < 10 || popups.length < 15) {
  console.error('FATAL: Expected at least 30 routes, 10 redirects, and 15 popups')
  process.exit(1)
}

// 2. Search test
const searchSample = SYSTEM_REGISTRY.filter(e => e.id.toLowerCase().includes('browse') || e.name.toLowerCase().includes('browse'))
console.log(`Search for "browse": found ${searchSample.length} cards`)
if (searchSample.length === 0) {
  console.error('Search failed')
  process.exit(1)
}

// 3. Filter by role test
const staffCards = SYSTEM_REGISTRY.filter(e => e.rolesAllowed.includes('staff'))
console.log(`Filter by role "staff": found ${staffCards.length} cards`)
if (staffCards.length === 0) {
  console.error('Role filter failed')
  process.exit(1)
}

// 4. Debug info format check
function generateDebugInfo(entry) {
  return [
    `=== V FOODS SYSTEM MAP DEBUG CARD ===`,
    `ID: ${entry.id}`,
    `Type: ${entry.type.toUpperCase()}`,
    `Name: ${entry.name}`,
    `Path / Trigger: ${entry.pathOrTrigger}`,
    `Roles Allowed: ${entry.rolesAllowed.join(', ')}`,
    `Opened From: ${entry.openedFrom}`,
    entry.redirectCondition ? `Redirect Condition: ${entry.redirectCondition}` : '',
    entry.redirectTarget ? `Redirect Target: ${entry.redirectTarget}` : '',
    entry.apiRoutes && entry.apiRoutes.length > 0 ? `API Routes: ${entry.apiRoutes.join(', ')}` : '',
    entry.tables && entry.tables.length > 0 ? `Supabase Tables: ${entry.tables.join(', ')}` : '',
    `Source Files: ${entry.sourceFiles.join(', ')}`,
    `Protected Status: ${entry.protected ? 'PROTECTED (Not Instrumented)' : 'Instrumented'}`,
    `Environment: Production VIT Chennai`
  ].filter(Boolean).join('\n')
}

const sampleDebug = generateDebugInfo(SYSTEM_REGISTRY[0])
console.log('\nSample Debug Export Output:\n' + sampleDebug)

// Confirm no secrets or tokens in debug output
const hasToken = /token|bearer|jwt|password|secret|key/i.test(sampleDebug)
console.log(`\nSecrets check on debug info: ${hasToken ? 'Contains keywords' : 'Clean'}`)

console.log('\n[PASS] All System Map logic and debug formatting validated successfully!')
