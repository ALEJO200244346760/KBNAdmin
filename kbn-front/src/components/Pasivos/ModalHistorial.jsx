import React from 'react';
import { NA, sx, labelMoneda, simboloMoneda } from './PasivosShared';

const fmtFecha = (f) => {
  if (!f || f === 'Sin fecha') return 'Sin fecha';
  const [y, m, d] = String(f).split('-');
  return d && m && y ? `${d}/${m}/${y}` : String(f);
};

// ── Un día del historial: cabecera colapsable + sus movimientos ──────────────
const GrupoDia = ({ fecha, movimientos, abiertoInicial, eliminandoMovIds, onDeleteMovimiento }) => {
  const [open, setOpen] = React.useState(abiertoInicial);

  // Subtotal por moneda dentro del día
  const subtotales = React.useMemo(() => {
    const acc = {};
    movimientos.forEach(m => {
      const mon = m.moneda || 'BRL';
      acc[mon] = (acc[mon] || 0) + (parseFloat(m.montoPagado) || 0);
    });
    return Object.entries(acc).filter(([, v]) => Math.abs(v) > 0.001);
  }, [movimientos]);

  return (
    <div style={{ borderRadius: 12, border: `0.5px solid ${open ? NA.border : '#eef2f1'}`, overflow: 'hidden' }}>
      {/* Cabecera del día */}
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '10px 14px', textAlign: 'left', cursor: 'pointer',
          border: 'none', background: open ? NA.light : '#f9fafb',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
        }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: NA.darker }}>{fmtFecha(fecha)}</span>
          <span style={{ fontSize: 11, color: NA.text2 }}>
            {movimientos.length} mov.
          </span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {subtotales.map(([mon, val]) => (
            <span key={mon} style={{
              fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
              color: val < 0 ? '#B91C1C' : NA.dark,
            }}>
              {val < 0 ? '-' : '+'}{simboloMoneda(mon)} {Math.abs(val).toFixed(2)}
            </span>
          ))}
          <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 13, color: NA.text2 }} />
        </span>
      </button>

      {/* Movimientos del día */}
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 10px 12px' }}>
          {movimientos.map(mov => {
            const monto      = parseFloat(mov.montoPagado) || 0;
            const esPositivo = monto > 0;
            const eliminando = eliminandoMovIds.has(mov.id);

            return (
              <div key={mov.id} style={{
                background: '#f9fafb', borderRadius: 10, padding: '10px 12px',
                borderLeft: `3px solid ${esPositivo ? NA.dark : '#B91C1C'}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: NA.text, margin: 0, lineHeight: 1.4, wordBreak: 'break-word' }}>
                    {mov.nota}
                  </p>
                  {mov.moneda && (
                    <p style={{ fontSize: 10, color: '#9ca3af', margin: '3px 0 0' }}>{labelMoneda(mov.moneda)}</p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: esPositivo ? NA.dark : '#B91C1C', whiteSpace: 'nowrap' }}>
                    {esPositivo ? `+${monto.toFixed(2)}` : `-${Math.abs(monto).toFixed(2)}`}
                  </span>
                  <button
                    onClick={() => onDeleteMovimiento(mov)}
                    disabled={eliminando}
                    title="Eliminar este movimiento"
                    style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'transparent', color: '#fca5a5', cursor: eliminando ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i
                      className={`ti ${eliminando ? 'ti-loader-2' : 'ti-trash'}`}
                      aria-hidden="true"
                      style={{ fontSize: 14, ...(eliminando ? { animation: 'kbn-spin .7s linear infinite' } : {}) }}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ModalHistorial = ({ selectedPasivo, eliminandoMovIds, onDeleteMovimiento, onClose }) => {
  if (!selectedPasivo) return null;

  // Agrupar por fecha, del día más reciente al más viejo
  const grupos = React.useMemo(() => {
    const map = {};
    (selectedPasivo.historialPagos || []).forEach(m => {
      const f = m.fecha || 'Sin fecha';
      (map[f] = map[f] || []).push(m);
    });
    return Object.keys(map)
      .sort((a, b) => String(b).localeCompare(String(a)))
      .map(f => [f, map[f]]);
  }, [selectedPasivo]);

  const saldos = selectedPasivo.saldosPorMoneda || {};
  const saldosEntries = Object.entries(saldos).filter(([, v]) => Math.abs(v) > 0.001);

  return (
    <div style={sx.overlay} onClick={onClose}>
      <div style={{ ...sx.modal, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <h2 style={{ fontSize: 17, fontWeight: 500, color: NA.text, margin: 0 }}>{selectedPasivo.titulo}</h2>
          <button onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#f3f4f6', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-x" style={{ fontSize: 15 }} aria-hidden="true" />
          </button>
        </div>

        {/* ── Saldos por moneda ── */}
        {saldosEntries.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0 14px' }}>
            {saldosEntries.map(([mon, val]) => {
              const esNeg = val < -0.001;
              return (
                <span key={mon} style={{
                  fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 99,
                  background: esNeg ? '#FEF2F2' : NA.light,
                  color: esNeg ? '#B91C1C' : NA.dark,
                }}>
                  {labelMoneda(mon)}: {esNeg ? '-' : '+'}{simboloMoneda(mon)} {Math.abs(val).toFixed(2)}
                </span>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '0 0 12px' }}>
          <p style={{ fontSize: 12, color: NA.text2, margin: 0 }}>Historial de movimientos</p>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
            {grupos.length} día{grupos.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* ── Lista agrupada por día ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto', marginBottom: 18 }}>
          {grupos.length > 0 ? grupos.map(([fecha, movs], idx) => (
            <GrupoDia
              key={fecha}
              fecha={fecha}
              movimientos={movs}
              abiertoInicial={idx === 0}
              eliminandoMovIds={eliminandoMovIds}
              onDeleteMovimiento={onDeleteMovimiento}
            />
          )) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 13 }}>
              Sin movimientos registrados.
            </div>
          )}
        </div>

        <button onClick={onClose}
          style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: NA.darker, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default ModalHistorial;