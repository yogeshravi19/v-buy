// test_phase8_polish.mjs
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

console.log('Testing Phase 8 Design Polish Pass...')

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u

function walk(dir) {
  let results = []
  const list = fs.readdirSync(dir)
  list.forEach(file => {
    const full = path.join(dir, file)
    if (file === 'node_modules' || file === 'dist' || file === '.git') return
    const stat = fs.statSync(full)
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full))
    } else if (/\.(jsx?|tsx?|html|json)$/.test(file)) {
      results.push(full)
    }
  })
  return results
}

const files = walk('frontend')

// 1. Emoji Audit
let emojiCount = 0
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8')
  const lines = content.split('\n')
  lines.forEach((line, idx) => {
    if (emojiRegex.test(line)) {
      console.error(`Emoji violation in ${file}:${idx + 1}: ${line.trim()}`)
      emojiCount++
    }
  })
})
assert.strictEqual(emojiCount, 0, 'Zero emojis allowed anywhere in the frontend codebase')
console.log('✔ Zero emojis confirmed across all frontend source files')

// 2. V-BUY wordmark audit
let vbuyCount = 0
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8')
  if (content.includes('V-BUY')) {
    console.error(`V-BUY violation in ${file}`)
    vbuyCount++
  }
})
assert.strictEqual(vbuyCount, 0, 'Zero instances of V-BUY allowed in frontend')
console.log('✔ Official V Foods branding confirmed (0 instances of V-BUY)')

// 3. Receipt generator polish
const receiptGen = fs.readFileSync('frontend/src/utils/receiptGenerator.js', 'utf8')
assert(!receiptGen.includes('✓'), 'Receipt generator must not contain unicode checkmarks')
console.log('✔ Receipt generator clean text verified')

console.log('All Phase 8 Design Polish tests passed cleanly!')
