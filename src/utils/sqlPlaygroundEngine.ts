export type SqlRow = Record<string, unknown>;

export interface SqlQueryResult {
  rows: SqlRow[];
  columns: string[];
  rowCount: number;
  elapsedMs: number;
}

export interface ParsedDataset {
  rows: SqlRow[];
  format: 'json' | 'csv' | 'tsv';
  columns: string[];
}

function inferPrimitive(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === '') return '';
  if (trimmed.toLowerCase() === 'null') return null;
  if (trimmed.toLowerCase() === 'true') return true;
  if (trimmed.toLowerCase() === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed);
    if (Number.isFinite(n)) return n;
  }
  return trimmed;
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

function detectDelimiter(headerLine: string): { delimiter: string; format: 'csv' | 'tsv' } {
  const tabCount = (headerLine.match(/\t/g) || []).length;
  const semiCount = (headerLine.match(/;/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;

  if (tabCount > commaCount && tabCount > semiCount) {
    return { delimiter: '\t', format: 'tsv' };
  }
  if (semiCount > commaCount) {
    return { delimiter: ';', format: 'csv' };
  }
  return { delimiter: ',', format: 'csv' };
}

export function parseDatasetInput(input: string): ParsedDataset {
  const trimmed = input.trim();
  if (!trimmed) {
    return { rows: [], format: 'json', columns: [] };
  }

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const parsed: unknown = JSON.parse(trimmed);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    const rows: SqlRow[] = arr.map((item, idx) => {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        return item as SqlRow;
      }
      throw new Error(`Row ${idx + 1} must be a JSON object.`);
    });
    const colSet = new Set<string>();
    for (const r of rows) {
      for (const k of Object.keys(r)) colSet.add(k);
    }
    return { rows, format: 'json', columns: [...colSet] };
  }

  const lines = trimmed
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(l => l.trim().length > 0);

  if (lines.length < 2) {
    throw new Error('Input must be a JSON array of objects or CSV/TSV with a header row and data rows.');
  }

  const { delimiter, format } = detectDelimiter(lines[0]);
  const headers = parseDelimitedLine(lines[0], delimiter).map(h => h.trim());
  if (headers.length === 0 || headers.every(h => !h)) {
    throw new Error('CSV/TSV header row is empty.');
  }

  const rows: SqlRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseDelimitedLine(lines[i], delimiter);
    const row: SqlRow = {};
    headers.forEach((header, idx) => {
      const key = header || `col_${idx + 1}`;
      row[key] = inferPrimitive(values[idx] ?? '');
    });
    rows.push(row);
  }

  return { rows, format, columns: headers.filter(Boolean) };
}

type TokenType = 'IDENT' | 'NUMBER' | 'STRING' | 'OP' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'STAR';

interface ExprToken {
  type: TokenType;
  value: string;
}

function tokenizeWhere(expr: string): ExprToken[] {
  const tokens: ExprToken[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      i++;
      continue;
    }
    if (ch === '*') {
      tokens.push({ type: 'STAR', value: '*' });
      i++;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const quote = ch;
      let str = '';
      i++;
      while (i < expr.length) {
        if (expr[i] === '\\' && i + 1 < expr.length) {
          str += expr[i + 1];
          i += 2;
        } else if (expr[i] === quote && expr[i + 1] === quote) {
          str += quote;
          i += 2;
        } else if (expr[i] === quote) {
          i++;
          break;
        } else {
          str += expr[i];
          i++;
        }
      }
      tokens.push({ type: 'STRING', value: str });
      continue;
    }
    const twoChar = expr.slice(i, i + 2);
    if (['>=', '<=', '!=', '<>', '=='].includes(twoChar)) {
      tokens.push({ type: 'OP', value: twoChar });
      i += 2;
      continue;
    }
    if (['=', '>', '<'].includes(ch)) {
      tokens.push({ type: 'OP', value: ch });
      i++;
      continue;
    }
    if (/-?\d/.test(ch) && (ch !== '-' || /\d/.test(expr[i + 1] || ''))) {
      let num = ch;
      i++;
      while (i < expr.length && /[\d.]/.test(expr[i])) {
        num += expr[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: num });
      continue;
    }
    if (/[a-zA-Z_`]/.test(ch)) {
      let ident = '';
      if (ch === '`') {
        i++;
        while (i < expr.length && expr[i] !== '`') {
          ident += expr[i++];
        }
        if (expr[i] === '`') i++;
      } else {
        while (i < expr.length && /[a-zA-Z0-9_.]/.test(expr[i])) {
          ident += expr[i++];
        }
      }
      tokens.push({ type: 'IDENT', value: ident });
      continue;
    }
    throw new Error(`Unexpected character "${ch}" in WHERE/HAVING clause.`);
  }
  return tokens;
}

