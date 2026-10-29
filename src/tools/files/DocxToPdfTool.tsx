import React, { useState } from 'react';
import mammoth from 'mammoth';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { 
  FileText, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Sparkles,
  Eye,
  FileCode
} from 'lucide-react';

export const DocxToPdfTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    wordCount: number;
    charCount: number;
    pageCount: number;
    durationMs: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper to create a sample DOCX-like demo text for instant testing
  const loadSampleDocument = () => {
    const sample = `SMLOUVA O POSKYTOVÁNÍ SLUŽEB A TECHNICKÉ PODPOŘE

1. Smluvní strany
Dodavatel: OmniDesk Solutions s.r.o., IČO: 12345678, se sídlem Technologická 10, Praha
Objednatel: Zákazník / Uživatel lokálního softwaru

2. Předmět smlouvy
Předmětem této smlouvy je zajištění plně offline zpracování a konverze digitálních dokumentů.
Veškerá data jsou zpracována výhradně v paměti zařízení zákazníka bez odesílání na vzdálené cloudové servery.

3. Důvěrnost informací
Všechna data podléhají nejpřísnějším standardům ochrany soukromí. Konverzní proces využívá lokální WebAssembly jádro a nativní instrukce procesoru.

4. Technické parametry
- Vstupní formát: Microsoft Word (.docx)
- Výstupní formát: Portable Document Format (PDF 1.7)
- Doba zpracování: < 200 ms
- Způsob uložení: Místní souborový systém`;

    setExtractedText(sample);
    setFile({ name: 'Ukazkovy_dokument.docx', size: 14520 } as File);
    generatePdfFromText(sample, 'Ukazkovy_dokument.pdf');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.docx') && !selectedFile.name.toLowerCase().endsWith('.txt')) {
      setError('Vyberte prosím soubor ve formátu .docx nebo .txt');
      return;
    }

    setError(null);
    setFile(selectedFile);
    setIsProcessing(true);
    const startTime = performance.now();

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      let text = '';

      if (selectedFile.name.toLowerCase().endsWith('.docx')) {
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        const decoder = new TextDecoder('utf-8');
        text = decoder.decode(arrayBuffer);
      }

      setExtractedText(text);
      await generatePdfFromText(text, selectedFile.name.replace(/\.[^/.]+$/, '') + '.pdf', startTime);
    } catch (err: unknown) {
      console.error(err);
      setError('Chyba při čtení souboru: ' + (err instanceof Error ? err.message : 'Neznámá chyba'));
    } finally {
      setIsProcessing(false);
    }
  };

  const generatePdfFromText = async (text: string, outputName: string, startTime: number = performance.now()) => {
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const pageWidth = 595.28; // A4
      const pageHeight = 841.89;
      const margin = 50;
      const fontSize = 10;
      const lineHeight = 15;
      const maxLineWidth = pageWidth - margin * 2;

      // Split into paragraphs and wrap into lines
      const paragraphs = text.split('\n');
      const lines: string[] = [];

      for (const p of paragraphs) {
        if (!p.trim()) {
          lines.push('');
          continue;
        }

        const words = p.split(/\s+/);
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = font.widthOfTextAtSize(testLine, fontSize);
          if (testWidth > maxLineWidth) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) {
          lines.push(currentLine);
        }
      }

      const linesPerPage = Math.floor((pageHeight - margin * 2 - 40) / lineHeight);
      const totalPages = Math.max(1, Math.ceil(lines.length / linesPerPage));

      for (let pageNum = 0; pageNum < totalPages; pageNum++) {
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        
        // Header
        page.drawText(outputName, {
          x: margin,
          y: pageHeight - margin + 15,
          size: 8,
          font: fontBold,
          color: rgb(0.4, 0.45, 0.5),
        });

        // Top subtle divider
        page.drawLine({
          start: { x: margin, y: pageHeight - margin + 8 },
          end: { x: pageWidth - margin, y: pageHeight - margin + 8 },
          thickness: 0.5,
          color: rgb(0.8, 0.85, 0.9),
        });

        // Lines
        const pageLines = lines.slice(pageNum * linesPerPage, (pageNum + 1) * linesPerPage);
        let y = pageHeight - margin - 20;

        for (const line of pageLines) {
          if (line) {
            // Check if title-like
            const isHeading = line === line.toUpperCase() && line.length < 60 && line.length > 3;
            page.drawText(line, {
              x: margin,
              y,
              size: isHeading ? fontSize + 2 : fontSize,
              font: isHeading ? fontBold : font,
              color: isHeading ? rgb(0.1, 0.15, 0.25) : rgb(0.2, 0.2, 0.2),
            });
          }
          y -= lineHeight;
        }

        // Footer pagination
        page.drawText(`Stránka ${pageNum + 1} z ${totalPages}`, {
          x: pageWidth - margin - 60,
          y: margin - 20,
          size: 8,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
      const newUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(newUrl);

      const endTime = performance.now();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setStats({
        wordCount: words,
        charCount: text.length,
        pageCount: totalPages,
        durationMs: Math.round(endTime - startTime),
      });
    } catch (err: unknown) {
      console.error(err);
      setError('Chyba při generování PDF: ' + (err instanceof Error ? err.message : 'Neznámá chyba'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tool Introduction & Security Promise */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Offline DOCX &rarr; PDF Konvertor</h2>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
              100% Offline / Bez odesílání
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Konverze probíhá přímo v paměti přes WebAssembly parser. Žádný bajt neopustí váš počítač.
          </p>
        </div>
        <button
          onClick={loadSampleDocument}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg transition-colors shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          Vyzkoušet na ukázkovém dokumentu
        </button>
      </div>

      {/* Upload Zone */}
      <div className="relative border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-8 transition-colors text-center bg-slate-900/20">
        <input
          type="file"
          accept=".docx,.txt"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="flex flex-col items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <p className="text-base font-medium text-slate-200">
            Přetáhněte sem soubor <span className="text-indigo-400 font-mono">.docx</span> nebo klikněte pro výběr
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Podporuje standardní Microsoft Word dokumenty i čisté textové soubory.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Results & Conversion Stats */}
      {isProcessing && (
        <div className="flex items-center justify-center gap-3 p-8 rounded-xl bg-slate-900/40 border border-slate-800">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          <span className="text-sm font-medium text-slate-300">Generuji PDF dokument v lokální paměti...</span>
        </div>
      )}

      {stats && !isProcessing && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-xs text-slate-500 block">Doba konverze</span>
            <span className="text-base font-semibold font-mono text-emerald-400">{stats.durationMs} ms</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-xs text-slate-500 block">Počet stran PDF</span>
            <span className="text-base font-semibold font-mono text-slate-200">{stats.pageCount}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-xs text-slate-500 block">Počet slov</span>
            <span className="text-base font-semibold font-mono text-slate-200">{stats.wordCount.toLocaleString()}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-xs text-slate-500 block">Počet znaků</span>
            <span className="text-base font-semibold font-mono text-slate-200">{stats.charCount.toLocaleString()}</span>
          </div>
        </div>
      )}

      {pdfBlobUrl && !isProcessing && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>PDF je připraveno ke stažení a náhledu</span>
            </div>
            <a
              href={pdfBlobUrl}
              download={file ? file.name.replace(/\.[^/.]+$/, '') + '.pdf' : 'konvertovany_dokument.pdf'}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Stáhnout PDF
            </a>
          </div>

          {/* Embedded PDF Preview / Text Preview tabs */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
            <div className="h-96 w-full">
              <iframe
                src={pdfBlobUrl}
                title="Náhled PDF"
                className="w-full h-full bg-slate-900"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
