import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { usePresencia } from '../hooks/usePresencia';

const NA = {
  primary: '#1ABFA0', dark: '#0F6E56', darker: '#085041',
  light: '#E1F5EE', mid: '#9FE1CB', bg: '#f0faf7',
  text: '#0a2e27', text2: '#3a6b5e', border: '#c5e8df',
};

// ── Reparto de dueños ─────────────────────────────────────────────────────────
const HANS_PCT = 5;
const PASIVO_TITULOS = { JOSE:'José Sánchez', IGNA:'Igna Krebs', HANS:'Hans Leonhard Wurbs' };

const calcularReparto = (asignadoA, monto) => {
  let pIgna = 8, pJose = 8;
  if      (asignadoA === 'IGNA')  { pIgna=16; pJose=8;    }
  else if (asignadoA === 'JOSE')  { pIgna=8;  pJose=16;   }
  else if (asignadoA === 'AMBOS') { pIgna=12.5; pJose=12.5; }
  else                            { pIgna=10; pJose=10;   }
  const pH = HANS_PCT;
  return {
    pIgna, pJose, pHans: pH,
    mIgna: Math.round(monto*pIgna/100*100)/100,
    mJose: Math.round(monto*pJose/100*100)/100,
    mHans: Math.round(monto*pH/100*100)/100,
  };
};

const labelMon = (m) => {
  if (!m || m==='BRL' || m.startsWith('R$_')) return 'R$';
  if (m.startsWith('EUR')) return '€';
  if (m.startsWith('USD')) return 'US$';
  return m;
};

const MONEDAS = [
  { v:'R$_STONE_JOSE', l:'R$ Stone José' },
  { v:'R$_STONE_IGNA', l:'R$ Stone Igna' },
  { v:'R$_EFECTIVO',   l:'R$ Efectivo'   },
  { v:'USD_EFECTIVO',  l:'USD Efectivo'  },
  { v:'USD_MARIANA',   l:'USD Mariana'   },
  { v:'EUR_WIZE_IGNA', l:'€ Wize Igna'  },
  { v:'BRL', l:'BRL' }, { v:'USD', l:'USD' }, { v:'EUR', l:'EUR' }, { v:'ARS', l:'ARS' },
];

const FORMAS_PAGO = ['Efectivo','Transferencia','MercadoPago','Tarjeta Crédito'];

const COLOR_TIPO = {
  APK:{ bg:'#DCFCE7', border:'#16A34A', text:'#14532D' },
  ASPK:{ bg:'#D1FAE5', border:'#059669', text:'#064E3B' },
  APWF:{ bg:'#DBEAFE', border:'#2563EB', text:'#1E3A8A' },
  ASPWF:{ bg:'#EDE9FE', border:'#7C3AED', text:'#4C1D95' },
  APWS:{ bg:'#FEF9C3', border:'#CA8A04', text:'#713F12' },
  ASPWS:{ bg:'#FEF3C7', border:'#D97706', text:'#78350F' },
  RENTAL:{ bg:'#F3F4F6', border:'#6B7280', text:'#1F2937' },
};
const colorTipo = (t) => COLOR_TIPO[t] || { bg:NA.light, border:NA.dark, text:NA.darker };

const sx = {
  label: { fontSize:11, color:NA.text2, display:'block', marginBottom:5, fontWeight:500 },
  input: { width:'100%', padding:'12px 14px', borderRadius:10, border:`0.5px solid ${NA.border}`, background:'#fff', color:NA.text, fontSize:15, fontFamily:'inherit', boxSizing:'border-box', outline:'none' },
};

