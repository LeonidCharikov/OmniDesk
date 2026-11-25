export type DiagramNodeType =
  | 'sql-table'
  | 'sql-view'
  | 'uml-class'
  | 'uml-interface'
  | 'uml-enum'
  | 'uml-actor'
  | 'uml-usecase'
  | 'uml-package'
  | 'uml-component'
  | 'flow-start'
  | 'flow-process'
  | 'flow-decision'
  | 'flow-io'
  | 'flow-database'
  | 'flow-document'
  | 'arch-service'
  | 'arch-cloud'
  | 'arch-queue'
  | 'note'
  | 'group';

export type ShapeCategory = 'sql' | 'uml' | 'flowchart' | 'architecture';

export type PortSide = 'auto' | 'top' | 'right' | 'bottom' | 'left';
export type EdgeRouting = 'orthogonal' | 'bezier' | 'straight';
export type EdgeLineStyle = 'solid' | 'dashed' | 'dotted';

export type EdgeMarkerType =
  | 'none'
  | 'arrow'
  | 'arrow-filled'
  | 'inheritance'
  | 'aggregation'
  | 'composition'
  | 'crow-one'
  | 'crow-zero-one'
  | 'crow-many'
  | 'crow-zero-many';

export type DiagramCanvasTheme = 'dark' | 'light' | 'transparent';

export type DiagramTemplateId =
  | 'sql-ecommerce'
  | 'uml-class'
  | 'flowchart-order'
  | 'system-arch'
  | 'uml-usecase'
  | 'blank';

export interface TableColumn {
  id: string;
  name: string;
  dataType: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isUnique?: boolean;
  isNotNull?: boolean;
}

export interface DiagramNode {
  id: string;
  type: DiagramNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  stereotype?: string;
  subtitle?: string;
  color: string;
  /** Used by sql-table & sql-view */
  columns?: TableColumn[];
  /** Used by uml-class, uml-interface, uml-enum */
  attributes?: string[];
  /** Used by uml-class, uml-interface */
  methods?: string[];
  /** Used by note */
  body?: string;
}

export interface DiagramEdge {
  id: string;
  fromId: string;
  toId: string;
  fromPort: PortSide;
  toPort: PortSide;
  label: string;
  sourceMultiplicity?: string;
  targetMultiplicity?: string;
  routing: EdgeRouting;
  lineStyle: EdgeLineStyle;
  startMarker: EdgeMarkerType;
  endMarker: EdgeMarkerType;
  color: string;
}

export interface DiagramDocument {
  title: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  canvasTheme: DiagramCanvasTheme;
  showGrid: boolean;
  snapToGrid: boolean;
}

export interface ShapeCatalogItem {
  type: DiagramNodeType;
  category: ShapeCategory;
  labelKey: string;
  defaultLabel: string;
  defaultColor: string;
  defaultWidth: number;
  defaultHeight: number;
}

export const NODE_COLOR_PRESETS: Array<{ id: string; hex: string; name: string }> = [
  { id: 'indigo', hex: '#6366f1', name: 'Indigo' },
  { id: 'sky', hex: '#0284c7', name: 'Sky' },
  { id: 'emerald', hex: '#10b981', name: 'Emerald' },
  { id: 'amber', hex: '#f59e0b', name: 'Amber' },
  { id: 'rose', hex: '#f43f5e', name: 'Rose' },
  { id: 'violet', hex: '#8b5cf6', name: 'Violet' },
  { id: 'teal', hex: '#14b8a6', name: 'Teal' },
  { id: 'slate', hex: '#64748b', name: 'Slate' },
];

export const SHAPE_CATALOG: ShapeCatalogItem[] = [
  // SQL / ERD
  {
    type: 'sql-table',
    category: 'sql',
    labelKey: 'de_shape_sql_table',
    defaultLabel: 'SQL Table',
    defaultColor: '#0284c7',
    defaultWidth: 230,
    defaultHeight: 150,
  },
  {
    type: 'sql-view',
    category: 'sql',
    labelKey: 'de_shape_sql_view',
    defaultLabel: 'SQL View',
    defaultColor: '#14b8a6',
    defaultWidth: 220,
    defaultHeight: 130,
  },
  // UML
  {
    type: 'uml-class',
    category: 'uml',
    labelKey: 'de_shape_uml_class',
    defaultLabel: 'UML Class',
    defaultColor: '#6366f1',
    defaultWidth: 215,
    defaultHeight: 150,
  },
  {
    type: 'uml-interface',
    category: 'uml',
    labelKey: 'de_shape_uml_interface',
    defaultLabel: 'Interface',
    defaultColor: '#8b5cf6',
    defaultWidth: 215,
    defaultHeight: 130,
  },
  {
    type: 'uml-enum',
    category: 'uml',
    labelKey: 'de_shape_uml_enum',
    defaultLabel: 'Enum',
    defaultColor: '#f59e0b',
    defaultWidth: 185,
    defaultHeight: 120,
  },
  {
    type: 'uml-actor',
    category: 'uml',
    labelKey: 'de_shape_uml_actor',
    defaultLabel: 'Actor',
    defaultColor: '#6366f1',
    defaultWidth: 96,
    defaultHeight: 112,
  },
  {
    type: 'uml-usecase',
    category: 'uml',
    labelKey: 'de_shape_uml_usecase',
    defaultLabel: 'Use Case',
    defaultColor: '#0284c7',
    defaultWidth: 170,
    defaultHeight: 74,
  },
  {
    type: 'uml-component',
    category: 'uml',
    labelKey: 'de_shape_uml_component',
    defaultLabel: 'Component',
    defaultColor: '#10b981',
    defaultWidth: 180,
    defaultHeight: 86,
  },
  {
    type: 'uml-package',
    category: 'uml',
    labelKey: 'de_shape_uml_package',
    defaultLabel: 'Package',
    defaultColor: '#64748b',
    defaultWidth: 200,
    defaultHeight: 115,
  },
  // Flowchart
  {
    type: 'flow-start',
    category: 'flowchart',
    labelKey: 'de_shape_flow_start',
    defaultLabel: 'Start / End',
    defaultColor: '#10b981',
    defaultWidth: 150,
    defaultHeight: 54,
  },
  {
    type: 'flow-process',
    category: 'flowchart',
    labelKey: 'de_shape_flow_process',
    defaultLabel: 'Process',
    defaultColor: '#6366f1',
    defaultWidth: 165,
    defaultHeight: 68,
  },
  {
    type: 'flow-decision',
    category: 'flowchart',
    labelKey: 'de_shape_flow_decision',
    defaultLabel: 'Decision',
    defaultColor: '#f59e0b',
    defaultWidth: 150,
    defaultHeight: 96,
  },
  {
    type: 'flow-io',
    category: 'flowchart',
    labelKey: 'de_shape_flow_io',
    defaultLabel: 'Input / Output',
    defaultColor: '#0284c7',
    defaultWidth: 170,
    defaultHeight: 66,
  },
  {
    type: 'flow-database',
    category: 'flowchart',
    labelKey: 'de_shape_flow_database',
    defaultLabel: 'Database',
    defaultColor: '#14b8a6',
    defaultWidth: 132,
    defaultHeight: 94,
  },
  {
    type: 'flow-document',
    category: 'flowchart',
    labelKey: 'de_shape_flow_document',
    defaultLabel: 'Document',
    defaultColor: '#8b5cf6',
    defaultWidth: 155,
    defaultHeight: 78,
  },
  // Architecture & Annotations
  {
    type: 'arch-service',
    category: 'architecture',
    labelKey: 'de_shape_arch_service',
    defaultLabel: 'Service / API',
    defaultColor: '#6366f1',
    defaultWidth: 180,
    defaultHeight: 78,
  },
  {
    type: 'arch-cloud',
    category: 'architecture',
    labelKey: 'de_shape_arch_cloud',
    defaultLabel: 'Cloud / Web',
    defaultColor: '#0284c7',
    defaultWidth: 170,
    defaultHeight: 96,
  },
  {
    type: 'arch-queue',
    category: 'architecture',
    labelKey: 'de_shape_arch_queue',
    defaultLabel: 'Queue / Bus',
    defaultColor: '#f43f5e',
    defaultWidth: 170,
    defaultHeight: 66,
  },
  {
    type: 'note',
    category: 'architecture',
    labelKey: 'de_shape_note',
    defaultLabel: 'Sticky Note',
    defaultColor: '#f59e0b',
    defaultWidth: 185,
    defaultHeight: 96,
  },
  {
    type: 'group',
    category: 'architecture',
    labelKey: 'de_shape_group',
    defaultLabel: 'Group / Frame',
    defaultColor: '#64748b',
    defaultWidth: 340,
    defaultHeight: 240,
  },
];

