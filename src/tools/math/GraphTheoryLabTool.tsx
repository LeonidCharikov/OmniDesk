import React, { useState, useMemo } from 'react';
import { Network, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { analyzeGraph, type GraphNode, type GraphEdge } from '../../utils/scienceMathExt.logic';

interface GraphPreset {
  id: string;
  label: string;
  directed: boolean;
  nodes: GraphNode[];
  edges: GraphEdge[];
  start: string;
  end: string;
}

const PRESETS: GraphPreset[] = [
  {
    id: 'city',
    label: 'City Network (Undirected)',
    directed: false,
    nodes: [
      { id: 'A', x: 70, y: 120 },
      { id: 'B', x: 200, y: 45 },
      { id: 'C', x: 200, y: 195 },
      { id: 'D', x: 350, y: 45 },
      { id: 'E', x: 350, y: 195 },
      { id: 'F', x: 480, y: 120 },
    ],
    edges: [
      { from: 'A', to: 'B', weight: 4 },
      { from: 'A', to: 'C', weight: 2 },
      { from: 'B', to: 'C', weight: 5 },
      { from: 'B', to: 'D', weight: 10 },
      { from: 'C', to: 'E', weight: 3 },
      { from: 'E', to: 'D', weight: 4 },
      { from: 'D', to: 'F', weight: 11 },
      { from: 'E', to: 'F', weight: 8 },
    ],
    start: 'A',
    end: 'F',
  },
  {
    id: 'dag',
    label: 'Task Dependency DAG (Directed)',
    directed: true,
    nodes: [
      { id: 'A', x: 70, y: 120 },
      { id: 'B', x: 210, y: 50 },
      { id: 'C', x: 210, y: 190 },
      { id: 'D', x: 360, y: 120 },
      { id: 'E', x: 490, y: 120 },
    ],
    edges: [
      { from: 'A', to: 'B', weight: 2 },
      { from: 'A', to: 'C', weight: 5 },
      { from: 'B', to: 'D', weight: 3 },
      { from: 'C', to: 'D', weight: 1 },
      { from: 'D', to: 'E', weight: 4 },
    ],
    start: 'A',
    end: 'E',
  },
];

export const GraphTheoryLabTool: React.FC = () => {
  const { t } = useI18n();

  const [nodes, setNodes] = useState<GraphNode[]>(PRESETS[0].nodes);
  const [edges, setEdges] = useState<GraphEdge[]>(PRESETS[0].edges);
  const [directed, setDirected] = useState(false);
  const [startId, setStartId] = useState('A');
  const [endId, setEndId] = useState('F');
  const [highlightMode, setHighlightMode] = useState<'dijkstra' | 'mst'>('dijkstra');

  const analysis = useMemo(
    () => analyzeGraph(nodes, edges, startId, endId, directed),
    [nodes, edges, startId, endId, directed]
  );

  const loadPreset = (p: GraphPreset) => {
    setNodes(p.nodes);
    setEdges(p.edges);
    setDirected(p.directed);
    setStartId(p.start);
    setEndId(p.end);
  };

  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const isEdgeInShortestPath = (e: GraphEdge): boolean => {
    const sp = analysis.shortestPath;
    for (let i = 0; i < sp.length - 1; i++) {
      if (sp[i] === e.from && sp[i + 1] === e.to) return true;
      if (!directed && sp[i] === e.to && sp[i + 1] === e.from) return true;
    }
    return false;
  };

  const isEdgeInMst = (e: GraphEdge): boolean => {
    return analysis.mstEdges.some(
      me =>
        (me.from === e.from && me.to === e.to && me.weight === e.weight) ||
        (me.from === e.to && me.to === e.from && me.weight === e.weight)
    );
  };

  const updateEdge = (idx: number, patch: Partial<GraphEdge>) => {
    setEdges(prev => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Network className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('graph_title', 'Graph Theory & Shortest Path Playground')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'graph_subtitle',
                  'Visualize weighted directed/undirected graphs with Dijkstra shortest path, Kruskal MST, BFS traversal, and Topological Sort.'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => loadPreset(p)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-300"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('graph_start', 'Start Node')}</label>
            <select value={startId} onChange={e => setStartId(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200">
              {nodes.map(n => (
                <option key={n.id} value={n.id}>{n.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('graph_target', 'Target Node')}</label>
            <select value={endId} onChange={e => setEndId(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200">
              {nodes.map(n => (
                <option key={n.id} value={n.id}>{n.id}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setDirected(d => !d)}
              className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${
                directed
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              {directed ? t('graph_directed', 'Mode: Directed') : t('graph_undirected', 'Mode: Undirected')}
            </button>
          </div>
          <div className="flex items-end gap-1">
            <button
              onClick={() => setHighlightMode('dijkstra')}
              className={`flex-1 px-2.5 py-2 rounded-xl text-xs font-semibold border ${
                highlightMode === 'dijkstra'
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              Dijkstra
            </button>
            <button
              onClick={() => setHighlightMode('mst')}
              className={`flex-1 px-2.5 py-2 rounded-xl text-xs font-semibold border ${
                highlightMode === 'mst'
                  ? 'bg-amber-600/20 border-amber-500/50 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              MST
            </button>
          </div>
        </div>

        {/* SVG Canvas */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto">
          <svg viewBox="0 0 560 245" className="w-full min-w-[440px] h-60">
            <defs>
              <marker id="arrow-muted" markerWidth="8" markerHeight="8" refX="20" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill="#64748b" />
              </marker>
              <marker id="arrow-active" markerWidth="8" markerHeight="8" refX="20" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill="#34d399" />
              </marker>
            </defs>

            {edges.map((e, idx) => {
              const a = nodeMap.get(e.from);
              const b = nodeMap.get(e.to);
              if (!a || !b) return null;
              const active = highlightMode === 'dijkstra' ? isEdgeInShortestPath(e) : isEdgeInMst(e);
              const strokeColor = active ? (highlightMode === 'dijkstra' ? '#34d399' : '#fbbf24') : '#475569';
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              return (
                <g key={idx}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={strokeColor}
                    strokeWidth={active ? 3.2 : 1.6}
                    markerEnd={directed ? (active ? 'url(#arrow-active)' : 'url(#arrow-muted)') : undefined}
                  />
                  <rect x={mx - 12} y={my - 9} width="24" height="17" rx="4" fill="#0f172a" stroke={strokeColor} strokeWidth="1" />
                  <text x={mx} y={my + 3} textAnchor="middle" className="fill-slate-200 text-[10px] font-mono">
                    {e.weight}
                  </text>
                </g>
              );
            })}

            {nodes.map(n => {
              const isStart = n.id === startId;
              const isEnd = n.id === endId;
              const inPath = analysis.shortestPath.includes(n.id);
              const fill = isStart ? '#6366f1' : isEnd ? '#10b981' : inPath && highlightMode === 'dijkstra' ? '#1e293b' : '#0f172a';
              const stroke = isStart ? '#a5b4fc' : isEnd ? '#6ee7b7' : inPath ? '#34d399' : '#64748b';
              return (
                <g key={n.id}>
                  <circle cx={n.x} cy={n.y} r="17" fill={fill} stroke={stroke} strokeWidth="2.5" />
                  <text x={n.x} y={n.y + 4} textAnchor="middle" className="fill-white text-xs font-bold font-mono">
                    {n.id}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Algorithm Outputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400">{t('graph_dijkstra_res', 'Dijkstra Shortest Path')}</div>
            <div className="font-mono font-bold text-emerald-400 mt-1">
              {analysis.shortestDistance !== null
                ? `${analysis.shortestPath.join(' → ')} (${analysis.shortestDistance})`
                : t('graph_unreachable', 'Unreachable')}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400">{t('graph_mst_res', 'Kruskal MST Total Weight')}</div>
            <div className="font-mono font-bold text-amber-300 mt-1">
              {analysis.mstTotalWeight} ({analysis.mstEdges.length} {t('graph_edges_short', 'edges')})
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400">{t('graph_bfs_res', 'BFS Order from Start')}</div>
            <div className="font-mono text-indigo-300 mt-1">{analysis.bfsOrder.join(' → ')}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400">{t('graph_topo_res', 'Topological Sort (DAG)')}</div>
            <div className="font-mono text-slate-200 mt-1">
              {!directed
                ? t('graph_topo_need_dir', 'Enable Directed mode')
                : analysis.topoOrder
                ? analysis.topoOrder.join(' → ')
                : t('graph_cycle_detected', 'Cycle detected')}
            </div>
          </div>
        </div>

        {/* Edge Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t('graph_edges_editor', 'Edges & Weights')}
            </h3>
            <button
              onClick={() =>
                setEdges(prev => [
                  ...prev,
                  { from: nodes[0]?.id ?? 'A', to: nodes[nodes.length - 1]?.id ?? 'B', weight: 5 },
                ])
              }
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('graph_add_edge', 'Add Edge')}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {edges.map((e, idx) => (
              <div key={idx} className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                <select value={e.from} onChange={ev => updateEdge(idx, { from: ev.target.value })} className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.id}</option>
                  ))}
                </select>
                <span className="text-slate-500">{directed ? '→' : '—'}</span>
                <select value={e.to} onChange={ev => updateEdge(idx, { to: ev.target.value })} className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.id}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  value={e.weight}
                  onChange={ev => updateEdge(idx, { weight: Math.max(0, Number(ev.target.value) || 0) })}
                  className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-indigo-300"
                />
                <button
                  onClick={() => setEdges(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))}
                  className="ml-auto p-1 text-slate-500 hover:text-rose-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
