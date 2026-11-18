import React, { useRef, useState } from 'react';
import { Download, Plus, Trash2, Printer } from 'lucide-react';
import { saveTextWithDialog } from '../../services/fileSystemService';
import { printHtmlDocument } from '../../services/printService';
import { useI18n } from '../../i18n/context';
import { button, secondary, danger, input, panel, ToolHeader } from './shared';

/* ─────────────────────────────────────────────────────────────
   10. UML DIAGRAM EDITOR
   ───────────────────────────────────────────────────────────── */
type UmlNode = { id: number; x: number; y: number; text: string; type: 'class' | 'interface' | 'actor' | 'usecase' };
type UmlEdge = { id: number; from: number; to: number; label: string; dashed: boolean };

export const DiagramEditorTool: React.FC = () => {
  const { t } = useI18n();
  const [nodes, setNodes] = useState<UmlNode[]>([
    { id: 1, x: 80, y: 70, text: 'User', type: 'actor' },
    { id: 2, x: 280, y: 160, text: 'OrderService', type: 'class' },
    { id: 3, x: 500, y: 160, text: 'IPayment', type: 'interface' },
  ]);
  const [edges, setEdges] = useState<UmlEdge[]>([
    { id: 1, from: 1, to: 2, label: 'places order', dashed: false },
    { id: 2, from: 2, to: 3, label: 'implements', dashed: true },
  ]);
  const [selected, setSelected] = useState<number>(2);
  const [edgeFrom, setEdgeFrom] = useState<number>(1);
  const [edgeTo, setEdgeTo] = useState<number>(2);
  const [edgeLabel, setEdgeLabel] = useState('');
  const [edgeDashed, setEdgeDashed] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Dragging state
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const selectedNode = nodes.find(node => node.id === selected);

  const add = (type: UmlNode['type']) => {
    const id = Date.now();
    const x = 50 + (nodes.length % 4) * 140;
    const y = 80 + Math.floor(nodes.length / 4) * 80;
    setNodes([...nodes, { id, x, y, text: type === 'class' ? 'NewClass' : type === 'interface' ? 'INewInterface' : 'NewNode', type }]);
    setSelected(id);
  };

  const addEdge = () => {
    if (edgeFrom === edgeTo) return;
    setEdges([...edges, { id: Date.now(), from: edgeFrom, to: edgeTo, label: edgeLabel, dashed: edgeDashed }]);
    setEdgeLabel('');
  };

  const deleteEdge = (id: number) => {
    setEdges(edges.filter(e => e.id !== id));
  };

  const exportSvg = async () => {
    if (!svgRef.current) return;
    const source = new XMLSerializer().serializeToString(svgRef.current);
    await saveTextWithDialog('uml-diagram.svg', source, [{ name: 'SVG (*.svg)', extensions: ['svg'] }], t('save_diagram', 'Uložit diagram'));
  };

  const printDiagram = () => {
    if (!svgRef.current) return;
    const source = new XMLSerializer().serializeToString(svgRef.current);
    void printHtmlDocument(source, {
      title: 'UML Diagram',
      isSvg: true,
      extraCss: 'svg{background:#0f172a;border-radius:12px;width:100%;height:auto;max-height:90vh;display:block;margin:0 auto;}',
    });
  };

  const handlePointerDown = (nodeId: number, e: React.PointerEvent<SVGGElement>) => {
    e.stopPropagation();
    setSelected(nodeId);
    setDraggingId(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 700 / rect.width;
    const scaleY = 450 / rect.height;
    const mouseSvgX = (e.clientX - rect.left) * scaleX;
    const mouseSvgY = (e.clientY - rect.top) * scaleY;
    setDragOffset({ x: mouseSvgX - node.x, y: mouseSvgY - node.y });
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingId === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 700 / rect.width;
    const scaleY = 450 / rect.height;
    const mouseSvgX = (e.clientX - rect.left) * scaleX;
    const mouseSvgY = (e.clientY - rect.top) * scaleY;
    const newX = Math.max(0, Math.min(560, Math.round(mouseSvgX - dragOffset.x)));
    const newY = Math.max(0, Math.min(390, Math.round(mouseSvgY - dragOffset.y)));
    setNodes(prev => prev.map(n => (n.id === draggingId ? { ...n, x: newX, y: newY } : n)));
  };

  const handlePointerUp = () => {
    setDraggingId(null);
  };

  return (
    <div className="space-y-5 select-none">
      <ToolHeader
        title="Diagram Editor"
        description={t(
          'diagram_editor_desc',
          'Vytvářejte přetahovatelné UML uzly tříd, rozhraní a aktérů, propojujte je šipkami a exportujte čistý vektorový SVG soubor.'
        )}
      />

      <div className="flex flex-wrap gap-2 items-center">
        {(['class', 'interface', 'actor', 'usecase'] as UmlNode['type'][]).map(type => (
          <button key={type} className={button} onClick={() => add(type)}>
            <Plus className="inline w-3.5 h-3.5 mr-1" />
            {t(`add_${type}`, `+ ${type}`)}
          </button>
        ))}
        <button className={secondary} onClick={exportSvg}>
          <Download className="inline w-3.5 h-3.5 mr-1" /> {t('export_svg', 'Exportovat SVG')}
        </button>
        <button className={secondary} onClick={printDiagram} title={t('print_btn', 'Print')}>
          <Printer className="inline w-3.5 h-3.5 mr-1 text-indigo-400" /> {t('print_btn', 'Print')}
        </button>
        <button
          className={danger}
          disabled={!selectedNode}
          onClick={() => {
            setNodes(nodes.filter(node => node.id !== selected));
            setEdges(edges.filter(edge => edge.from !== selected && edge.to !== selected));
          }}
        >
          <Trash2 className="inline w-3.5 h-3.5 mr-1" /> {t('delete_selected_node', 'Smazat vybraný uzel')}
        </button>
      </div>

      {selectedNode && (
        <div className={panel + ' grid md:grid-cols-3 gap-3'}>
          <label className="text-xs text-slate-400">
            {t('selected_label', 'Text vybraného uzlu')}
            <input
              className={input + ' mt-1'}
              value={selectedNode.text}
              onChange={event =>
                setNodes(nodes.map(node => (node.id === selected ? { ...node, text: event.target.value } : node)))
              }
            />
          </label>
          <label className="text-xs text-slate-400">
            {t('node_type', 'Typ elementu')}
            <select
              className={input + ' mt-1'}
              value={selectedNode.type}
              onChange={event =>
                setNodes(nodes.map(node => (node.id === selected ? { ...node, type: event.target.value as UmlNode['type'] } : node)))
              }
            >
              <option value="class">{t('class', 'Třída (Class)')}</option>
              <option value="interface">{t('interface', 'Rozhraní (Interface)')}</option>
              <option value="actor">{t('actor', 'Aktér (Actor)')}</option>
              <option value="usecase">{t('usecase', 'Případ užití (Use case)')}</option>
            </select>
          </label>
          <div className="text-xs text-slate-400 flex flex-col justify-end">
            <span className="text-indigo-400">
              💡 {t('drag_hint', 'Uzly můžete myší přetahovat po celé ploše diagramu!')}
            </span>
          </div>
        </div>
      )}

      {/* Edge creation and management */}
      <div className={panel + ' space-y-3'}>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-xs text-slate-400">
            {t('from_node', 'Z uzlu')}
            <select className={input + ' mt-1 w-36'} value={edgeFrom} onChange={e => setEdgeFrom(Number(e.target.value))}>
              {nodes.map(node => (
                <option key={node.id} value={node.id}>
                  {node.text}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-400">
            {t('to_node', 'Do uzlu')}
            <select className={input + ' mt-1 w-36'} value={edgeTo} onChange={e => setEdgeTo(Number(e.target.value))}>
              {nodes.map(node => (
                <option key={node.id} value={node.id}>
                  {node.text}
                </option>
              ))}
            </select>
          </label>
          <input
            className={input + ' max-w-44'}
            value={edgeLabel}
            onChange={e => setEdgeLabel(e.target.value)}
            placeholder={t('arrow_label', 'Popis vztahu…')}
          />
          <label className="flex items-center gap-1.5 text-xs text-slate-300 pb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={edgeDashed}
              onChange={e => setEdgeDashed(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-indigo-600"
            />
            {t('dashed_arrow', 'Čárkovaná šipka')}
          </label>
          <button className={button} onClick={addEdge}>
            {t('connect_arrow', 'Propojit šipkou')}
          </button>
        </div>

        {edges.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400">{t('edges', 'Vztahy:')}</span>
            {edges.map(edge => {
              const fromNode = nodes.find(n => n.id === edge.from);
              const toNode = nodes.find(n => n.id === edge.to);
              return (
                <span
                  key={edge.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 text-[11px] text-slate-300"
                >
                  {fromNode?.text || edge.from} → {toNode?.text || edge.to} {edge.label && `("${edge.label}")`}
                  <button
                    className="text-slate-500 hover:text-rose-400 ml-1"
                    onClick={() => deleteEdge(edge.id)}
                    title={t('delete', 'Smazat')}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 700 450"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full min-h-[420px] rounded-xl bg-slate-950 border border-slate-800 cursor-default shadow-inner"
      >
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#818cf8" />
          </marker>
        </defs>

        {/* Render edges */}
        {edges.map(edge => {
          const from = nodes.find(node => node.id === edge.from);
          const to = nodes.find(node => node.id === edge.to);
          if (!from || !to) return null;
          const x1 = from.x + 70;
          const y1 = from.y + 30;
          const x2 = to.x + 70;
          const y2 = to.y + 30;
          return (
            <g key={edge.id}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#818cf8"
                strokeWidth="2"
                strokeDasharray={edge.dashed ? '6 4' : undefined}
                markerEnd="url(#arrow)"
              />
              {edge.label && (
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 6}
                  fill="#cbd5e1"
                  fontSize="11"
                  textAnchor="middle"
                  className="bg-slate-950 font-sans"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Render nodes */}
        {nodes.map(node => {
          const isSel = node.id === selected;
          return (
            <g
              key={node.id}
              onPointerDown={e => handlePointerDown(node.id, e)}
              className="cursor-move"
            >
              <rect
                x={node.x}
                y={node.y}
                width="140"
                height="60"
                rx={node.type === 'actor' ? 30 : node.type === 'usecase' ? 24 : 6}
                fill={isSel ? '#3730a3' : '#1e293b'}
                stroke={isSel ? '#a5b4fc' : '#475569'}
                strokeWidth={isSel ? 2 : 1}
              />
              <text
                x={node.x + 70}
                y={node.y + 33}
                textAnchor="middle"
                fill="white"
                fontSize="13"
                fontWeight="bold"
              >
                {node.text}
              </text>
              <text
                x={node.x + 70}
                y={node.y + 48}
                textAnchor="middle"
                fill={isSel ? '#c7d2fe' : '#94a3b8'}
                fontSize="9"
              >
                &lt;&lt;{node.type}&gt;&gt;
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