export interface RelationshipPreset {
  id: string;
  labelKey: string;
  defaultLabel: string;
  lineStyle: EdgeLineStyle;
  startMarker: EdgeMarkerType;
  endMarker: EdgeMarkerType;
  sourceMultiplicity?: string;
  targetMultiplicity?: string;
}

export const RELATIONSHIP_PRESETS: RelationshipPreset[] = [
  {
    id: 'flow',
    labelKey: 'de_rel_flow',
    defaultLabel: 'Flow Arrow',
    lineStyle: 'solid',
    startMarker: 'none',
    endMarker: 'arrow-filled',
  },
  {
    id: 'erd-1n',
    labelKey: 'de_rel_erd_1n',
    defaultLabel: 'SQL 1 : N',
    lineStyle: 'solid',
    startMarker: 'crow-one',
    endMarker: 'crow-zero-many',
    sourceMultiplicity: '1',
    targetMultiplicity: '0..*',
  },
  {
    id: 'erd-11',
    labelKey: 'de_rel_erd_11',
    defaultLabel: 'SQL 1 : 1',
    lineStyle: 'solid',
    startMarker: 'crow-one',
    endMarker: 'crow-zero-one',
    sourceMultiplicity: '1',
    targetMultiplicity: '0..1',
  },
  {
    id: 'erd-nm',
    labelKey: 'de_rel_erd_nm',
    defaultLabel: 'SQL N : M',
    lineStyle: 'solid',
    startMarker: 'crow-many',
    endMarker: 'crow-many',
    sourceMultiplicity: '1..*',
    targetMultiplicity: '1..*',
  },
  {
    id: 'uml-inheritance',
    labelKey: 'de_rel_inheritance',
    defaultLabel: 'UML Inheritance',
    lineStyle: 'solid',
    startMarker: 'none',
    endMarker: 'inheritance',
  },
  {
    id: 'uml-implements',
    labelKey: 'de_rel_implements',
    defaultLabel: 'UML Implements',
    lineStyle: 'dashed',
    startMarker: 'none',
    endMarker: 'inheritance',
  },
  {
    id: 'uml-composition',
    labelKey: 'de_rel_composition',
    defaultLabel: 'UML Composition',
    lineStyle: 'solid',
    startMarker: 'composition',
    endMarker: 'none',
  },
  {
    id: 'uml-aggregation',
    labelKey: 'de_rel_aggregation',
    defaultLabel: 'UML Aggregation',
    lineStyle: 'solid',
    startMarker: 'aggregation',
    endMarker: 'none',
  },
  {
    id: 'uml-dependency',
    labelKey: 'de_rel_dependency',
    defaultLabel: 'UML Dependency',
    lineStyle: 'dashed',
    startMarker: 'none',
    endMarker: 'arrow',
  },
];

export const GRID_SIZE = 20;

export function snapValue(val: number, enabled: boolean, grid = GRID_SIZE): number {
  if (!enabled) return Math.round(val);
  return Math.round(val / grid) * grid;
}

