import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Box,
  Check,
  Code2,
  Copy,
  Database,
  Download,
  FileCode2,
  FileJson,
  FolderOpen,
  GitBranch,
  Grid,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Link2,
  Magnet,
  Maximize2,
  Plus,
  Printer,
  Redo2,
  Sparkles,
  Trash2,
  Undo2,
  Workflow,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { saveBinaryWithDialog, saveTextWithDialog } from '../../services/fileSystemService';
import { printHtmlDocument } from '../../services/printService';
import { toastService } from '../../services/toastService';
import { consumePendingToolPipe } from '../../services/toolPipeService';
import { SendToToolButton } from '../../components/ui/SendToToolButton';
import { DiagramEditorCanvas, DiagramViewport } from './DiagramEditorCanvas';
import {
  DIAGRAM_TEMPLATES,
  DiagramCanvasTheme,
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
  DiagramNodeType,
  DiagramTemplateId,
  EdgeLineStyle,
  EdgeMarkerType,
  EdgeRouting,
  NODE_COLOR_PRESETS,
  PortSide,
  RELATIONSHIP_PRESETS,
  SHAPE_CATALOG,
  ShapeCategory,
  TableColumn,
  autoLayoutNodes,
  createDefaultNode,
  createDiagramId,
  exportDiagramToMermaid,
  exportDiagramToSqlDdl,
  getEffectiveNodeHeight,
  getTemplateDocument,
  parseSqlDdlToDiagram,
  snapValue,
} from './diagramEditor.logic';

const STORAGE_KEY = 'omnidesk_diagram_studio_v2';
const MAX_HISTORY = 40;

const SAMPLE_SQL_IMPORT = `CREATE TABLE departments (
  id BIGINT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  budget DECIMAL(12,2) NOT NULL
);

CREATE TABLE employees (
  id BIGINT PRIMARY KEY,
  department_id BIGINT NOT NULL REFERENCES departments(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(80) NOT NULL,
  hired_at TIMESTAMP NOT NULL
);

CREATE TABLE projects (
  id BIGINT PRIMARY KEY,
  lead_id BIGINT REFERENCES employees(id),
  title VARCHAR(160) NOT NULL,
  status VARCHAR(32) NOT NULL
);`;

const MARKER_OPTIONS: Array<{ value: EdgeMarkerType; labelKey: string; defaultLabel: string }> = [
  { value: 'none', labelKey: 'de_mk_none', defaultLabel: 'None' },
  { value: 'arrow-filled', labelKey: 'de_mk_arrow_filled', defaultLabel: 'Filled Arrow' },
  { value: 'arrow', labelKey: 'de_mk_arrow', defaultLabel: 'Open Arrow' },
  { value: 'inheritance', labelKey: 'de_mk_inheritance', defaultLabel: 'UML Inheritance (△)' },
  { value: 'composition', labelKey: 'de_mk_composition', defaultLabel: 'UML Composition (◆)' },
  { value: 'aggregation', labelKey: 'de_mk_aggregation', defaultLabel: 'UML Aggregation (◇)' },
  { value: 'crow-one', labelKey: 'de_mk_crow_one', defaultLabel: 'ERD One (||)' },
  { value: 'crow-zero-one', labelKey: 'de_mk_crow_zero_one', defaultLabel: 'ERD Zero/One (o|)' },
  { value: 'crow-many', labelKey: 'de_mk_crow_many', defaultLabel: 'ERD Many (|<)' },
  { value: 'crow-zero-many', labelKey: 'de_mk_crow_zero_many', defaultLabel: 'ERD Zero/Many (o<)' },
];

const PORT_OPTIONS: Array<{ value: PortSide; labelKey: string; defaultLabel: string }> = [
  { value: 'auto', labelKey: 'de_port_auto', defaultLabel: 'Auto' },
  { value: 'top', labelKey: 'de_port_top', defaultLabel: 'Top' },
  { value: 'right', labelKey: 'de_port_right', defaultLabel: 'Right' },
  { value: 'bottom', labelKey: 'de_port_bottom', defaultLabel: 'Bottom' },
  { value: 'left', labelKey: 'de_port_left', defaultLabel: 'Left' },
];

function loadInitialDocument(): DiagramDocument {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getTemplateDocument('sql-ecommerce');
    const parsed = JSON.parse(raw) as Partial<DiagramDocument>;
    if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
      return {
        title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title : 'Untitled Diagram',
        nodes: parsed.nodes,
        edges: parsed.edges,
        canvasTheme:
          parsed.canvasTheme === 'light' || parsed.canvasTheme === 'transparent' ? parsed.canvasTheme : 'dark',
        showGrid: parsed.showGrid !== false,
        snapToGrid: parsed.snapToGrid !== false,
      };
    }
  } catch {
    // Corrupted payload: gracefully fall back to SQL ERD starter
  }
  return getTemplateDocument('sql-ecommerce');
}