function likeMatch(value: unknown, pattern: string): boolean {
  const text = String(value ?? '');
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexStr = '^' + escaped.replace(/%/g, '.*').replace(/_/g, '.') + '$';
  return new RegExp(regexStr, 'i').test(text);
}

function compareValues(left: unknown, op: string, right: unknown): boolean {
  if (left === null || left === undefined || right === null || right === undefined) {
    if (op === '=' || op === '==') return left === right;
    if (op === '!=' || op === '<>') return left !== right;
    return false;
  }

  const leftNum = typeof left === 'number' ? left : Number(left);
  const rightNum = typeof right === 'number' ? right : Number(right);
  const bothNumeric =
    (typeof left === 'number' || (typeof left === 'string' && left.trim() !== '' && Number.isFinite(leftNum))) &&
    (typeof right === 'number' || (typeof right === 'string' && right.trim() !== '' && Number.isFinite(rightNum)));

  const a = bothNumeric ? leftNum : String(left).toLowerCase();
  const b = bothNumeric ? rightNum : String(right).toLowerCase();

  switch (op) {
    case '=':
    case '==':
      return a === b;
    case '!=':
    case '<>':
      return a !== b;
    case '>':
      return a > b;
    case '<':
      return a < b;
    case '>=':
      return a >= b;
    case '<=':
      return a <= b;
    default:
      return false;
  }
}

function getColumnValue(row: SqlRow, key: string): unknown {
  if (key in row) return row[key];
  const lower = key.toLowerCase();
  const foundKey = Object.keys(row).find(k => k.toLowerCase() === lower);
  return foundKey ? row[foundKey] : undefined;
}

function evaluateCondition(expr: string, row: SqlRow): boolean {
  const tokens = tokenizeWhere(expr);
  let pos = 0;

  const peek = (): ExprToken | undefined => tokens[pos];
  const consume = (): ExprToken => tokens[pos++];
  const matchKw = (kw: string): boolean => {
    const t = peek();
    if (t && t.type === 'IDENT' && t.value.toUpperCase() === kw) {
      pos++;
      return true;
    }
    return false;
  };

  const parseValue = (asColumnIfIdent: boolean): unknown => {
    const t = consume();
    if (!t) throw new Error('Unexpected end of expression.');
    if (t.type === 'NUMBER') return Number(t.value);
    if (t.type === 'STRING') return t.value;
    if (t.type === 'IDENT') {
      const upper = t.value.toUpperCase();
      if (upper === 'NULL') return null;
      if (upper === 'TRUE') return true;
      if (upper === 'FALSE') return false;
      // Check for aggregate expression in HAVING e.g. COUNT(*) or AVG(salary)
      if (peek()?.type === 'LPAREN') {
        consume(); // (
        let inner = '';
        while (peek() && peek()?.type !== 'RPAREN') {
          inner += consume().value;
        }
        if (peek()?.type === 'RPAREN') consume();
        const aggKey = `${t.value}(${inner})`;
        return getColumnValue(row, aggKey);
      }
      if (asColumnIfIdent) {
        return getColumnValue(row, t.value);
      }
      return t.value;
    }
    throw new Error(`Unexpected token "${t.value}".`);
  };

  const parseOr = (): boolean => {
    let left = parseAnd();
    while (matchKw('OR')) {
      const right = parseAnd();
      left = left || right;
    }
    return left;
  };

  const parseAnd = (): boolean => {
    let left = parseNot();
    while (matchKw('AND')) {
      const right = parseNot();
      left = left && right;
    }
    return left;
  };

  const parseNot = (): boolean => {
    if (matchKw('NOT')) {
      return !parseNot();
    }
    return parsePrimary();
  };

  const parsePrimary = (): boolean => {
    if (peek()?.type === 'LPAREN') {
      consume();
      const val = parseOr();
      if (peek()?.type !== 'RPAREN') {
        throw new Error('Missing closing parenthesis in WHERE/HAVING clause.');
      }
      consume();
      return val;
    }

    const leftVal = parseValue(true);

    if (matchKw('IS')) {
      const negated = matchKw('NOT');
      if (!matchKw('NULL')) {
        throw new Error('Expected NULL after IS / IS NOT.');
      }
      const isNull = leftVal === null || leftVal === undefined || leftVal === '';
      return negated ? !isNull : isNull;
    }

    const negated = matchKw('NOT');

    if (matchKw('LIKE')) {
      const pattern = String(parseValue(false) ?? '');
      const matched = likeMatch(leftVal, pattern);
      return negated ? !matched : matched;
    }

    if (matchKw('IN')) {
      if (peek()?.type !== 'LPAREN') {
        throw new Error('Expected "(" after IN.');
      }
      consume();
      const list: unknown[] = [];
      while (peek() && peek()?.type !== 'RPAREN') {
        list.push(parseValue(false));
        if (peek()?.type === 'COMMA') consume();
      }
      if (peek()?.type !== 'RPAREN') {
        throw new Error('Expected ")" after IN list.');
      }
      consume();
      const found = list.some(item => compareValues(leftVal, '=', item));
      return negated ? !found : found;
    }

    if (matchKw('BETWEEN')) {
      const low = parseValue(false);
      if (!matchKw('AND')) {
        throw new Error('Expected AND in BETWEEN expression.');
      }
      const high = parseValue(false);
      const inRange = compareValues(leftVal, '>=', low) && compareValues(leftVal, '<=', high);
      return negated ? !inRange : inRange;
    }

    if (negated) {
      throw new Error('Unexpected NOT operator.');
    }

    const opToken = peek();
    if (opToken && opToken.type === 'OP') {
      consume();
      const rightVal = parseValue(false);
      return compareValues(leftVal, opToken.value, rightVal);
    }

    return Boolean(leftVal);
  };

  return parseOr();
}