// ── Ingreso ───────────────────────────────────────────────────────────────────
const Ingreso = ({ formData, setView, axiosConfig }) => {
  const { asignadoAuto, opcionActual } = usePresencia();
  const API = 'https://kbn-admin-production.up.railway.app';

  // Estado
  const today = new Date().toISOString().split('T')[0];
  const [paso, setPaso]       = useState(0); // 0=form, 1=confirmar
  const [guardando, setGuardando] = useState(false);
  const enviandoRef = useRef(false);

  const [fecha,      setFecha]      = useState(formData?.fecha || today);
  const [monto,      setMonto]      = useState('');
  const [moneda,     setMoneda]     = useState('R$_STONE_IGNA');
  const [formaPago,  setFormaPago]  = useState('Efectivo');
  const [detalles,   setDetalles]   = useState('');
  const [tipoActividad, setTipoActividad] = useState(''); // libre

  // Clases para vincular — busca en rango amplio (±14 días desde la fecha del ingreso)
  const [todasClases,     setTodasClases]     = useState([]);
  const [clasesSelec,     setClasesSelec]     = useState([]);
  const [loadingClases,   setLoadingClases]   = useState(false);

  // Buscar clases al montar y cuando cambia la fecha
  useEffect(() => {
    if (!axiosConfig) return;
    setLoadingClases(true);
    axios.get(`${API}/api/agenda/listar`, axiosConfig)
      .then(r => setTodasClases(r.data))
      .catch(console.error)
      .finally(() => setLoadingClases(false));
  }, [axiosConfig]);

  // Clases relevantes: ±14 días de la fecha del ingreso, no rechazadas
  const clasesFiltradas = todasClases.filter(a => {
    if (a.estado === 'RECHAZADA') return false;
    const diff = Math.abs(new Date(a.fecha) - new Date(fecha)) / 86400000;
    return diff <= 14;
  }).sort((a,b) => new Date(a.fecha) - new Date(b.fecha));

  const toggleClase = (id) =>
    setClasesSelec(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);

  // Tarjeta de crédito: -5%
  const montoNum    = parseFloat(monto) || 0;
  const descuento   = formaPago === 'Tarjeta Crédito' ? montoNum*0.05 : 0;
  const totalFinal  = montoNum - descuento;

  const puedeConfirmar = totalFinal > 0;

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setGuardando(true);
    try {
      const payload = {
        tipoTransaccion: 'INGRESO',
        fecha,
        actividad: tipoActividad || 'Ingreso',
        detalles: [
          clasesSelec.length > 0
            ? todasClases.filter(c=>clasesSelec.includes(c.id)).map(c=>c.alumno).join(', ')
            : '',
          detalles,
        ].filter(Boolean).join(' · '),
        instructor: opcionActual.label,
        asignadoA:  'NINGUNO',  // se asigna después desde Estadísticas
        total:      String(totalFinal),
        moneda,
        formaPago,
        comision:   String(descuento),
        agendaIds:  clasesSelec.length > 0 ? clasesSelec.join(',') : null,
      };

      await axios.post(`${API}/api/clases/guardar`, payload, axiosConfig);

      // El reparto a los dueños NO se hace acá.
      // Se hace desde Estadísticas al asignar el ingreso, para evitar duplicados.

      setView();
    } catch(err) {
      console.error(err);
      alert('No se pudo guardar el ingreso.');
    } finally {
      enviandoRef.current = false;
      setGuardando(false);
    }
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth:560, margin:'0 auto', padding:'0 0 80px', fontFamily:'system-ui,sans-serif' }}>
      <style>{`@keyframes kbn-spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
        <button type="button" onClick={() => paso===0 ? setView() : setPaso(0)}
          style={{ width:38, height:38, borderRadius:11, border:`0.5px solid ${NA.border}`, background:'#fff', color:NA.text2, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
          <i className="ti ti-arrow-left" style={{ fontSize:18 }}/>
        </button>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:18, fontWeight:700, color:NA.text, margin:0 }}>
            {paso===0 ? 'Nuevo ingreso' : 'Confirmar ingreso'}
          </h1>
          <p style={{ fontSize:11, color:NA.text2, margin:'2px 0 0' }}>
            {paso===0 ? 'Completá los datos del cobro' : 'Revisá y confirmá'}
          </p>
        </div>
        {/* Presencia */}
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:99, background:opcionActual.bg, border:`1px solid ${opcionActual.color}30` }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:opcionActual.color }}/>
          <span style={{ fontSize:12, fontWeight:600, color:opcionActual.color }}>{opcionActual.short}</span>
        </div>
      </div>

      {/* ══ PASO 0 — FORMULARIO ══ */}
      {paso === 0 && (
        <form onSubmit={e => { e.preventDefault(); if (puedeConfirmar) setPaso(1); }}>

          {/* Fecha */}
          <div style={{ marginBottom:16 }}>
            <label style={sx.label}>Fecha del cobro</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              style={sx.input} required/>
          </div>

          {/* Clases vinculadas — SIEMPRE VISIBLE */}
          <div style={{ background:'#fff', borderRadius:14, border:`0.5px solid ${NA.border}`, padding:16, marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <p style={{ margin:0, fontSize:12, fontWeight:700, color:NA.text2, textTransform:'uppercase', letterSpacing:'.06em' }}>
                Clases que cubre este pago
              </p>
              <span style={{ fontSize:11, color:NA.text2 }}>±14 días de la fecha</span>
            </div>

            {loadingClases ? (
              <p style={{ fontSize:12, color:NA.text2, textAlign:'center', padding:'12px 0' }}>Cargando clases...</p>
            ) : clasesFiltradas.length === 0 ? (
              <p style={{ fontSize:12, color:'#9ca3af', textAlign:'center', padding:'12px 0' }}>No hay clases en ese período.</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:280, overflowY:'auto' }}>
                {clasesFiltradas.map(a => {
                  const sel     = clasesSelec.includes(a.id);
                  const cobrada = a.cobrada;
                  const col     = colorTipo(a.tipoAula);
                  const esHoy   = a.fecha === fecha;
                  return (
                    <button key={a.id} type="button"
                      onClick={() => !cobrada && toggleClase(a.id)}
                      style={{
                        padding:'10px 12px', borderRadius:10, textAlign:'left',
                        cursor: cobrada ? 'default' : 'pointer',
                        opacity: cobrada ? 0.5 : 1,
                        border:`1.5px solid ${sel ? col.border : cobrada ? '#D1FAE5' : NA.border}`,
                        background: sel ? col.bg : cobrada ? '#F0FDF4' : '#fff',
                        display:'flex', justifyContent:'space-between', alignItems:'center', gap:8,
                      }}>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginBottom:2 }}>
                          <span style={{ fontWeight:700, fontSize:13, color: sel ? col.text : NA.text }}>
                            {a.alumno}
                          </span>
                          {a.tipoAula && (
                            <span style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:99,
                              background:col.bg, color:col.text, border:`1px solid ${col.border}30` }}>
                              {a.tipoAula}
                            </span>
                          )}
                          {esHoy && <span style={{ fontSize:10, fontWeight:600, padding:'1px 7px', borderRadius:99, background:'#D1FAE5', color:'#065F46' }}>hoy</span>}
                          {cobrada && <span style={{ fontSize:10, color:'#9ca3af' }}>✓ cobrada</span>}
                        </div>
                        <span style={{ fontSize:11, color:NA.text2 }}>
                          {a.fecha} · {a.nombreInstructor || '—'}
                          {a.horas && ` · ${a.horas}h`}
                          {a.hora && ` · ${String(a.hora).substring(0,5)}`}
                          {a.tarifa && ` · R$ ${a.tarifa}/h`}
                        </span>
                      </div>
                      <div style={{ width:20, height:20, borderRadius:'50%', border:`2px solid ${sel ? col.border : NA.border}`,
                        background: sel ? col.border : '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {sel && <i className="ti ti-check" style={{ fontSize:11, color:'#fff' }}/>}
                        {cobrada && <i className="ti ti-lock" style={{ fontSize:10, color:'#9ca3af' }}/>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {clasesSelec.length > 0 && (
              <p style={{ margin:'10px 0 0', fontSize:11, color:NA.dark, fontWeight:500 }}>
                ✓ {clasesSelec.length} clase{clasesSelec.length>1?'s':''} seleccionada{clasesSelec.length>1?'s':''} — se marcarán como cobradas al guardar
              </p>
            )}
          </div>

          {/* Monto */}
          <div style={{ background:NA.darker, borderRadius:14, padding:18, marginBottom:16 }}>
            <p style={{ margin:'0 0 14px', fontSize:10, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:600 }}>
              Monto cobrado
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, color:'rgba(255,255,255,.6)', display:'block', marginBottom:5 }}>Total</label>
                <input type="number" step="0.01" placeholder="0.00" value={monto}
                  onChange={e => setMonto(e.target.value)}
                  style={{ width:'100%', padding:'13px', borderRadius:10, border:'0.5px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.1)', color:'#fff', fontSize:22, fontWeight:800, boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'rgba(255,255,255,.6)', display:'block', marginBottom:5 }}>Canal</label>
                <select value={moneda} onChange={e => setMoneda(e.target.value)}
                  style={{ width:'100%', padding:'13px 10px', borderRadius:10, border:'0.5px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.1)', color:'#fff', fontSize:13, boxSizing:'border-box' }}>
                  {MONEDAS.map(m => <option key={m.v} value={m.v} style={{ background:'#1a1a1a' }}>{m.l}</option>)}
                </select>
              </div>
            </div>

            {/* Forma de pago */}
            <label style={{ fontSize:11, color:'rgba(255,255,255,.6)', display:'block', marginBottom:8 }}>Forma de pago</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:6 }}>
              {FORMAS_PAGO.map(f => (
                <button key={f} type="button" onClick={() => setFormaPago(f)}
                  style={{ padding:'9px', borderRadius:9, border:'none', fontSize:12, fontWeight:600, cursor:'pointer',
                    background: formaPago===f ? NA.primary : 'rgba(255,255,255,.12)',
                    color:      formaPago===f ? NA.darker  : 'rgba(255,255,255,.7)' }}>
                  {f}
                </button>
              ))}
            </div>
            {descuento > 0 && (
              <p style={{ margin:'10px 0 0', fontSize:11, color:'#FCA5A5' }}>
                -5% banco: -{descuento.toFixed(2)} → Total: <strong>{totalFinal.toFixed(2)}</strong>
              </p>
            )}
          </div>

          {/* Descripción libre */}
          <div style={{ marginBottom:18 }}>
            <label style={sx.label}>Descripción / Notas (opcional)</label>
            <input type="text" placeholder="Ej: Clases del 14/08, pago adelantado..." value={detalles}
              onChange={e => setDetalles(e.target.value)}
              style={sx.input}/>
          </div>

          <button type="submit" disabled={!puedeConfirmar}
            style={{ width:'100%', padding:'16px', borderRadius:14, border:'none',
              background: puedeConfirmar ? NA.dark : NA.border,
              color:'#fff', fontSize:15, fontWeight:700, cursor: puedeConfirmar ? 'pointer' : 'default' }}>
            Ver resumen →
          </button>
        </form>
      )}

      {/* ══ PASO 1 — CONFIRMAR ══ */}
      {paso === 1 && (
        <form onSubmit={handleSubmit}>
          {/* Card de resumen */}
          <div style={{ background:'#fff', borderRadius:18, border:`0.5px solid ${NA.border}`, overflow:'hidden', marginBottom:16 }}>
            <div style={{ background:NA.darker, padding:'16px 20px' }}>
              <p style={{ margin:0, fontSize:11, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.1em' }}>Total a cobrar</p>
              <p style={{ margin:'4px 0 0', fontSize:32, fontWeight:800, color:'#fff' }}>
                {labelMon(moneda)} {totalFinal.toFixed(2)}
              </p>
              {descuento > 0 && <p style={{ margin:'4px 0 0', fontSize:11, color:'#FCA5A5' }}>Incluye descuento -5% tarjeta</p>}
            </div>

            {[
              { label:'Fecha',          value: fecha },
              { label:'Canal',          value: MONEDAS.find(m=>m.v===moneda)?.l || moneda },
              { label:'Forma de pago',  value: formaPago },
              { label:'Asignado a',     value: opcionActual.label, color: opcionActual.color },
              detalles && { label:'Notas', value: detalles },
              clasesSelec.length > 0 && {
                label: `Clases (${clasesSelec.length})`,
                value: todasClases.filter(c=>clasesSelec.includes(c.id)).map(c=>c.alumno).join(', '),
              },
            ].filter(Boolean).map(({ label, value, color }) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'11px 20px', borderBottom:`0.5px solid ${NA.border}` }}>
                <span style={{ fontSize:13, color:NA.text2 }}>{label}</span>
                <span style={{ fontSize:13, color: color||NA.text, fontWeight:500, textAlign:'right', maxWidth:'60%' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Aviso: el reparto se hace después */}
          <div style={{ background:'#FEF9C3', border:'0.5px solid #FDE68A', borderRadius:14, padding:'14px 18px', marginBottom:16, display:'flex', gap:10, alignItems:'flex-start' }}>
            <i className="ti ti-info-circle" style={{ fontSize:18, color:'#D97706', flexShrink:0, marginTop:1 }}/>
            <div>
              <p style={{ margin:0, fontSize:13, fontWeight:600, color:'#713F12' }}>Queda pendiente de asignación</p>
              <p style={{ margin:'3px 0 0', fontSize:12, color:'#92400E' }}>
                El reparto a Igna, José y Hans se hace desde Estadísticas al asignar este ingreso.
              </p>
            </div>
          </div>

          <button type="submit" disabled={guardando}
            style={{ width:'100%', padding:'17px', borderRadius:14, border:'none',
              background: guardando ? NA.mid : NA.dark, color:'#fff', fontSize:16, fontWeight:700,
              cursor: guardando ? 'default' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
            {guardando
              ? <><i className="ti ti-loader-2" style={{ fontSize:19, animation:'kbn-spin .7s linear infinite' }}/> Guardando...</>
              : <><i className="ti ti-check" style={{ fontSize:19 }}/> Confirmar ingreso</>}
          </button>
          <button type="button" onClick={() => setPaso(0)}
            style={{ width:'100%', padding:'13px', borderRadius:14, border:`0.5px solid ${NA.border}`, background:'#fff', color:NA.text2, fontSize:14, fontWeight:500, cursor:'pointer', marginTop:10 }}>
            ← Volver a editar
          </button>
        </form>
      )}
    </div>
  );
};

export default Ingreso;