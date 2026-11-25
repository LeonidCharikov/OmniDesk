import { describe, it, expect } from 'vitest';
import {
  DIAGRAM_TEMPLATES,
  RELATIONSHIP_PRESETS,
  SHAPE_CATALOG,
  autoLayoutNodes,
  computeEdgeGeometry,
  createDefaultNode,
  exportDiagramToMermaid,
  exportDiagramToSqlDdl,
  getEffectiveNodeHeight,
  getTemplateDocument,
  parseSqlDdlToDiagram,
} from '../tools/expanded/diagramEditor.logic';

describe('diagramEditor.logic', () => {
  it('provides 20 shape types, 9 relationship presets, and 6 starter templates', () => {
    expect(SHAPE_CATALOG.length).toBe(20);
    expect(RELATIONSHIP_PRESETS.length).toBe(9);
    expect(DIAGRAM_TEMPLATES.length).toBe(6);

    for (const tpl of DIAGRAM_TEMPLATES) {
      const doc = tpl.create();
      expect(doc.title.length).toBeGreaterThan(0);
      expect(Array.isArray(doc.nodes)).toBe(true);
      expect(Array.isArray(doc.edges)).toBe(true);
    }
  });

  it('expands dynamic height for SQL tables and UML classes with many members', () => {
    const table = createDefaultNode('sql-table', 0, 0);
    table.height = 100;
    table.columns = Array.from({ length: 8 }, (_, i) => ({
      id: `c${i}`,
      name: `col_${i}`,
      dataType: 'INT',
    }));
    expect(getEffectiveNodeHeight(table)).toBeGreaterThan(220);

    const cls = createDefaultNode('uml-class', 0, 0);
    cls.height = 100;
    cls.attributes = ['- a: int', '- b: int', '- c: int', '- d: int'];
    cls.methods = ['+ m1(): void', '+ m2(): void', '+ m3(): void'];
    expect(getEffectiveNodeHeight(cls)).toBeGreaterThan(190);
  });

  it('computes orthogonal, bezier, and straight edge paths accurately', () => {
    const a = createDefaultNode('sql-table', 40, 60);
    const b = createDefaultNode('sql-table', 420, 140);
    const baseEdge = {
      id: 'e1',
      fromId: a.id,
      toId: b.id,
      fromPort: 'auto' as const,
      toPort: 'auto' as const,
      label: 'links',
      routing: 'orthogonal' as const,
      lineStyle: 'solid' as const,
      startMarker: 'crow-one' as const,
      endMarker: 'crow-zero-many' as const,
      color: '#38bdf8',
    };

    const ortho = computeEdgeGeometry(baseEdge, a, b);
    expect(ortho.pathD.startsWith('M ')).toBe(true);
    expect(ortho.pathD).toContain(' L ');
    expect(ortho.start.x).toBe(a.x + a.width);
    expect(ortho.end.x).toBe(b.x);

    const bezier = computeEdgeGeometry({ ...baseEdge, routing: 'bezier' }, a, b);
    expect(bezier.pathD).toContain(' C ');

    const straight = computeEdgeGeometry({ ...baseEdge, routing: 'straight' }, a, b);
    expect(straight.pathD.split('L').length).toBe(2);
  });

  it('parses SQL CREATE TABLE DDL into tables, columns, PK/FK flags, and Crow Foot edges', () => {
    const sql = `
      CREATE TABLE accounts (
        id BIGINT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL
      );
      CREATE TABLE invoices (
        id BIGINT PRIMARY KEY,
        account_id BIGINT NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );
    `;
    const parsed = parseSqlDdlToDiagram(sql);
    expect(parsed.nodes.length).toBe(2);
    expect(parsed.edges.length).toBe(1);

    const accounts = parsed.nodes.find(n => n.title === 'accounts')!;
    const invoices = parsed.nodes.find(n => n.title === 'invoices')!;
    expect(accounts.columns?.find(c => c.name === 'id')?.isPrimaryKey).toBe(true);
    expect(accounts.columns?.find(c => c.name === 'email')?.isUnique).toBe(true);
    expect(invoices.columns?.find(c => c.name === 'account_id')?.isForeignKey).toBe(true);
    expect(invoices.columns?.find(c => c.name === 'total')?.dataType).toBe('DECIMAL(10,2)');
    expect(parsed.edges[0].fromId).toBe(accounts.id);
    expect(parsed.edges[0].toId).toBe(invoices.id);
    expect(parsed.edges[0].startMarker).toBe('crow-one');
    expect(parsed.edges[0].endMarker).toBe('crow-zero-many');
  });

  it('exports visual SQL ERD diagram back to valid SQL CREATE TABLE DDL', () => {
    const doc = getTemplateDocument('sql-ecommerce');
    const ddl = exportDiagramToSqlDdl(doc);
    expect(ddl).toContain('CREATE TABLE users');
    expect(ddl).toContain('CREATE TABLE orders');
    expect(ddl).toContain('PRIMARY KEY');
    expect(ddl).toContain('FOREIGN KEY (user_id) REFERENCES users(id)');
  });

  it('exports SQL ERD, UML Class, and Flowchart diagrams to matching Mermaid syntax', () => {
    const erdMermaid = exportDiagramToMermaid(getTemplateDocument('sql-ecommerce'));
    expect(erdMermaid.startsWith('erDiagram')).toBe(true);
    expect(erdMermaid).toContain('users {');
    expect(erdMermaid).toContain('orders');

    const umlMermaid = exportDiagramToMermaid(getTemplateDocument('uml-class'));
    expect(umlMermaid.startsWith('classDiagram')).toBe(true);
    expect(umlMermaid).toContain('class IPaymentGateway');
    expect(umlMermaid).toContain('..|>');

    const flowMermaid = exportDiagramToMermaid(getTemplateDocument('flowchart-order'));
    expect(flowMermaid.startsWith('flowchart TD')).toBe(true);
    expect(flowMermaid).toContain('{"Valid Card?"}');
  });

  it('auto-arranges connected nodes into non-overlapping layered coordinates', () => {
    const doc = getTemplateDocument('sql-ecommerce');
    const scrambled = doc.nodes.map(n => ({ ...n, x: 0, y: 0 }));
    const arranged = autoLayoutNodes(scrambled, doc.edges);
    const positions = new Set(arranged.map(n => `${n.x},${n.y}`));
    expect(positions.size).toBe(arranged.length);
  });
});
