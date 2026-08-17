import React, { useState, useRef, useCallback } from 'react';
import { NA, fmt, esPasado, HOY, labelMon, Tag } from './MonitorShared';
import { useAuth } from '../../context/AuthContext';

// ── Constantes ────────────────────────────────────────────────────────────────
const HORA_INICIO = 9;
const HORA_FIN    = 18;
const HORAS_TOTAL = HORA_FIN - HORA_INICIO;
const PX_H        = 80; // px por hora
const TIMELINE_H  = HORAS_TOTAL * PX_H;
const LABEL_W     = 44; // ancho columna de horas

const COLOR = {
  APK:   { bg:'#D1FAE5', bdr:'#059669', txt:'#064E3B' },
  ASPK:  { bg:'#A7F3D0', bdr:'#047857', txt:'#064E3B' },
  APWF:  { bg:'#BFDBFE', bdr:'#2563EB', txt:'#1E3A8A' },
  ASPWF: { bg:'#DDD6FE', bdr:'#7C3AED', txt:'#4C1D95' },
  APWS:  { bg:'#FEF08A', bdr:'#CA8A04', txt:'#713F12' },
  ASPWS: { bg:'#FDE68A', bdr:'#D97706', txt:'#78350F' },
  RENTAL:{ bg:'#E5E7EB', bdr:'#6B7280', txt:'#374151' },
  OTRO:  { bg:'#FEE2E2', bdr:'#EF4444', txt:'#7F1D1D' },
};
const ESTADO_COLOR = {
  PENDIENTE:  { bg:'#FEF9C3', bdr:'#EAB308', txt:'#713F12' },
  RECHAZADA:  { bg:'#FEE2E2', bdr:'#EF4444', txt:'#7F1D1D' },
  FINALIZADA: { bg:'#DCFCE7', bdr:'#16A34A', txt:'#14532D' },
};
const colClase = (tipoAula, estado) => {
  if (ESTADO_COLOR[estado]) return ESTADO_COLOR[estado];
  return COLOR[tipoAula] || { bg: NA.light, bdr: NA.dark, txt: NA.darker };
};

const PRIO = { APK:0, ASPK:1, APWF:2, ASPWF:3, APWS:4, ASPWS:5, RENTAL:8, OTRO:9 };

const toMin  = (h) => { if (!h) return null; const [hh,mm] = String(h).substring(0,5).split(':').map(Number); return hh*60+(mm||0); };
const toPx   = (min) => Math.max(0, ((min - HORA_INICIO*60)/60)*PX_H);
const toH    = (ini, fin) => Math.max(32, ((Math.min(fin, HORA_FIN*60) - ini)/60)*PX_H - 2);
const hhMM   = (s) => String(s||'').substring(0,5);

