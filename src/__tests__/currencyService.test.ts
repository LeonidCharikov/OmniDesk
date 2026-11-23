import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useAppCurrency,
  getCurrencySymbol,
  formatCurrency,
  SUPPORTED_FIAT_CURRENCIES,
  convertFiat,
} from '../services/currencyService';
import { loadUserConfig, saveUserConfig } from '../services/storage';
import { ALL_CURRENCIES, FIATS, CURRENCY_NAMES } from '../components/ui/settings/settingsConstants';

describe('currencyService global currency synchronization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes useAppCurrency from Settings defaultCurrency', () => {
    const base = loadUserConfig();
    saveUserConfig({ ...base, defaultCurrency: 'EUR' });

    const { result } = renderHook(() => useAppCurrency());
    expect(result.current[0]).toBe('EUR');
    expect(getCurrencySymbol(result.current[0])).toBe('€');
  });

  it('reactively updates active tools when Settings defaultCurrency changes', () => {
    const base = loadUserConfig();
    saveUserConfig({ ...base, defaultCurrency: 'CZK' });

    const { result } = renderHook(() => useAppCurrency());
    expect(result.current[0]).toBe('CZK');

    act(() => {
      const updated = loadUserConfig();
      saveUserConfig({
        ...updated,
        defaultCurrency: 'USD',
        widgets: { ...updated.widgets, selectedFiat: 'USD' },
      });
    });

    expect(result.current[0]).toBe('USD');
    expect(formatCurrency(1250, result.current[0], 'en-US')).toBe('1,250 $');
  });

  it('persists currency updates to UserConfig when updateCurrency is invoked', () => {
    const { result } = renderHook(() => useAppCurrency());

    act(() => {
      result.current[1]('GBP');
    });

    expect(result.current[0]).toBe('GBP');
    const saved = loadUserConfig();
    expect(saved.defaultCurrency).toBe('GBP');
    expect(saved.widgets.selectedFiat).toBe('GBP');
  });

  it('supports Chinese Yuan (CNY) across service, settings, formatting, and conversions', () => {
    expect(SUPPORTED_FIAT_CURRENCIES.some(c => c.code === 'CNY')).toBe(true);
    expect(ALL_CURRENCIES.some(c => c.code === 'CNY')).toBe(true);
    expect(FIATS.some(c => c.code === 'CNY')).toBe(true);
    expect(CURRENCY_NAMES.CNY?.en).toBe('Chinese yuan');
    expect(getCurrencySymbol('CNY')).toBe('¥');
    expect(formatCurrency(1000, 'CNY', 'en-US')).toBe('1,000 ¥');

    const cnyToCzk = convertFiat(100, 'CNY', 'CZK');
    expect(cnyToCzk).toBeCloseTo(328, 1);

    const { result } = renderHook(() => useAppCurrency());
    act(() => {
      result.current[1]('CNY');
    });
    expect(result.current[0]).toBe('CNY');
    expect(loadUserConfig().defaultCurrency).toBe('CNY');
  });
});