export const DiagramEditorTool: React.FC = () => {
  const { t } = useI18n();
  const initialDoc = useMemo(() => loadInitialDocument(), []);

  const [doc, setDoc] = useState<DiagramDocument>(initialDoc);
  const [undoStack, setUndoStack] = useState<DiagramDocument[]>([]);
  const [redoStack, setRedoStack] = useState<DiagramDocument[]>([]);

  const [viewport, setViewport] = useState<DiagramViewport>({ panX: 20, panY: 20, zoom: 0.92 });
  const [activeShapeCat, setActiveShapeCat] = useState<ShapeCategory>('sql');
  const [activeRelPresetId, setActiveRelPresetId] = useState<string>('erd-1n');

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialDoc.nodes[0]?.id ?? null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [quickConnectTargetId, setQuickConnectTargetId] = useState<string>('');

  const [showCodeDrawer, setShowCodeDrawer] = useState(false);
  const [codeTab, setCodeTab] = useState<'import-sql' | 'export-sql' | 'mermaid'>('export-sql');
  const [sqlImportInput, setSqlImportInput] = useState(SAMPLE_SQL_IMPORT);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const sqlFileInputRef = useRef<HTMLInputElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const dragSnapshotRef = useRef<DiagramDocument | null>(null);

  // Persist diagram safely to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
    } catch {
      // Ignore quota errors
    }
  }, [doc]);

  // Sync live updates pushed from Desktop MCP Bridge
  useEffect(() => {
    const handleExternalUpdate = () => {
      const next = loadInitialDocument();
      setDoc(next);
      setSelectedNodeId(next.nodes[0]?.id ?? null);
      setSelectedEdgeId(null);
    };
    window.addEventListener('omnidesk-diagram-studio-updated', handleExternalUpdate);
    return () => {
      window.removeEventListener('omnidesk-diagram-studio-updated', handleExternalUpdate);
    };
  }, []);

  const commitChange = useCallback((updater: (prev: DiagramDocument) => DiagramDocument) => {
    setDoc(prev => {
      const next = updater(prev);
      setUndoStack(stack => [...stack.slice(-(MAX_HISTORY - 1)), prev]);
      setRedoStack([]);
      return next;
    });
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack(stack => {
      if (stack.length === 0) return stack;
      const previous = stack[stack.length - 1];
      setDoc(current => {
        setRedoStack(r => [...r.slice(-(MAX_HISTORY - 1)), current]);
        return previous;
      });
      return stack.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack(stack => {
      if (stack.length === 0) return stack;
      const next = stack[stack.length - 1];
      setDoc(current => {
        setUndoStack(u => [...u.slice(-(MAX_HISTORY - 1)), current]);
        return next;
      });
      return stack.slice(0, -1);
    });
  }, []);

  const selectedNode = useMemo(
    () => doc.nodes.find(n => n.id === selectedNodeId) ?? null,
    [doc.nodes, selectedNodeId]
  );
  const selectedEdge = useMemo(
    () => doc.edges.find(e => e.id === selectedEdgeId) ?? null,
    [doc.edges, selectedEdgeId]
  );

  const generatedSql = useMemo(() => exportDiagramToSqlDdl(doc), [doc]);
  const generatedMermaid = useMemo(() => exportDiagramToMermaid(doc), [doc]);

  const handleFitView = useCallback((nodesList: DiagramNode[] = doc.nodes) => {
    const svg = svgRef.current;
    if (!svg || nodesList.length === 0) {
      setViewport({ panX: 24, panY: 24, zoom: 1 });
      return;
    }
    const rect = svg.getBoundingClientRect();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of nodesList) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + getEffectiveNodeHeight(n));
    }
    const pad = 48;
    const contentW = Math.max(120, maxX - minX + pad * 2);
    const contentH = Math.max(120, maxY - minY + pad * 2);
    const zoom = Math.max(0.35, Math.min(1.25, Math.min(rect.width / contentW, rect.height / contentH)));
    const panX = (rect.width - (maxX - minX) * zoom) / 2 - minX * zoom;
    const panY = (rect.height - (maxY - minY) * zoom) / 2 - minY * zoom;
    setViewport({ panX, panY, zoom: Number(zoom.toFixed(3)) });
  }, [doc.nodes]);

  // Consume incoming tool pipe payloads (SQL DDL or Diagram JSON)
  useEffect(() => {
    const incoming = consumePendingToolPipe('diagram-editor');
    if (!incoming) return;

    const loadTextPayload = (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed) as Partial<DiagramDocument>;
          if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
            const loaded: DiagramDocument = {
              title: parsed.title || 'Imported Diagram',
              nodes: parsed.nodes,
              edges: parsed.edges,
              canvasTheme: parsed.canvasTheme ?? 'dark',
              showGrid: parsed.showGrid !== false,
              snapToGrid: parsed.snapToGrid !== false,
            };
            commitChange(() => loaded);
            toastService.show({ type: 'success', title: t('de_imported_json', 'Imported diagram project') });
            return;
          }
        } catch {
          // Not JSON; try SQL DDL
        }
      }
      if (/CREATE\s+TABLE/i.test(trimmed)) {
        const result = parseSqlDdlToDiagram(trimmed);
        if (result.nodes.length > 0) {
          commitChange(prev => ({
            ...prev,
            title: 'Imported SQL Schema',
            nodes: result.nodes,
            edges: result.edges,
          }));
          toastService.show({
            type: 'success',
            title: t('de_imported_sql_toast', 'Generated {tables} tables & {rels} relationships', {
              tables: result.nodes.length,
              rels: result.edges.length,
            }),
          });
        }
      }
    };

    if (incoming.kind === 'file' && incoming.file) {
      void incoming.file.text().then(loadTextPayload);
    } else if (incoming.kind === 'text' && incoming.text) {
      loadTextPayload(incoming.text);
    }
  }, [commitChange, t]);

  // Node & Edge CRUD
  const handleAddNode = (type: DiagramNodeType) => {
    const offset = (doc.nodes.length % 7) * 28;
    const rawX = (140 - viewport.panX) / viewport.zoom + offset;
    const rawY = (100 - viewport.panY) / viewport.zoom + offset;
    const node = createDefaultNode(type, snapValue(rawX, doc.snapToGrid), snapValue(rawY, doc.snapToGrid));
    commitChange(prev => ({ ...prev, nodes: [...prev.nodes, node] }));
    setSelectedEdgeId(null);
    setSelectedNodeId(node.id);
  };

  const handleDuplicateSelected = useCallback(() => {
    if (!selectedNode) return;
    const copy: DiagramNode = {
      ...selectedNode,
      id: createDiagramId('n'),
      x: selectedNode.x + 36,
      y: selectedNode.y + 36,
      title: `${selectedNode.title}_copy`,
      columns: selectedNode.columns?.map(c => ({ ...c, id: createDiagramId('c') })),
      attributes: selectedNode.attributes ? [...selectedNode.attributes] : undefined,
      methods: selectedNode.methods ? [...selectedNode.methods] : undefined,
    };
    commitChange(prev => ({ ...prev, nodes: [...prev.nodes, copy] }));
    setSelectedNodeId(copy.id);
  }, [commitChange, selectedNode]);

  const handleDeleteSelection = useCallback(() => {
    if (selectedNodeId) {
      commitChange(prev => ({
        ...prev,
        nodes: prev.nodes.filter(n => n.id !== selectedNodeId),
        edges: prev.edges.filter(e => e.fromId !== selectedNodeId && e.toId !== selectedNodeId),
      }));
      setSelectedNodeId(null);
    } else if (selectedEdgeId) {
      commitChange(prev => ({
        ...prev,
        edges: prev.edges.filter(e => e.id !== selectedEdgeId),
      }));
      setSelectedEdgeId(null);
    }
  }, [commitChange, selectedEdgeId, selectedNodeId]);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+D, Delete) when not typing inside an input/textarea
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditingText =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');
      if (isEditingText) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelection();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleDeleteSelection, handleDuplicateSelected, handleRedo, handleUndo]);

  const handleMoveNode = useCallback((id: string, x: number, y: number, commit = false) => {
    if (!commit) {
      setDoc(prev => {
        if (!dragSnapshotRef.current) dragSnapshotRef.current = prev;
        return {
          ...prev,
          nodes: prev.nodes.map(n => (n.id === id ? { ...n, x, y } : n)),
        };
      });
    } else {
      const snapshot = dragSnapshotRef.current;
      dragSnapshotRef.current = null;
      if (snapshot) {
        setUndoStack(stack => [...stack.slice(-(MAX_HISTORY - 1)), snapshot]);
        setRedoStack([]);
      }
    }
  }, []);

  const handleResizeNode = useCallback((id: string, width: number, height: number, commit = false) => {
    if (!commit) {
      setDoc(prev => {
        if (!dragSnapshotRef.current) dragSnapshotRef.current = prev;
        return {
          ...prev,
          nodes: prev.nodes.map(n => (n.id === id ? { ...n, width, height } : n)),
        };
      });
    } else {
      const snapshot = dragSnapshotRef.current;
      dragSnapshotRef.current = null;
      if (snapshot) {
        setUndoStack(stack => [...stack.slice(-(MAX_HISTORY - 1)), snapshot]);
        setRedoStack([]);
      }
    }
  }, []);

  const handleConnectNodes = useCallback(
    (fromId: string, fromPort: PortSide, toId: string, toPort: PortSide) => {
      if (fromId === toId) return;
      const preset = RELATIONSHIP_PRESETS.find(p => p.id === activeRelPresetId) ?? RELATIONSHIP_PRESETS[0];
      const newEdge: DiagramEdge = {
        id: createDiagramId('e'),
        fromId,
        toId,
        fromPort,
        toPort,
        label: '',
        sourceMultiplicity: preset.sourceMultiplicity,
        targetMultiplicity: preset.targetMultiplicity,
        routing: 'orthogonal',
        lineStyle: preset.lineStyle,
        startMarker: preset.startMarker,
        endMarker: preset.endMarker,
        color: '#818cf8',
      };
      commitChange(prev => ({ ...prev, edges: [...prev.edges, newEdge] }));
      setSelectedNodeId(null);
      setSelectedEdgeId(newEdge.id);
    },
    [activeRelPresetId, commitChange]
  );

  const updateSelectedNode = (patch: Partial<DiagramNode>) => {
    if (!selectedNodeId) return;
    commitChange(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => (n.id === selectedNodeId ? { ...n, ...patch } : n)),
    }));
  };

  const updateSelectedEdge = (patch: Partial<DiagramEdge>) => {
    if (!selectedEdgeId) return;
    commitChange(prev => ({
      ...prev,
      edges: prev.edges.map(e => (e.id === selectedEdgeId ? { ...e, ...patch } : e)),
    }));
  };

  // SQL Table Column Helpers
  const addColumnToSelected = () => {
    if (!selectedNode) return;
    const cols = selectedNode.columns ?? [];
    const nextCol: TableColumn = {
      id: createDiagramId('c'),
      name: `col_${cols.length + 1}`,
      dataType: 'VARCHAR(100)',
      isNotNull: true,
    };
    updateSelectedNode({ columns: [...cols, nextCol] });
  };

  const updateColumn = (colId: string, patch: Partial<TableColumn>) => {
    if (!selectedNode) return;
    const cols = (selectedNode.columns ?? []).map(c => (c.id === colId ? { ...c, ...patch } : c));
    updateSelectedNode({ columns: cols });
  };

  const moveColumn = (index: number, dir: -1 | 1) => {
    if (!selectedNode?.columns) return;
    const nextIdx = index + dir;
    if (nextIdx < 0 || nextIdx >= selectedNode.columns.length) return;
    const copy = [...selectedNode.columns];
    const [moved] = copy.splice(index, 1);
    copy.splice(nextIdx, 0, moved);
    updateSelectedNode({ columns: copy });
  };

  const deleteColumn = (colId: string) => {
    if (!selectedNode) return;
    updateSelectedNode({ columns: (selectedNode.columns ?? []).filter(c => c.id !== colId) });
  };

  const handleLoadTemplate = (tplId: DiagramTemplateId) => {
    const fresh = getTemplateDocument(tplId);
    commitChange(() => fresh);
    setSelectedNodeId(fresh.nodes[0]?.id ?? null);
    setSelectedEdgeId(null);
    if (tplId === 'sql-ecommerce') {
      setActiveShapeCat('sql');
      setActiveRelPresetId('erd-1n');
    } else if (tplId === 'uml-class' || tplId === 'uml-usecase') {
      setActiveShapeCat('uml');
      setActiveRelPresetId('uml-inheritance');
    } else if (tplId === 'flowchart-order') {
      setActiveShapeCat('flowchart');
      setActiveRelPresetId('flow');
    } else if (tplId === 'system-arch') {
      setActiveShapeCat('architecture');
      setActiveRelPresetId('flow');
    }
    window.setTimeout(() => handleFitView(fresh.nodes), 30);
  };

  const handleAutoLayout = () => {
    const arranged = autoLayoutNodes(doc.nodes, doc.edges);
    commitChange(prev => ({ ...prev, nodes: arranged }));
    window.setTimeout(() => handleFitView(arranged), 30);
    toastService.show({ type: 'success', title: t('de_layout_done', 'Auto-arranged diagram layout') });
  };

  const handleGenerateFromSql = () => {
    const res = parseSqlDdlToDiagram(sqlImportInput);
    if (res.nodes.length === 0) {
      toastService.show({
        type: 'error',
        title: t('de_sql_parse_empty', 'No CREATE TABLE statements found in SQL input'),
      });
      return;
    }
    const arranged = autoLayoutNodes(res.nodes, res.edges);
    commitChange(prev => ({
      ...prev,
      title: 'SQL ERD Schema',
      nodes: arranged,
      edges: res.edges,
    }));
    setSelectedNodeId(arranged[0]?.id ?? null);
    setSelectedEdgeId(null);
    setActiveShapeCat('sql');
    setActiveRelPresetId('erd-1n');
    window.setTimeout(() => handleFitView(arranged), 30);
    toastService.show({
      type: 'success',
      title: t('de_imported_sql_toast', 'Generated {tables} tables & {rels} relationships', {
        tables: arranged.length,
        rels: res.edges.length,
      }),
    });
  };

  // ─── Clean Tight Bounding-Box SVG / PNG / Print / JSON Export ──────────────

  const buildCleanExportSvg = (): { markup: string; width: number; height: number } | null => {
    const svgEl = svgRef.current;
    if (!svgEl || doc.nodes.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of doc.nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + getEffectiveNodeHeight(n));
    }
    const pad = 44;
    const vbX = Math.floor(minX - pad);
    const vbY = Math.floor(minY - pad);
    const vbW = Math.max(320, Math.ceil(maxX - minX + pad * 2));
    const vbH = Math.max(220, Math.ceil(maxY - minY + pad * 2));

    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
    clone.setAttribute('width', String(vbW));
    clone.setAttribute('height', String(vbH));
    clone.removeAttribute('class');

    // Strip interactive UI handles & grid pattern rect
    clone.querySelectorAll('[data-ui-only="true"]').forEach(el => el.remove());
    clone.querySelectorAll('rect[data-bg="true"]').forEach(el => {
      el.setAttribute('x', String(vbX));
      el.setAttribute('y', String(vbY));
      el.setAttribute('width', String(vbW));
      el.setAttribute('height', String(vbH));
      if (el.getAttribute('fill')?.includes('diagram_dot_grid')) {
        el.remove();
      }
    });

    const worldG = clone.querySelector('[data-diagram-world="true"]');
    if (worldG) {
      worldG.setAttribute('transform', 'translate(0, 0) scale(1)');
    }

    const serializer = new XMLSerializer();
    return {
      markup: serializer.serializeToString(clone),
      width: vbW,
      height: vbH,
    };
  };

  const fileSlug =
    doc.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'diagram';

  const handleExportSvg = async () => {
    const exported = buildCleanExportSvg();
    if (!exported) return;
    const res = await saveTextWithDialog(`${fileSlug}.svg`, exported.markup, [
      { name: 'SVG Vector Image', extensions: ['svg'] },
    ]);
    if (res.success) {
      toastService.show({ type: 'success', title: t('de_exported_svg', 'Exported vector SVG diagram') });
    }
  };

  const handleCopyText = async (text: string, key: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toastService.show({ type: 'success', title: msg });
      window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      toastService.show({ type: 'error', title: t('de_copy_failed', 'Clipboard copy failed') });
    }
  };

  const handleExportPng = async () => {
    const exported = buildCleanExportSvg();
    if (!exported) return;
    try {
      const scale = 2;
      const svgBlob = new Blob([exported.markup], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to rasterize SVG'));
        img.src = url;
      });

      const canvas = document.createElement('canvas');
      canvas.width = exported.width * scale;
      canvas.height = exported.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D unavailable');
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, exported.width, exported.height);
      URL.revokeObjectURL(url);

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(b => resolve(b), 'image/png'));
      if (!blob) throw new Error('PNG encoding failed');
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const res = await saveBinaryWithDialog(`${fileSlug}.png`, bytes, 'image/png', [
        { name: 'PNG Image', extensions: ['png'] },
      ]);
      if (res.success) {
        toastService.show({ type: 'success', title: t('de_exported_png', 'Exported 2× HD PNG diagram') });
      }
    } catch (err) {
      toastService.show({
        type: 'error',
        title: err instanceof Error ? err.message : t('de_export_failed', 'PNG export failed'),
      });
    }
  };

  const handleExportJson = async () => {
    const res = await saveTextWithDialog(`${fileSlug}.omnidesk-diagram.json`, JSON.stringify(doc, null, 2), [
      { name: 'Diagram JSON', extensions: ['json'] },
    ]);
    if (res.success) {
      toastService.show({ type: 'success', title: t('de_saved_json', 'Saved diagram JSON project') });
    }
  };

  const handleImportJsonFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<DiagramDocument>;
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        throw new Error('Invalid diagram JSON structure');
      }
      const nextDoc: DiagramDocument = {
        title: parsed.title || file.name.replace(/\.json$/i, ''),
        nodes: parsed.nodes,
        edges: parsed.edges,
        canvasTheme: parsed.canvasTheme ?? 'dark',
        showGrid: parsed.showGrid !== false,
        snapToGrid: parsed.snapToGrid !== false,
      };
      commitChange(() => nextDoc);
      setSelectedNodeId(nextDoc.nodes[0]?.id ?? null);
      setSelectedEdgeId(null);
      window.setTimeout(() => handleFitView(nextDoc.nodes), 30);
      toastService.show({ type: 'success', title: t('de_imported_json', 'Imported diagram project') });
    } catch (err) {
      toastService.show({
        type: 'error',
        title: err instanceof Error ? err.message : t('de_invalid_json', 'Could not load diagram JSON'),
      });
    }
  };

  const handlePrint = async () => {
    const exported = buildCleanExportSvg();
    if (!exported) return;
    await printHtmlDocument(exported.markup, {
      title: doc.title || t('de_title', 'Diagram Studio'),
      isSvg: true,
    });
  };

  const visibleShapes = useMemo(
    () => SHAPE_CATALOG.filter(s => s.category === activeShapeCat),
    [activeShapeCat]
  );

  const connectableNodes = useMemo(
    () => doc.nodes.filter(n => n.type !== 'group' && n.id !== selectedNodeId),
    [doc.nodes, selectedNodeId]
  );

  return (
    <div className="space-y-3">
      {/* Top Studio Bar */}
      <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Workflow className="w-4 h-4 text-indigo-400 shrink-0" />
          <input
            type="text"
            aria-label={t('de_diagram_title', 'Diagram title')}
            value={doc.title}
            onChange={e => setDoc(prev => ({ ...prev, title: e.target.value }))}
            className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs font-semibold text-white w-52 sm:w-64 focus:outline-none"
          />

          <select
            aria-label={t('de_templates', 'Templates')}
            defaultValue=""
            onChange={e => {
              if (e.target.value) {
                handleLoadTemplate(e.target.value as DiagramTemplateId);
                e.target.value = '';
              }
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="" disabled>
              {t('de_load_template', 'Load Template...')}
            </option>
            {DIAGRAM_TEMPLATES.map(tpl => (
              <option key={tpl.id} value={tpl.id}>
                {t(tpl.labelKey, tpl.defaultLabel)}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title={t('de_undo', 'Undo (Ctrl+Z)')}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title={t('de_redo', 'Redo (Ctrl+Y)')}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-colors"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleAutoLayout}
              title={t('de_auto_layout', 'Auto-arrange layout')}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden xl:inline">{t('de_layout_btn', 'Auto-Layout')}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowCodeDrawer(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              showCodeDrawer
                ? 'bg-indigo-600/25 border-indigo-500/60 text-white'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('de_sql_mermaid_btn', 'SQL / Mermaid')}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleExportPng()}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{t('de_export_png', 'Export PNG')}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleExportSvg()}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>SVG</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const exported = buildCleanExportSvg();
              if (exported) {
                void handleCopyText(exported.markup, 'svg', t('de_copied_svg', 'SVG copied to clipboard'));
              }
            }}
            title={t('de_copy_svg', 'Copy SVG')}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
          >
            {copiedKey === 'svg' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => void handleExportJson()}
            title={t('de_save_json', 'Save JSON project')}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
          >
            <FileJson className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => jsonInputRef.current?.click()}
            title={t('de_open_json', 'Open JSON project')}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) void handleImportJsonFile(f);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            onClick={() => void handlePrint()}
            title={t('de_print', 'Print diagram')}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          <SendToToolButton
            sourceToolId="diagram-editor"
            kind="text"
            getText={() =>
              doc.nodes.some(n => n.type === 'sql-table') ? generatedSql : generatedMermaid
            }
          />
        </div>
      </div>

      {/* Main 3-Pane Diagram Studio */}
      <div className="grid grid-cols-1 xl:grid-cols-[216px_minmax(0,1fr)_280px] gap-3 items-start">
        {/* Left Palette: Shape Libraries + Connector Default Style */}
        <aside className="rounded-xl bg-slate-900/40 border border-slate-800 p-2.5 space-y-3">
          {/* Category Segmented Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-slate-950/80 border border-slate-800">
            {(
              [
                { id: 'sql', label: 'SQL', icon: Database },
                { id: 'uml', label: 'UML', icon: Box },
                { id: 'flowchart', label: t('de_cat_flow', 'Flow'), icon: GitBranch },
                { id: 'architecture', label: t('de_cat_arch', 'Arch'), icon: Layers },
              ] as const
            ).map(cat => {
              const Icon = cat.icon;
              const active = activeShapeCat === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveShapeCat(cat.id)}
                  className={`py-1.5 rounded-md text-[11px] font-semibold flex flex-col items-center gap-0.5 transition-colors ${
                    active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Add Shape Buttons */}
          <div className="space-y-1">
            <div className="px-1 text-[11px] font-medium text-slate-400">
              {t('de_click_to_add', 'Click to add shape')}
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-1 gap-1.5">
              {visibleShapes.map(shape => (
                <button
                  key={shape.type}
                  type="button"
                  onClick={() => handleAddNode(shape.type)}
                  className="px-2.5 py-2 rounded-lg bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-xs text-slate-200 flex items-center justify-between gap-2 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: shape.defaultColor }}
                    />
                    <span className="truncate">{t(shape.labelKey, shape.defaultLabel)}</span>
                  </span>
                  <Plus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Default Connector Preset when dragging from node ports */}
          <div className="pt-2.5 border-t border-slate-800 space-y-1.5">
            <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('de_default_connector', 'New Connector Style')}</span>
            </label>
            <select
              value={activeRelPresetId}
              onChange={e => setActiveRelPresetId(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {RELATIONSHIP_PRESETS.map(p => (
                <option key={p.id} value={p.id}>
                  {t(p.labelKey, p.defaultLabel)}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {t('de_port_drag_hint', 'Drag from any blue port dot on a shape to another shape to connect.')}
            </p>
          </div>
        </aside>

        {/* Center Canvas Column */}
        <div className="space-y-2 min-w-0">
          {/* Canvas View Controls Strip */}
          <div className="px-3 py-2 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setViewport(v => ({ ...v, zoom: Math.max(0.35, Number((v.zoom - 0.12).toFixed(2))) }))
                }
                title={t('de_zoom_out', 'Zoom out')}
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono tabular-nums text-slate-300 w-11 text-center">
                {Math.round(viewport.zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() =>
                  setViewport(v => ({ ...v, zoom: Math.min(2.4, Number((v.zoom + 0.12).toFixed(2))) }))
                }
                title={t('de_zoom_in', 'Zoom in')}
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleFitView()}
                title={t('de_fit_view', 'Fit diagram to view')}
                className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <Maximize2 className="w-3 h-3" />
                <span>{t('de_fit', 'Fit')}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDoc(prev => ({ ...prev, showGrid: !prev.showGrid }))}
                className={`px-2 py-1 rounded-lg border text-xs flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
                  doc.showGrid
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <Grid className="w-3 h-3" />
                <span>{t('de_grid', 'Grid')}</span>
              </button>

              <button
                type="button"
                onClick={() => setDoc(prev => ({ ...prev, snapToGrid: !prev.snapToGrid }))}
                className={`px-2 py-1 rounded-lg border text-xs flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
                  doc.snapToGrid
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <Magnet className="w-3 h-3" />
                <span>{t('de_snap', 'Snap')}</span>
              </button>

              <select
                aria-label={t('de_canvas_theme', 'Canvas background')}
                value={doc.canvasTheme}
                onChange={e =>
                  setDoc(prev => ({ ...prev, canvasTheme: e.target.value as DiagramCanvasTheme }))
                }
                className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="dark">{t('de_bg_dark', 'Dark Canvas')}</option>
                <option value="light">{t('de_bg_light', 'Light (Paper)')}</option>
                <option value="transparent">{t('de_bg_transparent', 'Transparent')}</option>
              </select>

              <span className="text-[11px] text-slate-500 font-mono tabular-nums hidden sm:inline">
                {doc.nodes.length} {t('de_nodes_count', 'nodes')} · {doc.edges.length}{' '}
                {t('de_edges_count', 'links')}
              </span>
            </div>
          </div>

          {/* Interactive SVG Canvas */}
          <DiagramEditorCanvas
            svgRef={svgRef}
            nodes={doc.nodes}
            edges={doc.edges}
            canvasTheme={doc.canvasTheme}
            showGrid={doc.showGrid}
            snapToGrid={doc.snapToGrid}
            viewport={viewport}
            onViewportChange={setViewport}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            onSelectNode={setSelectedNodeId}
            onSelectEdge={setSelectedEdgeId}
            onMoveNode={handleMoveNode}
            onResizeNode={handleResizeNode}
            onConnectNodes={handleConnectNodes}
            onDoubleClickNode={() => titleInputRef.current?.focus()}
            emptyHint={t(
              'de_empty_canvas',
              'Pick a SQL table, UML class, or flowchart shape on the left — or load a starter template above.'
            )}
          />

          <p className="text-[11px] text-slate-500 px-1">
            {t(
              'de_canvas_shortcuts',
              'Drag empty canvas to pan · Ctrl+Wheel to zoom · Drag port dots to connect · Drag corner handle to resize · Ctrl+Z / Ctrl+D / Delete'
            )}
          </p>
        </div>

        {/* Right Context Inspector */}
        <aside className="rounded-xl bg-slate-900/40 border border-slate-800 p-3 space-y-3 xl:max-h-[630px] xl:overflow-y-auto">
          {selectedNode ? (
            <>
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <h3 className="text-xs font-semibold text-white truncate">
                  {t('de_node_inspector', 'Element Properties')}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleDuplicateSelected}
                    title={t('de_duplicate', 'Duplicate (Ctrl+D)')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelection}
                    title={t('de_delete', 'Delete')}
                    className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 text-rose-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Title & Stereotype / Subtitle */}
              <div className="space-y-2">
                <label className="block space-y-1">
                  <span className="text-[11px] text-slate-400">{t('de_label_name', 'Title / Name')}</span>
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={selectedNode.title}
                    onChange={e => updateSelectedNode({ title: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-white focus:outline-none"
                  />
                </label>

                {(selectedNode.type === 'uml-class' ||
                  selectedNode.type === 'uml-interface' ||
                  selectedNode.type === 'uml-enum' ||
                  selectedNode.type === 'uml-component' ||
                  selectedNode.type === 'sql-view') && (
                  <label className="block space-y-1">
                    <span className="text-[11px] text-slate-400">{t('de_stereotype', 'Stereotype')}</span>
                    <input
                      type="text"
                      value={selectedNode.stereotype ?? ''}
                      onChange={e => updateSelectedNode({ stereotype: e.target.value })}
                      placeholder="interface, abstract, entity..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-white focus:outline-none"
                    />
                  </label>
                )}

                {(selectedNode.type === 'arch-service' ||
                  selectedNode.type === 'arch-queue' ||
                  selectedNode.type === 'flow-database' ||
                  selectedNode.type === 'uml-package' ||
                  selectedNode.type === 'flow-process') && (
                  <label className="block space-y-1">
                    <span className="text-[11px] text-slate-400">{t('de_subtitle', 'Subtitle / Tech')}</span>
                    <input
                      type="text"
                      value={selectedNode.subtitle ?? ''}
                      onChange={e => updateSelectedNode({ subtitle: e.target.value })}
                      placeholder="PostgreSQL, REST API..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-white focus:outline-none"
                    />
                  </label>
                )}

                {selectedNode.type === 'note' && (
                  <label className="block space-y-1">
                    <span className="text-[11px] text-slate-400">{t('de_note_body', 'Note Content')}</span>
                    <textarea
                      rows={3}
                      value={selectedNode.body ?? ''}
                      onChange={e => updateSelectedNode({ body: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-white focus:outline-none"
                    />
                  </label>
                )}

                {/* Accent Color Swatches */}
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 block">{t('de_accent_color', 'Color')}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {NODE_COLOR_PRESETS.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => updateSelectedNode({ color: c.hex })}
                        title={c.name}
                        className={`w-5 h-5 rounded-md transition-transform ${
                          selectedNode.color === c.hex ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>

                {/* Size Controls */}
                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1">
                    <span className="text-[11px] text-slate-400">{t('de_width', 'Width')}</span>
                    <input
                      type="number"
                      min={80}
                      max={900}
                      step={10}
                      value={selectedNode.width}
                      onChange={e =>
                        updateSelectedNode({ width: Math.max(80, Number(e.target.value) || 120) })
                      }
                      className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] text-slate-400">{t('de_height', 'Height')}</span>
                    <input
                      type="number"
                      min={44}
                      max={900}
                      step={10}
                      value={selectedNode.height}
                      onChange={e =>
                        updateSelectedNode({ height: Math.max(44, Number(e.target.value) || 64) })
                      }
                      className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                    />
                  </label>
                </div>
              </div>

              {/* SQL Table / View Column Editor */}
              {(selectedNode.type === 'sql-table' || selectedNode.type === 'sql-view') && (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">
                      {t('de_columns', 'Columns')} ({selectedNode.columns?.length ?? 0})
                    </span>
                    <button
                      type="button"
                      onClick={addColumnToSelected}
                      className="px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{t('de_add_col', 'Column')}</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(selectedNode.columns ?? []).map((col, idx) => (
                      <div
                        key={col.id}
                        className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5"
                      >
                        <div className="grid grid-cols-[1fr_92px] gap-1.5">
                          <input
                            type="text"
                            value={col.name}
                            onChange={e => updateColumn(col.id, { name: e.target.value })}
                            placeholder="column_name"
                            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-white focus:outline-none focus:border-indigo-500"
                          />
                          <input
                            type="text"
                            value={col.dataType}
                            onChange={e => updateColumn(col.id, { dataType: e.target.value })}
                            placeholder="VARCHAR(64)"
                            className="px-1.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-300 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            {(
                              [
                                { key: 'isPrimaryKey', label: 'PK', activeCls: 'bg-amber-500/25 text-amber-300 border-amber-500/50' },
                                { key: 'isForeignKey', label: 'FK', activeCls: 'bg-sky-500/25 text-sky-300 border-sky-500/50' },
                                { key: 'isUnique', label: 'UQ', activeCls: 'bg-violet-500/25 text-violet-300 border-violet-500/50' },
                                { key: 'isNotNull', label: 'NN', activeCls: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50' },
                              ] as const
                            ).map(flag => {
                              const on = Boolean(col[flag.key]);
                              return (
                                <button
                                  key={flag.key}
                                  type="button"
                                  onClick={() => updateColumn(col.id, { [flag.key]: !on })}
                                  className={`px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold transition-colors ${
                                    on
                                      ? flag.activeCls
                                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                                  }`}
                                >
                                  {flag.label}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => moveColumn(idx, -1)}
                              disabled={idx === 0}
                              className="p-0.5 text-slate-500 hover:text-white disabled:opacity-30"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveColumn(idx, 1)}
                              disabled={idx === (selectedNode.columns?.length ?? 1) - 1}
                              className="p-0.5 text-slate-500 hover:text-white disabled:opacity-30"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteColumn(col.id)}
                              className="p-0.5 text-slate-500 hover:text-rose-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* UML Attributes & Methods Editor */}
              {(selectedNode.type === 'uml-class' ||
                selectedNode.type === 'uml-interface' ||
                selectedNode.type === 'uml-enum') && (
                <div className="pt-2 border-t border-slate-800 space-y-2.5">
                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold text-slate-300">
                      {selectedNode.type === 'uml-enum'
                        ? t('de_enum_values', 'Enum Values (one per line)')
                        : t('de_uml_attributes', 'Attributes (one per line)')}
                    </span>
                    <textarea
                      rows={4}
                      value={(selectedNode.attributes ?? []).join('\n')}
                      onChange={e =>
                        updateSelectedNode({
                          attributes: e.target.value.split('\n').filter(line => line.trim().length > 0),
                        })
                      }
                      placeholder="- id: string&#10;- email: string"
                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </label>

                  {selectedNode.type !== 'uml-enum' && (
                    <label className="block space-y-1">
                      <span className="text-[11px] font-semibold text-slate-300">
                        {t('de_uml_methods', 'Methods (one per line)')}
                      </span>
                      <textarea
                        rows={4}
                        value={(selectedNode.methods ?? []).join('\n')}
                        onChange={e =>
                          updateSelectedNode({
                            methods: e.target.value.split('\n').filter(line => line.trim().length > 0),
                          })
                        }
                        placeholder="+ save(): void&#10;+ calculateTotal(): number"
                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Quick Connect From Selected Node */}
              {selectedNode.type !== 'group' && connectableNodes.length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-300 block">
                    {t('de_quick_connect', 'Connect to Element')}
                  </span>
                  <div className="flex gap-1.5">
                    <select
                      value={quickConnectTargetId}
                      onChange={e => setQuickConnectTargetId(e.target.value)}
                      className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                    >
                      <option value="">{t('de_choose_target', 'Select target...')}</option>
                      {connectableNodes.map(n => (
                        <option key={n.id} value={n.id}>
                          {n.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!quickConnectTargetId}
                      onClick={() => {
                        if (quickConnectTargetId) {
                          handleConnectNodes(selectedNode.id, 'auto', quickConnectTargetId, 'auto');
                          setQuickConnectTargetId('');
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold whitespace-nowrap shrink-0"
                    >
                      {t('de_link', 'Link')}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : selectedEdge ? (
            <>
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <h3 className="text-xs font-semibold text-white truncate">
                  {t('de_edge_inspector', 'Connector Properties')}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      updateSelectedEdge({
                        fromId: selectedEdge.toId,
                        toId: selectedEdge.fromId,
                        fromPort: selectedEdge.toPort,
                        toPort: selectedEdge.fromPort,
                        startMarker: selectedEdge.endMarker,
                        endMarker: selectedEdge.startMarker,
                        sourceMultiplicity: selectedEdge.targetMultiplicity,
                        targetMultiplicity: selectedEdge.sourceMultiplicity,
                      })
                    }
                    title={t('de_reverse_edge', 'Reverse direction')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelection}
                    title={t('de_delete', 'Delete')}
                    className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 text-rose-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Relationship Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 block">
                  {t('de_rel_presets', 'Relationship Preset')}
                </span>
                <div className="grid grid-cols-2 gap-1">
                  {RELATIONSHIP_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        updateSelectedEdge({
                          lineStyle: preset.lineStyle,
                          startMarker: preset.startMarker,
                          endMarker: preset.endMarker,
                          sourceMultiplicity: preset.sourceMultiplicity ?? selectedEdge.sourceMultiplicity,
                          targetMultiplicity: preset.targetMultiplicity ?? selectedEdge.targetMultiplicity,
                        })
                      }
                      className="px-2 py-1 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-200 text-left truncate"
                    >
                      {t(preset.labelKey, preset.defaultLabel)}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block space-y-1">
                <span className="text-[11px] text-slate-400">{t('de_edge_label', 'Label')}</span>
                <input
                  type="text"
                  value={selectedEdge.label}
                  onChange={e => updateSelectedEdge({ label: e.target.value })}
                  placeholder="places, implements, Yes..."
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[11px] text-slate-400">{t('de_mult_start', 'Start Mult.')}</span>
                  <input
                    type="text"
                    value={selectedEdge.sourceMultiplicity ?? ''}
                    onChange={e => updateSelectedEdge({ sourceMultiplicity: e.target.value })}
                    placeholder="1"
                    className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] text-slate-400">{t('de_mult_end', 'End Mult.')}</span>
                  <input
                    type="text"
                    value={selectedEdge.targetMultiplicity ?? ''}
                    onChange={e => updateSelectedEdge({ targetMultiplicity: e.target.value })}
                    placeholder="0..*"
                    className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[11px] text-slate-400">{t('de_routing', 'Routing')}</span>
                  <select
                    value={selectedEdge.routing}
                    onChange={e => updateSelectedEdge({ routing: e.target.value as EdgeRouting })}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                  >
                    <option value="orthogonal">{t('de_route_ortho', 'Orthogonal')}</option>
                    <option value="bezier">{t('de_route_bezier', 'Curved')}</option>
                    <option value="straight">{t('de_route_straight', 'Straight')}</option>
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] text-slate-400">{t('de_line_style', 'Line Style')}</span>
                  <select
                    value={selectedEdge.lineStyle}
                    onChange={e => updateSelectedEdge({ lineStyle: e.target.value as EdgeLineStyle })}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                  >
                    <option value="solid">{t('de_line_solid', 'Solid')}</option>
                    <option value="dashed">{t('de_line_dashed', 'Dashed')}</option>
                    <option value="dotted">{t('de_line_dotted', 'Dotted')}</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[11px] text-slate-400">{t('de_start_marker', 'Start End')}</span>
                  <select
                    value={selectedEdge.startMarker}
                    onChange={e => updateSelectedEdge({ startMarker: e.target.value as EdgeMarkerType })}
                    className="w-full px-1.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-200"
                  >
                    {MARKER_OPTIONS.map(m => (
                      <option key={m.value} value={m.value}>
                        {t(m.labelKey, m.defaultLabel)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] text-slate-400">{t('de_end_marker', 'Target End')}</span>
                  <select
                    value={selectedEdge.endMarker}
                    onChange={e => updateSelectedEdge({ endMarker: e.target.value as EdgeMarkerType })}
                    className="w-full px-1.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-200"
                  >
                    {MARKER_OPTIONS.map(m => (
                      <option key={m.value} value={m.value}>
                        {t(m.labelKey, m.defaultLabel)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[11px] text-slate-400">{t('de_from_port', 'From Side')}</span>
                  <select
                    value={selectedEdge.fromPort}
                    onChange={e => updateSelectedEdge({ fromPort: e.target.value as PortSide })}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                  >
                    {PORT_OPTIONS.map(p => (
                      <option key={p.value} value={p.value}>
                        {t(p.labelKey, p.defaultLabel)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] text-slate-400">{t('de_to_port', 'To Side')}</span>
                  <select
                    value={selectedEdge.toPort}
                    onChange={e => updateSelectedEdge({ toPort: e.target.value as PortSide })}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                  >
                    {PORT_OPTIONS.map(p => (
                      <option key={p.value} value={p.value}>
                        {t(p.labelKey, p.defaultLabel)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 block">{t('de_edge_color', 'Line Color')}</span>
                <div className="flex flex-wrap gap-1.5">
                  {NODE_COLOR_PRESETS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => updateSelectedEdge({ color: c.hex })}
                      title={c.name}
                      className={`w-5 h-5 rounded-md transition-transform ${
                        selectedEdge.color === c.hex ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
                <h3 className="text-xs font-semibold text-white">
                  {t('de_outline', 'Diagram Outline')}
                </h3>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {t(
                  'de_select_hint',
                  'Click any shape or connector on the canvas to edit its columns, UML methods, cardinality, or style.'
                )}
              </p>

              {doc.nodes.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-slate-500 block">
                    {t('de_elements_list', 'Elements')} ({doc.nodes.length})
                  </span>
                  <div className="space-y-1 max-h-52 overflow-y-auto pr-0.5">
                    {doc.nodes.map(n => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => setSelectedNodeId(n.id)}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 text-xs text-slate-200 flex items-center justify-between gap-2 text-left"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: n.color }} />
                          <span className="truncate">{n.title}</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">{n.type}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {doc.edges.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-medium text-slate-500 block">
                    {t('de_links_list', 'Relationships')} ({doc.edges.length})
                  </span>
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
                    {doc.edges.map(e => {
                      const fn = doc.nodes.find(n => n.id === e.fromId)?.title ?? '?';
                      const tn = doc.nodes.find(n => n.id === e.toId)?.title ?? '?';
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => setSelectedEdgeId(e.id)}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 text-[11px] text-slate-300 flex items-center justify-between gap-1 text-left"
                        >
                          <span className="truncate">
                            {fn} → {tn}
                          </span>
                          {e.label && <span className="text-slate-500 truncate max-w-[70px]">{e.label}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* Expandable SQL DDL Import/Export & Mermaid Code Drawer */}
      {showCodeDrawer && (
        <section className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
              {(
                [
                  { id: 'import-sql', label: t('de_tab_import_sql', 'Import SQL DDL → ERD') },
                  { id: 'export-sql', label: t('de_tab_export_sql', 'Generated SQL DDL') },
                  { id: 'mermaid', label: t('de_tab_mermaid', 'Mermaid Code') },
                ] as const
              ).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCodeTab(tab.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    codeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {codeTab === 'import-sql' && (
                <>
                  <button
                    type="button"
                    onClick={() => sqlFileInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <FileCode2 className="w-3.5 h-3.5" />
                    <span>{t('de_import_sql_file', 'Load .sql File')}</span>
                  </button>
                  <input
                    ref={sqlFileInputRef}
                    type="file"
                    accept=".sql,.txt"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        void f.text().then(txt => setSqlImportInput(txt));
                      }
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateFromSql}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold whitespace-nowrap shrink-0"
                  >
                    {t('de_generate_erd_btn', 'Generate Visual ERD')}
                  </button>
                </>
              )}

              {codeTab === 'export-sql' && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      void handleCopyText(generatedSql, 'sql', t('de_copied_sql', 'SQL DDL copied'))
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    {copiedKey === 'sql' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{t('de_copy_sql', 'Copy SQL')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await saveTextWithDialog(`${fileSlug}.sql`, generatedSql, [
                        { name: 'SQL Schema', extensions: ['sql'] },
                      ]);
                      if (res.success) {
                        toastService.show({ type: 'success', title: t('de_exported_sql', 'Exported SQL DDL file') });
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t('de_download_sql', 'Download .sql')}</span>
                  </button>
                </>
              )}

              {codeTab === 'mermaid' && (
                <button
                  type="button"
                  onClick={() =>
                    void handleCopyText(generatedMermaid, 'mermaid', t('de_copied_mermaid', 'Mermaid syntax copied'))
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  {copiedKey === 'mermaid' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{t('de_copy_mermaid', 'Copy Mermaid')}</span>
                </button>
              )}
            </div>
          </div>

          {codeTab === 'import-sql' ? (
            <textarea
              rows={8}
              value={sqlImportInput}
              onChange={e => setSqlImportInput(e.target.value)}
              className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          ) : (
            <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-200 overflow-x-auto max-h-64 whitespace-pre">
              {codeTab === 'export-sql' ? generatedSql : generatedMermaid}
            </pre>
          )}
        </section>
      )}
    </div>
  );
};
