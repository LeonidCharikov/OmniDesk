import React, { useMemo, useState } from 'react';
import {
  DiagramCanvasTheme,
  DiagramEdge,
  DiagramNode,
  EdgeMarkerType,
  GRID_SIZE,
  Point2D,
  PortSide,
  computeEdgeGeometry,
  getEffectiveNodeHeight,
  getPortAnchor,
  snapValue,
} from './diagramEditor.logic';

export interface DiagramViewport {
  panX: number;
  panY: number;
  zoom: number;
}

interface DiagramEditorCanvasProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  canvasTheme: DiagramCanvasTheme;
  showGrid: boolean;
  snapToGrid: boolean;
  viewport: DiagramViewport;
  onViewportChange: (next: DiagramViewport) => void;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (id: string | null) => void;
  onSelectEdge: (id: string | null) => void;
  onMoveNode: (id: string, x: number, y: number, commit?: boolean) => void;
  onResizeNode: (id: string, width: number, height: number, commit?: boolean) => void;
  onConnectNodes: (fromId: string, fromPort: PortSide, toId: string, toPort: PortSide) => void;
  onDoubleClickNode?: (id: string) => void;
  emptyHint: string;
}

interface CanvasPalette {
  bg: string;
  grid: string;
  cardFill: string;
  cardHeaderText: string;
  bodyText: string;
  mutedText: string;
  divider: string;
  labelPillBg: string;
  labelPillStroke: string;
  hollowFill: string;
}

