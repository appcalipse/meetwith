/** biome-ignore-all lint/style/noCommonJs: Node audit script uses CommonJS for direct execution */
/** biome-ignore-all lint/suspicious/noConsole: Audit script prints missing translations */
const fs = require('fs')
const path = require('path')
const ts = require('typescript')

const root = path.join(process.cwd(), 'src')
const excludeDirs = new Set([
  'node_modules',
  '.next',
  'coverage',
  '__tests__',
  'testing',
  '__mocks__',
  'abis',
])
const includeExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.md', '.mdx'])
const uiAttrNames = new Set([
  'placeholder',
  'aria-label',
  'title',
  'alt',
  'label',
  'description',
])
const interestingCalls = new Set([
  'showErrorToast',
  'showSuccessToast',
  'showInfoToast',
  'toast',
  'send',
  'json',
])
const strings = new Map()
const translated = new Set()

function clean(value) {
  return value.replace(/\s+/g, ' ').trim()
}

function walk(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const next = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!excludeDirs.has(entry.name)) walk(next, cb)
    } else if (includeExt.has(path.extname(entry.name))) {
      cb(next)
    }
  }
}

function looksUserFacing(value) {
  const normalized = clean(value)
  if (!normalized || normalized.length < 2) return false
  if (/^[\W_\d]+$/.test(normalized)) return false
  if (/^https?:\/\//.test(normalized) || /^mailto:/.test(normalized))
    return false
  if (/^[@$]/.test(normalized) || /^\//.test(normalized)) return false
  if (/^[.#][\w-]+$/.test(normalized)) return false
  if (
    /^[\w-]+\.(png|jpg|jpeg|svg|gif|webp|css|js|ts|tsx|json)$/i.test(normalized)
  )
    return false
  if (
    /^(GET|POST|PUT|DELETE|PATCH|OPTIONS|Bearer|Content-Type|X-Server-Secret|UTC|HS256|PGRST116)$/i.test(
      normalized
    )
  )
    return false
  if (
    /^(flex|block|none|auto|hidden|relative|absolute|fixed|sticky|center|left|right|top|bottom|row|column|wrap|nowrap|transparent|pointer|default|primary|secondary|solid|outline|ghost|link|sm|md|lg|xl|full|fit-content|stretch|space-between|space-around|flex-start|flex-end)$/i.test(
      normalized
    )
  )
    return false
  if (
    /^[a-z]+(?:\.[0-9a-z]+)?$/i.test(normalized) &&
    normalized === normalized.toLowerCase()
  )
    return false
  if (/^\d+(px|rem|em|fr|%)?( \d+(px|rem|em|fr|%)?)*$/i.test(normalized))
    return false
  if (
    /gradient|rgba|var\(|transform|transition|animation|chakra|neutral\.|primary\.|text-|bg-|border-/i.test(
      normalized
    )
  )
    return false
  if (/^[A-Z][A-Za-z]+Type$/.test(normalized)) return false
  if (/^[A-Z][A-Za-z]+Provider$/.test(normalized)) return false
  if (/^[A-Z][A-Za-z]+Role$/.test(normalized)) return false
  return /[A-Za-z]/.test(normalized)
}

function add(value, file) {
  const normalized = clean(value)
  if (!looksUserFacing(normalized)) return
  const current = strings.get(normalized) || { count: 0, files: new Set() }
  current.count += 1
  current.files.add(path.relative(process.cwd(), file))
  strings.set(normalized, current)
}

function literalText(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return node.text
  return undefined
}

function propName(node) {
  return ts.isIdentifier(node) || ts.isStringLiteral(node)
    ? node.text
    : undefined
}

function getCallName(node) {
  if (!ts.isCallExpression(node)) return ''
  if (ts.isIdentifier(node.expression)) return node.expression.text
  if (ts.isPropertyAccessExpression(node.expression))
    return node.expression.name.text
  return ''
}

function isInterestingLiteral(node) {
  const parent = node.parent
  if (!parent) return false
  if (ts.isJsxAttribute(parent)) return uiAttrNames.has(parent.name.text)
  if (ts.isPropertyAssignment(parent)) {
    const name = propName(parent.name)
    return (
      !!name &&
      [
        'title',
        'description',
        'message',
        'error',
        'label',
        'placeholder',
        'text',
        'name',
        'alt',
      ].includes(name)
    )
  }
  if (parent.parent && ts.isCallExpression(parent.parent))
    return interestingCalls.has(getCallName(parent.parent))
  if (ts.isNewExpression(parent) && parent.expression.getText() === 'Error')
    return true
  return false
}

function collectTranslations(file) {
  const sourceText = fs.readFileSync(file, 'utf8')
  const source = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  )
  function visit(node) {
    if (ts.isPropertyAssignment(node)) {
      const name = propName(node.name)
      if (name) translated.add(name)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
}

function processFile(file) {
  const sourceText = fs.readFileSync(file, 'utf8')
  const ext = path.extname(file)
  if (ext === '.md' || ext === '.mdx') {
    for (const line of sourceText.split(/\r?\n/)) add(line, file)
    return
  }
  const source = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ext === '.tsx' || ext === '.jsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  )
  function visit(node) {
    if (ts.isJsxText(node)) add(node.getText(source), file)
    const text = literalText(node)
    if (text !== undefined && isInterestingLiteral(node)) add(text, file)
    ts.forEachChild(node, visit)
  }
  visit(source)
}

collectTranslations(path.join(root, 'i18n', 'textTranslations.ts'))
collectTranslations(path.join(root, 'i18n', 'textTranslationsExtra.ts'))
walk(root, processFile)

const missing = Array.from(strings.entries())
  .filter(([text]) => !translated.has(text))
  .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
  .map(([text, meta]) => ({
    text,
    count: meta.count,
    files: Array.from(meta.files).slice(0, 4),
  }))

console.log(
  JSON.stringify(
    { totalCandidates: strings.size, missingCount: missing.length, missing },
    null,
    2
  )
)