// ══════════════════════════════════════════════════════════════════════════════
// DRAWER — panel deslizante desde abajo con detalle de clase
// ══════════════════════════════════════════════════════════════════════════════
const ClaseDrawer = ({
  clase, cobrado, ingresoVinc, puedeAdmin, onClose,
  cambiarEstado, abrirEditClase, abrirIngreso,
  liquidarClase, duplicarClase, eliminarClase, onSaveHoraEntrada,
}) => {
  const col    = colClase(clase.tipoAula, clase.estado);
  const pasada = esPasado(String(clase.fecha));
  const [hora, setHora]     = useState(hhMM(clase.hora));
  const [saving, setSaving] = useState(false);

  const guardarHora = async () => {
    if (!hora || !onSaveHoraEntrada) return;
    setSaving(true);
    await onSaveHoraEntrada(clase.id, hora);
    setSaving(false);
    onClose();
  };

  const BtnAccion = ({ icon, label, bg='#fff', bdr=NA.border, color=NA.text, onClick }) => (
    <button onClick={onClick}
      style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        gap:5, padding:'14px 8px', borderRadius:14, border:`1px solid ${bdr}`,
        background:bg, color, fontSize:12, fontWeight:600, cursor:'pointer', flex:1 }}>
      <i className={`ti ${icon}`} style={{ fontSize:20 }}/>
      {label}
    </button>
  );

  return (
    <>
      <div onClick={onClose}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:400, backdropFilter:'blur(2px)' }}/>
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:401,
        background:'#fff', borderRadius:'22px 22px 0 0',
        paddingBottom:'max(env(safe-area-inset-bottom),20px)',
        maxHeight:'88vh', overflowY:'auto',
        boxShadow:'0 -8px 40px rgba(0,0,0,.2)',
      }}>
        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 4px' }}>
          <div style={{ width:40, height:5, borderRadius:99, background:'#D1D5DB' }}/>
        </div>

        {/* Header color por tipo */}
        <div style={{ margin:'0 16px 16px', borderRadius:16, background:col.bg,
          borderLeft:`5px solid ${col.bdr}`, padding:'14px 16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:5 }}>
                <span style={{ fontSize:20, fontWeight:800, color:col.txt }}>{clase.alumno}</span>
                {clase.tipoAula && (
                  <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99,
                    background:'rgba(255,255,255,.7)', color:col.bdr }}>{clase.tipoAula}</span>
                )}
              </div>
              <div style={{ fontSize:13, color:col.txt, opacity:.8, display:'flex', flexWrap:'wrap', gap:8 }}>
                {clase.nombreInstructor && <span>👤 {clase.nombreInstructor}</span>}
                {clase.hora && <span>🕐 {hhMM(clase.hora)}{clase.horaSalida && ` → ${hhMM(clase.horaSalida)}`}</span>}
                {clase.horas && <span>⏱ {clase.horas}h</span>}
                {clase.lugar && <span>📍 {clase.lugar}</span>}
              </div>
              {clase.tarifa && (
                <p style={{ margin:'6px 0 0', fontSize:13, color:col.bdr, fontWeight:600 }}>
                  R$ {clase.tarifa}/h{clase.horas ? ` · Total: R$ ${(clase.tarifa * parseFloat(clase.horas)).toFixed(0)}` : ''}
                </p>
              )}
              {ingresoVinc && (
                <p style={{ margin:'4px 0 0', fontSize:12, color:'#059669', fontWeight:500 }}>
                  💰 Cobrado — Ingreso #{ingresoVinc.id} · {parseFloat(ingresoVinc.total).toFixed(2)} {labelMon(ingresoVinc.moneda)}
                </p>
              )}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end', flexShrink:0, marginLeft:8 }}>
              <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:99,
                background:'rgba(255,255,255,.8)', color:col.bdr }}>{clase.estado}</span>
              {pasada && !cobrado && clase.estado !== 'RECHAZADA' &&
                <span style={{ fontSize:10, color:'#EA580C' }}>⚠ Sin cobro</span>}
              {cobrado && <span style={{ fontSize:10, color:'#059669' }}>✓ Cobrada</span>}
            </div>
          </div>
        </div>

        <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:12 }}>

          {/* Acciones principales */}
          {clase.estado === 'PENDIENTE' && (
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => { cambiarEstado(clase.id,'CONFIRMADA'); onClose(); }}
                style={{ flex:1, padding:'15px', borderRadius:14, border:'none', background:'#D1FAE5', color:'#065F46', fontSize:15, fontWeight:700, cursor:'pointer' }}>
                ✓ Confirmar
              </button>
              <button onClick={() => { cambiarEstado(clase.id,'RECHAZADA'); onClose(); }}
                style={{ flex:1, padding:'15px', borderRadius:14, border:'none', background:'#FEE2E2', color:'#DC2626', fontSize:15, fontWeight:700, cursor:'pointer' }}>
                ✗ Rechazar
              </button>
            </div>
          )}
          {clase.estado === 'CONFIRMADA' && puedeAdmin && (
            <button onClick={() => { liquidarClase(clase); onClose(); }}
              style={{ width:'100%', padding:'15px', borderRadius:14, border:'none', background:NA.darker, color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <i className="ti ti-cash" style={{ fontSize:18 }}/> Liquidar clase
            </button>
          )}
          {clase.estado === 'FINALIZADA' && (
            <div style={{ padding:'14px', borderRadius:14, background:'#D1FAE5', color:'#065F46', fontSize:15, fontWeight:600, textAlign:'center' }}>
              ✓ Clase liquidada
            </div>
          )}

          {/* Editar hora de entrada */}
          <div style={{ background:NA.bg, borderRadius:14, padding:'14px 16px' }}>
            <p style={{ margin:'0 0 10px', fontSize:11, color:NA.text2, fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em' }}>
              Hora de entrada
            </p>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <input type="time" value={hora} onChange={e => setHora(e.target.value)}
                style={{ flex:1, padding:'12px 14px', borderRadius:10, border:`0.5px solid ${NA.border}`, fontSize:16, color:NA.text, background:'#fff', fontFamily:'inherit' }}/>
              <button onClick={guardarHora} disabled={!hora || saving}
                style={{ padding:'12px 20px', borderRadius:10, border:'none', background: hora ? NA.dark : NA.border, color:'#fff', fontSize:14, fontWeight:600, cursor: hora ? 'pointer' : 'default' }}>
                {saving ? '...' : 'Guardar'}
              </button>
            </div>
          </div>

          {/* Botones secundarios */}
          <div style={{ display:'flex', gap:10 }}>
            <BtnAccion icon="ti-edit" label="Editar" onClick={() => { abrirEditClase(clase); onClose(); }}/>
            {duplicarClase && (
              <BtnAccion icon="ti-copy" label="Duplicar" bg='#EDE9FE' bdr='#C4B5FD' color='#6D28D9'
                onClick={() => { duplicarClase(clase); onClose(); }}/>
            )}
            {pasada && !cobrado && (
              <BtnAccion icon="ti-cash" label="Cobro" bg={NA.light} bdr={NA.border} color={NA.dark}
                onClick={() => { abrirIngreso(String(clase.fecha), {}); onClose(); }}/>
            )}
          </div>

          {/* Eliminar */}
          {puedeAdmin && eliminarClase && (
            <button
              onClick={() => { if(window.confirm(`¿Eliminar clase de ${clase.alumno}?`)) { eliminarClase(clase.id); onClose(); }}}
              style={{ width:'100%', padding:'13px', borderRadius:14, border:'1.5px solid #FCA5A5', background:'#fff', color:'#DC2626', fontSize:14, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <i className="ti ti-trash" style={{ fontSize:16 }}/> Eliminar clase
            </button>
          )}
        </div>
      </div>
    </>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MONITOR DIA
// ══════════════════════════════════════════════════════════════════════════════
const MonitorDia = ({
  diaSelec, evD, agenda, ingresos,
  tieneCobro, ingresoDeClase,
  cambiarEstado, abrirEditClase, abrirIngreso, abrirAgendar,
  liquidarClase, duplicarClase, navDia, onDragHora,
  eliminarClase, onSaveHoraEntrada,
}) => {
  const [claseSelec, setClaseSelec]   = useState(null);
  const [modoMover,  setModoMover]    = useState(false); // modo drag activado explícitamente
  const timelineRef  = useRef(null);
  const dragRef      = useRef(null);
  const { user }     = useAuth();
  const puedeAdmin   = user?.role === 'ADMINISTRADOR' || user?.role === 'SECRETARIA';


  // ── Datos ─────────────────────────────────────────────────────────────────
  const pasado        = esPasado(diaSelec);
  const clasesActivas = evD.clases.filter(a => a.estado !== 'RECHAZADA');
  const clasesRechaz  = evD.clases.filter(a => a.estado === 'RECHAZADA');
  const horasTotales  = clasesActivas.reduce((s,a) => s+(parseFloat(a.horas)||0), 0);
  const clasesCobradas = clasesActivas.filter(a => tieneCobro(a)).length;
  const sumaIngresos  = {};
  evD.ingresos.forEach(i => {
    const m = i.moneda?.startsWith('R$')||i.moneda==='BRL'?'R$':i.moneda?.startsWith('EUR')?'€':'US$';
    sumaIngresos[m] = (sumaIngresos[m]||0)+(parseFloat(i.total)||0);
  });

  // ── Construir columnas (solapamiento) con prioridad de tipo ───────────────
  const conPos = clasesActivas
    .filter(a => toMin(a.hora) !== null)
    .sort((a,b) => { const d=toMin(a.hora)-toMin(b.hora); return d!==0?d:(PRIO[a.tipoAula]??6)-(PRIO[b.tipoAula]??6); });
  const sinPos = clasesActivas.filter(a => toMin(a.hora) === null);

  // Asignar columna a cada clase
  const asignacion = []; // [{clase, col, totalCols}] — totalCols se llena después
  const colFin     = []; // fin en minutos de la última clase en cada columna

  conPos.forEach(clase => {
    const ini = toMin(clase.hora);
    const fin = clase.horaSalida
      ? toMin(clase.horaSalida)
      : ini + Math.min(parseFloat(clase.horas)||1, 8)*60;

    let c = colFin.findIndex(f => f <= ini);
    if (c === -1) { c = colFin.length; colFin.push(fin); }
    else           colFin[c] = fin;

    asignacion.push({ clase, col:c });
  });

  const nCols = Math.max(1, colFin.length);

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const startDrag = useCallback((e, clase) => {
    if (!modoMover) return;
    e.stopPropagation();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragRef.current = { id:clase.id, startY:clientY, hora:clase.hora };
  }, [modoMover]);

  const onMove = useCallback((e) => {
    if (!dragRef.current) return;
    e.preventDefault();
  }, []);

  const endDrag = useCallback((e) => {
    if (!dragRef.current || !timelineRef.current) { dragRef.current=null; return; }
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const rect    = timelineRef.current.getBoundingClientRect();
    const yRel    = clientY - rect.top;
    const min     = HORA_INICIO*60 + (yRel/PX_H)*60;
    const snapped = Math.round(min/15)*15;
    const hh      = Math.max(HORA_INICIO, Math.min(HORA_FIN-1, Math.floor(snapped/60)));
    const mm      = snapped%60;
    const nueva   = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
    if (onDragHora && nueva !== hhMM(dragRef.current.hora)) onDragHora(dragRef.current.id, nueva);
    dragRef.current = null;
  }, [onDragHora]);

  // Early return DESPUÉS de todos los hooks
  if (!diaSelec) return null;

  return (
    <div style={{ background:'#fff', borderRadius:16, border:`0.5px solid ${NA.border}`, overflow:'hidden', marginBottom:14 }}>

      {/* ── HEADER ── */}
      <div style={{ padding:'14px 16px', borderBottom:`0.5px solid ${NA.border}` }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>

          {/* Navegación + título */}
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            {navDia && (
              <button onClick={() => navDia(-1)}
                style={{ width:32, height:32, borderRadius:9, border:`0.5px solid ${NA.border}`, background:'#fff', color:NA.text2, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <i className="ti ti-chevron-left" style={{ fontSize:16 }}/>
              </button>
            )}
            <div>
              <p style={{ margin:0, fontWeight:700, fontSize:16, color:NA.text }}>{fmt(diaSelec)}</p>
              <p style={{ margin:'1px 0 0', fontSize:11, color:NA.text2 }}>
                {clasesActivas.length} clase{clasesActivas.length!==1?'s':''} · {horasTotales}h
              </p>
            </div>
            {navDia && (
              <button onClick={() => navDia(1)}
                style={{ width:32, height:32, borderRadius:9, border:`0.5px solid ${NA.border}`, background:'#fff', color:NA.text2, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <i className="ti ti-chevron-right" style={{ fontSize:16 }}/>
              </button>
            )}
          </div>

          {/* Acciones derecha */}
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            {/* Toggle modo mover */}
            {puedeAdmin && conPos.length > 0 && (
              <button onClick={() => setModoMover(m => !m)}
                title={modoMover ? 'Desactivar modo mover' : 'Activar modo mover'}
                style={{ width:34, height:34, borderRadius:9, border:`1.5px solid ${modoMover ? NA.dark : NA.border}`,
                  background: modoMover ? NA.dark : '#fff',
                  color: modoMover ? '#fff' : NA.text2,
                  display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <i className="ti ti-arrows-move" style={{ fontSize:17 }}/>
              </button>
            )}
            {abrirAgendar && (
              <button onClick={() => abrirAgendar(diaSelec)}
                style={{ padding:'8px 14px', borderRadius:10, border:`0.5px solid ${NA.border}`, background:'#fff', color:NA.dark, fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                <i className="ti ti-plus" style={{ fontSize:15 }}/> Clase
              </button>
            )}
            <button onClick={() => abrirIngreso(diaSelec)}
              style={{ padding:'8px 14px', borderRadius:10, border:'none', background:NA.dark, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
              <i className="ti ti-cash" style={{ fontSize:15 }}/> Cobro
            </button>
          </div>
        </div>

        {/* Chips stats */}
        <div style={{ display:'flex', gap:6, marginTop:12, flexWrap:'wrap' }}>
          <Chip icon="ti-check"  val={clasesCobradas} label="cobradas" c="#065F46" bg="#D1FAE5"/>
          {clasesActivas.length - clasesCobradas > 0 && pasado && (
            <Chip icon="ti-alert-triangle" val={clasesActivas.length-clasesCobradas} label="sin cobro" c="#9A3412" bg="#FFF7ED"/>
          )}
          {Object.entries(sumaIngresos).map(([m,v]) => (
            <Chip key={m} icon="ti-cash" val={`${v.toFixed(0)} ${m}`} label="cobrado" c="#065F46" bg="#D1FAE5"/>
          ))}
          {modoMover && (
            <Chip icon="ti-arrows-move" val="Modo mover" label="activado" c={NA.darker} bg={NA.light}/>
          )}
        </div>
      </div>

      {/* ── TIMELINE ── */}
      <div
        style={{ position:'relative', overflowX:'hidden', cursor: modoMover ? 'crosshair' : 'default' }}
        onMouseMove={onMove} onMouseUp={endDrag} onMouseLeave={endDrag}
        onTouchMove={onMove} onTouchEnd={endDrag}>

        {/* Columna de horas + área de bloques en flex */}
        <div style={{ display:'flex' }}>

          {/* Labels de horas */}
          <div style={{ width:LABEL_W, flexShrink:0, position:'relative', height:TIMELINE_H+20 }}>
            {Array.from({ length:HORAS_TOTAL+1 }, (_,i) => {
              const hora = HORA_INICIO+i;
              return (
                <div key={hora} style={{ position:'absolute', top:i*PX_H+10, width:'100%', display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ fontSize:10, color:NA.text2, fontWeight:500, width:'100%', textAlign:'right', paddingRight:8 }}>
                    {hora}:00
                  </span>
                </div>
              );
            })}
          </div>

          {/* Área de bloques */}
          <div ref={timelineRef}
            style={{ flex:1, position:'relative', height:TIMELINE_H+20, borderLeft:`0.5px solid ${NA.border}` }}>

            {/* Líneas horizontales */}
            {Array.from({ length:HORAS_TOTAL+1 }, (_,i) => (
              <div key={i} style={{ position:'absolute', left:0, right:0, top:i*PX_H+10,
                borderTop: i===0 ? `1px solid ${NA.border}` : `0.5px solid ${NA.border}40`, zIndex:1 }}/>
            ))}

            {/* Botones + por hora */}
            {abrirAgendar && Array.from({ length:HORAS_TOTAL }, (_,i) => {
              const hora = HORA_INICIO+i;
              return (
                <button key={hora}
                  onClick={() => abrirAgendar(diaSelec, `${String(hora).padStart(2,'0')}:00`)}
                  style={{ position:'absolute', right:4, top:i*PX_H+14, width:20, height:20, borderRadius:6,
                    border:`0.5px dashed ${NA.border}`, background:'transparent', color:NA.border,
                    cursor:'pointer', zIndex:2, display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background=NA.light; e.currentTarget.style.color=NA.dark; e.currentTarget.style.borderColor=NA.dark; }}
                  onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color=NA.border; e.currentTarget.style.borderColor=NA.border; }}>
                  <i className="ti ti-plus" style={{ fontSize:11 }}/>
                </button>
              );
            })}

            {/* Línea "ahora" */}
            {diaSelec === HOY && (() => {
              const n = new Date(); const min = n.getHours()*60+n.getMinutes();
              if (min < HORA_INICIO*60 || min > HORA_FIN*60) return null;
              const top = toPx(min)+10;
              return (
                <div style={{ position:'absolute', left:0, right:0, top, height:2, background:'#EF4444', zIndex:10 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:'#EF4444', marginTop:-4, marginLeft:-2 }}/>
                </div>
              );
            })()}

            {/* Bloques de clases */}
            {asignacion.map(({ clase, col }) => {
              const ini    = toMin(clase.hora);
              const finMin = clase.horaSalida
                ? toMin(clase.horaSalida)
                : ini + Math.min(parseFloat(clase.horas)||1, 8)*60;
              const top = toPx(ini)+10;
              const h   = toH(ini, finMin);
              const c   = colClase(clase.tipoAula, clase.estado);
              const cob = tieneCobro(clase);

              // Cada columna toma una fracción igual del ancho disponible
              const pct  = 100 / nCols;
              const left = `${col * pct}%`;
              const w    = `calc(${pct}% - 2px)`;

              return (
                <div key={clase.id}
                  onClick={() => !modoMover && setClaseSelec(clase)}
                  onMouseDown={modoMover ? e => startDrag(e, clase) : undefined}
                  onTouchStart={modoMover ? e => startDrag(e, clase) : undefined}
                  style={{
                    position:'absolute', top, left, width:w, height:h,
                    zIndex:5,
                    background: c.bg,
                    borderLeft:`3px solid ${c.bdr}`,
                    borderRadius:'0 8px 8px 0',
                    padding:'4px 6px 4px 8px',
                    boxSizing:'border-box',
                    cursor: modoMover ? 'grab' : 'pointer',
                    overflow:'hidden',
                    userSelect:'none',
                    // Sombra sutil para separar clases solapadas
                    boxShadow:'0 1px 3px rgba(0,0,0,.08)',
                  }}>
                  {/* Indicadores */}
                  <div style={{ position:'absolute', top:3, right:4, display:'flex', gap:3 }}>
                    {cob && <span style={{ fontSize:9, color:'#059669', fontWeight:700 }}>✓</span>}
                    {pasado && !cob && clase.estado!=='RECHAZADA' && clase.estado!=='FINALIZADA' &&
                      <span style={{ fontSize:9, color:'#EA580C' }}>⚠</span>}
                    {modoMover && <i className="ti ti-grip-vertical" style={{ fontSize:11, color:c.bdr, opacity:.6 }}/>}
                  </div>

                  {/* Nombre */}
                  <p style={{ margin:0, fontSize:11, fontWeight:700, color:c.txt,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                    paddingRight: modoMover ? 16 : 12 }}>
                    {clase.alumno}
                  </p>

                  {/* Tipo */}
                  {h > 36 && clase.tipoAula && (
                    <p style={{ margin:'1px 0 0', fontSize:10, fontWeight:600, color:c.bdr,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {clase.tipoAula}
                    </p>
                  )}

                  {/* Hora */}
                  {h > 50 && (
                    <p style={{ margin:'1px 0 0', fontSize:10, color:c.txt, opacity:.7 }}>
                      {hhMM(clase.hora)}{clase.horaSalida && ` → ${hhMM(clase.horaSalida)}`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Clases sin horario */}
        {sinPos.length > 0 && (
          <div style={{ borderTop:`0.5px solid ${NA.border}`, padding:'10px 14px' }}>
            <p style={{ margin:'0 0 8px', fontSize:10, color:NA.text2, fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em' }}>
              Sin horario asignado
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {sinPos.map(clase => {
                const c = colClase(clase.tipoAula, clase.estado);
                return (
                  <div key={clase.id} onClick={() => setClaseSelec(clase)}
                    style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                      background:c.bg, borderLeft:`3px solid ${c.bdr}`, borderRadius:'0 10px 10px 0',
                      padding:'10px 14px', cursor:'pointer' }}>
                    <div>
                      <span style={{ fontWeight:700, fontSize:14, color:c.txt }}>{clase.alumno}</span>
                      {clase.tipoAula && <span style={{ fontSize:12, color:c.bdr, marginLeft:8, fontWeight:600 }}>{clase.tipoAula}</span>}
                    </div>
                    <span style={{ fontSize:11, color:c.txt, opacity:.6 }}>{clase.estado}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rechazadas */}
        {clasesRechaz.length > 0 && (
          <div style={{ borderTop:`0.5px solid ${NA.border}`, padding:'8px 14px' }}>
            <p style={{ margin:'0 0 6px', fontSize:10, color:'#9ca3af', fontWeight:600, textTransform:'uppercase' }}>
              Rechazadas ({clasesRechaz.length})
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {clasesRechaz.map(c => (
                <span key={c.id} style={{ fontSize:11, color:'#9ca3af', background:'#F9FAFB',
                  padding:'3px 10px', borderRadius:99, border:'0.5px solid #E5E7EB' }}>
                  {c.alumno}{c.hora && ` · ${hhMM(c.hora)}`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── INGRESOS ── */}
      {evD.ingresos.length > 0 && (
        <SeccionFinanciera color="#065F46" bg="#F0FDF4" label="Ingresos">
          {evD.ingresos.map(i => {
            const clasesVinc = agenda.filter(a => a.ingresoId === i.id);
            return (
              <div key={i.id} style={{ padding:'11px 16px', borderBottom:`0.5px solid ${NA.border}` }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:2 }}>
                  <span style={{ fontWeight:700, fontSize:15, color:'#065F46' }}>
                    + {parseFloat(i.total||0).toFixed(2)} {labelMon(i.moneda)}
                  </span>
                  <span style={{ fontSize:10, color:'#9ca3af' }}>#{i.id}</span>
                  {i.asignadoA && i.asignadoA!=='NINGUNO'
                    ? <Tag label={i.asignadoA} color={NA.darker} bg={NA.light} small/>
                    : <Tag label="Sin asignar" color="#92400E" bg="#FEF3C7" small/>}
                </div>
                <p style={{ margin:0, fontSize:12, color:NA.text2 }}>
                  {i.actividad}{i.instructor && ` · ${i.instructor}`} · {i.formaPago}
                </p>
                {i.detalles && <p style={{ margin:'2px 0 0', fontSize:11, color:NA.text2, fontStyle:'italic' }}>{i.detalles.split('|')[0].trim()}</p>}
                {clasesVinc.length > 0 && (
                  <p style={{ margin:'3px 0 0', fontSize:11, color:'#059669' }}>
                    <i className="ti ti-link" style={{ fontSize:10, marginRight:3 }}/>{clasesVinc.map(c=>c.alumno).join(', ')}
                  </p>
                )}
              </div>
            );
          })}
        </SeccionFinanciera>
      )}

      {/* ── EGRESOS ── */}
      {evD.egresos.length > 0 && (
        <SeccionFinanciera color="#991B1B" bg="#FEF2F2" label="Egresos">
          {evD.egresos.map(e => (
            <div key={e.id} style={{ padding:'11px 16px', borderBottom:`0.5px solid ${NA.border}` }}>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:2, flexWrap:'wrap' }}>
                <span style={{ fontWeight:700, fontSize:15, color:'#DC2626' }}>
                  - {parseFloat(e.total||0).toFixed(2)} {labelMon(e.moneda)}
                </span>
                <span style={{ fontSize:10, color:'#9ca3af' }}>#{e.id}</span>
              </div>
              <p style={{ margin:0, fontSize:12, color:NA.text2 }}>{e.detalles||e.actividad} · {e.formaPago}</p>
            </div>
          ))}
        </SeccionFinanciera>
      )}

      {clasesActivas.length===0 && evD.ingresos.length===0 && evD.egresos.length===0 && (
        <div style={{ padding:'40px 20px', textAlign:'center', color:NA.text2 }}>
          <i className="ti ti-calendar-off" style={{ fontSize:32, opacity:.2, display:'block', marginBottom:10 }}/>
          Sin eventos para este día.
          {abrirAgendar && (
            <div style={{ marginTop:14 }}>
              <button onClick={() => abrirAgendar(diaSelec)}
                style={{ padding:'10px 22px', background:NA.dark, color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Agregar clase
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── DRAWER ── */}
      {claseSelec && (
        <ClaseDrawer
          clase={claseSelec}
          ingresoVinc={ingresoDeClase(claseSelec)}
          cobrado={tieneCobro(claseSelec)}
          puedeAdmin={puedeAdmin}
          onClose={() => setClaseSelec(null)}
          cambiarEstado={cambiarEstado}
          abrirEditClase={abrirEditClase}
          abrirIngreso={abrirIngreso}
          liquidarClase={liquidarClase}
          duplicarClase={duplicarClase}
          eliminarClase={eliminarClase}
          onSaveHoraEntrada={onSaveHoraEntrada}
        />
      )}
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const Chip = ({ icon, val, label, c, bg }) => (
  <div style={{ display:'flex', alignItems:'center', gap:5, background:bg, padding:'4px 10px', borderRadius:99 }}>
    <i className={`ti ${icon}`} style={{ fontSize:11, color:c }}/>
    <span style={{ fontSize:11, fontWeight:600, color:c }}>{val}</span>
    {label && <span style={{ fontSize:10, color:c, opacity:.7 }}>{label}</span>}
  </div>
);

const SeccionFinanciera = ({ color, bg, label, children }) => (
  <div>
    <div style={{ padding:'8px 16px', background:bg, borderTop:`0.5px solid ${NA.border}` }}>
      <span style={{ fontSize:10, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'.08em' }}>{label}</span>
    </div>
    {children}
  </div>
);

export default MonitorDia;