function getCanvasPalette(theme: DiagramCanvasTheme): CanvasPalette {
  if (theme === 'light') {
    return {
      bg: '#ffffff',
      grid: '#e2e8f0',
      cardFill: '#f8fafc',
      cardHeaderText: '#ffffff',
      bodyText: '#0f172a',
      mutedText: '#475569',
      divider: '#cbd5e1',
      labelPillBg: '#ffffff',
      labelPillStroke: '#cbd5e1',
      hollowFill: '#ffffff',
    };
  }
  if (theme === 'transparent') {
    return {
      bg: 'none',
      grid: 'rgba(148,163,184,0.16)',
      cardFill: '#111827',
      cardHeaderText: '#ffffff',
      bodyText: '#f1f5f9',
      mutedText: '#94a3b8',
      divider: '#334155',
      labelPillBg: '#0f172a',
      labelPillStroke: '#334155',
      hollowFill: '#0f172a',
    };
  }
  return {
    bg: '#090d16',
    grid: 'rgba(148,163,184,0.13)',
    cardFill: '#111827',
    cardHeaderText: '#ffffff',
    bodyText: '#f1f5f9',
    mutedText: '#94a3b8',
    divider: '#293548',
    labelPillBg: '#0f172a',
    labelPillStroke: '#334155',
    hollowFill: '#090d16',
  };
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(1, maxChars - 1))}…`;
}

function markerIdFor(marker: EdgeMarkerType, color: string): string {
  const safeHex = color.replace(/[^a-zA-Z0-9]/g, '');
  return `mk_${marker}_${safeHex}`;
}

function getStrokeDasharray(style: DiagramEdge['lineStyle']): string | undefined {
  if (style === 'dashed') return '7 5';
  if (style === 'dotted') return '2.5 4';
  return undefined;
}

type DragInteraction =
  | { kind: 'pan'; startClientX: number; startClientY: number; origPanX: number; origPanY: number }
  | { kind: 'move-node'; nodeId: string; offsetX: number; offsetY: number; moved: boolean }
  | { kind: 'resize-node'; nodeId: string; startX: number; startY: number; origW: number; origH: number; moved: boolean }
  | { kind: 'connect'; fromId: string; fromPort: Exclude<PortSide, 'auto'>; curX: number; curY: number };

const PORT_SIDES: Array<Exclude<PortSide, 'auto'>> = ['top', 'right', 'bottom', 'left'];

export const DiagramEditorCanvas: React.FC<DiagramEditorCanvasProps> = ({
  svgRef,
  nodes,
  edges,
  canvasTheme,
  showGrid,
  snapToGrid,
  viewport,
  onViewportChange,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  onMoveNode,
  onResizeNode,
  onConnectNodes,
  onDoubleClickNode,
  emptyHint,
}) => {
  const [interaction, setInteraction] = useState<DragInteraction | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [connectHoverTarget, setConnectHoverTarget] = useState<{
    nodeId: string;
    port: PortSide;
  } | null>(null);

  const pal = useMemo(() => getCanvasPalette(canvasTheme), [canvasTheme]);
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  // Separate background group frames from foreground shapes
  const { groupNodes, regularNodes } = useMemo(() => {
    const groups: DiagramNode[] = [];
    const regular: DiagramNode[] = [];
    for (const n of nodes) {
      if (n.type === 'group') groups.push(n);
      else regular.push(n);
    }
    return { groupNodes: groups, regularNodes: regular };
  }, [nodes]);

  // Collect all unique (markerType, color) pairs so SVG <defs> stay compact & clean
  const markerDefs = useMemo(() => {
    const seen = new Map<string, { marker: EdgeMarkerType; color: string }>();
    for (const e of edges) {
      const col = e.id === selectedEdgeId ? '#818cf8' : e.color;
      if (e.startMarker !== 'none') {
        seen.set(markerIdFor(e.startMarker, col), { marker: e.startMarker, color: col });
      }
      if (e.endMarker !== 'none') {
        seen.set(markerIdFor(e.endMarker, col), { marker: e.endMarker, color: col });
      }
    }
    return Array.from(seen.entries());
  }, [edges, selectedEdgeId]);

  const clientToWorld = (clientX: number, clientY: number): Point2D => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left - viewport.panX) / viewport.zoom,
      y: (clientY - rect.top - viewport.panY) / viewport.zoom,
    };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // Only pan when clicking empty background or using middle button
    if (e.button === 1 || e.target === e.currentTarget || (e.target as Element).getAttribute('data-bg') === 'true') {
      onSelectNode(null);
      onSelectEdge(null);
      setInteraction({
        kind: 'pan',
        startClientX: e.clientX,
        startClientY: e.clientY,
        origPanX: viewport.panX,
        origPanY: viewport.panY,
      });
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handleNodePointerDown = (node: DiagramNode, e: React.PointerEvent<SVGGElement>) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    onSelectEdge(null);
    onSelectNode(node.id);
    const world = clientToWorld(e.clientX, e.clientY);
    setInteraction({
      kind: 'move-node',
      nodeId: node.id,
      offsetX: world.x - node.x,
      offsetY: world.y - node.y,
      moved: false,
    });
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const handleResizePointerDown = (node: DiagramNode, e: React.PointerEvent<SVGRectElement>) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const world = clientToWorld(e.clientX, e.clientY);
    setInteraction({
      kind: 'resize-node',
      nodeId: node.id,
      startX: world.x,
      startY: world.y,
      origW: node.width,
      origH: getEffectiveNodeHeight(node),
      moved: false,
    });
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePortPointerDown = (
    node: DiagramNode,
    side: Exclude<PortSide, 'auto'>,
    e: React.PointerEvent<SVGCircleElement>
  ) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const anchor = getPortAnchor(node, side);
    setInteraction({
      kind: 'connect',
      fromId: node.id,
      fromPort: side,
      curX: anchor.x,
      curY: anchor.y,
    });
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interaction) return;

    if (interaction.kind === 'pan') {
      const dx = e.clientX - interaction.startClientX;
      const dy = e.clientY - interaction.startClientY;
      onViewportChange({
        ...viewport,
        panX: interaction.origPanX + dx,
        panY: interaction.origPanY + dy,
      });
      return;
    }

    const world = clientToWorld(e.clientX, e.clientY);

    if (interaction.kind === 'move-node') {
      const nx = snapValue(world.x - interaction.offsetX, snapToGrid);
      const ny = snapValue(world.y - interaction.offsetY, snapToGrid);
      onMoveNode(interaction.nodeId, nx, ny, false);
      if (!interaction.moved) {
        setInteraction({ ...interaction, moved: true });
      }
      return;
    }

    if (interaction.kind === 'resize-node') {
      const dx = world.x - interaction.startX;
      const dy = world.y - interaction.startY;
      const nw = Math.max(90, snapValue(interaction.origW + dx, snapToGrid));
      const nh = Math.max(48, snapValue(interaction.origH + dy, snapToGrid));
      onResizeNode(interaction.nodeId, nw, nh, false);
      if (!interaction.moved) {
        setInteraction({ ...interaction, moved: true });
      }
      return;
    }

    if (interaction.kind === 'connect') {
      setInteraction({ ...interaction, curX: world.x, curY: world.y });
      // Hit-test target node & closest port
      let found: { nodeId: string; port: PortSide } | null = null;
      for (const n of regularNodes) {
        if (n.id === interaction.fromId) continue;
        const nh = getEffectiveNodeHeight(n);
        if (world.x >= n.x - 14 && world.x <= n.x + n.width + 14 && world.y >= n.y - 14 && world.y <= n.y + nh + 14) {
          // Pick closest port
          let bestPort: Exclude<PortSide, 'auto'> = 'left';
          let bestDist = Infinity;
          for (const side of PORT_SIDES) {
            const p = getPortAnchor(n, side);
            const d = Math.hypot(world.x - p.x, world.y - p.y);
            if (d < bestDist) {
              bestDist = d;
              bestPort = side;
            }
          }
          found = { nodeId: n.id, port: bestPort };
          break;
        }
      }
      setConnectHoverTarget(found);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interaction) return;
    if (interaction.kind === 'move-node' && interaction.moved) {
      const n = nodeMap.get(interaction.nodeId);
      if (n) onMoveNode(n.id, n.x, n.y, true);
    } else if (interaction.kind === 'resize-node' && interaction.moved) {
      const n = nodeMap.get(interaction.nodeId);
      if (n) onResizeNode(n.id, n.width, n.height, true);
    } else if (interaction.kind === 'connect' && connectHoverTarget) {
      onConnectNodes(
        interaction.fromId,
        interaction.fromPort,
        connectHoverTarget.nodeId,
        connectHoverTarget.port
      );
    }

    setInteraction(null);
    setConnectHoverTarget(null);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer was not captured
    }
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.91;
    const nextZoom = Math.max(0.35, Math.min(2.4, Number((viewport.zoom * factor).toFixed(3))));
    const worldX = (mouseX - viewport.panX) / viewport.zoom;
    const worldY = (mouseY - viewport.panY) / viewport.zoom;
    onViewportChange({
      zoom: nextZoom,
      panX: mouseX - worldX * nextZoom,
      panY: mouseY - worldY * nextZoom,
    });
  };

  const renderMarkerElement = (id: string, marker: EdgeMarkerType, color: string) => {
    switch (marker) {
      case 'arrow':
        return (
          <marker
            key={id}
            id={id}
            viewBox="0 0 12 12"
            refX="10"
            refY="6"
            markerWidth="10"
            markerHeight="10"
            orient="auto-start-reverse"
          >
            <path d="M 1.5 1.5 L 10.5 6 L 1.5 10.5" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        );
      case 'arrow-filled':
        return (
          <marker
            key={id}
            id={id}
            viewBox="0 0 12 12"
            refX="10"
            refY="6"
            markerWidth="10"
            markerHeight="10"
            orient="auto-start-reverse"
          >
            <path d="M 1 1.5 L 11 6 L 1 10.5 Z" fill={color} />
          </marker>
        );
      case 'inheritance':
        return (
          <marker
            key={id}
            id={id}
            viewBox="0 0 14 14"
            refX="12"
            refY="7"
            markerWidth="12"
            markerHeight="12"
            orient="auto-start-reverse"
          >
            <path d="M 1.5 2 L 12.5 7 L 1.5 12 Z" fill={pal.hollowFill} stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
          </marker>
        );
      case 'aggregation':
        return (
          <marker
            key={id}
            id={id}
            viewBox="0 0 16 12"
            refX="14"
            refY="6"
            markerWidth="14"
            markerHeight="11"
            orient="auto-start-reverse"
          >
            <path d="M 1.5 6 L 8 1.5 L 14.5 6 L 8 10.5 Z" fill={pal.hollowFill} stroke={color} strokeWidth="1.7" />
          </marker>
        );
      case 'composition':
        return (
          <marker
            key={id}
            id={id}
            viewBox="0 0 16 12"
            refX="14"
            refY="6"
            markerWidth="14"
            markerHeight="11"
            orient="auto-start-reverse"
          >
            <path d="M 1.5 6 L 8 1.5 L 14.5 6 L 8 10.5 Z" fill={color} stroke={color} strokeWidth="1.4" />
          </marker>
        );
      case 'crow-one':
        return (
          <marker
            key={id}
            id={id}
            viewBox="0 0 16 14"
            refX="14"
            refY="7"
            markerWidth="14"
            markerHeight="12"
            orient="auto-start-reverse"
          >
            <line x1="8" y1="2" x2="8" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
            <line x1="12" y1="2" x2="12" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          </marker>
        );
      case 'crow-zero-one':
        return (
          <marker
            key={id}
            id={id}
            viewBox="0 0 18 14"
            refX="16"
            refY="7"
            markerWidth="16"
            markerHeight="12"
            orient="auto-start-reverse"
          >
            <circle cx="5.5" cy="7" r="3.2" fill={pal.hollowFill} stroke={color} strokeWidth="1.7" />
            <line x1="13" y1="2" x2="13" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          </marker>
        );
      case 'crow-many':
        return (
          <marker
            key={id}
            id={id}
            viewBox="0 0 18 14"
            refX="16"
            refY="7"
            markerWidth="16"
            markerHeight="12"
            orient="auto-start-reverse"
          >
            <line x1="6" y1="2" x2="6" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
            <path d="M 16 2 L 6.5 7 L 16 12" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        );
      case 'crow-zero-many':
        return (
          <marker
            key={id}
            id={id}
            viewBox="0 0 20 14"
            refX="18"
            refY="7"
            markerWidth="18"
            markerHeight="12"
            orient="auto-start-reverse"
          >
            <circle cx="5" cy="7" r="3" fill={pal.hollowFill} stroke={color} strokeWidth="1.6" />
            <path d="M 18 2 L 8.5 7 L 18 12" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        );
      default:
        return null;
    }
  };

  const renderNodeBody = (node: DiagramNode) => {
    const w = node.width;
    const h = getEffectiveNodeHeight(node);
    const isSel = node.id === selectedNodeId;
    const strokeCol = isSel ? '#818cf8' : node.color;
    const strokeW = isSel ? 2.2 : 1.5;

    // 1. SQL Table & SQL View
    if (node.type === 'sql-table' || node.type === 'sql-view') {
      const headerH = node.type === 'sql-view' ? 42 : 34;
      const cols = node.columns ?? [];
      const maxNameChars = Math.max(8, Math.floor((w - 115) / 6.8));
      return (
        <g>
          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            rx={8}
            fill={pal.cardFill}
            stroke={strokeCol}
            strokeWidth={strokeW}
          />
          {/* Header band */}
          <path
            d={`M 0 8 Q 0 0 8 0 L ${w - 8} 0 Q ${w} 0 ${w} 8 L ${w} ${headerH} L 0 ${headerH} Z`}
            fill={node.color}
          />
          {node.type === 'sql-view' && (
            <text x={w / 2} y={14} textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize="9.5" fontStyle="italic">
              «{node.stereotype || 'view'}»
            </text>
          )}
          <text
            x={w / 2}
            y={node.type === 'sql-view' ? 31 : 22}
            textAnchor="middle"
            fill={pal.cardHeaderText}
            fontSize="12.5"
            fontWeight="700"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          >
            {truncateText(node.title, Math.max(10, Math.floor((w - 18) / 7.5)))}
          </text>

          {/* Columns */}
          {cols.map((col, idx) => {
            const ry = headerH + 8 + idx * 24;
            const keyTag = col.isPrimaryKey ? 'PK' : col.isForeignKey ? 'FK' : col.isUnique ? 'UQ' : '';
            const keyBg = col.isPrimaryKey ? '#f59e0b' : col.isForeignKey ? '#0ea5e9' : '#8b5cf6';
            return (
              <g key={col.id}>
                {idx > 0 && (
                  <line x1={8} y1={ry - 4} x2={w - 8} y2={ry - 4} stroke={pal.divider} strokeWidth="0.7" opacity="0.6" />
                )}
                {keyTag ? (
                  <g>
                    <rect x={8} y={ry} width={22} height={15} rx={3} fill={keyBg} opacity="0.22" />
                    <text
                      x={19}
                      y={ry + 11}
                      textAnchor="middle"
                      fill={keyBg}
                      fontSize="8.5"
                      fontWeight="700"
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    >
                      {keyTag}
                    </text>
                  </g>
                ) : (
                  <circle cx={19} cy={ry + 7.5} r={2.2} fill={pal.mutedText} opacity="0.55" />
                )}
                <text
                  x={36}
                  y={ry + 11.5}
                  fill={pal.bodyText}
                  fontSize="11"
                  fontWeight={col.isPrimaryKey ? '700' : '500'}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {truncateText(col.name, maxNameChars)}
                  {col.isNotNull ? '' : '?'}
                </text>
                <text
                  x={w - 10}
                  y={ry + 11.5}
                  textAnchor="end"
                  fill={pal.mutedText}
                  fontSize="10"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {truncateText(col.dataType, 14)}
                </text>
              </g>
            );
          })}
        </g>
      );
    }

    // 2. UML Class / Interface / Enum
    if (node.type === 'uml-class' || node.type === 'uml-interface' || node.type === 'uml-enum') {
      const stereo =
        node.stereotype ||
        (node.type === 'uml-interface' ? 'interface' : node.type === 'uml-enum' ? 'enumeration' : '');
      const headerH = stereo ? 44 : 34;
      const attrs = node.attributes ?? [];
      const methods = node.methods ?? [];
      const attrSectionH = Math.max(1, attrs.length) * 20 + 12;
      const maxLineChars = Math.max(12, Math.floor((w - 22) / 6.6));
      return (
        <g>
          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            rx={6}
            fill={pal.cardFill}
            stroke={strokeCol}
            strokeWidth={strokeW}
          />
          <path
            d={`M 0 6 Q 0 0 6 0 L ${w - 6} 0 Q ${w} 0 ${w} 6 L ${w} ${headerH} L 0 ${headerH} Z`}
            fill={node.color}
            opacity="0.92"
          />
          {stereo && (
            <text x={w / 2} y={15} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="9.5" fontStyle="italic">
              «{stereo}»
            </text>
          )}
          <text
            x={w / 2}
            y={stereo ? 33 : 22}
            textAnchor="middle"
            fill={pal.cardHeaderText}
            fontSize="12.5"
            fontWeight="700"
            fontStyle={node.type === 'uml-interface' ? 'italic' : 'normal'}
          >
            {truncateText(node.title, maxLineChars)}
          </text>

          {/* Attributes compartment */}
          {attrs.length > 0 ? (
            attrs.map((line, i) => (
              <text
                key={`a-${i}`}
                x={10}
                y={headerH + 18 + i * 20}
                fill={pal.bodyText}
                fontSize="10.5"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                {truncateText(line, maxLineChars)}
              </text>
            ))
          ) : (
            <text x={10} y={headerH + 18} fill={pal.mutedText} fontSize="10" fontStyle="italic">
              —
            </text>
          )}

          {/* Methods compartment (for class & interface) */}
          {node.type !== 'uml-enum' && (
            <g>
              <line x1={0} y1={headerH + attrSectionH} x2={w} y2={headerH + attrSectionH} stroke={pal.divider} strokeWidth="1" />
              {methods.length > 0 ? (
                methods.map((line, i) => (
                  <text
                    key={`m-${i}`}
                    x={10}
                    y={headerH + attrSectionH + 18 + i * 20}
                    fill={pal.bodyText}
                    fontSize="10.5"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  >
                    {truncateText(line, maxLineChars)}
                  </text>
                ))
              ) : (
                <text x={10} y={headerH + attrSectionH + 18} fill={pal.mutedText} fontSize="10" fontStyle="italic">
                  —
                </text>
              )}
            </g>
          )}
        </g>
      );
    }

    // 3. UML Actor (Stick Figure)
    if (node.type === 'uml-actor') {
      const cx = w / 2;
      return (
        <g>
          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            rx={8}
            fill="transparent"
            stroke={isSel ? '#818cf8' : 'transparent'}
            strokeDasharray="4 3"
            strokeWidth={1.5}
          />
          <circle cx={cx} cy={22} r={13} fill={pal.cardFill} stroke={node.color} strokeWidth={2.2} />
          <line x1={cx} y1={35} x2={cx} y2={66} stroke={node.color} strokeWidth={2.2} strokeLinecap="round" />
          <line x1={cx - 22} y1={47} x2={cx + 22} y2={47} stroke={node.color} strokeWidth={2.2} strokeLinecap="round" />
          <line x1={cx} y1={66} x2={cx - 18} y2={90} stroke={node.color} strokeWidth={2.2} strokeLinecap="round" />
          <line x1={cx} y1={66} x2={cx + 18} y2={90} stroke={node.color} strokeWidth={2.2} strokeLinecap="round" />
          <text x={cx} y={h - 4} textAnchor="middle" fill={pal.bodyText} fontSize="12" fontWeight="600">
            {truncateText(node.title, 18)}
          </text>
        </g>
      );
    }

    // 4. UML Use Case (Ellipse)
    if (node.type === 'uml-usecase') {
      return (
        <g>
          <ellipse
            cx={w / 2}
            cy={h / 2}
            rx={w / 2 - 2}
            ry={h / 2 - 2}
            fill={pal.cardFill}
            stroke={strokeCol}
            strokeWidth={strokeW}
          />
          <text x={w / 2} y={h / 2 + 4} textAnchor="middle" fill={pal.bodyText} fontSize="12" fontWeight="600">
            {truncateText(node.title, Math.max(10, Math.floor(w / 7.5)))}
          </text>
        </g>
      );
    }

    // 5. UML Package (Folder tab)
    if (node.type === 'uml-package') {
      const tabW = Math.min(w * 0.48, 96);
      const tabH = 22;
      return (
        <g>
          <path
            d={`M 0 6 Q 0 0 6 0 L ${tabW - 6} 0 Q ${tabW} 0 ${tabW + 4} 6 L ${tabW + 10} ${tabH} L ${w - 6} ${tabH} Q ${w} ${tabH} ${w} ${tabH + 6} L ${w} ${h - 6} Q ${w} ${h} ${w - 6} ${h} L 6 ${h} Q 0 ${h} 0 ${h - 6} Z`}
            fill={pal.cardFill}
            stroke={strokeCol}
            strokeWidth={strokeW}
          />
          <line x1={0} y1={tabH} x2={tabW + 10} y2={tabH} stroke={strokeCol} strokeWidth={1.2} />
          <text x={w / 2} y={tabH + (h - tabH) / 2 + 2} textAnchor="middle" fill={pal.bodyText} fontSize="12.5" fontWeight="700">
            {truncateText(node.title, Math.max(10, Math.floor(w / 7.5)))}
          </text>
          {node.subtitle && (
            <text x={w / 2} y={tabH + (h - tabH) / 2 + 18} textAnchor="middle" fill={pal.mutedText} fontSize="10">
              {node.subtitle}
            </text>
          )}
        </g>
      );
    }

    // 6. UML Component
    if (node.type === 'uml-component') {
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} rx={6} fill={pal.cardFill} stroke={strokeCol} strokeWidth={strokeW} />
          {/* Standard UML component glyph in top-right */}
          <g transform={`translate(${w - 28}, 10)`}>
            <rect x={4} y={0} width={16} height={18} rx={1.5} fill="none" stroke={node.color} strokeWidth={1.3} />
            <rect x={0} y={3.5} width={7} height={4} fill={pal.cardFill} stroke={node.color} strokeWidth={1.2} />
            <rect x={0} y={10.5} width={7} height={4} fill={pal.cardFill} stroke={node.color} strokeWidth={1.2} />
          </g>
          <text x={w / 2} y={h / 2 - 5} textAnchor="middle" fill={pal.mutedText} fontSize="9.5" fontStyle="italic">
            «{node.stereotype || 'component'}»
          </text>
          <text x={w / 2} y={h / 2 + 13} textAnchor="middle" fill={pal.bodyText} fontSize="12.5" fontWeight="700">
            {truncateText(node.title, Math.max(10, Math.floor((w - 32) / 7.2)))}
          </text>
        </g>
      );
    }

    // 7. Flowchart Start / Terminator (Stadium)
    if (node.type === 'flow-start') {
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} rx={h / 2} fill={node.color} fillOpacity="0.18" stroke={strokeCol} strokeWidth={strokeW} />
          <text x={w / 2} y={h / 2 + 4.5} textAnchor="middle" fill={pal.bodyText} fontSize="12.5" fontWeight="700">
            {truncateText(node.title, Math.max(10, Math.floor(w / 7.5)))}
          </text>
        </g>
      );
    }

    // 8. Flowchart Decision (Diamond)
    if (node.type === 'flow-decision') {
      const pts = `${w / 2},2 ${w - 2},${h / 2} ${w / 2},${h - 2} 2,${h / 2}`;
      return (
        <g>
          <polygon points={pts} fill={pal.cardFill} stroke={strokeCol} strokeWidth={strokeW} strokeLinejoin="round" />
          <text x={w / 2} y={h / 2 + 4} textAnchor="middle" fill={pal.bodyText} fontSize="11.5" fontWeight="700">
            {truncateText(node.title, Math.max(8, Math.floor(w / 9)))}
          </text>
        </g>
      );
    }

    // 9. Flowchart I/O (Parallelogram)
    if (node.type === 'flow-io') {
      const skew = Math.min(22, w * 0.16);
      const pts = `${skew},2 ${w - 2},2 ${w - skew},${h - 2} 2,${h - 2}`;
      return (
        <g>
          <polygon points={pts} fill={pal.cardFill} stroke={strokeCol} strokeWidth={strokeW} strokeLinejoin="round" />
          <text x={w / 2} y={h / 2 + 4} textAnchor="middle" fill={pal.bodyText} fontSize="12" fontWeight="600">
            {truncateText(node.title, Math.max(10, Math.floor((w - skew * 2) / 7)))}
          </text>
        </g>
      );
    }

    // 10. Flowchart / Architecture Database Cylinder
    if (node.type === 'flow-database') {
      const ry = Math.min(14, h * 0.16);
      return (
        <g>
          <path
            d={`M 2 ${ry} L 2 ${h - ry} A ${w / 2 - 2} ${ry} 0 0 0 ${w - 2} ${h - ry} L ${w - 2} ${ry} Z`}
            fill={pal.cardFill}
            stroke={strokeCol}
            strokeWidth={strokeW}
          />
          <ellipse cx={w / 2} cy={ry} rx={w / 2 - 2} ry={ry} fill={node.color} fillOpacity="0.28" stroke={strokeCol} strokeWidth={strokeW} />
          <text x={w / 2} y={h / 2 + (node.subtitle ? 0 : 6)} textAnchor="middle" fill={pal.bodyText} fontSize="12" fontWeight="700">
            {truncateText(node.title, Math.max(8, Math.floor(w / 7.5)))}
          </text>
          {node.subtitle && (
            <text x={w / 2} y={h / 2 + 16} textAnchor="middle" fill={pal.mutedText} fontSize="9.5">
              {truncateText(node.subtitle, 16)}
            </text>
          )}
        </g>
      );
    }

    // 11. Flowchart Document (Wavy bottom)
    if (node.type === 'flow-document') {
      const waveY = h - 12;
      return (
        <g>
          <path
            d={`M 2 6 Q 2 2 6 2 L ${w - 6} 2 Q ${w - 2} 2 ${w - 2} 6 L ${w - 2} ${waveY} Q ${w * 0.75} ${waveY - 12}, ${w * 0.5} ${waveY} T 2 ${waveY} Z`}
            fill={pal.cardFill}
            stroke={strokeCol}
            strokeWidth={strokeW}
          />
          <text x={w / 2} y={h / 2} textAnchor="middle" fill={pal.bodyText} fontSize="12" fontWeight="600">
            {truncateText(node.title, Math.max(10, Math.floor(w / 7.5)))}
          </text>
        </g>
      );
    }

    // 12. Architecture Cloud
    if (node.type === 'arch-cloud') {
      const d = `M ${w * 0.24} ${h * 0.78} C ${w * 0.06} ${h * 0.78}, ${w * 0.04} ${h * 0.46}, ${w * 0.2} ${h * 0.42} C ${w * 0.18} ${h * 0.16}, ${w * 0.46} ${h * 0.08}, ${w * 0.56} ${h * 0.24} C ${w * 0.7} ${h * 0.12}, ${w * 0.92} ${h * 0.26}, ${w * 0.86} ${h * 0.48} C ${w * 0.98} ${h * 0.54}, ${w * 0.94} ${h * 0.78}, ${w * 0.76} ${h * 0.78} Z`;
      return (
        <g>
          <path d={d} fill={pal.cardFill} stroke={strokeCol} strokeWidth={strokeW} strokeLinejoin="round" />
          <text x={w / 2} y={h * 0.57} textAnchor="middle" fill={pal.bodyText} fontSize="12" fontWeight="700">
            {truncateText(node.title, Math.max(10, Math.floor(w / 8.5)))}
          </text>
        </g>
      );
    }

    // 13. Architecture Message Queue (Horizontal Cylinder)
    if (node.type === 'arch-queue') {
      const rx = 12;
      return (
        <g>
          <path
            d={`M ${rx} 2 L ${w - rx} 2 A ${rx} ${h / 2 - 2} 0 0 1 ${w - rx} ${h - 2} L ${rx} ${h - 2} A ${rx} ${h / 2 - 2} 0 0 1 ${rx} 2 Z`}
            fill={pal.cardFill}
            stroke={strokeCol}
            strokeWidth={strokeW}
          />
          <ellipse cx={w - rx} cy={h / 2} rx={rx} ry={h / 2 - 2} fill={node.color} fillOpacity="0.22" stroke={strokeCol} strokeWidth={strokeW} />
          <text x={(w - rx) / 2 + 4} y={h / 2 + (node.subtitle ? -2 : 4)} textAnchor="middle" fill={pal.bodyText} fontSize="12" fontWeight="700">
            {truncateText(node.title, Math.max(8, Math.floor((w - 28) / 7.5)))}
          </text>
          {node.subtitle && (
            <text x={(w - rx) / 2 + 4} y={h / 2 + 14} textAnchor="middle" fill={pal.mutedText} fontSize="9.5">
              {truncateText(node.subtitle, 18)}
            </text>
          )}
        </g>
      );
    }

    // 14. Sticky Note / UML Comment
    if (node.type === 'note') {
      const fold = 18;
      const bodyLines = (node.body || '').split('\n').slice(0, 3);
      return (
        <g>
          <path
            d={`M 2 2 L ${w - fold} 2 L ${w - 2} ${fold} L ${w - 2} ${h - 2} L 2 ${h - 2} Z`}
            fill={node.color}
            fillOpacity="0.16"
            stroke={strokeCol}
            strokeWidth={strokeW}
            strokeLinejoin="round"
          />
          <path
            d={`M ${w - fold} 2 L ${w - fold} ${fold} L ${w - 2} ${fold}`}
            fill="none"
            stroke={strokeCol}
            strokeWidth={1.3}
          />
          <text x={12} y={22} fill={pal.bodyText} fontSize="11.5" fontWeight="700">
            {truncateText(node.title, Math.max(10, Math.floor((w - 30) / 7)))}
          </text>
          {bodyLines.map((line, i) => (
            <text key={i} x={12} y={42 + i * 16} fill={pal.mutedText} fontSize="10.5">
              {truncateText(line, Math.max(14, Math.floor((w - 24) / 6)))}
            </text>
          ))}
        </g>
      );
    }

    // 15. Group / Swimlane Frame
    if (node.type === 'group') {
      return (
        <g>
          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            rx={12}
            fill={node.color}
            fillOpacity="0.07"
            stroke={isSel ? '#818cf8' : node.color}
            strokeWidth={isSel ? 2 : 1.5}
            strokeDasharray="8 5"
          />
          <rect x={12} y={-10} width={Math.min(w - 24, Math.max(90, node.title.length * 7.8 + 20))} height={20} rx={4} fill={pal.labelPillBg} stroke={node.color} strokeWidth={1.2} />
          <text x={22} y={4} fill={pal.bodyText} fontSize="11" fontWeight="700">
            {truncateText(node.title, Math.max(12, Math.floor((w - 36) / 7.5)))}
          </text>
        </g>
      );
    }

    // 16. Default: Process / Arch Service rectangle with subtle top accent bar
    return (
      <g>
        <rect x={0} y={0} width={w} height={h} rx={8} fill={pal.cardFill} stroke={strokeCol} strokeWidth={strokeW} />
        <path d={`M 0 8 Q 0 0 8 0 L ${w - 8} 0 Q ${w} 0 ${w} 8 L ${w} 8 L 0 8 Z`} fill={node.color} />
        <text
          x={w / 2}
          y={h / 2 + (node.subtitle ? -2 : 5)}
          textAnchor="middle"
          fill={pal.bodyText}
          fontSize="12.5"
          fontWeight="700"
        >
          {truncateText(node.title, Math.max(10, Math.floor((w - 18) / 7.4)))}
        </text>
        {node.subtitle && (
          <text x={w / 2} y={h / 2 + 16} textAnchor="middle" fill={pal.mutedText} fontSize="10">
            {truncateText(node.subtitle, Math.max(12, Math.floor((w - 18) / 6)))}
          </text>
        )}
      </g>
    );
  };

  const renderNodeWrapper = (node: DiagramNode) => {
    const isSel = node.id === selectedNodeId;
    const isHover = node.id === hoveredNodeId;
    const isConnectTarget = connectHoverTarget?.nodeId === node.id;
    const h = getEffectiveNodeHeight(node);
    const showPorts = node.type !== 'group' && (isSel || isHover || interaction?.kind === 'connect');

    return (
      <g
        key={node.id}
        transform={`translate(${node.x}, ${node.y})`}
        onPointerDown={e => handleNodePointerDown(node, e)}
        onDoubleClick={e => {
          e.stopPropagation();
          onDoubleClickNode?.(node.id);
        }}
        onMouseEnter={() => setHoveredNodeId(node.id)}
        onMouseLeave={() => setHoveredNodeId(prev => (prev === node.id ? null : prev))}
        className="cursor-move"
      >
        {renderNodeBody(node)}

        {/* Highlight ring when targeted by live connector drag */}
        {isConnectTarget && (
          <rect
            x={-4}
            y={-4}
            width={node.width + 8}
            height={h + 8}
            rx={10}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={2}
            strokeDasharray="5 3"
            pointerEvents="none"
          />
        )}

        {/* Interactive Connection Ports (Top / Right / Bottom / Left) */}
        {showPorts &&
          PORT_SIDES.map(side => {
            const localX = side === 'left' ? 0 : side === 'right' ? node.width : node.width / 2;
            const localY = side === 'top' ? 0 : side === 'bottom' ? h : h / 2;
            const isTargetPort = isConnectTarget && connectHoverTarget?.port === side;
            return (
              <circle
                key={side}
                data-ui-only="true"
                cx={localX}
                cy={localY}
                r={isTargetPort ? 6.5 : 5}
                fill={isTargetPort ? '#38bdf8' : '#6366f1'}
                stroke="#ffffff"
                strokeWidth={1.8}
                className="cursor-crosshair"
                onPointerDown={e => handlePortPointerDown(node, side, e)}
              />
            );
          })}

        {/* Bottom-right resize handle for selected node */}
        {isSel && (
          <rect
            data-ui-only="true"
            x={node.width - 6}
            y={h - 6}
            width={11}
            height={11}
            rx={2.5}
            fill="#6366f1"
            stroke="#ffffff"
            strokeWidth={1.5}
            className="cursor-nwse-resize"
            onPointerDown={e => handleResizePointerDown(node, e)}
          />
        )}
      </g>
    );
  };

  // Live rubber-band connector preview while dragging from a port
  const liveConnectLine = useMemo(() => {
    if (interaction?.kind !== 'connect') return null;
    const fromNode = nodeMap.get(interaction.fromId);
    if (!fromNode) return null;
    const start = getPortAnchor(fromNode, interaction.fromPort);
    return { x1: start.x, y1: start.y, x2: interaction.curX, y2: interaction.curY };
  }, [interaction, nodeMap]);

  return (
    <div
      className={`relative w-full h-[560px] rounded-xl overflow-hidden border border-slate-800 select-none ${
        canvasTheme === 'transparent'
          ? 'bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] bg-slate-950/60'
          : ''
      }`}
    >
      <svg
        ref={svgRef}
        className="w-full h-full block touch-none"
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      >
        <defs>
          {showGrid && (
            <pattern
              id="diagram_dot_grid"
              width={GRID_SIZE}
              height={GRID_SIZE}
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${viewport.panX} ${viewport.panY}) scale(${viewport.zoom})`}
            >
              <circle cx={1.5} cy={1.5} r={1.1} fill={pal.grid} />
            </pattern>
          )}
          {markerDefs.map(([id, def]) => renderMarkerElement(id, def.marker, def.color))}
        </defs>

        {/* Background fill */}
        {pal.bg !== 'none' && <rect data-bg="true" width="100%" height="100%" fill={pal.bg} />}
        {showGrid && <rect data-bg="true" width="100%" height="100%" fill="url(#diagram_dot_grid)" />}

        {/* Main Transformed World Group */}
        <g data-diagram-world="true" transform={`translate(${viewport.panX}, ${viewport.panY}) scale(${viewport.zoom})`}>
          {/* Layer 1: Background Group Frames */}
          {groupNodes.map(renderNodeWrapper)}

          {/* Layer 2: Edges & Connectors */}
          {edges.map(edge => {
            const from = nodeMap.get(edge.fromId);
            const to = nodeMap.get(edge.toId);
            if (!from || !to) return null;

            const geom = computeEdgeGeometry(edge, from, to);
            const isSel = edge.id === selectedEdgeId;
            const strokeCol = isSel ? '#818cf8' : edge.color;
            const startMk = edge.startMarker !== 'none' ? `url(#${markerIdFor(edge.startMarker, strokeCol)})` : undefined;
            const endMk = edge.endMarker !== 'none' ? `url(#${markerIdFor(edge.endMarker, strokeCol)})` : undefined;

            return (
              <g
                key={edge.id}
                onPointerDown={e => {
                  e.stopPropagation();
                  onSelectNode(null);
                  onSelectEdge(edge.id);
                }}
                className="cursor-pointer"
              >
                {/* Invisible wide hitbox for effortless edge clicking */}
                <path d={geom.pathD} fill="none" stroke="transparent" strokeWidth={14} />

                {/* Visible path */}
                <path
                  d={geom.pathD}
                  fill="none"
                  stroke={strokeCol}
                  strokeWidth={isSel ? 2.8 : 1.9}
                  strokeDasharray={getStrokeDasharray(edge.lineStyle)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  markerStart={startMk}
                  markerEnd={endMk}
                />

                {/* Center Label */}
                {edge.label && (
                  <g transform={`translate(${geom.labelPos.x}, ${geom.labelPos.y})`}>
                    <rect
                      x={-(edge.label.length * 3.6 + 8)}
                      y={-11}
                      width={edge.label.length * 7.2 + 16}
                      height={18}
                      rx={4}
                      fill={pal.labelPillBg}
                      stroke={isSel ? '#818cf8' : pal.labelPillStroke}
                      strokeWidth={1}
                    />
                    <text textAnchor="middle" y={2} fill={pal.bodyText} fontSize="10.5" fontWeight="600">
                      {edge.label}
                    </text>
                  </g>
                )}

                {/* Source & Target Multiplicity */}
                {edge.sourceMultiplicity && (
                  <text
                    x={geom.startMultPos.x}
                    y={geom.startMultPos.y}
                    textAnchor="middle"
                    fill={pal.mutedText}
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  >
                    {edge.sourceMultiplicity}
                  </text>
                )}
                {edge.targetMultiplicity && (
                  <text
                    x={geom.endMultPos.x}
                    y={geom.endMultPos.y}
                    textAnchor="middle"
                    fill={pal.mutedText}
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  >
                    {edge.targetMultiplicity}
                  </text>
                )}
              </g>
            );
          })}

          {/* Layer 3: Foreground Nodes */}
          {regularNodes.map(renderNodeWrapper)}

          {/* Layer 4: Live Drag-to-Connect Rubber-Band Line */}
          {liveConnectLine && (
            <line
              data-ui-only="true"
              x1={liveConnectLine.x1}
              y1={liveConnectLine.y1}
              x2={liveConnectLine.x2}
              y2={liveConnectLine.y2}
              stroke="#38bdf8"
              strokeWidth={2.2}
              strokeDasharray="6 4"
              pointerEvents="none"
            />
          )}
        </g>
      </svg>

      {/* Empty canvas guidance */}
      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-sm text-center px-5 py-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            {emptyHint}
          </div>
        </div>
      )}
    </div>
  );
};