interface SelectItem {
  raw: string;
  alias: string;
  aggregate?: {
    fn: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
    arg: string;
  };
  column?: string;
}

function splitTopLevelCommas(str: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let quote: string | null = null;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
    } else if (ch === '(') {
      depth++;
      current += ch;
    } else if (ch === ')') {
      depth = Math.max(0, depth - 1);
      current += ch;
    } else if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseSelectItems(selectClause: string): SelectItem[] {
  return splitTopLevelCommas(selectClause).map(item => {
    const aliasMatch = item.match(/^(.+?)\s+as\s+([a-zA-Z0-9_`]+)$/i);
    const expr = (aliasMatch ? aliasMatch[1] : item).trim();
    const explicitAlias = aliasMatch ? aliasMatch[2].replace(/^`|`$/g, '') : undefined;

    const aggMatch = expr.match(/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*(\*|[a-zA-Z0-9_.`]+)\s*\)$/i);
    if (aggMatch) {
      const fn = aggMatch[1].toUpperCase() as 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
      const arg = aggMatch[2].replace(/^`|`$/g, '');
      return {
        raw: expr,
        alias: explicitAlias || `${fn.toLowerCase()}_${arg === '*' ? 'all' : arg}`,
        aggregate: { fn, arg },
      };
    }

    const col = expr.replace(/^`|`$/g, '');
    return {
      raw: expr,
      alias: explicitAlias || col,
      column: col,
    };
  });
}

function computeAggregate(fn: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX', arg: string, groupRows: SqlRow[]): unknown {
  if (fn === 'COUNT') {
    if (arg === '*') return groupRows.length;
    return groupRows.filter(r => {
      const v = getColumnValue(r, arg);
      return v !== null && v !== undefined && v !== '';
    }).length;
  }

  const nums = groupRows
    .map(r => getColumnValue(r, arg))
    .filter(v => v !== null && v !== undefined && v !== '')
    .map(v => Number(v))
    .filter(n => Number.isFinite(n));

  if (nums.length === 0) return null;

  if (fn === 'SUM') return Number(nums.reduce((a, b) => a + b, 0).toFixed(6));
  if (fn === 'AVG') return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2));
  if (fn === 'MIN') return Math.min(...nums);
  if (fn === 'MAX') return Math.max(...nums);
  return null;
}

