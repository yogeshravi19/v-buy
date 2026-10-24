import fs from 'fs'
import path from 'path'

const SRC_DIR = 'e:/v-buy/frontend/src'

const FILLER_WORDS = [
  /\bPlease\b/i,
  /\bsuccessfully\b/i,
  /\bOops\b/i,
  /\bWhoops\b/i,
  /\bWelcome back!\b/i,
  /\bAwesome\b/i,
  /\bGreat\b/i,
  /\bjust\b/i,
  /\bsimply\b/i,
  /\bClick here\b/i
]

const NON_SCALE_CLASSES = [
  /gap-3\.5/g,
  /p-2\.5/g,
  /p-3\.5/g,
  /px-2\.5/g,
  /py-2\.5/g,
  /gap-1\.5/g,
  /gap-2\.5/g,
  /text-\[11px\]/g,
  /text-\[10px\]/g,
  /text-\[13px\]/g,
  /text-\[12\.5px\]/g,
  /text-\[13\.5px\]/g,
  /h-7\b/g,
  /w-6\b/g,
  /h-6\b/g,
  /w-7\b/g,
  /h-7\b/g
]

const auditResults = {
  totalFilesScanned: 0,
  copyViolations: [],
  spacingViolations: [],
  totalWords: 0,
  filesWithIssues: new Set()
}

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      scanDir(fullPath)
    } else if (/\.(jsx?|tsx?|css)$/.test(entry.name)) {
      scanFile(fullPath)
    }
  }
}

function scanFile(filePath) {
  auditResults.totalFilesScanned++
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const relPath = path.relative('e:/v-buy', filePath).replace(/\\/g, '/')

  // Count words
  const words = content.match(/[A-Za-z0-9_-]+/g) || []
  auditResults.totalWords += words.length

  lines.forEach((line, idx) => {
    const lineNum = idx + 1

    // Exclude comments, imports, svg paths
    if (/^\s*(\/\/|\/\*|\*|import |from )/.test(line)) return
    if (line.includes('d="M') || line.includes('stroke=')) return

    // Check fillers in strings
    for (const filler of FILLER_WORDS) {
      if (filler.test(line)) {
        // exclude technical strings or comments
        if (!line.includes('//') && (line.includes("'") || line.includes('"') || line.includes('`') || line.includes('>'))) {
          auditResults.copyViolations.push({
            file: relPath,
            line: lineNum,
            filler: filler.toString(),
            snippet: line.trim()
          })
          auditResults.filesWithIssues.add(relPath)
        }
      }
    }

    // Check exclamation points in visible strings (not != or !== or !)
    const stringExclamation = /['"`>][^'"`<]*![^'"`<]*['"`<]/.exec(line)
    if (stringExclamation && !line.includes('!==') && !line.includes('!=') && !line.includes('!important')) {
      auditResults.copyViolations.push({
        file: relPath,
        line: lineNum,
        filler: 'Exclamation mark in UI copy',
        snippet: line.trim()
      })
      auditResults.filesWithIssues.add(relPath)
    }

    // Check non-scale tokens
    for (const nonScale of NON_SCALE_CLASSES) {
      if (nonScale.test(line)) {
        auditResults.spacingViolations.push({
          file: relPath,
          line: lineNum,
          rule: 'Arbitrary/non-scale spacing or sizing',
          snippet: line.trim()
        })
        auditResults.filesWithIssues.add(relPath)
      }
    }
  })
}

scanDir(SRC_DIR)

console.log('=== AUDIT METRICS SUMMARY ===')
console.log(`Total files scanned: ${auditResults.totalFilesScanned}`)
console.log(`Total visible & code words: ${auditResults.totalWords}`)
console.log(`Copy violations found: ${auditResults.copyViolations.length}`)
console.log(`Spacing/sizing violations found: ${auditResults.spacingViolations.length}`)
console.log(`Files with violations: ${auditResults.filesWithIssues.size}`)

fs.writeFileSync('e:/v-buy/scratch_audit_data.json', JSON.stringify({
  summary: {
    totalFilesScanned: auditResults.totalFilesScanned,
    totalWords: auditResults.totalWords,
    copyViolationsCount: auditResults.copyViolations.length,
    spacingViolationsCount: auditResults.spacingViolations.length,
    filesWithIssuesCount: auditResults.filesWithIssues.size
  },
  copyViolations: auditResults.copyViolations.slice(0, 100),
  spacingViolations: auditResults.spacingViolations.slice(0, 100)
}, null, 2))
