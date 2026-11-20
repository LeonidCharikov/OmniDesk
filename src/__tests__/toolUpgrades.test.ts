import { describe, it, expect } from 'vitest';
import {
  executeSqlQuery,
  formatRowsAsCsv,
  parseDatasetInput,
} from '../utils/sqlPlaygroundEngine';
import {
  beautifyCode,
  bearingToCompass,
  computeHaversineKm,
  computeInitialBearing,
  computeInvestmentSchedule,
  computeMidpoint,
  ddToDms,
  decodeJwtToken,
  dmsToDd,
  escapeRegexLiteral,
  minifyCode,
  parseDmsPair,
  runRegexAnalysis,
  signJwtHmac,
  verifyJwtHmac,
} from '../utils/toolUpgrades.logic';

describe('sqlPlaygroundEngine', () => {
  const sampleRows = [
    { id: 1, name: 'Alice', dept: 'Dev', salary: 90000, city: 'Prague' },
    { id: 2, name: 'Bob', dept: 'Dev', salary: 70000, city: 'Brno' },
    { id: 3, name: 'Cara', dept: 'Design', salary: 65000, city: 'Prague' },
    { id: 4, name: 'Dan', dept: 'Design', salary: 65000, city: 'Ostrava' },
  ];

  it('parses CSV input with type inference and quotes', () => {
    const csv = 'name,city,score\n"Alice, A",Prague,95\nBob,Brno,80';
    const parsed = parseDatasetInput(csv);
    expect(parsed.format).toBe('csv');
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toEqual({ name: 'Alice, A', city: 'Prague', score: 95 });
  });

  it('supports WHERE with AND/OR/IN/BETWEEN/LIKE', () => {
    const res = executeSqlQuery(
      sampleRows,
      "SELECT name, salary FROM data WHERE city IN ('Prague', 'Brno') AND salary BETWEEN 65000 AND 85000 ORDER BY salary DESC"
    );
    expect(res.rows.map(r => r.name)).toEqual(['Bob', 'Cara']);
  });

  it('supports GROUP BY, aggregates, aliases, and HAVING', () => {
    const res = executeSqlQuery(
      sampleRows,
      'SELECT dept, COUNT(*) AS cnt, AVG(salary) AS avg_sal, SUM(salary) AS total_sal FROM data GROUP BY dept HAVING avg_sal > 70000'
    );
    expect(res.rows).toEqual([{ dept: 'Dev', cnt: 2, avg_sal: 80000, total_sal: 160000 }]);
  });

  it('supports DISTINCT, LIMIT, and OFFSET', () => {
    const res = executeSqlQuery(sampleRows, 'SELECT DISTINCT dept FROM data ORDER BY dept ASC LIMIT 1 OFFSET 1');
    expect(res.rows).toEqual([{ dept: 'Dev' }]);
  });

  it('formats rows safely as RFC-4180 CSV', () => {
    const csv = formatRowsAsCsv([{ a: 'hello, world', b: 42 }]);
    expect(csv).toBe('a,b\n"hello, world",42');
  });
});

describe('Investment & Compound Interest logic', () => {
  it('computes compounding schedule and inflation-adjusted real balance', () => {
    const result = computeInvestmentSchedule({
      initial: 10000,
      periodicAddition: 1000,
      annualRatePct: 12,
      compoundingPerYear: 12,
      years: 2,
      annualInflationPct: 3,
      contributeAtStart: false,
    });
    expect(result.schedule).toHaveLength(2);
    expect(result.totalContributed).toBe(34000);
    expect(result.finalNominal).toBeGreaterThan(34000);
    expect(result.finalReal).toBeLessThan(result.finalNominal);
    expect(result.effectiveAnnualYieldPct).toBeCloseTo(12.6825, 2);
  });
});

describe('Geo / GPS logic', () => {
  it('converts DD <-> DMS and parses DMS string pairs', () => {
    const dms = ddToDms(50.0755, 'lat');
    expect(dms.deg).toBe(50);
    expect(dms.dir).toBe('N');
    expect(dmsToDd(dms)).toBeCloseTo(50.0755, 4);

    const parsed = parseDmsPair(`50° 4' 31.8" N, 14° 26' 16.1" E`);
    expect(parsed).not.toBeNull();
    expect(parsed?.lat).toBeCloseTo(50.0755, 3);
    expect(parsed?.lon).toBeCloseTo(14.4378, 3);
  });

  it('computes Haversine distance, bearing, and midpoint accurately', () => {
    const km = computeHaversineKm(50.0755, 14.4378, 48.8566, 2.3522);
    expect(km).toBeGreaterThan(870);
    expect(km).toBeLessThan(900);

    const bearing = computeInitialBearing(50.0755, 14.4378, 48.8566, 2.3522);
    expect(bearingToCompass(bearing)).toBe('W');

    const mid = computeMidpoint(0, 0, 0, 10);
    expect(mid.lat).toBeCloseTo(0, 4);
    expect(mid.lon).toBeCloseTo(5, 4);
  });
});

describe('String-safe Minifier & Beautifier', () => {
  it('preserves URLs inside JS string literals when minifying', () => {
    const js = `// header comment\nconst url = "https://omnidesk.app/a/b"; // trailing\nreturn url;`;
    const min = minifyCode(js, 'js');
    expect(min).toContain('"https://omnidesk.app/a/b"');
    expect(min).not.toContain('header comment');
    expect(min).not.toContain('trailing');
  });

  it('beautifies minified HTML and CSS cleanly', () => {
    const html = beautifyCode('<section><h1>Hi</h1><p>Test</p></section>', 'html', 2);
    expect(html.split('\n').length).toBeGreaterThanOrEqual(4);

    const css = beautifyCode('.a{color:#fff;margin:0}', 'css', 2);
    expect(css).toContain('color: #fff;');
  });
});

describe('JWT Decoder & Web Crypto HMAC Signer/Verifier', () => {
  it('signs and verifies HS256 JWT offline', async () => {
    const secret = 'omnidesk-test-secret';
    const token = await signJwtHmac({ typ: 'JWT' }, { sub: '42', role: 'admin' }, secret, 'HS256');
    const decoded = decodeJwtToken(`Bearer ${token}`);
    expect(decoded.payload.sub).toBe('42');
    expect(decoded.alg).toBe('HS256');

    const ok = await verifyJwtHmac(token, secret);
    expect(ok).toEqual({ valid: true, alg: 'HS256', supported: true });

    const bad = await verifyJwtHmac(token, 'wrong-secret');
    expect(bad.valid).toBe(false);
  });
});

describe('Regex Analysis, Groups & Replace', () => {
  it('extracts capture groups, named groups, highlight segments, and replacement output', () => {
    const res = runRegexAnalysis('(?<user>[a-z]+)@(?<host>[a-z]+\\.[a-z]+)', 'g', 'Mail: ada@omni.app', '[$1 at $2]');
    expect(res.error).toBeNull();
    expect(res.matches).toHaveLength(1);
    expect(res.matches[0].groups).toEqual(['ada', 'omni.app']);
    expect(res.matches[0].namedGroups).toEqual({ user: 'ada', host: 'omni.app' });
    expect(res.replacedText).toBe('Mail: [ada at omni.app]');
    expect(escapeRegexLiteral('a+b*(c)?')).toBe('a\\+b\\*\\(c\\)\\?');
  });
});