let uidCounter = 1;
export function createDiagramId(prefix: string): string {
  uidCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${uidCounter.toString(36)}`;
}

/**
 * Computes the effective rendered height of structured nodes (SQL tables, UML classes)
 * so text rows never clip when users add more fields or methods.
 */
export function getEffectiveNodeHeight(node: DiagramNode): number {
  if (node.type === 'sql-table' || node.type === 'sql-view') {
    const rowCount = Math.max(1, node.columns?.length ?? 0);
    const headerH = node.type === 'sql-view' ? 42 : 34;
    const minH = headerH + rowCount * 24 + 12;
    return Math.max(node.height, minH);
  }
  if (node.type === 'uml-class' || node.type === 'uml-interface') {
    const headerH = node.stereotype || node.type === 'uml-interface' ? 44 : 34;
    const attrCount = Math.max(1, node.attributes?.length ?? 0);
    const methodCount = Math.max(1, node.methods?.length ?? 0);
    const minH = headerH + attrCount * 20 + 12 + methodCount * 20 + 14;
    return Math.max(node.height, minH);
  }
  if (node.type === 'uml-enum') {
    const headerH = 44;
    const valCount = Math.max(1, node.attributes?.length ?? 0);
    return Math.max(node.height, headerH + valCount * 20 + 14);
  }
  return node.height;
}

export function createDefaultNode(type: DiagramNodeType, x: number, y: number): DiagramNode {
  const spec = SHAPE_CATALOG.find(s => s.type === type) ?? SHAPE_CATALOG[0];
  const base: DiagramNode = {
    id: createDiagramId('n'),
    type,
    x,
    y,
    width: spec.defaultWidth,
    height: spec.defaultHeight,
    title: spec.defaultLabel,
    color: spec.defaultColor,
  };

  switch (type) {
    case 'sql-table':
      return {
        ...base,
        title: 'new_table',
        columns: [
          { id: createDiagramId('c'), name: 'id', dataType: 'BIGINT', isPrimaryKey: true, isNotNull: true },
          { id: createDiagramId('c'), name: 'name', dataType: 'VARCHAR(120)', isNotNull: true },
          { id: createDiagramId('c'), name: 'created_at', dataType: 'TIMESTAMP', isNotNull: true },
        ],
      };
    case 'sql-view':
      return {
        ...base,
        title: 'active_summary_v',
        stereotype: 'view',
        columns: [
          { id: createDiagramId('c'), name: 'id', dataType: 'BIGINT' },
          { id: createDiagramId('c'), name: 'total_count', dataType: 'INT' },
        ],
      };
    case 'uml-class':
      return {
        ...base,
        title: 'NewClass',
        attributes: ['- id: string', '- createdAt: Date'],
        methods: ['+ save(): void', '+ validate(): boolean'],
      };
    case 'uml-interface':
      return {
        ...base,
        title: 'IService',
        stereotype: 'interface',
        attributes: [],
        methods: ['+ execute(input: T): Promise<R>'],
      };
    case 'uml-enum':
      return {
        ...base,
        title: 'Status',
        stereotype: 'enumeration',
        attributes: ['PENDING', 'ACTIVE', 'ARCHIVED'],
      };
    case 'uml-actor':
      return { ...base, title: 'User' };
    case 'uml-usecase':
      return { ...base, title: 'Perform Action' };
    case 'uml-component':
      return { ...base, title: 'AuthModule', stereotype: 'component' };
    case 'uml-package':
      return { ...base, title: 'domain.billing', subtitle: 'Package' };
    case 'flow-start':
      return { ...base, title: 'Start' };
    case 'flow-process':
      return { ...base, title: 'Process Step' };
    case 'flow-decision':
      return { ...base, title: 'Condition?' };
    case 'flow-io':
      return { ...base, title: 'Read Input' };
    case 'flow-database':
      return { ...base, title: 'PostgreSQL', subtitle: 'Primary DB' };
    case 'flow-document':
      return { ...base, title: 'Report PDF' };
    case 'arch-service':
      return { ...base, title: 'API Service', subtitle: 'REST / gRPC' };
    case 'arch-cloud':
      return { ...base, title: 'Public Internet' };
    case 'arch-queue':
      return { ...base, title: 'Event Queue', subtitle: 'Kafka / RabbitMQ' };
    case 'note':
      return { ...base, title: 'Note', body: 'Add architecture notes, constraints, or TODO items here.' };
    case 'group':
      return { ...base, title: 'VPC / Bounded Context' };
    default:
      return base;
  }
}

export interface Point2D {
  x: number;
  y: number;
}

export function getPortAnchor(node: DiagramNode, side: Exclude<PortSide, 'auto'>): Point2D {
  const h = getEffectiveNodeHeight(node);
  switch (side) {
    case 'top':
      return { x: node.x + node.width / 2, y: node.y };
    case 'right':
      return { x: node.x + node.width, y: node.y + h / 2 };
    case 'bottom':
      return { x: node.x + node.width / 2, y: node.y + h };
    case 'left':
      return { x: node.x, y: node.y + h / 2 };
  }
}

export function resolveEdgePorts(
  from: DiagramNode,
  to: DiagramNode,
  fromPort: PortSide,
  toPort: PortSide
): { startSide: Exclude<PortSide, 'auto'>; endSide: Exclude<PortSide, 'auto'>; start: Point2D; end: Point2D } {
  const fh = getEffectiveNodeHeight(from);
  const th = getEffectiveNodeHeight(to);
  const fcx = from.x + from.width / 2;
  const fcy = from.y + fh / 2;
  const tcx = to.x + to.width / 2;
  const tcy = to.y + th / 2;

  const dx = tcx - fcx;
  const dy = tcy - fcy;

  let startSide: Exclude<PortSide, 'auto'>;
  if (fromPort !== 'auto') {
    startSide = fromPort;
  } else if (Math.abs(dx) >= Math.abs(dy)) {
    startSide = dx >= 0 ? 'right' : 'left';
  } else {
    startSide = dy >= 0 ? 'bottom' : 'top';
  }

  let endSide: Exclude<PortSide, 'auto'>;
  if (toPort !== 'auto') {
    endSide = toPort;
  } else if (Math.abs(dx) >= Math.abs(dy)) {
    endSide = dx >= 0 ? 'left' : 'right';
  } else {
    endSide = dy >= 0 ? 'top' : 'bottom';
  }

  return {
    startSide,
    endSide,
    start: getPortAnchor(from, startSide),
    end: getPortAnchor(to, endSide),
  };
}

function sideVector(side: Exclude<PortSide, 'auto'>): Point2D {
  switch (side) {
    case 'top':
      return { x: 0, y: -1 };
    case 'right':
      return { x: 1, y: 0 };
    case 'bottom':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
  }
}

export interface ComputedEdgeGeometry {
  pathD: string;
  labelPos: Point2D;
  startMultPos: Point2D;
  endMultPos: Point2D;
  start: Point2D;
  end: Point2D;
}

export function computeEdgeGeometry(
  edge: DiagramEdge,
  from: DiagramNode,
  to: DiagramNode
): ComputedEdgeGeometry {
  const { startSide, endSide, start, end } = resolveEdgePorts(from, to, edge.fromPort, edge.toPort);
  const sv = sideVector(startSide);
  const ev = sideVector(endSide);

  // Pull multiplicity labels slightly off the start/end anchors
  const startMultPos: Point2D = {
    x: start.x + sv.x * 22 + (sv.y !== 0 ? 14 : 0),
    y: start.y + sv.y * 18 + (sv.x !== 0 ? -10 : 0),
  };
  const endMultPos: Point2D = {
    x: end.x + ev.x * 22 + (ev.y !== 0 ? 14 : 0),
    y: end.y + ev.y * 18 + (ev.x !== 0 ? -10 : 0),
  };

  if (edge.routing === 'straight') {
    return {
      pathD: `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} L ${end.x.toFixed(1)} ${end.y.toFixed(1)}`,
      labelPos: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - 8 },
      startMultPos,
      endMultPos,
      start,
      end,
    };
  }

  if (edge.routing === 'bezier') {
    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    const ctrl = Math.max(40, Math.min(160, dist * 0.42));
    const c1x = start.x + sv.x * ctrl;
    const c1y = start.y + sv.y * ctrl;
    const c2x = end.x + ev.x * ctrl;
    const c2y = end.y + ev.y * ctrl;
    // Midpoint on cubic bezier at t = 0.5
    const midX = 0.125 * start.x + 0.375 * c1x + 0.375 * c2x + 0.125 * end.x;
    const midY = 0.125 * start.y + 0.375 * c1y + 0.375 * c2y + 0.125 * end.y;
    return {
      pathD: `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${end.x.toFixed(1)} ${end.y.toFixed(1)}`,
      labelPos: { x: midX, y: midY - 8 },
      startMultPos,
      endMultPos,
      start,
      end,
    };
  }

  // Orthogonal (Manhattan) elbow routing
  const stub = 24;
  const p1: Point2D = { x: start.x + sv.x * stub, y: start.y + sv.y * stub };
  const p2: Point2D = { x: end.x + ev.x * stub, y: end.y + ev.y * stub };
  const pts: Point2D[] = [start, p1];

  const startHoriz = startSide === 'left' || startSide === 'right';
  const endHoriz = endSide === 'left' || endSide === 'right';

  if (startHoriz && endHoriz) {
    const midX = (p1.x + p2.x) / 2;
    const movingForward = (startSide === 'right' && p2.x >= p1.x) || (startSide === 'left' && p2.x <= p1.x);
    if (movingForward) {
      pts.push({ x: midX, y: p1.y }, { x: midX, y: p2.y });
    } else {
      const midY = (p1.y + p2.y) / 2;
      pts.push({ x: p1.x, y: midY }, { x: p2.x, y: midY });
    }
  } else if (!startHoriz && !endHoriz) {
    const midY = (p1.y + p2.y) / 2;
    const movingForward = (startSide === 'bottom' && p2.y >= p1.y) || (startSide === 'top' && p2.y <= p1.y);
    if (movingForward) {
      pts.push({ x: p1.x, y: midY }, { x: p2.x, y: midY });
    } else {
      const midX = (p1.x + p2.x) / 2;
      pts.push({ x: midX, y: p1.y }, { x: midX, y: p2.y });
    }
  } else if (startHoriz && !endHoriz) {
    pts.push({ x: p2.x, y: p1.y });
  } else {
    pts.push({ x: p1.x, y: p2.y });
  }

  pts.push(p2, end);

  const pathD = pts
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');

  // Label at midpoint of the longest interior segment
  let bestIdx = Math.floor(pts.length / 2) - 1;
  let bestLen = -1;
  for (let i = 1; i < pts.length - 1; i++) {
    const segLen = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    if (segLen > bestLen) {
      bestLen = segLen;
      bestIdx = i;
    }
  }
  const a = pts[bestIdx];
  const b = pts[bestIdx + 1] ?? pts[bestIdx];

  return {
    pathD,
    labelPos: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 8 },
    startMultPos,
    endMultPos,
    start,
    end,
  };
}

// ─── SQL DDL Exporter & Importer ─────────────────────────────────────────────

function sanitizeSqlIdentifier(raw: string): string {
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+/, '');
  return cleaned || 'table_name';
}

export function exportDiagramToSqlDdl(doc: DiagramDocument): string {
  const tables = doc.nodes.filter(n => n.type === 'sql-table' || n.type === 'sql-view');
  if (tables.length === 0) {
    return '-- Add SQL Table nodes to your diagram to generate CREATE TABLE DDL statements.\n';
  }

  const lines: string[] = [
    `-- Generated by OmniDesk Diagram Studio: ${doc.title}`,
    '',
  ];

  const tableById = new Map(tables.map(t => [t.id, t]));

  for (const tbl of tables) {
    const tblName = sanitizeSqlIdentifier(tbl.title);
    const cols = tbl.columns ?? [];

    if (tbl.type === 'sql-view') {
      const selectCols = cols.length > 0 ? cols.map(c => sanitizeSqlIdentifier(c.name)).join(', ') : '*';
      lines.push(`CREATE OR REPLACE VIEW ${tblName} AS`);
      lines.push(`SELECT ${selectCols}`);
      lines.push(`FROM source_table;`);
      lines.push('');
      continue;
    }

    const colDefs: string[] = [];
    const pkCols: string[] = [];

    for (const col of cols) {
      const colName = sanitizeSqlIdentifier(col.name);
      const colType = col.dataType.trim() || 'VARCHAR(255)';
      const constraints: string[] = [];
      if (col.isPrimaryKey) pkCols.push(colName);
      if (col.isNotNull && !col.isPrimaryKey) constraints.push('NOT NULL');
      if (col.isUnique && !col.isPrimaryKey) constraints.push('UNIQUE');
      const suffix = constraints.length > 0 ? ` ${constraints.join(' ')}` : '';
      colDefs.push(`  ${colName} ${colType}${suffix}`);
    }

    if (pkCols.length === 1) {
      const pkIdx = cols.findIndex(c => c.isPrimaryKey);
      if (pkIdx >= 0) {
        colDefs[pkIdx] = `${colDefs[pkIdx]} PRIMARY KEY`;
      }
    } else if (pkCols.length > 1) {
      colDefs.push(`  PRIMARY KEY (${pkCols.join(', ')})`);
    }

    // Infer FOREIGN KEY constraints from edges targeting or originating at this table
    for (const edge of doc.edges) {
      // Convention: edge from parent (1) -> child (many) means child has FK to parent
      if (edge.toId === tbl.id && tableById.has(edge.fromId)) {
        const parent = tableById.get(edge.fromId)!;
        const parentName = sanitizeSqlIdentifier(parent.title);
        const parentPk = parent.columns?.find(c => c.isPrimaryKey)?.name ?? 'id';
        const fkCol = cols.find(
          c =>
            c.isForeignKey &&
            (c.name.toLowerCase().includes(parentName.replace(/s$/, '').toLowerCase()) ||
              c.name.toLowerCase() === `${parentName.toLowerCase()}_id`)
        );
        if (fkCol) {
          colDefs.push(
            `  FOREIGN KEY (${sanitizeSqlIdentifier(fkCol.name)}) REFERENCES ${parentName}(${sanitizeSqlIdentifier(parentPk)})`
          );
        }
      }
    }

    lines.push(`CREATE TABLE ${tblName} (`);
    lines.push(colDefs.join(',\n'));
    lines.push(');');
    lines.push('');
  }

  return lines.join('\n').trim() + '\n';
}

/**
 * Parses SQL CREATE TABLE statements into visual SQL ERD nodes and foreign-key edges.
 */
export function parseSqlDdlToDiagram(sqlText: string): {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
} {
  const cleaned = sqlText
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"[]?([\w.]+)[`"\]]?\s*\(([\s\S]*?)\)\s*;/gi;
  const nodes: DiagramNode[] = [];
  const rawForeignKeys: Array<{ childTable: string; childCol: string; parentTable: string }> = [];

  const palette = ['#0284c7', '#6366f1', '#10b981', '#8b5cf6', '#f59e0b', '#14b8a6'];

  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = tableRegex.exec(cleaned)) !== null) {
    const rawName = match[1].split('.').pop() || match[1];
    const body = match[2];

    // Split top-level comma-separated definitions (respecting parentheses like DECIMAL(10,2))
    const parts: string[] = [];
    let current = '';
    let depth = 0;
    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth = Math.max(0, depth - 1);
      if (ch === ',' && depth === 0) {
        if (current.trim()) parts.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) parts.push(current.trim());

    const columns: TableColumn[] = [];
    const tableLevelPks = new Set<string>();

    for (const part of parts) {
      const upper = part.toUpperCase();

      // Table-level PRIMARY KEY (col1, col2)
      const pkMatch = part.match(/^(?:CONSTRAINT\s+\S+\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        for (const colName of pkMatch[1].split(',')) {
          tableLevelPks.add(colName.trim().replace(/[`"[\]]/g, '').toLowerCase());
        }
        continue;
      }

      // Table-level FOREIGN KEY (col) REFERENCES parent(col)
      const fkMatch = part.match(
        /^(?:CONSTRAINT\s+\S+\s+)?FOREIGN\s+KEY\s*\([`"[]?(\w+)[`"\]]?\)\s*REFERENCES\s+[`"[]?([\w.]+)[`"\]]?/i
      );
      if (fkMatch) {
        rawForeignKeys.push({
          childTable: rawName.toLowerCase(),
          childCol: fkMatch[1].toLowerCase(),
          parentTable: (fkMatch[2].split('.').pop() || fkMatch[2]).toLowerCase(),
        });
        continue;
      }

      // Skip standalone UNIQUE / CHECK / INDEX constraints
      if (/^(?:CONSTRAINT|UNIQUE|CHECK|INDEX|KEY)\b/i.test(part)) {
        continue;
      }

      // Column definition: name TYPE [constraints...]
      const colMatch = part.match(/^[`"[]?(\w+)[`"\]]?\s+([a-zA-Z0-9_]+(?:\s*\([^)]+\))?)(.*)$/i);
      if (!colMatch) continue;
      const colName = colMatch[1];
      const dataType = colMatch[2].toUpperCase();
      const rest = colMatch[3] || '';

      const inlineRef = rest.match(/REFERENCES\s+[`"[]?([\w.]+)[`"\]]?/i);
      if (inlineRef) {
        rawForeignKeys.push({
          childTable: rawName.toLowerCase(),
          childCol: colName.toLowerCase(),
          parentTable: (inlineRef[1].split('.').pop() || inlineRef[1]).toLowerCase(),
        });
      }

      columns.push({
        id: createDiagramId('c'),
        name: colName,
        dataType,
        isPrimaryKey: /PRIMARY\s+KEY/i.test(upper),
        isForeignKey: Boolean(inlineRef),
        isUnique: /\bUNIQUE\b/i.test(upper),
        isNotNull: /NOT\s+NULL/i.test(upper) || /PRIMARY\s+KEY/i.test(upper),
      });
    }

    // Apply table-level PK flags
    for (const col of columns) {
      if (tableLevelPks.has(col.name.toLowerCase())) {
        col.isPrimaryKey = true;
        col.isNotNull = true;
      }
    }

    const colX = 60 + (idx % 3) * 300;
    const rowY = 60 + Math.floor(idx / 3) * 260;

    nodes.push({
      id: createDiagramId('n'),
      type: 'sql-table',
      x: colX,
      y: rowY,
      width: 240,
      height: Math.max(120, 38 + Math.max(1, columns.length) * 24 + 14),
      title: rawName,
      color: palette[idx % palette.length],
      columns,
    });
    idx++;
  }

  // Mark FK columns & build Crow's Foot edges
  const nodeByLowerName = new Map(nodes.map(n => [n.title.toLowerCase(), n]));
  const edges: DiagramEdge[] = [];
  for (const fk of rawForeignKeys) {
    const parent = nodeByLowerName.get(fk.parentTable);
    const child = nodeByLowerName.get(fk.childTable);
    if (!parent || !child) continue;
    const childCol = child.columns?.find(c => c.name.toLowerCase() === fk.childCol);
    if (childCol) childCol.isForeignKey = true;

    edges.push({
      id: createDiagramId('e'),
      fromId: parent.id,
      toId: child.id,
      fromPort: 'auto',
      toPort: 'auto',
      label: fk.childCol,
      sourceMultiplicity: '1',
      targetMultiplicity: '0..*',
      routing: 'orthogonal',
      lineStyle: 'solid',
      startMarker: 'crow-one',
      endMarker: 'crow-zero-many',
      color: '#38bdf8',
    });
  }

  return { nodes, edges };
}

// ─── Mermaid Exporter ────────────────────────────────────────────────────────

export function exportDiagramToMermaid(doc: DiagramDocument): string {
  const nonGroupNodes = doc.nodes.filter(n => n.type !== 'group');
  if (nonGroupNodes.length === 0) return 'flowchart TD\n  Empty["Add shapes to diagram"]\n';

  const sqlCount = nonGroupNodes.filter(n => n.type === 'sql-table' || n.type === 'sql-view').length;
  const umlClassCount = nonGroupNodes.filter(
    n => n.type === 'uml-class' || n.type === 'uml-interface' || n.type === 'uml-enum'
  ).length;

  const idAlias = new Map<string, string>();
  nonGroupNodes.forEach((n, idx) => {
    const clean = n.title.replace(/[^a-zA-Z0-9_]/g, '_') || `Node_${idx + 1}`;
    idAlias.set(n.id, clean);
  });

  if (sqlCount >= nonGroupNodes.length / 2 && sqlCount > 0) {
    const lines: string[] = ['erDiagram'];
    for (const node of nonGroupNodes) {
      const name = idAlias.get(node.id) ?? 'ENTITY';
      lines.push(`  ${name} {`);
      for (const col of node.columns ?? []) {
        const typeToken = col.dataType.replace(/\s+/g, '_').replace(/[(),]/g, '');
        const keyFlags = [col.isPrimaryKey ? 'PK' : '', col.isForeignKey ? 'FK' : '', col.isUnique ? 'UK' : '']
          .filter(Boolean)
          .join(',');
        lines.push(`    ${typeToken || 'string'} ${sanitizeSqlIdentifier(col.name)}${keyFlags ? ` ${keyFlags}` : ''}`);
      }
      lines.push('  }');
    }
    for (const edge of doc.edges) {
      const from = idAlias.get(edge.fromId);
      const to = idAlias.get(edge.toId);
      if (!from || !to) continue;
      const left = edge.startMarker === 'crow-many' ? '}o' : '||';
      const right = edge.endMarker === 'crow-one' || edge.endMarker === 'crow-zero-one' ? 'o|' : 'o{';
      const rel = `${left}--${right}`;
      lines.push(`  ${from} ${rel} ${to} : "${edge.label || 'relates'}"`);
    }
    return lines.join('\n') + '\n';
  }

  if (umlClassCount >= nonGroupNodes.length / 2 && umlClassCount > 0) {
    const lines: string[] = ['classDiagram'];
    for (const node of nonGroupNodes) {
      const name = idAlias.get(node.id) ?? 'Class';
      lines.push(`  class ${name} {`);
      if (node.stereotype || node.type === 'uml-interface' || node.type === 'uml-enum') {
        const stereo = node.stereotype || (node.type === 'uml-interface' ? 'interface' : 'enumeration');
        lines.push(`    <<${stereo}>>`);
      }
      for (const attr of node.attributes ?? []) {
        lines.push(`    ${attr}`);
      }
      for (const m of node.methods ?? []) {
        lines.push(`    ${m}`);
      }
      lines.push('  }');
    }
    for (const edge of doc.edges) {
      const from = idAlias.get(edge.fromId);
      const to = idAlias.get(edge.toId);
      if (!from || !to) continue;
      let op = '-->';
      if (edge.endMarker === 'inheritance') {
        op = edge.lineStyle === 'dashed' ? '..|>' : '--|>';
      } else if (edge.startMarker === 'composition') {
        op = '*--';
      } else if (edge.startMarker === 'aggregation') {
        op = 'o--';
      } else if (edge.lineStyle === 'dashed') {
        op = '..>';
      }
      lines.push(`  ${from} ${op} ${to}${edge.label ? ` : ${edge.label}` : ''}`);
    }
    return lines.join('\n') + '\n';
  }

  // Default: Flowchart TD
  const lines: string[] = ['flowchart TD'];
  for (const node of nonGroupNodes) {
    const id = idAlias.get(node.id) ?? node.id;
    const label = node.title.replace(/"/g, "'");
    let def = `${id}["${label}"]`;
    if (node.type === 'flow-decision') def = `${id}{"${label}"}`;
    else if (node.type === 'flow-start' || node.type === 'uml-usecase') def = `${id}(["${label}"])`;
    else if (node.type === 'flow-database') def = `${id}[("${label}")]`;
    else if (node.type === 'flow-io') def = `${id}[/"${label}"/]`;
    lines.push(`  ${def}`);
  }
  for (const edge of doc.edges) {
    const from = idAlias.get(edge.fromId);
    const to = idAlias.get(edge.toId);
    if (!from || !to) continue;
    const arrow = edge.lineStyle === 'dashed' ? '-.->' : '-->';
    lines.push(`  ${from} ${arrow}${edge.label ? `|"${edge.label}"|` : ''} ${to}`);
  }
  return lines.join('\n') + '\n';
}

// ─── Auto-Layout Utility ─────────────────────────────────────────────────────

/**
 * Cleanly arranges non-group nodes into a topological-ish layered grid based on outgoing edges.
 */
export function autoLayoutNodes(nodes: DiagramNode[], edges: DiagramEdge[]): DiagramNode[] {
  const regular = nodes.filter(n => n.type !== 'group');
  if (regular.length === 0) return nodes;

  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of regular) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    if (adj.has(e.fromId) && inDegree.has(e.toId) && e.fromId !== e.toId) {
      adj.get(e.fromId)!.push(e.toId);
      inDegree.set(e.toId, (inDegree.get(e.toId) ?? 0) + 1);
    }
  }

  // Assign layers via BFS from roots
  const layerMap = new Map<string, number>();
  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      layerMap.set(id, 0);
      queue.push(id);
    }
  }
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const curLayer = layerMap.get(cur) ?? 0;
    for (const next of adj.get(cur) ?? []) {
      const nextLayer = curLayer + 1;
      if (!layerMap.has(next) || (layerMap.get(next) ?? 0) < nextLayer) {
        if (nextLayer <= regular.length) {
          layerMap.set(next, nextLayer);
          queue.push(next);
        }
      }
    }
  }

  // Fallback for cyclic / disconnected nodes
  let fallbackIdx = 0;
  for (const n of regular) {
    if (!layerMap.has(n.id)) {
      layerMap.set(n.id, Math.floor(fallbackIdx / 3));
      fallbackIdx++;
    }
  }

  const columns = new Map<number, DiagramNode[]>();
  for (const n of regular) {
    const layer = layerMap.get(n.id) ?? 0;
    const list = columns.get(layer) ?? [];
    list.push(n);
    columns.set(layer, list);
  }

  const sortedLayers = Array.from(columns.keys()).sort((a, b) => a - b);
  const posMap = new Map<string, Point2D>();

  let curX = 60;
  for (const layer of sortedLayers) {
    const colNodes = columns.get(layer) ?? [];
    let curY = 60;
    let maxW = 0;
    for (const n of colNodes) {
      posMap.set(n.id, { x: snapValue(curX, true), y: snapValue(curY, true) });
      curY += getEffectiveNodeHeight(n) + 56;
      maxW = Math.max(maxW, n.width);
    }
    curX += maxW + 100;
  }

  return nodes.map(n => {
    const next = posMap.get(n.id);
    return next ? { ...n, x: next.x, y: next.y } : n;
  });
}

// ─── Starter Templates ───────────────────────────────────────────────────────

export interface DiagramTemplateSpec {
  id: DiagramTemplateId;
  labelKey: string;
  defaultLabel: string;
  create: () => DiagramDocument;
}

export const DIAGRAM_TEMPLATES: DiagramTemplateSpec[] = [
  {
    id: 'sql-ecommerce',
    labelKey: 'de_tpl_sql',
    defaultLabel: 'SQL Database ERD',
    create: () => ({
      title: 'E-Commerce SQL Schema (ERD)',
      canvasTheme: 'dark',
      showGrid: true,
      snapToGrid: true,
      nodes: [
        {
          id: 'tbl_users',
          type: 'sql-table',
          x: 60,
          y: 80,
          width: 230,
          height: 158,
          title: 'users',
          color: '#0284c7',
          columns: [
            { id: 'u1', name: 'id', dataType: 'BIGINT', isPrimaryKey: true, isNotNull: true },
            { id: 'u2', name: 'email', dataType: 'VARCHAR(255)', isUnique: true, isNotNull: true },
            { id: 'u3', name: 'full_name', dataType: 'VARCHAR(120)', isNotNull: true },
            { id: 'u4', name: 'created_at', dataType: 'TIMESTAMP', isNotNull: true },
          ],
        },
        {
          id: 'tbl_orders',
          type: 'sql-table',
          x: 380,
          y: 60,
          width: 240,
          height: 182,
          title: 'orders',
          color: '#6366f1',
          columns: [
            { id: 'o1', name: 'id', dataType: 'BIGINT', isPrimaryKey: true, isNotNull: true },
            { id: 'o2', name: 'user_id', dataType: 'BIGINT', isForeignKey: true, isNotNull: true },
            { id: 'o3', name: 'status', dataType: 'VARCHAR(32)', isNotNull: true },
            { id: 'o4', name: 'total_amount', dataType: 'DECIMAL(10,2)', isNotNull: true },
            { id: 'o5', name: 'ordered_at', dataType: 'TIMESTAMP', isNotNull: true },
          ],
        },
        {
          id: 'tbl_items',
          type: 'sql-table',
          x: 720,
          y: 60,
          width: 240,
          height: 182,
          title: 'order_items',
          color: '#8b5cf6',
          columns: [
            { id: 'i1', name: 'id', dataType: 'BIGINT', isPrimaryKey: true, isNotNull: true },
            { id: 'i2', name: 'order_id', dataType: 'BIGINT', isForeignKey: true, isNotNull: true },
            { id: 'i3', name: 'product_id', dataType: 'BIGINT', isForeignKey: true, isNotNull: true },
            { id: 'i4', name: 'quantity', dataType: 'INT', isNotNull: true },
            { id: 'i5', name: 'unit_price', dataType: 'DECIMAL(10,2)', isNotNull: true },
          ],
        },
        {
          id: 'tbl_products',
          type: 'sql-table',
          x: 380,
          y: 300,
          width: 240,
          height: 158,
          title: 'products',
          color: '#10b981',
          columns: [
            { id: 'p1', name: 'id', dataType: 'BIGINT', isPrimaryKey: true, isNotNull: true },
            { id: 'p2', name: 'sku', dataType: 'VARCHAR(64)', isUnique: true, isNotNull: true },
            { id: 'p3', name: 'title', dataType: 'VARCHAR(160)', isNotNull: true },
            { id: 'p4', name: 'price', dataType: 'DECIMAL(10,2)', isNotNull: true },
          ],
        },
      ],
      edges: [
        {
          id: 'e_u_o',
          fromId: 'tbl_users',
          toId: 'tbl_orders',
          fromPort: 'right',
          toPort: 'left',
          label: 'places',
          sourceMultiplicity: '1',
          targetMultiplicity: '0..*',
          routing: 'orthogonal',
          lineStyle: 'solid',
          startMarker: 'crow-one',
          endMarker: 'crow-zero-many',
          color: '#38bdf8',
        },
        {
          id: 'e_o_i',
          fromId: 'tbl_orders',
          toId: 'tbl_items',
          fromPort: 'right',
          toPort: 'left',
          label: 'contains',
          sourceMultiplicity: '1',
          targetMultiplicity: '1..*',
          routing: 'orthogonal',
          lineStyle: 'solid',
          startMarker: 'crow-one',
          endMarker: 'crow-many',
          color: '#818cf8',
        },
        {
          id: 'e_p_i',
          fromId: 'tbl_products',
          toId: 'tbl_items',
          fromPort: 'right',
          toPort: 'bottom',
          label: 'referenced by',
          sourceMultiplicity: '1',
          targetMultiplicity: '0..*',
          routing: 'orthogonal',
          lineStyle: 'solid',
          startMarker: 'crow-one',
          endMarker: 'crow-zero-many',
          color: '#34d399',
        },
      ],
    }),
  },
  {
    id: 'uml-class',
    labelKey: 'de_tpl_uml_class',
    defaultLabel: 'UML Class Diagram',
    create: () => ({
      title: 'Order Processing UML Class Diagram',
      canvasTheme: 'dark',
      showGrid: true,
      snapToGrid: true,
      nodes: [
        {
          id: 'cls_iface',
          type: 'uml-interface',
          x: 60,
          y: 60,
          width: 230,
          height: 120,
          title: 'IPaymentGateway',
          stereotype: 'interface',
          color: '#8b5cf6',
          attributes: [],
          methods: ['+ charge(amount: Money): Receipt', '+ refund(txId: string): boolean'],
        },
        {
          id: 'cls_stripe',
          type: 'uml-class',
          x: 60,
          y: 260,
          width: 230,
          height: 150,
          title: 'StripeGateway',
          color: '#6366f1',
          attributes: ['- apiKey: string', '- timeoutMs: number'],
          methods: ['+ charge(amount: Money): Receipt', '+ refund(txId: string): boolean'],
        },
        {
          id: 'cls_order',
          type: 'uml-class',
          x: 380,
          y: 60,
          width: 230,
          height: 170,
          title: 'Order',
          color: '#0284c7',
          attributes: ['- id: UUID', '- status: OrderStatus', '- items: OrderItem[]'],
          methods: ['+ addItem(item: OrderItem): void', '+ calculateTotal(): Money', '+ checkout(): void'],
        },
        {
          id: 'cls_item',
          type: 'uml-class',
          x: 700,
          y: 60,
          width: 210,
          height: 148,
          title: 'OrderItem',
          color: '#10b981',
          attributes: ['- sku: string', '- quantity: number', '- price: Money'],
          methods: ['+ subtotal(): Money'],
        },
        {
          id: 'cls_enum',
          type: 'uml-enum',
          x: 400,
          y: 300,
          width: 190,
          height: 136,
          title: 'OrderStatus',
          stereotype: 'enumeration',
          color: '#f59e0b',
          attributes: ['DRAFT', 'PAID', 'SHIPPED', 'CANCELLED'],
        },
      ],
      edges: [
        {
          id: 'e_impl',
          fromId: 'cls_stripe',
          toId: 'cls_iface',
          fromPort: 'top',
          toPort: 'bottom',
          label: '«implements»',
          routing: 'orthogonal',
          lineStyle: 'dashed',
          startMarker: 'none',
          endMarker: 'inheritance',
          color: '#a78bfa',
        },
        {
          id: 'e_uses',
          fromId: 'cls_order',
          toId: 'cls_iface',
          fromPort: 'left',
          toPort: 'right',
          label: 'uses',
          routing: 'orthogonal',
          lineStyle: 'dashed',
          startMarker: 'none',
          endMarker: 'arrow',
          color: '#94a3b8',
        },
        {
          id: 'e_comp',
          fromId: 'cls_order',
          toId: 'cls_item',
          fromPort: 'right',
          toPort: 'left',
          label: 'items',
          sourceMultiplicity: '1',
          targetMultiplicity: '1..*',
          routing: 'orthogonal',
          lineStyle: 'solid',
          startMarker: 'composition',
          endMarker: 'none',
          color: '#34d399',
        },
        {
          id: 'e_stat',
          fromId: 'cls_order',
          toId: 'cls_enum',
          fromPort: 'bottom',
          toPort: 'top',
          label: 'state',
          routing: 'orthogonal',
          lineStyle: 'solid',
          startMarker: 'none',
          endMarker: 'arrow',
          color: '#fbbf24',
        },
      ],
    }),
  },
  {
    id: 'flowchart-order',
    labelKey: 'de_tpl_flowchart',
    defaultLabel: 'Process Flowchart',
    create: () => ({
      title: 'Payment Verification Flowchart',
      canvasTheme: 'dark',
      showGrid: true,
      snapToGrid: true,
      nodes: [
        { id: 'f_start', type: 'flow-start', x: 100, y: 40, width: 160, height: 52, title: 'Receive Request', color: '#10b981' },
        { id: 'f_io', type: 'flow-io', x: 95, y: 140, width: 170, height: 64, title: 'Parse Payload', color: '#0284c7' },
        { id: 'f_dec', type: 'flow-decision', x: 105, y: 260, width: 150, height: 96, title: 'Valid Card?', color: '#f59e0b' },
        { id: 'f_proc', type: 'flow-process', x: 380, y: 274, width: 175, height: 68, title: 'Charge Payment', color: '#6366f1' },
        { id: 'f_db', type: 'flow-database', x: 660, y: 260, width: 136, height: 94, title: 'Ledger DB', subtitle: 'PostgreSQL', color: '#14b8a6' },
        { id: 'f_err', type: 'flow-document', x: 102, y: 420, width: 156, height: 76, title: 'Decline Notice', color: '#f43f5e' },
        { id: 'f_end', type: 'flow-start', x: 648, y: 430, width: 160, height: 52, title: 'Send Receipt', color: '#10b981' },
      ],
      edges: [
        { id: 'fe1', fromId: 'f_start', toId: 'f_io', fromPort: 'bottom', toPort: 'top', label: '', routing: 'orthogonal', lineStyle: 'solid', startMarker: 'none', endMarker: 'arrow-filled', color: '#94a3b8' },
        { id: 'fe2', fromId: 'f_io', toId: 'f_dec', fromPort: 'bottom', toPort: 'top', label: '', routing: 'orthogonal', lineStyle: 'solid', startMarker: 'none', endMarker: 'arrow-filled', color: '#94a3b8' },
        { id: 'fe3', fromId: 'f_dec', toId: 'f_proc', fromPort: 'right', toPort: 'left', label: 'Yes', routing: 'orthogonal', lineStyle: 'solid', startMarker: 'none', endMarker: 'arrow-filled', color: '#34d399' },
        { id: 'fe4', fromId: 'f_dec', toId: 'f_err', fromPort: 'bottom', toPort: 'top', label: 'No', routing: 'orthogonal', lineStyle: 'solid', startMarker: 'none', endMarker: 'arrow-filled', color: '#fb7185' },
        { id: 'fe5', fromId: 'f_proc', toId: 'f_db', fromPort: 'right', toPort: 'left', label: 'commit', routing: 'orthogonal', lineStyle: 'solid', startMarker: 'none', endMarker: 'arrow-filled', color: '#818cf8' },
        { id: 'fe6', fromId: 'f_db', toId: 'f_end', fromPort: 'bottom', toPort: 'top', label: 'OK', routing: 'orthogonal', lineStyle: 'solid', startMarker: 'none', endMarker: 'arrow-filled', color: '#34d399' },
      ],
    }),
  },
  {
    id: 'system-arch',
    labelKey: 'de_tpl_arch',
    defaultLabel: 'System Architecture',
    create: () => ({
      title: 'Cloud Microservices Architecture',
      canvasTheme: 'dark',
      showGrid: true,
      snapToGrid: true,
      nodes: [
        { id: 'a_vpc', type: 'group', x: 300, y: 40, width: 620, height: 390, title: 'Private VPC Cluster', color: '#64748b' },
        { id: 'a_web', type: 'arch-cloud', x: 60, y: 170, width: 170, height: 96, title: 'Web & Mobile' , color: '#0284c7' },
        { id: 'a_gw', type: 'arch-service', x: 340, y: 180, width: 170, height: 76, title: 'API Gateway', subtitle: 'TLS · Rate Limit', color: '#6366f1' },
        { id: 'a_auth', type: 'arch-service', x: 580, y: 80, width: 170, height: 74, title: 'Auth Service', subtitle: 'JWT / OAuth2', color: '#8b5cf6' },
        { id: 'a_queue', type: 'arch-queue', x: 580, y: 200, width: 170, height: 64, title: 'Event Bus', subtitle: 'Kafka Topics', color: '#f43f5e' },
        { id: 'a_db', type: 'flow-database', x: 760, y: 310, width: 132, height: 92, title: 'Primary DB', subtitle: 'PostgreSQL 17', color: '#14b8a6' },
        { id: 'a_note', type: 'note', x: 60, y: 320, width: 195, height: 96, title: 'SLA Target', body: '99.95% uptime · Multi-AZ failover enabled.', color: '#f59e0b' },
      ],
      edges: [
        { id: 'ae1', fromId: 'a_web', toId: 'a_gw', fromPort: 'right', toPort: 'left', label: 'HTTPS', routing: 'orthogonal', lineStyle: 'solid', startMarker: 'none', endMarker: 'arrow-filled', color: '#38bdf8' },
        { id: 'ae2', fromId: 'a_gw', toId: 'a_auth', fromPort: 'top', toPort: 'left', label: 'verify', routing: 'orthogonal', lineStyle: 'solid', startMarker: 'none', endMarker: 'arrow-filled', color: '#a78bfa' },
        { id: 'ae3', fromId: 'a_gw', toId: 'a_queue', fromPort: 'right', toPort: 'left', label: 'publish', routing: 'orthogonal', lineStyle: 'solid', startMarker: 'none', endMarker: 'arrow-filled', color: '#fb7185' },
        { id: 'ae4', fromId: 'a_queue', toId: 'a_db', fromPort: 'bottom', toPort: 'left', label: 'persist', routing: 'orthogonal', lineStyle: 'dashed', startMarker: 'none', endMarker: 'arrow', color: '#2dd4bf' },
      ],
    }),
  },
  {
    id: 'uml-usecase',
    labelKey: 'de_tpl_usecase',
    defaultLabel: 'UML Use-Case',
    create: () => ({
      title: 'Online Store Use-Case Diagram',
      canvasTheme: 'dark',
      showGrid: true,
      snapToGrid: true,
      nodes: [
        { id: 'uc_sys', type: 'group', x: 240, y: 40, width: 470, height: 390, title: 'Storefront System', color: '#6366f1' },
        { id: 'uc_cust', type: 'uml-actor', x: 80, y: 150, width: 96, height: 112, title: 'Customer', color: '#0284c7' },
        { id: 'uc_adm', type: 'uml-actor', x: 770, y: 150, width: 96, height: 112, title: 'Admin', color: '#f59e0b' },
        { id: 'uc_1', type: 'uml-usecase', x: 280, y: 80, width: 175, height: 70, title: 'Browse Catalog', color: '#0284c7' },
        { id: 'uc_2', type: 'uml-usecase', x: 280, y: 200, width: 175, height: 70, title: 'Place Order', color: '#6366f1' },
        { id: 'uc_3', type: 'uml-usecase', x: 510, y: 200, width: 175, height: 70, title: 'Authenticate', color: '#8b5cf6' },
        { id: 'uc_4', type: 'uml-usecase', x: 510, y: 320, width: 175, height: 70, title: 'Manage Inventory', color: '#10b981' },
      ],
      edges: [
        { id: 'ue1', fromId: 'uc_cust', toId: 'uc_1', fromPort: 'right', toPort: 'left', label: '', routing: 'straight', lineStyle: 'solid', startMarker: 'none', endMarker: 'none', color: '#94a3b8' },
        { id: 'ue2', fromId: 'uc_cust', toId: 'uc_2', fromPort: 'right', toPort: 'left', label: '', routing: 'straight', lineStyle: 'solid', startMarker: 'none', endMarker: 'none', color: '#94a3b8' },
        { id: 'ue3', fromId: 'uc_2', toId: 'uc_3', fromPort: 'right', toPort: 'left', label: '«include»', routing: 'straight', lineStyle: 'dashed', startMarker: 'none', endMarker: 'arrow', color: '#a78bfa' },
        { id: 'ue4', fromId: 'uc_adm', toId: 'uc_4', fromPort: 'left', toPort: 'right', label: '', routing: 'straight', lineStyle: 'solid', startMarker: 'none', endMarker: 'none', color: '#fbbf24' },
        { id: 'ue5', fromId: 'uc_adm', toId: 'uc_3', fromPort: 'left', toPort: 'right', label: '', routing: 'straight', lineStyle: 'solid', startMarker: 'none', endMarker: 'none', color: '#fbbf24' },
      ],
    }),
  },
  {
    id: 'blank',
    labelKey: 'de_tpl_blank',
    defaultLabel: 'Blank Canvas',
    create: () => ({
      title: 'Untitled Diagram',
      canvasTheme: 'dark',
      showGrid: true,
      snapToGrid: true,
      nodes: [],
      edges: [],
    }),
  },
];

export function getTemplateDocument(id: DiagramTemplateId): DiagramDocument {
  const tpl = DIAGRAM_TEMPLATES.find(t => t.id === id) ?? DIAGRAM_TEMPLATES[0];
  return tpl.create();
}