export function executeSqlQuery(rows: SqlRow[], query: string): SqlQueryResult {
  const start = performance.now();
  const cleanQuery = query.trim().replace(/;+\s*$/, '').replace(/\s+/g, ' ');

  const clauseRegex =
    /^select\s+(distinct\s+)?(.+?)\s+from\s+[a-zA-Z0-9_`]+(?:\s+where\s+(.+?))?(?:\s+group\s+by\s+(.+?))?(?:\s+having\s+(.+?))?(?:\s+order\s+by\s+(.+?))?(?:\s+limit\s+(\d+))?(?:\s+offset\s+(\d+))?$/i;

  const match = cleanQuery.match(clauseRegex);
  if (!match) {
    throw new Error(
      'Supported syntax: SELECT [DISTINCT] cols/aggregates FROM data [WHERE ...] [GROUP BY ...] [HAVING ...] [ORDER BY col ASC|DESC] [LIMIT n] [OFFSET m]'
    );
  }

  const isDistinct = Boolean(match[1]);
  const selectClause = match[2].trim();
  const whereClause = match[3]?.trim();
  const groupByClause = match[4]?.trim();
  const havingClause = match[5]?.trim();
  const orderByClause = match[6]?.trim();
  const limitVal = match[7] !== undefined ? parseInt(match[7], 10) : undefined;
  const offsetVal = match[8] !== undefined ? parseInt(match[8], 10) : 0;

  // 1. WHERE filter
  const filtered = whereClause ? rows.filter(row => evaluateCondition(whereClause, row)) : [...rows];

  // 2. SELECT / GROUP BY / Aggregates
  const selectItems = selectClause === '*' ? null : parseSelectItems(selectClause);
  const hasAggregates = Boolean(selectItems?.some(item => item.aggregate));
  let resultRows: SqlRow[] = [];

  if (groupByClause || hasAggregates) {
    const groupCols = groupByClause ? splitTopLevelCommas(groupByClause).map(c => c.replace(/^`|`$/g, '')) : [];
    const groups = new Map<string, SqlRow[]>();

    if (groupCols.length === 0) {
      groups.set('__all__', filtered);
    } else {
      for (const row of filtered) {
        const key = JSON.stringify(groupCols.map(c => getColumnValue(row, c) ?? null));
        const bucket = groups.get(key);
        if (bucket) bucket.push(row);
        else groups.set(key, [row]);
      }
    }

    const items = selectItems ?? [];
    for (const groupRows of groups.values()) {
      const sample = groupRows[0] ?? {};
      const outRow: SqlRow = {};
      const havingContext: SqlRow = {};

      for (const gc of groupCols) {
        havingContext[gc] = getColumnValue(sample, gc);
      }

      for (const item of items) {
        if (item.aggregate) {
          const val = computeAggregate(item.aggregate.fn, item.aggregate.arg, groupRows);
          outRow[item.alias] = val;
          havingContext[item.alias] = val;
          havingContext[`${item.aggregate.fn}(${item.aggregate.arg})`] = val;
        } else if (item.column === '*') {
          Object.assign(outRow, sample);
        } else if (item.column) {
          const val = getColumnValue(sample, item.column);
          outRow[item.alias] = val;
          havingContext[item.alias] = val;
        }
      }

      if (!havingClause || evaluateCondition(havingClause, havingContext)) {
        resultRows.push(outRow);
      }
    }
  } else if (selectItems) {
    resultRows = filtered.map(row => {
      const outRow: SqlRow = {};
      for (const item of selectItems) {
        if (item.column === '*') {
          Object.assign(outRow, row);
        } else if (item.column) {
          outRow[item.alias] = getColumnValue(row, item.column);
        }
      }
      return outRow;
    });
  } else {
    resultRows = filtered;
  }

  // 3. DISTINCT
  if (isDistinct) {
    const seen = new Set<string>();
    resultRows = resultRows.filter(row => {
      const key = JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // 4. ORDER BY (supports multi-column)
  if (orderByClause) {
    const orderSpecs = splitTopLevelCommas(orderByClause).map(part => {
      const m = part.match(/^([a-zA-Z0-9_.`]+)(?:\s+(asc|desc))?$/i);
      if (!m) throw new Error(`Invalid ORDER BY specification: "${part}".`);
      return {
        col: m[1].replace(/^`|`$/g, ''),
        dir: (m[2] || 'asc').toLowerCase() as 'asc' | 'desc',
      };
    });

    resultRows.sort((a, b) => {
      for (const spec of orderSpecs) {
        const va = getColumnValue(a, spec.col);
        const vb = getColumnValue(b, spec.col);
        if (va === vb) continue;
        if (va === null || va === undefined) return 1;
        if (vb === null || vb === undefined) return -1;
        let cmp = 0;
        if (typeof va === 'number' && typeof vb === 'number') {
          cmp = va - vb;
        } else {
          cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
        }
        if (cmp !== 0) return spec.dir === 'desc' ? -cmp : cmp;
      }
      return 0;
    });
  }

  // 5. OFFSET & LIMIT
  if (offsetVal > 0 || limitVal !== undefined) {
    const end = limitVal !== undefined ? offsetVal + limitVal : undefined;
    resultRows = resultRows.slice(offsetVal, end);
  }

  const columns = resultRows.length > 0 ? Object.keys(resultRows[0]) : [];
  return {
    rows: resultRows,
    columns,
    rowCount: resultRows.length,
    elapsedMs: Number((performance.now() - start).toFixed(2)),
  };
}

export function formatRowsAsCsv(rows: SqlRow[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escapeCell = (val: unknown): string => {
    const s = val === null || val === undefined ? '' : String(val);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.map(escapeCell).join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escapeCell(row[h])).join(','));
  }
  return lines.join('\n');
}
