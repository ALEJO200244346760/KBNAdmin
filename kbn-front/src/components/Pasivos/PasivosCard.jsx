import React, { useState } from 'react';
import { decodeTarifa, labelCaja } from './PasivosShared';

/* ══════════════════════════════════════════════════════════════════════════
   TARJETA DE CUENTA CORRIENTE

   El saldo manda: es el número que se viene a mirar. Todo lo demás —nombre,
   tarifa, cajas, botones— se ordena alrededor y baja de tono.

   El estado no va en una etiqueta aparte: se lee en el color del número y
   en la línea de la izquierda. Repetirlo en un badge era decir dos veces
   lo mismo y competía con el saldo.
   ══════════════════════════════════════════════════════════════════════════ */

const T = {
  superficie:  'rgba(255,255,255,.045)',
  superficie2: 'rgba(255,255,255,.07)',
  linea:       'rgba(255,255,255,.09)',
  texto:       'rgba(255,255,255,.92)',
  medio:       'rgba(255,255,255,.55)',
  tenue:       'rgba(255,255,255,.32)',
  deben:       '#F98A8A',   // les debemos — coral, no rojo alarma
  favor:       '#2ECFC4',   // nos deben — turquesa de la app
  neutro:      'rgba(255,255,255,.4)',
};

const estadoDe = (saldo) => {
  if (saldo < -0.01) return { color: T.deben, texto: 'Les debemos' };
  if (saldo >  0.01) return { color: T.favor, texto: 'Nos deben' };
  return { color: T.neutro, texto: 'Saldado' };
};

// Miles con punto y dos decimales, para que las cifras se lean de un vistazo
const money = (n) =>
  Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PasivosCard = ({ p, onTransaction, onHistory, onEdit, onDelete }) => {
  const [verCajas, setVerCajas] = useState(false);

  const balance  = parseFloat(p.montoTotal) || 0;
  const saldos   = p.saldosPorMoneda || {};
  const saldo    = typeof saldos.BRL === 'number' ? saldos.BRL : balance;
  const est      = estadoDe(saldo);
  const decoded  = decodeTarifa(p.descripcion);

  const cajas = Object.entries(p.desglosePorCaja || {})
    .filter(([, v]) => Math.abs(v) > 0.001)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  // El subtítulo solo aporta si dice algo distinto del nombre
  const subtitulo = decoded.descripcion && decoded.descripcion.trim() !== p.titulo.trim()
    ? decoded.descripcion
    : null;

  const acciones = [
    { type: 'NUEVA_DEUDA', label: 'Deuda',    icon: 'ti-trending-down' },
    { type: 'PAGO_DEUDA',  label: 'Pagar',    icon: 'ti-receipt', primaria: true },
    { type: 'ADELANTO',    label: 'Adelanto', icon: 'ti-trending-up' },
  ];

  return (
    <article style={{
      position: 'relative',
      background: T.superficie,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: 18,
      boxShadow: `0 0 0 1px ${T.linea}, inset 0 1px 0 rgba(255,255,255,.04)`,
      padding: '18px 18px 16px 20px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Franja de estado: el color dice si debemos o nos deben */}
      <span aria-hidden="true" style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: est.color, opacity: .8,
      }} />

      {/* ── Nombre, tarifa y acciones ── */}
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 18 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin: 0, fontSize: 16, fontWeight: 600, color: T.texto,
            letterSpacing: '-.01em', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {p.titulo}
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: T.tenue }}>
            {subtitulo || (decoded.esInstructor ? `${decoded.tarifaHora} BRL por hora` : ' ')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <IconButton icon="ti-edit"  label="Editar"   onClick={() => onEdit(p)} />
          <IconButton icon="ti-trash" label="Eliminar" onClick={() => onDelete(p.id)} peligro />
        </div>
      </header>

      {/* ── Saldo: el dato principal ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
          <span style={{ fontSize: 15, color: T.tenue, fontWeight: 500 }}>R$</span>
          <span style={{
            fontSize: 34, fontWeight: 600, color: est.color,
            letterSpacing: '-.025em', lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',   // cifras alineadas entre tarjetas
          }}>
            {money(saldo)}
          </span>
        </div>
        <p style={{ margin: '7px 0 0', fontSize: 12, color: T.medio }}>{est.texto}</p>
      </div>

      {/* ── Dónde está la plata ── */}
      {cajas.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setVerCajas((v) => !v)}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: T.tenue, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: 'inherit',
            }}>
            <i className={`ti ti-chevron-${verCajas ? 'down' : 'right'}`}
               style={{ fontSize: 13 }} aria-hidden="true" />
            {cajas.length} {cajas.length === 1 ? 'caja' : 'cajas'}
          </button>

          {verCajas && (
            <dl style={{ margin: '10px 0 0', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {cajas.map(([caja, val]) => (
                <div key={caja} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  padding: '7px 0', borderTop: `1px solid ${T.linea}`,
                }}>
                  <dt style={{ fontSize: 12, color: T.medio }}>{labelCaja(caja)}</dt>
                  <dd style={{
                    margin: 0, fontSize: 13, fontVariantNumeric: 'tabular-nums',
                    color: val < -0.001 ? T.deben : T.texto,
                  }}>
                    {val < -0.001 ? '−' : ''}{money(val)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}

      {/* ── Registrar un movimiento ── */}
      <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
        {acciones.map((a) => (
          <button key={a.type} onClick={() => onTransaction(a.type, p)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500,
              border: a.primaria ? 'none' : `1px solid ${T.linea}`,
              background: a.primaria ? T.favor : 'transparent',
              color: a.primaria ? '#06302E' : T.medio,
              transition: 'background .12s, color .12s',
            }}
            onMouseEnter={(e) => {
              if (!a.primaria) {
                e.currentTarget.style.background = T.superficie2;
                e.currentTarget.style.color = T.texto;
              }
            }}
            onMouseLeave={(e) => {
              if (!a.primaria) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = T.medio;
              }
            }}>
            <i className={`ti ${a.icon}`} style={{ fontSize: 15 }} aria-hidden="true" />
            {a.label}
          </button>
        ))}
      </div>

      <button onClick={() => onHistory(p)}
        style={{
          marginTop: 10, padding: '8px', borderRadius: 9, border: 'none',
          background: 'none', color: T.tenue, fontSize: 12, cursor: 'pointer',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 6, transition: 'color .12s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = T.medio; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = T.tenue; }}>
        <i className="ti ti-history" style={{ fontSize: 14 }} aria-hidden="true" />
        Ver historial
      </button>
    </article>
  );
};

const IconButton = ({ icon, label, onClick, peligro }) => (
  <button onClick={onClick} aria-label={label} title={label}
    style={{
      width: 30, height: 30, borderRadius: 8, border: 'none',
      background: 'transparent', color: T.tenue, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background .12s, color .12s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = T.superficie2;
      e.currentTarget.style.color = peligro ? T.deben : T.texto;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'transparent';
      e.currentTarget.style.color = T.tenue;
    }}>
    <i className={`ti ${icon}`} style={{ fontSize: 15 }} aria-hidden="true" />
  </button>
);

export default PasivosCard;