import React, { useMemo, useState } from 'react';
import { Binary } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { SendToToolButton } from '../../components/ui/SendToToolButton';
import { analyzeBooleanExpression } from '../../utils/mathSuite.logic';

const GRAY_2 = ['0', '1'];
const GRAY_4 = ['00', '01', '11', '10'];

export const BooleanAlgebraTool: React.FC = () => {
  const { t } = useI18n();
  const [expr, setExpr] = useState('(A AND B) OR (NOT A AND C)');

  const analysis = useMemo(() => {
    try {
      return { data: analyzeBooleanExpression(expr), error: null as string | null };
    } catch {
      return { data: null, error: t('bool_invalid', 'Invalid boolean expression. Use AND, OR, NOT, XOR, NAND, NOR, ->, <->.') };
    }
  }, [expr, t]);

  const kmap = useMemo(() => {
    const data = analysis.data;
    if (!data || data.variables.length < 2 || data.variables.length > 4) return null;
    const n = data.variables.length;
    const rowBits = n === 4 ? GRAY_4 : GRAY_2;
    const colBits = n === 2 ? GRAY_2 : GRAY_4;
    const rowLabel = n === 4 ? `${data.variables[0]}${data.variables[1]}` : data.variables[0];
    const colLabel =
      n === 2
        ? data.variables[1]
        : n === 3
          ? `${data.variables[1]}${data.variables[2]}`
          : `${data.variables[2]}${data.variables[3]}`;

    const outMap = new Map<number, boolean>(data.rows.map(r => [r.index, r.output]));
    const grid = rowBits.map(rb =>
      colBits.map(cb => {
        const idx = parseInt(rb + cb, 2);
        return { idx, val: Boolean(outMap.get(idx)) };
      })
    );
    return { rowLabel, colLabel, rowBits, colBits, grid };
  }, [analysis.data]);

  const getPipeText = () => {
    const d = analysis.data;
    if (!d) return '';
    return [
      `Expression: ${expr}`,
      `Simplified SOP: ${d.simplifiedSop}`,
      `Canonical SOP: ${d.canonicalSop}`,
      `Minterms: Σm(${d.minterms.join(', ')})`,
    ].join('\n');
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Binary className="w-5 h-5 text-indigo-400" />
            {t('tool_boolean_algebra_title', 'Boolean Algebra & Truth Table Studio')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_boolean_algebra_desc', 'Generate truth tables, 2–4 variable Karnaugh maps, canonical SOP/POS, and simplified expressions.')}
          </p>
        </div>
        <SendToToolButton sourceToolId="boolean-algebra" getText={getPipeText} />
      </div>

      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <label className="text-xs text-slate-400 block">
          {t('bool_expr_label', 'Logic Expression (up to 4 variables, e.g. A, B, C, D)')}
          <input
            type="text"
            value={expr}
            onChange={e => setExpr(e.target.value)}
            className="mt-1 w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-indigo-300"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {[
            '(A AND B) OR (NOT A AND C)',
            'A XOR B',
            '(A -> B) AND (B -> C)',
            '(A AND B) OR (A AND C) OR (B AND C)',
          ].map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setExpr(p)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 hover:border-indigo-500/50"
            >
              {p}
            </button>
          ))}
        </div>

        {analysis.error || !analysis.data ? (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">{analysis.error}</div>
        ) : (
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">{t('bool_simplified_sop', 'Simplified SOP (Quine-McCluskey)')}</span>
                <span className="text-lg font-bold font-mono text-emerald-300 block mt-1">{analysis.data.simplifiedSop}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">{t('bool_minterms', 'Minterms / Maxterms')}</span>
                <div className="text-xs font-mono text-indigo-300 mt-1">Σm({analysis.data.minterms.join(', ')})</div>
                <div className="text-xs font-mono text-slate-400">ΠM({analysis.data.maxterms.join(', ')})</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Truth Table */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                  {t('bool_truth_table', 'Truth Table')}
                </span>
                <table className="w-full text-xs font-mono text-center">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      {analysis.data.variables.map(v => (
                        <th key={v} className="py-1.5 px-2">{v}</th>
                      ))}
                      <th className="py-1.5 px-2 text-indigo-300">OUT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.data.rows.map(row => (
                      <tr key={row.index} className="border-b border-slate-800/50">
                        {analysis.data!.variables.map(v => (
                          <td key={v} className="py-1 px-2 text-slate-300">{row.inputs[v] ? '1' : '0'}</td>
                        ))}
                        <td className={`py-1 px-2 font-bold ${row.output ? 'text-emerald-300' : 'text-slate-500'}`}>
                          {row.output ? '1' : '0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Karnaugh Map */}
              {kmap && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                    {t('bool_kmap', 'Karnaugh Map (Gray Code)')}
                  </span>
                  <table className="w-full text-xs font-mono text-center border-collapse">
                    <thead>
                      <tr>
                        <th className="p-2 text-slate-400 border border-slate-800">
                          {kmap.rowLabel} \ {kmap.colLabel}
                        </th>
                        {kmap.colBits.map(cb => (
                          <th key={cb} className="p-2 text-slate-400 border border-slate-800">{cb}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {kmap.grid.map((row, ri) => (
                        <tr key={ri}>
                          <th className="p-2 text-slate-400 border border-slate-800">{kmap.rowBits[ri]}</th>
                          {row.map(cell => (
                            <td
                              key={cell.idx}
                              className={`p-3 border border-slate-800 font-bold text-sm ${
                                cell.val ? 'bg-indigo-950/60 text-emerald-300' : 'text-slate-500'
                              }`}
                            >
                              {cell.val ? '1' : '0'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
