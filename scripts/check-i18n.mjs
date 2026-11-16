import fs from 'node:fs';
import path from 'node:path';

const LOCALE_DIR = path.resolve(process.cwd(), 'src/locales');
const SRC_DIR = path.resolve(process.cwd(), 'src');
const LANGS = ['en', 'cs', 'de', 'es', 'ru'];

const locales = Object.fromEntries(
  LANGS.map((lang) => {
    const filePath = path.join(LOCALE_DIR, `${lang}.json`);
    return [lang, JSON.parse(fs.readFileSync(filePath, 'utf8'))];
  }),
);

const enKeys = new Set(Object.keys(locales.en));
let hasErrors = false;

for (const lang of LANGS) {
  const langKeys = new Set(Object.keys(locales[lang]));
  const missingFromLang = [...enKeys].filter((k) => !langKeys.has(k));
  const extraInLang = [...langKeys].filter((k) => !enKeys.has(k));

  if (missingFromLang.length > 0) {
    hasErrors = true;
    console.error(`[i18n] ${lang}.json is missing ${missingFromLang.length} key(s):`, missingFromLang.slice(0, 15));
  }
  if (extraInLang.length > 0) {
    hasErrors = true;
    console.error(`[i18n] ${lang}.json has ${extraInLang.length} extra key(s) absent from en.json:`, extraInLang.slice(0, 15));
  }

  const emptyValues = Object.entries(locales[lang])
    .filter(([, val]) => typeof val !== 'string' || val.trim().length === 0)
    .map(([k]) => k);
  if (emptyValues.length > 0) {
    hasErrors = true;
    console.error(`[i18n] ${lang}.json has empty values for keys:`, emptyValues.slice(0, 15));
  }
}

function collectSourceFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') files.push(...collectSourceFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

const missingSourceKeys = [];
const regex = /\bt\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;
for (const file of collectSourceFiles(SRC_DIR)) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    if (!enKeys.has(key)) {
      missingSourceKeys.push({ key, file: path.relative(process.cwd(), file) });
    }
  }
}

if (missingSourceKeys.length > 0) {
  hasErrors = true;
  console.error(`[i18n] Found ${missingSourceKeys.length} t(...) key(s) in src/ missing from en.json:`, missingSourceKeys.slice(0, 20));
}

if (hasErrors) {
  process.exit(1);
}

console.log(`[i18n] OK: ${enKeys.size} keys verified across ${LANGS.join(', ')} with zero missing source keys.`);
