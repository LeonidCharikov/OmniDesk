import { describe, it, expect } from 'vitest';
import { compileSafeMathExpression, evaluateSafeMathExpression } from '../utils/safeMathParser';

describe('safeMathParser', () => {
  it('evaluates basic arithmetic and operator precedence', () => {
    expect(evaluateSafeMathExpression('2 + 3 * 4')).toBe(14);
    expect(evaluateSafeMathExpression('(2 + 3) * 4')).toBe(20);
    expect(evaluateSafeMathExpression('10 - 3 - 2')).toBe(5);
    expect(evaluateSafeMathExpression('10 / 4')).toBe(2.5);
    expect(evaluateSafeMathExpression('10 % 3')).toBe(1);
  });

  it('handles right-associative exponentiation and unary operators', () => {
    expect(evaluateSafeMathExpression('2 ^ 3 ^ 2')).toBe(512);
    expect(evaluateSafeMathExpression('2 ** 5')).toBe(32);
    expect(evaluateSafeMathExpression('-3 + 5')).toBe(2);
    expect(evaluateSafeMathExpression('2 ^ -1')).toBe(0.5);
  });

  it('supports implicit multiplication, constants, and x scope', () => {
    expect(evaluateSafeMathExpression('2x + 1', { x: 4 })).toBe(9);
    expect(evaluateSafeMathExpression('2(x + 3)', { x: 2 })).toBe(10);
    expect(evaluateSafeMathExpression('(x + 1)(x - 1)', { x: 5 })).toBe(24);
    expect(evaluateSafeMathExpression('cos(pi)')).toBeCloseTo(-1, 10);
    expect(evaluateSafeMathExpression('sin(tau / 4)')).toBeCloseTo(1, 10);
    expect(evaluateSafeMathExpression('ln(e)')).toBeCloseTo(1, 10);
  });

  it('compiles reusable f(x) functions cleanly', () => {
    const fn = compileSafeMathExpression('x^2 + 3x - 2');
    expect(fn(0)).toBe(-2);
    expect(fn(2)).toBe(8);
    expect(fn(-3)).toBe(-2);
  });

  it('rejects unknown identifiers, window access, or malformed syntax', () => {
    expect(() => evaluateSafeMathExpression('window.location')).toThrow();
    expect(() => evaluateSafeMathExpression('alert(1)')).toThrow();
    expect(() => evaluateSafeMathExpression('constructor')).toThrow();
    expect(() => compileSafeMathExpression('2 + * 3')).toThrow();
    expect(() => compileSafeMathExpression('sin(1')).toThrow();
  });

  it('returns NaN when division by zero produces Infinity', () => {
    const fn = compileSafeMathExpression('1 / x');
    expect(Number.isNaN(fn(0))).toBe(true);
    expect(fn(2)).toBe(0.5);
  });
});
