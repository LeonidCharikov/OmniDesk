import React, { useState } from 'react';
import { 
  Grid, 
  Sparkles, 
  RefreshCw, 
  ArrowRight, 
  Check, 
  Copy, 
  AlertCircle, 
  Plus, 
  Minus, 
  Shuffle, 
  Trash2, 
  ArrowLeftRight 
} from 'lucide-react';
import { useI18n } from '../../i18n/context';

type Matrix = number[][];

export const MatrixCalculatorTool: React.FC = () => {
  const { t, currentLanguage } = useI18n();

  // Dimension state for custom sizes (rows x cols) between 1 and 6
  const [rowsA, setRowsA] = useState<number>(3);
  const [colsA, setColsA] = useState<number>(3);
  const [rowsB, setRowsB] = useState<number>(3);
  const [colsB, setColsB] = useState<number>(3);

  const [matrixA, setMatrixA] = useState<Matrix>([
    [2, 1, -1],
    [-3, -1, 2],
    [-2, 1, 2],
  ]);

  const [matrixB, setMatrixB] = useState<Matrix>([
    [1, 0, 2],
    [0, 1, -1],
    [3, -2, 1],
  ]);

  const [scalar, setScalar] = useState<number>(2);
  const [resultMatrix, setResultMatrix] = useState<Matrix | null>(null);
  const [scalarResult, setScalarResult] = useState<number | null>(null);
  const [operationLabel, setOperationLabel] = useState<string>('Vyberte maticovou operaci');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Helper to resize matrix preserving existing cells
  const resizeMatrix = (mat: Matrix, targetRows: number, targetCols: number): Matrix => {
    return Array.from({ length: targetRows }, (_, r) =>
      Array.from({ length: targetCols }, (_, c) => {
        if (mat[r] && mat[r][c] !== undefined) return mat[r][c];
        return r === c ? 1 : 0;
      })
    );
  };

  const updateRowsA = (newR: number) => {
    const valid = Math.max(1, Math.min(6, newR));
    setRowsA(valid);
    setMatrixA(prev => resizeMatrix(prev, valid, colsA));
    setResultMatrix(null);
    setScalarResult(null);
    setError(null);
  };

  const updateColsA = (newC: number) => {
    const valid = Math.max(1, Math.min(6, newC));
    setColsA(valid);
    setMatrixA(prev => resizeMatrix(prev, rowsA, valid));
    setResultMatrix(null);
    setScalarResult(null);
    setError(null);
  };

  const updateRowsB = (newR: number) => {
    const valid = Math.max(1, Math.min(6, newR));
    setRowsB(valid);
    setMatrixB(prev => resizeMatrix(prev, valid, colsB));
    setResultMatrix(null);
    setScalarResult(null);
    setError(null);
  };

  const updateColsB = (newC: number) => {
    const valid = Math.max(1, Math.min(6, newC));
    setColsB(valid);
    setMatrixB(prev => resizeMatrix(prev, rowsB, valid));
    setResultMatrix(null);
    setScalarResult(null);
    setError(null);
  };

  // Quick Presets
  const applyPreset = (rA: number, cA: number, rB: number, cB: number) => {
    setRowsA(rA);
    setColsA(cA);
    setRowsB(rB);
    setColsB(cB);
    setMatrixA(prev => resizeMatrix(prev, rA, cA));
    setMatrixB(prev => resizeMatrix(prev, rB, cB));
    setResultMatrix(null);
    setScalarResult(null);
    setError(null);
  };

  const handleCellChange = (mat: 'A' | 'B', r: number, c: number, val: string) => {
    const num = parseFloat(val) || 0;
    if (mat === 'A') {
      const copy = matrixA.map(row => [...row]);
      copy[r][c] = num;
      setMatrixA(copy);
    } else {
      const copy = matrixB.map(row => [...row]);
      copy[r][c] = num;
      setMatrixB(copy);
    }
  };

  // Matrix fills
  const fillRandom = (mat: 'A' | 'B') => {
    if (mat === 'A') {
      setMatrixA(Array.from({ length: rowsA }, () =>
        Array.from({ length: colsA }, () => Math.floor(Math.random() * 19) - 9)
      ));
    } else {
      setMatrixB(Array.from({ length: rowsB }, () =>
        Array.from({ length: colsB }, () => Math.floor(Math.random() * 19) - 9)
      ));
    }
  };

  const fillIdentity = (mat: 'A' | 'B') => {
    if (mat === 'A') {
      setMatrixA(Array.from({ length: rowsA }, (_, r) =>
        Array.from({ length: colsA }, (_, c) => (r === c ? 1 : 0))
      ));
    } else {
      setMatrixB(Array.from({ length: rowsB }, (_, r) =>
        Array.from({ length: colsB }, (_, c) => (r === c ? 1 : 0))
      ));
    }
  };

  const fillZero = (mat: 'A' | 'B') => {
    if (mat === 'A') {
      setMatrixA(Array.from({ length: rowsA }, () => Array(colsA).fill(0)));
    } else {
      setMatrixB(Array.from({ length: rowsB }, () => Array(colsB).fill(0)));
    }
  };

  const swapMatrices = () => {
    const tempRows = rowsA;
    const tempCols = colsA;
    const tempMat = matrixA;
    setRowsA(rowsB);
    setColsA(colsB);
    setMatrixA(matrixB);
    setRowsB(tempRows);
    setColsB(tempCols);
    setMatrixB(tempMat);
    setResultMatrix(null);
    setScalarResult(null);
  };

  // Math algorithms
  const computeDeterminant = (m: Matrix): number => {
    const n = m.length;
    if (n === 1) return m[0][0];
    if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];

    let det = 0;
    for (let c = 0; c < n; c++) {
      const sub = m.slice(1).map(row => row.filter((_, colIdx) => colIdx !== c));
      det += Math.pow(-1, c) * m[0][c] * computeDeterminant(sub);
    }
    return det;
  };

  // General matrix inversion via Gauss-Jordan elimination with partial pivoting (up to 6x6)
  const invertMatrix = (m: Matrix): Matrix | null => {
    const n = m.length;
    // Build augmented matrix [m | I]
    const aug: number[][] = Array.from({ length: n }, (_, r) =>
      Array.from({ length: 2 * n }, (_, c) => {
        if (c < n) return m[r][c];
        return c - n === r ? 1 : 0;
      })
    );

    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      let maxVal = Math.abs(aug[i][i]);
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(aug[k][i]) > maxVal) {
          maxVal = Math.abs(aug[k][i]);
          maxRow = k;
        }
      }

      if (maxVal < 1e-10) {
        return null; // Singular matrix
      }

      // Swap rows
      if (maxRow !== i) {
        const temp = aug[i];
        aug[i] = aug[maxRow];
        aug[maxRow] = temp;
      }

      // Scale pivot row to 1
      const pivot = aug[i][i];
      for (let j = 0; j < 2 * n; j++) {
        aug[i][j] /= pivot;
      }

      // Eliminate column
      for (let r = 0; r < n; r++) {
        if (r !== i) {
          const factor = aug[r][i];
          for (let j = 0; j < 2 * n; j++) {
            aug[r][j] -= factor * aug[i][j];
          }
        }
      }
    }

    // Extract inverse
    const inv: Matrix = Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c) => aug[r][c + n])
    );
    return inv;
  };

  const handleDeterminant = (mat: 'A' | 'B') => {
    setError(null);
    const rows = mat === 'A' ? rowsA : rowsB;
    const cols = mat === 'A' ? colsA : colsB;
    const target = mat === 'A' ? matrixA : matrixB;

    if (rows !== cols) {
      setError(`Determinant lze počítat pouze pro čtvercové matice! Matice ${mat} má rozměr ${rows} × ${cols}.`);
      return;
    }
    const det = computeDeterminant(target);
    setScalarResult(det);
    setResultMatrix(null);
    setOperationLabel(`Determinant det(${mat}) = ${det}`);
  };

  const handleTrace = (mat: 'A' | 'B') => {
    setError(null);
    const rows = mat === 'A' ? rowsA : rowsB;
    const cols = mat === 'A' ? colsA : colsB;
    const target = mat === 'A' ? matrixA : matrixB;

    if (rows !== cols) {
      setError(`Stopu lze počítat pouze pro čtvercové matice! Matice ${mat} má rozměr ${rows} × ${cols}.`);
      return;
    }
    let tr = 0;
    for (let i = 0; i < rows; i++) tr += target[i][i];
    setScalarResult(tr);
    setResultMatrix(null);
    setOperationLabel(`Stopa matice tr(${mat}) = ${tr}`);
  };

  const handleInverse = (mat: 'A' | 'B') => {
    setError(null);
    const rows = mat === 'A' ? rowsA : rowsB;
    const cols = mat === 'A' ? colsA : colsB;
    const target = mat === 'A' ? matrixA : matrixB;

    if (rows !== cols) {
      setError(`Inverzní matici lze počítat pouze pro čtvercové matice! Matice ${mat} má rozměr ${rows} × ${cols}.`);
      return;
    }

    const det = computeDeterminant(target);
    if (Math.abs(det) < 1e-9) {
      setError(`Matice ${mat} je singulární (det(${mat}) = 0), inverzní matice neexistuje!`);
      setResultMatrix(null);
      setScalarResult(null);
      return;
    }

    const inv = invertMatrix(target);
    if (!inv) {
      setError(`Matice ${mat} je singulární a nelze ji invertovat.`);
      return;
    }

    setResultMatrix(inv);
    setScalarResult(null);
    setOperationLabel(`Inverzní matice (${mat}⁻¹) [${rows} × ${cols}]`);
  };

  const handleTranspose = (mat: 'A' | 'B') => {
    setError(null);
    const rows = mat === 'A' ? rowsA : rowsB;
    const cols = mat === 'A' ? colsA : colsB;
    const target = mat === 'A' ? matrixA : matrixB;

    const res: Matrix = Array.from({ length: cols }, (_, r) =>
      Array.from({ length: rows }, (_, c) => target[c][r])
    );
    setResultMatrix(res);
    setScalarResult(null);
    setOperationLabel(`Transpozice (${mat}ᵀ) [${cols} × ${rows}]`);
  };

  const handleAddition = () => {
    setError(null);
    if (rowsA !== rowsB || colsA !== colsB) {
      setError(`Pro sčítání musí mít obě matice stejný rozměr! A má ${rowsA}×${colsA}, B má ${rowsB}×${colsB}.`);
      return;
    }
    const res: Matrix = Array.from({ length: rowsA }, (_, r) =>
      Array.from({ length: colsA }, (_, c) => matrixA[r][c] + matrixB[r][c])
    );
    setResultMatrix(res);
    setScalarResult(null);
    setOperationLabel(`Součet matic (A + B) [${rowsA} × ${colsA}]`);
  };

  const handleSubtraction = () => {
    setError(null);
    if (rowsA !== rowsB || colsA !== colsB) {
      setError(`Pro odčítání musí mít obě matice stejný rozměr! A má ${rowsA}×${colsA}, B má ${rowsB}×${colsB}.`);
      return;
    }
    const res: Matrix = Array.from({ length: rowsA }, (_, r) =>
      Array.from({ length: colsA }, (_, c) => matrixA[r][c] - matrixB[r][c])
    );
    setResultMatrix(res);
    setScalarResult(null);
    setOperationLabel(`Rozdíl matic (A - B) [${rowsA} × ${colsA}]`);
  };

  const handleMultiplicationAB = () => {
    setError(null);
    if (colsA !== rowsB) {
      setError(`Pro násobení A × B se musí počet sloupců A (${colsA}) rovnat počtu řádků B (${rowsB})!`);
      return;
    }
    const res: Matrix = Array.from({ length: rowsA }, () => Array(colsB).fill(0));
    for (let r = 0; r < rowsA; r++) {
      for (let c = 0; c < colsB; c++) {
        let sum = 0;
        for (let k = 0; k < colsA; k++) {
          sum += matrixA[r][k] * matrixB[k][c];
        }
        res[r][c] = sum;
      }
    }
    setResultMatrix(res);
    setScalarResult(null);
    setOperationLabel(`Násobení matic (A × B) [Výsledek: ${rowsA} × ${colsB}]`);
  };

  const handleMultiplicationBA = () => {
    setError(null);
    if (colsB !== rowsA) {
      setError(`Pro násobení B × A se musí počet sloupců B (${colsB}) rovnat počtu řádků A (${rowsA})!`);
      return;
    }
    const res: Matrix = Array.from({ length: rowsB }, () => Array(colsA).fill(0));
    for (let r = 0; r < rowsB; r++) {
      for (let c = 0; c < colsA; c++) {
        let sum = 0;
        for (let k = 0; k < colsB; k++) {
          sum += matrixB[r][k] * matrixA[k][c];
        }
        res[r][c] = sum;
      }
    }
    setResultMatrix(res);
    setScalarResult(null);
    setOperationLabel(`Násobení matic (B × A) [Výsledek: ${rowsB} × ${colsA}]`);
  };

  const handleScalar = (mat: 'A' | 'B') => {
    setError(null);
    const rows = mat === 'A' ? rowsA : rowsB;
    const cols = mat === 'A' ? colsA : colsB;
    const target = mat === 'A' ? matrixA : matrixB;

    const res: Matrix = target.map(row => row.map(v => v * scalar));
    setResultMatrix(res);
    setScalarResult(null);
    setOperationLabel(`Skalární násobek (${scalar} · ${mat}) [${rows} × ${cols}]`);
  };

  const copyResult = () => {
    if (scalarResult !== null) {
      navigator.clipboard.writeText(scalarResult.toString());
    } else if (resultMatrix) {
      const text = resultMatrix.map(row => row.map(v => (Number.isInteger(v) ? v : v.toFixed(3))).join('\t')).join('\n');
      navigator.clipboard.writeText(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canMultiplyAB = colsA === rowsB;
  const canMultiplyBA = colsB === rowsA;
  const canAddSub = rowsA === rowsB && colsA === colsB;

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {currentLanguage === 'cs' ? 'Maticová Kalkulačka (Dynamické Rozměry)' :
             currentLanguage === 'ru' ? 'Матричный Калькулятор (Динамические Размеры)' :
             currentLanguage === 'de' ? 'Matrix-Rechner (Dynamische Dimensionen)' :
             currentLanguage === 'es' ? 'Calculadora de Matrices (Dimensiones Dinámicas)' :
             'Matrix Calculator (Dynamic Dimensions)'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {currentLanguage === 'cs' ? 'Libovolně nastavitelné rozměry matic A (M × K) a B (K × N) od 1×1 do 6×6, násobení A×B a B×A, inverze i determinanty.' :
             currentLanguage === 'ru' ? 'Произвольные размеры матриц A (M × K) и B (K × N) от 1×1 до 6×6, умножение A×B и B×A, обратные матрицы и определители.' :
             currentLanguage === 'de' ? 'Beliebige Dimensionen für Matrizen A (M × K) und B (K × N) von 1×1 bis 6×6, Multiplikation, Inverse und Determinanten.' :
             currentLanguage === 'es' ? 'Dimensiones arbitrarias de matrices A (M × K) y B (K × N) de 1×1 a 6×6, multiplicación, inversas y determinantes.' :
             'Fully customizable matrix dimensions A (M × K) and B (K × N) from 1×1 to 6×6, multiplication, inversion, and determinants.'}
          </p>
        </div>

        {/* Dimension Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-500 px-2 font-medium">{t('matrix_presets', 'Presety:')}</span>
          <button
            onClick={() => applyPreset(2, 2, 2, 2)}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono transition-colors"
          >
            2×2
          </button>
          <button
            onClick={() => applyPreset(3, 3, 3, 3)}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono transition-colors"
          >
            3×3
          </button>
          <button
            onClick={() => applyPreset(4, 4, 4, 4)}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono transition-colors"
          >
            4×4
          </button>
          <button
            onClick={() => applyPreset(2, 3, 3, 2)}
            className="px-2 py-1 rounded bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-300 font-mono transition-colors"
            title="Multiplication ready: A(2x3) x B(3x2) -> 2x2"
          >
            2×3 & 3×2
          </button>
          <button
            onClick={() => applyPreset(3, 1, 1, 3)}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono transition-colors"
          >
            3×1 & 1×3
          </button>
        </div>
      </div>

      {/* Matrices Input Grids with Custom Dimension Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Matrix A */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-400 font-bold text-xs">
                {t('matrix_matrix_a', 'Matice A')} ({rowsA} × {colsA})
              </span>
              {rowsA === colsA && (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  {t('matrix_square', 'Čtvercová')}
                </span>
              )}
            </div>

            {/* Stepper Dimension controls */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                <span className="text-slate-400 mr-1">R:</span>
                <button
                  onClick={() => updateRowsA(rowsA - 1)}
                  disabled={rowsA <= 1}
                  className="w-5 h-5 flex items-center justify-center rounded bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-4 text-center text-white font-bold">{rowsA}</span>
                <button
                  onClick={() => updateRowsA(rowsA + 1)}
                  disabled={rowsA >= 6}
                  className="w-5 h-5 flex items-center justify-center rounded bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <span className="text-slate-500">×</span>

              <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                <span className="text-slate-400 mr-1">C:</span>
                <button
                  onClick={() => updateColsA(colsA - 1)}
                  disabled={colsA <= 1}
                  className="w-5 h-5 flex items-center justify-center rounded bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-4 text-center text-white font-bold">{colsA}</span>
                <button
                  onClick={() => updateColsA(colsA + 1)}
                  disabled={colsA >= 6}
                  className="w-5 h-5 flex items-center justify-center rounded bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Matrix Action Buttons */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => fillRandom('A')}
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-950 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            >
              <Shuffle className="w-3 h-3" /> {t('matrix_random', 'Náhodná')}
            </button>
            <button
              onClick={() => fillIdentity('A')}
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-950 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            >
              {t('matrix_identity', 'Jednotková (I)')}
            </button>
            <button
              onClick={() => fillZero('A')}
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-950 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> {t('matrix_zero', 'Nulovat')}
            </button>
          </div>

          <div
            className="grid gap-2 overflow-x-auto p-3 bg-slate-950/70 rounded-xl border border-slate-900"
            style={{ gridTemplateColumns: `repeat(${colsA}, minmax(44px, 1fr))` }}
          >
            {matrixA.map((row, r) =>
              row.map((val, c) => (
                <input
                  key={`a-${r}-${c}`}
                  type="number"
                  step="any"
                  value={val}
                  onChange={e => handleCellChange('A', r, c, e.target.value)}
                  className="w-full py-2 px-1 text-center font-mono text-sm bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-white tabular-nums transition-colors"
                />
              ))
            )}
          </div>

          {/* Individual A operations */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <button
              onClick={() => handleTranspose('A')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition-colors"
            >
              {t('matrix_transpose_a', 'Transpozice Aᵀ')}
            </button>
            <button
              onClick={() => handleInverse('A')}
              disabled={rowsA !== colsA}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono disabled:opacity-40 transition-colors"
            >
              {t('matrix_inverse_a', 'Inverze A⁻¹')}
            </button>
            <button
              onClick={() => handleDeterminant('A')}
              disabled={rowsA !== colsA}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono disabled:opacity-40 transition-colors"
            >
              det(A)
            </button>
            <button
              onClick={() => handleTrace('A')}
              disabled={rowsA !== colsA}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono disabled:opacity-40 transition-colors"
            >
              tr(A)
            </button>
            <button
              onClick={() => handleScalar('A')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition-colors"
            >
              {scalar} · A
            </button>
          </div>
        </div>

        {/* Matrix B */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-400 font-bold text-xs">
                {t('matrix_matrix_b', 'Matice B')} ({rowsB} × {colsB})
              </span>
              {rowsB === colsB && (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  {t('matrix_square', 'Čtvercová')}
                </span>
              )}
            </div>

            {/* Stepper Dimension controls */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                <span className="text-slate-400 mr-1">R:</span>
                <button
                  onClick={() => updateRowsB(rowsB - 1)}
                  disabled={rowsB <= 1}
                  className="w-5 h-5 flex items-center justify-center rounded bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-4 text-center text-white font-bold">{rowsB}</span>
                <button
                  onClick={() => updateRowsB(rowsB + 1)}
                  disabled={rowsB >= 6}
                  className="w-5 h-5 flex items-center justify-center rounded bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <span className="text-slate-500">×</span>

              <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                <span className="text-slate-400 mr-1">C:</span>
                <button
                  onClick={() => updateColsB(colsB - 1)}
                  disabled={colsB <= 1}
                  className="w-5 h-5 flex items-center justify-center rounded bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-4 text-center text-white font-bold">{colsB}</span>
                <button
                  onClick={() => updateColsB(colsB + 1)}
                  disabled={colsB >= 6}
                  className="w-5 h-5 flex items-center justify-center rounded bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Matrix Action Buttons */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => fillRandom('B')}
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-950 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            >
              <Shuffle className="w-3 h-3" /> {t('matrix_random', 'Náhodná')}
            </button>
            <button
              onClick={() => fillIdentity('B')}
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-950 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            >
              {t('matrix_identity', 'Jednotková (I)')}
            </button>
            <button
              onClick={() => fillZero('B')}
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-950 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> {t('matrix_zero', 'Nulovat')}
            </button>
            <button
              onClick={swapMatrices}
              className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-950/40 text-indigo-300 hover:text-white border border-indigo-800/40 ml-auto transition-colors"
              title="Prohodit matici A a matici B"
            >
              <ArrowLeftRight className="w-3 h-3" /> {t('matrix_swap_ab', 'Prohodit A ↔ B')}
            </button>
          </div>

          <div
            className="grid gap-2 overflow-x-auto p-3 bg-slate-950/70 rounded-xl border border-slate-900"
            style={{ gridTemplateColumns: `repeat(${colsB}, minmax(44px, 1fr))` }}
          >
            {matrixB.map((row, r) =>
              row.map((val, c) => (
                <input
                  key={`b-${r}-${c}`}
                  type="number"
                  step="any"
                  value={val}
                  onChange={e => handleCellChange('B', r, c, e.target.value)}
                  className="w-full py-2 px-1 text-center font-mono text-sm bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-lg text-white tabular-nums transition-colors"
                />
              ))
            )}
          </div>

          {/* Individual B operations */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <button
              onClick={() => handleTranspose('B')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition-colors"
            >
              {t('matrix_transpose_b', 'Transpozice Bᵀ')}
            </button>
            <button
              onClick={() => handleInverse('B')}
              disabled={rowsB !== colsB}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono disabled:opacity-40 transition-colors"
            >
              {t('matrix_inverse_b', 'Inverze B⁻¹')}
            </button>
            <button
              onClick={() => handleDeterminant('B')}
              disabled={rowsB !== colsB}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono disabled:opacity-40 transition-colors"
            >
              det(B)
            </button>
            <button
              onClick={() => handleTrace('B')}
              disabled={rowsB !== colsB}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono disabled:opacity-40 transition-colors"
            >
              tr(B)
            </button>
            <button
              onClick={() => handleScalar('B')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition-colors"
            >
              {scalar} · B
            </button>
          </div>
        </div>
      </div>

      {/* Main Operations Panel */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            {t('matrix_binary_ops', 'Maticové Binární Operace (A a B)')}
          </span>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">{t('scalar_k', 'Skalár k:')}</span>
            <input
              type="number"
              step="any"
              value={scalar}
              onChange={e => setScalar(parseFloat(e.target.value) || 1)}
              className="w-16 px-2 py-1 bg-slate-950 border border-slate-800 rounded-md text-center text-white font-mono"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Multiplication A x B */}
          <button
            onClick={handleMultiplicationAB}
            disabled={!canMultiplyAB}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${
              canMultiplyAB
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950'
                : 'bg-slate-800/60 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span>{t('matrix_mult_ab', 'Násobení A × B')}</span>
            <span className="text-[10px] opacity-80 font-mono">
              ({rowsA}×{colsA} × {rowsB}×{colsB} {canMultiplyAB ? `→ ${rowsA}×${colsB}` : '≠'})
            </span>
          </button>

          {/* Multiplication B x A */}
          <button
            onClick={handleMultiplicationBA}
            disabled={!canMultiplyBA}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${
              canMultiplyBA
                ? 'bg-rose-600/80 hover:bg-rose-600 text-white'
                : 'bg-slate-800/60 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span>{t('matrix_mult_ba', 'Násobení B × A')}</span>
            <span className="text-[10px] opacity-80 font-mono">
              ({rowsB}×{colsB} × {rowsA}×{colsA} {canMultiplyBA ? `→ ${rowsB}×${colsA}` : '≠'})
            </span>
          </button>

          {/* Addition */}
          <button
            onClick={handleAddition}
            disabled={!canAddSub}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${
              canAddSub
                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                : 'bg-slate-800/40 text-slate-500 cursor-not-allowed'
            }`}
          >
            {t('matrix_sum_ab', 'Součet (A + B)')}
          </button>

          {/* Subtraction */}
          <button
            onClick={handleSubtraction}
            disabled={!canAddSub}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${
              canAddSub
                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                : 'bg-slate-800/40 text-slate-500 cursor-not-allowed'
            }`}
          >
            {t('matrix_diff_ab', 'Rozdíl (A - B)')}
          </button>
        </div>

        {/* Compatibility Hints */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${canMultiplyAB ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span>
              {t('matrix_mult_ab', 'Násobení A × B')}: {canMultiplyAB ? `${t('matrix_compatible', 'Kompatibilní')} (${t('matrix_cols', 'Sloupce')} A ${colsA} = ${t('matrix_rows', 'Řádky')} B ${rowsB})` : `${t('matrix_incompatible', 'Nelze')} (${t('matrix_cols', 'Sloupce')} A ${colsA} ≠ ${t('matrix_rows', 'Řádky')} B ${rowsB})`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${canAddSub ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            <span>
              {t('matrix_add_sub', 'Sčítání A ± B')}: {canAddSub ? `${t('matrix_same_dimension', 'Stejný rozměr')} (${rowsA}×${colsA})` : t('matrix_diff_dimensions', 'Různé rozměry')}
            </span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Result Display */}
      {(resultMatrix || scalarResult !== null) && (
        <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-900/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-white">{operationLabel}</span>
            </div>

            <button
              onClick={copyResult}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium border border-indigo-500/30 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t('copied', 'Zkopírováno') : t('copy_result', 'Kopírovat výsledek')}</span>
            </button>
          </div>

          {scalarResult !== null ? (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block mb-1">{t('scalar_value', 'Skalární hodnota:')}</span>
              <span className="text-3xl font-mono font-bold text-indigo-400 tabular-nums">
                {Number.isInteger(scalarResult) ? scalarResult : scalarResult.toFixed(4)}
              </span>
            </div>
          ) : resultMatrix ? (
            <div className="overflow-x-auto p-4 bg-slate-950 rounded-xl border border-slate-900">
              <div
                className="grid gap-2 inline-grid min-w-full"
                style={{ gridTemplateColumns: `repeat(${resultMatrix[0].length}, minmax(56px, 1fr))` }}
              >
                {resultMatrix.map((row, r) =>
                  row.map((val, c) => (
                    <div
                      key={`res-${r}-${c}`}
                      className="p-2.5 text-center font-mono text-sm bg-slate-900/90 border border-slate-800 rounded-lg text-indigo-200 tabular-nums font-semibold"
                    >
                      {Math.abs(val) < 1e-10 ? '0' : Number.isInteger(val) ? val : val.toFixed(3)}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
