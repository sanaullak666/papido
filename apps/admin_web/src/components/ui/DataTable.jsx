import React from 'react';
import { Loader2 } from 'lucide-react';

export function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No records found.',
  emptySubtext = 'Items will appear here once activity occurs.',
  keyExtractor = (item, idx) => item.id || idx,
  onRowClick,
  className = '',
  style = {}
}) {
  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        background: 'var(--bg-card, #131D31)',
        border: '1px solid var(--border, #23314E)',
        borderRadius: 'var(--radius-md, 10px)',
        ...style
      }}
      className={`data-table-wrapper ${className}`}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: '13px'
        }}
        className="data-table-ui"
      >
        <thead>
          <tr
            style={{
              background: 'rgba(15, 23, 42, 0.75)',
              borderBottom: '1px solid var(--border, #23314E)'
            }}
          >
            {columns.map((col, idx) => (
              <th
                key={idx}
                style={{
                  padding: '12px 16px',
                  fontWeight: 600,
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--text-secondary, #94A3B8)',
                  textAlign: col.align || 'left',
                  width: col.width || 'auto',
                  whiteSpace: 'nowrap'
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '48px 16px',
                  textAlign: 'center',
                  color: 'var(--text-muted, #64748B)'
                }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                  <Loader2 size={18} className="animate-spin" color="var(--primary, #F59E0B)" />
                  <span>Loading records...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '48px 16px',
                  textAlign: 'center',
                  color: 'var(--text-muted, #64748B)'
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)' }}>
                  {emptyMessage}
                </div>
                {emptySubtext && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)', marginTop: '4px' }}>
                    {emptySubtext}
                  </div>
                )}
              </td>
            </tr>
          ) : (
            data.map((item, rowIdx) => (
              <tr
                key={keyExtractor(item, rowIdx)}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                style={{
                  borderBottom: '1px solid var(--border, #23314E)',
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background 0.1s ease'
                }}
                className="table-row-hover"
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    style={{
                      padding: '14px 16px',
                      color: 'var(--text-primary, #F8FAFC)',
                      textAlign: col.align || 'left',
                      verticalAlign: 'middle'
                    }}
                  >
                    {typeof col.accessor === 'function'
                      ? col.accessor(item, rowIdx)
                      : item[col.accessor] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
export default DataTable;
