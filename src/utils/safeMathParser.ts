/**
 * Deterministic recursive-descent mathematical expression parser.
 * Evaluates arithmetic, powers, and whitelisted math functions without eval/new Function.
 */

export interface MathEvalScope {
  x?: number;
}

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
};

const FUNCTIONS: Record<string, (v: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  sqrt: Math.sqrt,
  abs: Math.abs,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  log2: Math.log2,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
};

type Token =
  | { type: 'number'; value: number }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = expr.length;

  while (i < len) {
    const ch = expr[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen' });
      i++;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i++;
      continue;
    }

    if (ch === '*' && expr[i + 1] === '*') {
      tokens.push({ type: 'op', value: '^' });
      i += 2;
      continue;
    }

    if ('+-*/^%'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      let start = i;
      let hasDot = ch === '.';
      i++;
      while (i < len && (/[0-9]/.test(expr[i]) || (!hasDot && expr[i] === '.'))) {
        if (expr[i] === '.') hasDot = true;
        i++;
      }
      // Scientific notation (e.g., 1e-5, 2.5E+3)
      if (i < len && (expr[i] === 'e' || expr[i] === 'E')) {
        const next = expr[i + 1];
        const next2 = expr[i + 2];
        if ((next && /[0-9]/.test(next)) || ((next === '+' || next === '-') && next2 && /[0-9]/.test(next2))) {
          i++;
          if (expr[i] === '+' || expr[i] === '-') i++;
          while (i < len && /[0-9]/.test(expr[i])) i++;
        }
      }
      const num = Number(expr.slice(start, i));
      if (!Number.isFinite(num)) {
        throw new Error(`Invalid number literal`);
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      const start = i;
      i++;
      while (i < len && /[a-zA-Z0-9_]/.test(expr[i])) {
        i++;
      }
      tokens.push({ type: 'ident', value: expr.slice(start, i).toLowerCase() });
      continue;
    }

    throw new Error(`Unexpected character "${ch}"`);
  }

  return tokens;
}

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[], private readonly scope: MathEvalScope) {}

  parse(): number {
    if (this.tokens.length === 0) return NaN;
    const result = this.parseAddSub();
    if (this.pos < this.tokens.length) {
      throw new Error('Unexpected trailing token');
    }
    return result;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    return this.tokens[this.pos++];
  }

  private parseAddSub(): number {
    let left = this.parseMulDiv();
    while (true) {
      const tok = this.peek();
      if (tok?.type === 'op' && (tok.value === '+' || tok.value === '-')) {
        this.consume();
        const right = this.parseMulDiv();
        left = tok.value === '+' ? left + right : left - right;
      } else {
        break;
      }
    }
    return left;
  }

  private parseMulDiv(): number {
    let left = this.parseUnary();
    while (true) {
      const tok = this.peek();
      if (tok?.type === 'op' && (tok.value === '*' || tok.value === '/' || tok.value === '%')) {
        this.consume();
        const right = this.parseUnary();
        if (tok.value === '*') left *= right;
        else if (tok.value === '/') left /= right;
        else left %= right;
      } else if (tok?.type === 'lparen' || tok?.type === 'ident') {
        // Support implicit multiplication like 2x, 2(x+1), (x+1)(x-1)
        const right = this.parseUnary();
        left *= right;
      } else {
        break;
      }
    }
    return left;
  }

  private parseUnary(): number {
    const tok = this.peek();
    if (tok?.type === 'op' && (tok.value === '+' || tok.value === '-')) {
      this.consume();
      const val = this.parseUnary();
      return tok.value === '-' ? -val : val;
    }
    return this.parsePower();
  }

  private parsePower(): number {
    const base = this.parsePrimary();
    const tok = this.peek();
    if (tok?.type === 'op' && tok.value === '^') {
      this.consume();
      // Right-associative exponentiation, allowing unary minus in exponent (e.g., 2^-1)
      const exponent = this.parseUnary();
      return Math.pow(base, exponent);
    }
    return base;
  }

  private parsePrimary(): number {
    const tok = this.peek();
    if (!tok) {
      throw new Error('Unexpected end of expression');
    }

    if (tok.type === 'number') {
      this.consume();
      return tok.value;
    }

    if (tok.type === 'lparen') {
      this.consume();
      const val = this.parseAddSub();
      const close = this.peek();
      if (close?.type !== 'rparen') {
        throw new Error('Missing closing parenthesis');
      }
      this.consume();
      return val;
    }

    if (tok.type === 'ident') {
      this.consume();
      const name = tok.value;

      if (this.peek()?.type === 'lparen') {
        const fn = FUNCTIONS[name];
        if (!fn) {
          throw new Error(`Unknown function "${name}"`);
        }
        this.consume(); // '('
        const arg = this.parseAddSub();
        const close = this.peek();
        if (close?.type !== 'rparen') {
          throw new Error(`Missing closing parenthesis after ${name}(...)`);
        }
        this.consume(); // ')'
        return fn(arg);
      }

      if (name === 'x' && typeof this.scope.x === 'number') {
        return this.scope.x;
      }

      if (Object.prototype.hasOwnProperty.call(CONSTANTS, name)) {
        return CONSTANTS[name];
      }

      throw new Error(`Unknown identifier "${name}"`);
    }

    throw new Error('Invalid syntax');
  }
}

export function compileSafeMathExpression(expr: string): (x?: number) => number {
  const tokens = tokenize(expr);
  if (tokens.length === 0) {
    return () => NaN;
  }
  // Validate structure once at compile time with x = 0 so invalid syntax fails fast
  const validator = new Parser(tokens, { x: 0 });
  validator.parse();

  return (x = 0) => {
    try {
      const parser = new Parser(tokens, { x });
      const val = parser.parse();
      return typeof val === 'number' && !Number.isNaN(val) && Number.isFinite(val) ? val : NaN;
    } catch {
      return NaN;
    }
  };
}

export function evaluateSafeMathExpression(expr: string, scope: MathEvalScope = {}): number {
  const tokens = tokenize(expr);
  const parser = new Parser(tokens, scope);
  const val = parser.parse();
  return typeof val === 'number' && Number.isFinite(val) ? val : NaN;
}
