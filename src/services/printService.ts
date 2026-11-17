import DOMPurify from 'dompurify';

export interface PrintHtmlOptions {
  title?: string;
  extraCss?: string;
  isSvg?: boolean;
}

export interface PrintPlainTextOptions {
  title?: string;
  monospace?: boolean;
  fontSizePx?: number;
  align?: 'left' | 'center' | 'right';
}

export interface PrintImageOptions {
  title?: string;
  caption?: string;
}

export interface PrintPagesOptions {
  title?: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#039;';
      default:
        return char;
    }
  });
}

async function waitForImagesInDocument(doc: Document): Promise<void> {
  const images = Array.from(doc.querySelectorAll('img'));
  if (images.length === 0) return;

  await Promise.all(
    images.map(
      img =>
        new Promise<void>(resolve => {
          if (img.complete) {
            if (typeof img.decode === 'function') {
              img.decode().then(() => resolve()).catch(() => resolve());
            } else {
              resolve();
            }
            return;
          }
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          window.setTimeout(done, 4000);
        })
    )
  );
}

async function printRawHtmlInIframe(fullHtmlDocument: string): Promise<void> {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';

  document.body.appendChild(iframe);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    iframe.remove();
  };

  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      cleanup();
      return;
    }

    doc.open();
    doc.write(fullHtmlDocument);
    doc.close();

    await waitForImagesInDocument(doc);
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    win.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(cleanup, 60_000);

    win.focus();
    win.print();
  } catch (err) {
    cleanup();
    throw err;
  }
}

export async function printHtmlDocument(
  bodyHtml: string,
  options: PrintHtmlOptions = {}
): Promise<void> {
  const safeTitle = escapeHtml(options.title || 'OmniDesk Print');
  const sanitizedBody = options.isSvg
    ? DOMPurify.sanitize(bodyHtml, {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: ['marker'],
        ADD_ATTR: ['markerEnd', 'marker-end', 'markerWidth', 'markerHeight', 'refX', 'refY', 'orient', 'strokeDasharray', 'stroke-dasharray', 'viewBox'],
      })
    : DOMPurify.sanitize(bodyHtml, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ['style', 'class', 'target', 'rel'],
      });

  const extraCss = options.extraCss || '';
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    @page { margin: 14mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      line-height: 1.55;
    }
    h1, h2, h3, h4, h5 { color: #0f172a; margin-top: 1.1em; margin-bottom: 0.45em; }
    h1 { font-size: 22px; border-bottom: 2px solid #4f46e5; padding-bottom: 6px; }
    h2 { font-size: 18px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
    h3 { font-size: 15px; }
    p { margin: 0.6em 0; }
    pre {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      color: #0f172a;
    }
    code {
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 4px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.9em;
      color: #1e293b;
    }
    table { width: 100%; border-collapse: collapse; margin: 14px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; font-size: 12px; }
    th { background: #f1f5f9; font-weight: 600; color: #0f172a; }
    blockquote { border-left: 3px solid #6366f1; padding-left: 12px; color: #334155; margin: 12px 0; }
    img, svg { max-width: 100%; height: auto; }
    ${extraCss}
  </style>
</head>
<body>${sanitizedBody}</body>
</html>`;

  await printRawHtmlInIframe(html);
}

export async function printPlainText(
  text: string,
  options: PrintPlainTextOptions = {}
): Promise<void> {
  const safeTitle = escapeHtml(options.title || 'OmniDesk Document');
  const escapedContent = escapeHtml(text);
  const fontFamily = options.monospace
    ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  const fontSize = Math.max(10, Math.min(36, options.fontSizePx ?? 13));
  const align = options.align || 'left';

  const body = `
    <header style="border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: baseline;">
      <strong style="font-size: 14px; color: #0f172a;">${safeTitle}</strong>
      <span style="font-size: 11px; color: #64748b;">${escapeHtml(new Date().toLocaleDateString())}</span>
    </header>
    <pre style="margin: 0; border: 0; background: transparent; padding: 0; font-family: ${fontFamily}; font-size: ${fontSize}px; line-height: 1.6; text-align: ${align}; white-space: pre-wrap; word-break: break-word; color: #0f172a;">${escapedContent}</pre>
  `;

  await printHtmlDocument(body, { title: options.title || 'OmniDesk Document' });
}

export async function printImageDataUrl(
  dataUrl: string,
  options: PrintImageOptions = {}
): Promise<void> {
  if (!dataUrl || !/^data:image\//i.test(dataUrl)) return;
  const safeTitle = escapeHtml(options.title || 'OmniDesk Image');
  const captionHtml = options.caption
    ? `<p style="margin-top: 12px; font-size: 13px; color: #334155; text-align: center; font-family: ui-monospace, monospace;">${escapeHtml(options.caption)}</p>`
    : '';

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    @page { margin: 10mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    }
    .sheet {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 8px;
    }
    img {
      max-width: 100%;
      max-height: 90vh;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <img src="${escapeHtml(dataUrl)}" alt="${safeTitle}" />
    ${captionHtml}
  </div>
</body>
</html>`;

  await printRawHtmlInIframe(html);
}

export async function printImagePages(
  pageDataUrls: string[],
  options: PrintPagesOptions = {}
): Promise<void> {
  const validPages = pageDataUrls.filter(url => typeof url === 'string' && /^data:image\//i.test(url));
  if (validPages.length === 0) return;

  const safeTitle = escapeHtml(options.title || 'OmniDesk PDF Document');
  const pagesMarkup = validPages
    .map(
      (url, index) => `
      <div class="pdf-page">
        <img src="${escapeHtml(url)}" alt="${safeTitle} - ${index + 1}" />
      </div>`
    )
    .join('');

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    @page { margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    .pdf-page {
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
    }
    .pdf-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .pdf-page img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
    }
  </style>
</head>
<body>${pagesMarkup}</body>
</html>`;

  await printRawHtmlInIframe(html);
}
