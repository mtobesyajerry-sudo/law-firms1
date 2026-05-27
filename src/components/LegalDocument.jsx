import React from 'react';
import { Link } from 'react-router-dom';

const s = {
  page: { minHeight: '100vh', background: '#fff', fontFamily: 'Georgia, "Times New Roman", serif' },
  header: { background: '#0a1929', borderBottom: '3px solid #d4af37', padding: '0 40px' },
  headerInner: { maxWidth: '860px', margin: '0 auto', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  backLink: { color: '#d4af37', fontWeight: '600', fontSize: '14px', textDecoration: 'none', fontFamily: 'system-ui,-apple-system,sans-serif' },
  updated: { fontSize: '13px', color: '#94a3b8', fontFamily: 'system-ui,-apple-system,sans-serif' },
  main: { maxWidth: '860px', margin: '0 auto', padding: '48px 24px 80px' },
  h1: { fontSize: '28px', fontWeight: '800', color: '#0a1929', margin: '40px 0 16px', paddingBottom: '10px', borderBottom: '3px solid #d4af37', fontFamily: 'system-ui,-apple-system,sans-serif', lineHeight: 1.2 },
  h2: { fontSize: '20px', fontWeight: '700', color: '#0a1929', margin: '36px 0 12px', fontFamily: 'system-ui,-apple-system,sans-serif', lineHeight: 1.3 },
  h3: { fontSize: '17px', fontWeight: '700', color: '#1e293b', margin: '28px 0 10px', fontFamily: 'system-ui,-apple-system,sans-serif' },
  p: { fontSize: '15px', lineHeight: '1.75', margin: '0 0 16px', color: '#1e293b' },
  ul: { fontSize: '15px', lineHeight: '1.75', margin: '0 0 16px', paddingLeft: '24px', color: '#1e293b' },
  li: { marginBottom: '6px' },
  hr: { border: 'none', borderTop: '1px solid #e2e8f0', margin: '32px 0' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px', margin: '20px 0' },
  th: { padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#0a1929', border: '1px solid #cbd5e1', background: '#f1f5f9' },
  td: { padding: '10px 14px', color: '#334155', border: '1px solid #e2e8f0', verticalAlign: 'top', lineHeight: 1.55 },
  footer: { marginTop: '64px', paddingTop: '32px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '13px', color: '#64748b', lineHeight: 2, fontFamily: 'system-ui,-apple-system,sans-serif' },
  footerLink: { color: '#1e40af', textDecoration: 'underline' },
};

function applyInline(text, key = 0) {
  const parts = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`)/g;
  let last = 0, m, i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<React.Fragment key={`t${key}-${i++}`}>{text.slice(last, m.index)}</React.Fragment>);
    if (m[2]) parts.push(<strong key={`b${key}-${i++}`} style={{ fontWeight: 700, color: '#0a1929' }}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={`e${key}-${i++}`}>{m[3]}</em>);
    else if (m[4]) {
      const href = m[5];
      const isInternal = href.startsWith('/') || href.startsWith('#');
      parts.push(isInternal
        ? <Link key={`l${key}-${i++}`} to={href} style={{ color: '#1e40af', textDecoration: 'underline' }}>{m[4]}</Link>
        : <a key={`a${key}-${i++}`} href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#1e40af', textDecoration: 'underline' }}>{m[4]}</a>
      );
    } else if (m[6]) parts.push(<code key={`c${key}-${i++}`} style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '13px', fontFamily: 'monospace', color: '#0a1929' }}>{m[6]}</code>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(<React.Fragment key={`t${key}-${i++}`}>{text.slice(last)}</React.Fragment>);
  return parts.length ? parts : text;
}

function renderMarkdown(md) {
  const lines = md.split('\n');
  const nodes = [];
  let i = 0, key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    // Headings
    if (trimmed.startsWith('### ')) { nodes.push(<h3 key={key++} style={s.h3}>{applyInline(trimmed.slice(4), key)}</h3>); i++; continue; }
    if (trimmed.startsWith('## ')) { nodes.push(<h2 key={key++} style={s.h2}>{applyInline(trimmed.slice(3), key)}</h2>); i++; continue; }
    if (trimmed.startsWith('# ')) { nodes.push(<h1 key={key++} style={s.h1}>{applyInline(trimmed.slice(2), key)}</h1>); i++; continue; }

    // HR
    if (trimmed === '---') { nodes.push(<hr key={key++} style={s.hr} />); i++; continue; }

    // Table — detect by | at start and next line being |---|
    if (trimmed.startsWith('|') && i + 1 < lines.length && lines[i + 1].trim().match(/^\|[\s\-|]+\|$/)) {
      const headers = trimmed.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(h => h.trim());
      i += 2; // skip header and separator
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim().split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim());
        rows.push(cells);
        i++;
      }
      nodes.push(
        <div key={key++} style={{ overflowX: 'auto', margin: '20px 0' }}>
          <table style={s.table}>
            <thead style={{ background: '#f1f5f9' }}>
              <tr>{headers.map((h, hi) => <th key={hi} style={s.th}>{applyInline(h, hi)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  {row.map((cell, ci) => <td key={ci} style={s.td}>{applyInline(cell, ci)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Unordered list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        items.push(<li key={i} style={s.li}>{applyInline(lines[i].trim().slice(2), i)}</li>);
        i++;
      }
      nodes.push(<ul key={key++} style={s.ul}>{items}</ul>);
      continue;
    }

    // Paragraph
    const paraLines = [];
    while (i < lines.length && lines[i].trim() && !lines[i].trim().startsWith('#') && !lines[i].trim().startsWith('|') && !lines[i].trim().startsWith('- ') && !lines[i].trim().startsWith('* ') && lines[i].trim() !== '---') {
      paraLines.push(lines[i].trim());
      i++;
    }
    if (paraLines.length) {
      nodes.push(<p key={key++} style={s.p}>{applyInline(paraLines.join(' '), key)}</p>);
    }
  }

  return nodes;
}

export default function LegalDocument({ content, lastUpdated }) {
  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerInner}>
          <Link to="/" style={s.backLink}>← Back to Iuris Peritis</Link>
          {lastUpdated && <span style={s.updated}>Last updated: {lastUpdated}</span>}
        </div>
      </header>
      <main style={s.main}>
        <article>{renderMarkdown(content)}</article>
        <footer style={s.footer}>
          <p style={{ margin: '0 0 8px' }}>© 2026 Iuris Peritis · Registered Data Processor · Certificate No. 0-000-006-655</p>
          <p style={{ margin: 0 }}>
            <Link to="/privacy" style={s.footerLink}>Privacy Policy</Link>
            {' · '}
            <Link to="/terms" style={s.footerLink}>Terms of Use</Link>
            {' · '}
            <a href="mailto:info@iursperitis.co.tz" style={s.footerLink}>info@iursperitis.co.tz</a>
          </p>
        </footer>
      </main>
    </div>
  );
}
