import React from 'react';
import { NA, TIPOS_AULA, MONEDAS, FORMAS_PAGO, fmt, labelMon, normName, Tag, Btn, Inp } from './MonitorShared';

// ── Layout helpers ────────────────────────────────────────────────────────────
const Overlay = ({ onClick, children }) => (
  <div onClick={onClick} style={{
    position:'fixed', inset:0, background:'rgba(8,80,65,.45)', backdropFilter:'blur(4px)',
    display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:16,
  }}>
    {children}
  </div>
);

// Modal con header fijo + body scrolleable + footer fijo.
// Usar data-zone="header"|"body"|"footer" en los hijos.
const Modal = ({ onClick, header, body, footer, maxWidth = 440 }) => (
  <div onClick={onClick} style={{
    background:'rgba(255,255,255,.07)', borderRadius:20, width:'100%', maxWidth,
    maxHeight:'92vh', display:'flex', flexDirection:'column',
    boxSizing:'border-box', overflow:'hidden',
  }}>
    {header && <div style={{ padding:'20px 24px 16px', flexShrink:0, borderBottom:`0.5px solid ${NA.border}` }}>{header}</div>}
    <div style={{ flex:1, overflowY:'auto', padding:'18px 24px' }}>{body}</div>
    {footer && <div style={{ padding:'14px 24px', borderTop:`0.5px solid ${NA.border}`, background:'rgba(255,255,255,.07)', flexShrink:0 }}>{footer}</div>}
  </div>
);

const sx  = { label: { fontSize:11, color:'rgba(255,255,255,.5)', display:'block', marginBottom:5, fontWeight:500 } };
const closeBtnSx = { width:28, height:28, borderRadius:8, border:'none', background:'#f3f4f6', color:'#6b7280', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 };

// ══════════════════════════════════════════════════════════════════════════════
// MODAL: EDITAR CLASE
// ══════════════════════════════════════════════════════════════════════════════
export const ModalEditarClase = ({
  editClase, editForm, setEditForm,
  ingresosDisponiblesEdit, agenda,
  guardandoEdit, guardarEditClase, onClose,
}) => {
  if (!editClase) return null;

  return (
    <Overlay onClick={onClose}>
      <Modal
        onClick={e => e.stopPropagation()}

        header={
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:'rgba(255,255,255,.9)' }}>Editar clase</h2>
              <p style={{ margin:'3px 0 0', fontSize:12, color:'rgba(255,255,255,.5)' }}>
                <strong>{editClase.alumno}</strong> · {fmt(editClase.fecha?.toString())} · {editClase.nombreInstructor}
              </p>
            </div>
            <button onClick={onClose} style={{ ...closeBtnSx }}>
              <i className="ti ti-x" style={{ fontSize:15 }}/>
            </button>
          </div>
        }

        body={<>
          {/* Tipo de aula */}
          <label style={sx.label}>Tipo de aula</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:16 }}>
            {TIPOS_AULA.map(({ v, l }) => (
              <button key={v} type="button"
                onClick={() => setEditForm(p => ({...p, tipoAula: p.tipoAula === v ? '' : v}))}
                style={{
                  padding:'9px 8px', borderRadius:10, fontSize:11, fontWeight:600, cursor:'pointer', textAlign:'center',
                  border:`1.5px solid ${editForm.tipoAula===v ? NA.dark : NA.border}`,
                  background: editForm.tipoAula===v ? NA.dark : '#fff',
                  color:      editForm.tipoAula===v ? '#fff'  : NA.text,
                }}>
                {l}
              </button>
            ))}
          </div>

          {/* Horarios */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
            <div>
              <label style={sx.label}>Hora entrada</label>
              <input type="time" readOnly
                value={editClase.hora?.substring(0,5) || ''}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`0.5px solid rgba(255,255,255,.1)`, fontSize:14, background:'#f9fafb', color:'#9ca3af', boxSizing:'border-box' }}/>
            </div>
            <div>
              <label style={sx.label}>Hora salida</label>
              <input type="time"
                value={editForm.horaSalida}
                onChange={e => setEditForm(p => ({...p, horaSalida: e.target.value}))}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`0.5px solid rgba(255,255,255,.1)`, fontSize:14, color:'rgba(255,255,255,.9)', boxSizing:'border-box' }}/>
            </div>
            <div>
              <label style={sx.label}>Horas</label>
              <input type="number" step="0.5"
                value={editForm.horas}
                onChange={e => setEditForm(p => ({...p, horas: e.target.value}))}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`0.5px solid rgba(255,255,255,.1)`, fontSize:14, color:'rgba(255,255,255,.9)', boxSizing:'border-box' }}/>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
            <div>
              <label style={sx.label}>Lugar</label>
              <input type="text"
                value={editForm.lugar}
                onChange={e => setEditForm(p => ({...p, lugar: e.target.value}))}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`0.5px solid rgba(255,255,255,.1)`, fontSize:14, color:'rgba(255,255,255,.9)', boxSizing:'border-box' }}/>
            </div>
            <div>
              <label style={sx.label}>Tarifa (R$/h)</label>
              <input type="number"
                value={editForm.tarifa}
                onChange={e => setEditForm(p => ({...p, tarifa: e.target.value}))}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`0.5px solid rgba(255,255,255,.1)`, fontSize:14, color:'rgba(255,255,255,.9)', boxSizing:'border-box' }}/>
            </div>
          </div>

          {/* Cobro vinculado */}
          <div style={{ marginBottom:14 }}>
            <label style={{ ...sx.label, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>
              Cobro vinculado
            </label>

            {/* Sin cobro */}
            <button type="button"
              onClick={() => setEditForm(p => ({...p, ingresoIdSelec:'', cobrada:false}))}
              style={{
                width:'100%', padding:'10px 14px', borderRadius:10, marginBottom:8,
                textAlign:'left', cursor:'pointer', fontSize:13, fontWeight:600,
                border:`1.5px solid ${!editForm.ingresoIdSelec ? '#DC2626' : NA.border}`,
                background: !editForm.ingresoIdSelec ? '#FEF2F2' : '#fff',
                color:      !editForm.ingresoIdSelec ? '#DC2626' : NA.text2,
              }}>
              ✗ Sin cobro registrado
            </button>

            {ingresosDisponiblesEdit.length === 0 ? (
              <p style={{ fontSize:12, color:'#9ca3af' }}>No hay ingresos disponibles.</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {ingresosDisponiblesEdit.map(i => {
                  const sel = String(editForm.ingresoIdSelec) === String(i.id);
                  const clasesVinc = agenda.filter(a => a.ingresoId === i.id && a.id !== editClase?.id);
                  const esMismoDia = i.fecha === editClase?.fecha?.toString();
                  return (
                    <button key={i.id} type="button"
                      onClick={() => setEditForm(p => ({...p, ingresoIdSelec: String(i.id), cobrada:true}))}
                      style={{
                        padding:'10px 14px', borderRadius:10, textAlign:'left', cursor:'pointer',
                        border:`1.5px solid ${sel ? NA.dark : NA.border}`,
                        background: sel ? NA.light : '#fff',
                      }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                        <div style={{ minWidth:0, flex:1 }}>
                          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginBottom:3 }}>
                            <span style={{ fontSize:13, fontWeight:700, color: sel ? NA.darker : NA.text }}>
                              #{i.id} · {parseFloat(i.total||0).toFixed(2)} {labelMon(i.moneda)}
                            </span>
                            {esMismoDia && <Tag label="mismo día" color="#065F46" bg="#D1FAE5" small/>}
                            {clasesVinc.length > 0 && (
                              <Tag label={`${clasesVinc.length} clase${clasesVinc.length>1?'s':''} más`} color="#4338CA" bg="#EEF2FF" small/>
                            )}
                          </div>
                          <span style={{ fontSize:11, color:'rgba(255,255,255,.5)' }}>
                            {i.fecha} · {i.detalles?.split('|')[0].trim() || i.actividad || '—'}
                          </span>
                        </div>
                        {sel && <i className="ti ti-check" style={{ color:NA.dark, fontSize:16, flexShrink:0 }}/>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notificar instructor */}
          <div style={{ padding:'12px 14px', borderRadius:12, background:'#FEF9C3', border:'0.5px solid #FDE68A', display:'flex', alignItems:'center', gap:10 }}>
            <button type="button"
              onClick={() => setEditForm(p => ({...p, notificar: !p.notificar}))}
              style={{ width:38, height:22, borderRadius:11, border:'none', cursor:'pointer', flexShrink:0,
                background: editForm.notificar ? '#F59E0B' : '#D1D5DB', position:'relative', transition:'background .2s' }}>
              <span style={{ position:'absolute', top:2, left: editForm.notificar ? 18 : 2, width:18, height:18,
                borderRadius:'50%', background:'rgba(255,255,255,.07)', transition:'left .2s' }}/>
            </button>
            <div>
              <p style={{ margin:0, fontSize:12, fontWeight:600, color:'#713F12' }}>
                {editForm.notificar ? '🔔 Vuelve a PENDIENTE' : 'Notificar al instructor'}
              </p>
              <p style={{ margin:0, fontSize:11, color:'#92400E' }}>
                {editForm.notificar ? 'El instructor verá la clase como nueva' : 'Activar para que el instructor confirme los cambios'}
              </p>
            </div>
          </div>
        </>}

        footer={
          <div style={{ display:'flex', gap:10 }}>
            <Btn label="Cancelar" bg='#fff' color={NA.text2} onClick={onClose}/>
            <Btn label={guardandoEdit ? 'Guardando...' : 'Guardar cambios'}
              disabled={guardandoEdit} icon="ti-check" onClick={guardarEditClase}/>
          </div>
        }
      />
    </Overlay>
  );
};


// ══════════════════════════════════════════════════════════════════════════════
// MODAL: NUEVO INGRESO
// ══════════════════════════════════════════════════════════════════════════════
export const ModalNuevoIngreso = ({
  ingresoFecha, ingresoForm, setIngresoForm,
  clasesParaIngreso, clasesSelec, toggleClaseSelec,
  agenda, tieneCobro, instructores,
  enviando, guardarIngreso, onClose,
}) => {
  if (!ingresoFecha) return null;

  const descuento  = ingresoForm.formaPago === 'Tarjeta Crédito' ? (parseFloat(ingresoForm.total||0)*0.05) : 0;
  const totalFinal = parseFloat(ingresoForm.total||0) - descuento;

  return (
    <Overlay onClick={onClose}>
      <Modal
        onClick={e => e.stopPropagation()}
        maxWidth={500}

        header={
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'rgba(255,255,255,.9)' }}>Registrar cobro</h2>
              <p style={{ margin:'3px 0 0', fontSize:12, color:'rgba(255,255,255,.5)' }}>{ingresoFecha}</p>
            </div>
            <button onClick={onClose} style={{ ...closeBtnSx }}>
              <i className="ti ti-x" style={{ fontSize:15 }}/>
            </button>
          </div>
        }

        body={<>
          {/* Selector de clases */}
          {clasesParaIngreso.length > 0 && (
            <div style={{ marginBottom:18 }}>
              <label style={{ ...sx.label, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>
                Clases que cubre este pago
              </label>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {clasesParaIngreso.map(a => {
                  const sel     = clasesSelec.includes(a.id);
                  const cobrado = tieneCobro(a);
                  return (
                    <button key={a.id} type="button"
                      onClick={() => !cobrado && toggleClaseSelec(a.id)}
                      style={{
                        padding:'10px 14px', borderRadius:11, textAlign:'left',
                        cursor: cobrado ? 'default' : 'pointer', opacity: cobrado ? 0.55 : 1,
                        border:`1.5px solid ${sel ? NA.dark : cobrado ? '#D1FAE5' : NA.border}`,
                        background: sel ? NA.light : cobrado ? '#F0FDF4' : '#fff',
                      }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <span style={{ fontWeight:600, fontSize:13, color:'rgba(255,255,255,.9)' }}>{a.alumno}</span>
                          <span style={{ fontSize:11, color:'rgba(255,255,255,.5)', marginLeft:8 }}>
                            {a.nombreInstructor}{a.tipoAula && ` · ${a.tipoAula}`}{a.horas && ` · ${a.horas}h`}
                            {a.hora && ` · ${String(a.hora).substring(0,5)}`}
                          </span>
                          {cobrado && <span style={{ display:'block', fontSize:10, color:'#9ca3af' }}>Ya tiene cobro registrado</span>}
                        </div>
                        <div style={{ width:20, height:20, borderRadius:'50%', border:`2px solid ${sel ? NA.dark : NA.border}`,
                          background: sel ? NA.dark : '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {sel     && <i className="ti ti-check" style={{ fontSize:11, color:'#fff' }}/>}
                          {cobrado && <i className="ti ti-lock"  style={{ fontSize:10, color:'#9ca3af' }}/>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {clasesSelec.length > 0 && (
                <p style={{ margin:'8px 0 0', fontSize:11, color:NA.dark, fontWeight:500 }}>
                  ✓ {clasesSelec.length} clase{clasesSelec.length>1?'s':''} — se marcarán como cobradas al guardar
                </p>
              )}
            </div>
          )}

          {/* Monto */}
          <div style={{ background:NA.darker, borderRadius:14, padding:16, marginBottom:14 }}>
            <p style={{ margin:'0 0 12px', fontSize:10, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:600 }}>Monto cobrado</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={{ fontSize:11, color:'rgba(255,255,255,.6)', display:'block', marginBottom:4 }}>Total</label>
                <input type="number" step="0.01" placeholder="0.00"
                  value={ingresoForm.total}
                  onChange={e => setIngresoForm(p => ({...p, total:e.target.value}))}
                  style={{ width:'100%', padding:'12px 13px', borderRadius:10, border:'0.5px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.1)', color:'#fff', fontSize:20, fontWeight:700, boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'rgba(255,255,255,.6)', display:'block', marginBottom:4 }}>Canal</label>
                <select value={ingresoForm.moneda}
                  onChange={e => setIngresoForm(p => ({...p, moneda:e.target.value}))}
                  style={{ width:'100%', padding:'12px 10px', borderRadius:10, border:'0.5px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.1)', color:'#fff', fontSize:13, boxSizing:'border-box' }}>
                  {MONEDAS.map(m => <option key={m.v} value={m.v} style={{ background:'#1a1a1a' }}>{m.l}</option>)}
                </select>
              </div>
            </div>
            {descuento > 0 && (
              <p style={{ margin:'8px 0 0', fontSize:11, color:'#FCA5A5' }}>
                -5% tarjeta: -{descuento.toFixed(2)} → Total final: <strong>{totalFinal.toFixed(2)}</strong>
              </p>
            )}
          </div>

          {/* Forma de pago */}
          <div style={{ marginBottom:14 }}>
            <label style={sx.label}>Forma de pago</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:6 }}>
              {FORMAS_PAGO.map(f => (
                <button key={f} type="button"
                  onClick={() => setIngresoForm(p => ({...p, formaPago:f}))}
                  style={{
                    padding:'9px', borderRadius:10, fontSize:12, fontWeight:600, cursor:'pointer',
                    border:`1.5px solid ${ingresoForm.formaPago===f ? NA.dark : NA.border}`,
                    background: ingresoForm.formaPago===f ? NA.dark : '#fff',
                    color:      ingresoForm.formaPago===f ? '#fff'  : NA.text,
                  }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Instructor + Asignado */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={sx.label}>Instructor</label>
              <select value={ingresoForm.instructor}
                onChange={e => setIngresoForm(p => ({...p, instructor:e.target.value}))}
                style={{ width:'100%', padding:'10px', borderRadius:10, border:`0.5px solid rgba(255,255,255,.1)`, fontSize:13, color:'rgba(255,255,255,.9)', background:'rgba(255,255,255,.07)', boxSizing:'border-box' }}>
                <option value="">Sin especificar</option>
                {instructores.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label style={sx.label}>Asignado a</label>
              <select value={ingresoForm.asignadoA}
                onChange={e => setIngresoForm(p => ({...p, asignadoA:e.target.value}))}
                style={{ width:'100%', padding:'10px', borderRadius:10, border:`0.5px solid rgba(255,255,255,.1)`, fontSize:13, color:'rgba(255,255,255,.9)', background:'rgba(255,255,255,.07)', boxSizing:'border-box' }}>
                <option value="IGNA">IGNA</option>
                <option value="JOSE">JOSE</option>
                <option value="AMBOS">AMBOS</option>
                <option value="ALE">ALE</option>
                <option value="NINGUNO">Sin asignar</option>
              </select>
            </div>
          </div>

          {/* Actividad + Detalles */}
          <div style={{ marginBottom:12 }}>
            <label style={sx.label}>Actividad</label>
            <input type="text" value={ingresoForm.actividad}
              onChange={e => setIngresoForm(p => ({...p, actividad:e.target.value}))}
              style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`0.5px solid rgba(255,255,255,.1)`, fontSize:13, color:'rgba(255,255,255,.9)', background:'rgba(255,255,255,.07)', boxSizing:'border-box' }}/>
          </div>
          <div>
            <label style={sx.label}>Detalles / Alumnos</label>
            <textarea rows={2} value={ingresoForm.detalles}
              onChange={e => setIngresoForm(p => ({...p, detalles:e.target.value}))}
              style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`0.5px solid rgba(255,255,255,.1)`, fontSize:13, color:'rgba(255,255,255,.9)', background:'rgba(255,255,255,.07)', boxSizing:'border-box', resize:'vertical', fontFamily:'inherit' }}/>
          </div>
        </>}

        footer={
          <div style={{ display:'flex', gap:10 }}>
            <Btn label="Cancelar" bg='#fff' color={NA.text2} onClick={onClose}/>
            <Btn
              label={enviando ? 'Guardando...' : `Guardar cobro${clasesSelec.length>0 ? ` (${clasesSelec.length})` : ''}`}
              disabled={enviando || !ingresoForm.total || parseFloat(ingresoForm.total||0) <= 0}
              icon="ti-check" onClick={guardarIngreso}/>
          </div>
        }
      />
    </Overlay>
  );
};


// ══════════════════════════════════════════════════════════════════════════════
// MODAL: AGENDAR CLASE
// ══════════════════════════════════════════════════════════════════════════════
export const ModalAgendar = ({
  fecha, horaInicio, prefill, instructores,
  guardando, onSubmit, onClose,
}) => {
  const TIPOS = [
    { v:'APK',   l:'Kite Privada',          emoji:'🪁', tarifa:400  },
    { v:'ASPK',  l:'Kite Semiprivada',       emoji:'🪁', tarifa:530  },
    { v:'APWF',  l:'Wingfoil Privada',       emoji:'🦅', tarifa:420  },
    { v:'ASPWF', l:'Wingfoil Semiprivada',   emoji:'🦅', tarifa:550  },
    { v:'APWS',  l:'Windsurf Privada',       emoji:'🌊', tarifa:370  },
    { v:'ASPWS', l:'Windsurf Semiprivada',   emoji:'🌊', tarifa:500  },
    { v:'RENTAL',l:'Rental',                 emoji:'🏄', tarifa:360  },
    { v:'OTRO',  l:'Otro',                   emoji:'✏️', tarifa:null },
  ];
  const COLOR_T = {
    APK:'#16A34A', ASPK:'#059669', APWF:'#2563EB', ASPWF:'#7C3AED',
    APWS:'#CA8A04', ASPWS:'#D97706', RENTAL:'#6B7280', OTRO:'#DC2626',
  };
  const today      = new Date().toISOString().split('T')[0];
  const esDuplicado = !!prefill;

  const [form, setForm] = React.useState({
    alumno:          prefill?.alumno          || '',
    instructorId:    prefill?.instructorId    || '',
    tipoAula:        prefill?.tipoAula        || '',
    fecha:           fecha || today,
    hora:            horaInicio || '09:00',
    horaSalida:      '',
    horas:           prefill?.horas           || 1,
    tarifa:          prefill?.tarifa          || '',
    horasPagadas:    0,
    lugar:           prefill?.lugar           || '',
    hotelDerivacion: prefill?.hotelDerivacion || '',
    notas:           '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const elegirTipo = (v) => {
    const t = TIPOS.find(x => x.v === v);
    setForm(p => ({ ...p, tipoAula: v, tarifa: t?.tarifa ? String(t.tarifa) : p.tarifa }));
  };

  const calcularHoras = (entrada, salida) => {
    if (!entrada || !salida) return;
    const [h1,m1] = entrada.split(':').map(Number);
    const [h2,m2] = salida.split(':').map(Number);
    const diff = (h2*60+m2 - h1*60-m1) / 60;
    if (diff > 0) set('horas', Math.round(diff * 100)/100);
  };

  const totalEst = form.tarifa && form.horas ? (Number(form.tarifa) * Number(form.horas)).toFixed(0) : null;

  return (
    <Overlay onClick={onClose}>
      <Modal
        onClick={e => e.stopPropagation()}
        maxWidth={480}

        header={
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:'rgba(255,255,255,.9)' }}>
                  {esDuplicado ? 'Duplicar clase' : 'Agendar clase'}
                </h2>
                {esDuplicado && (
                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'#EDE9FE', color:'#6D28D9' }}>COPIA</span>
                )}
              </div>
              <p style={{ margin:'3px 0 0', fontSize:12, color:'rgba(255,255,255,.5)' }}>{fmt(form.fecha)}</p>
            </div>
            <button onClick={onClose} style={{ ...closeBtnSx }}>
              <i className="ti ti-x" style={{ fontSize:15 }}/>
            </button>
          </div>
        }

        body={<>
          {/* Tipo */}
          <p style={{ ...sx.label, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Tipo de clase</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7, marginBottom:16 }}>
            {TIPOS.map(t => {
              const sel = form.tipoAula === t.v;
              const col = COLOR_T[t.v] || NA.dark;
              return (
                <button key={t.v} type="button" onClick={() => elegirTipo(t.v)}
                  style={{ padding:'9px 10px', borderRadius:10, textAlign:'left', cursor:'pointer',
                    border:`1.5px solid ${sel ? col : NA.border}`,
                    background: sel ? `${col}15` : '#fff',
                    display:'flex', alignItems:'center', gap:7 }}>
                  <span style={{ fontSize:16 }}>{t.emoji}</span>
                  <div>
                    <p style={{ margin:0, fontSize:11, fontWeight:700, color: sel ? col : NA.text }}>{t.l}</p>
                    {t.tarifa && <p style={{ margin:0, fontSize:10, color: sel ? col : NA.text2 }}>R$ {t.tarifa}/h</p>}
                  </div>
                  {sel && <i className="ti ti-check" style={{ fontSize:13, color:col, marginLeft:'auto' }}/>}
                </button>
              );
            })}
          </div>

          {/* Alumno e instructor */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
            <div>
              <label style={sx.label}>Alumno *</label>
              <input type="text" placeholder="Nombre..." value={form.alumno} onChange={e => set('alumno', e.target.value)} required
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`0.5px solid rgba(255,255,255,.1)`, fontSize:14, color:'rgba(255,255,255,.9)', boxSizing:'border-box' }}/>
            </div>
            <div>
              <label style={sx.label}>Instructor <span style={{ fontWeight:400, color:'#9ca3af' }}>(opcional)</span></label>
              <select value={form.instructorId} onChange={e => set('instructorId', e.target.value)}
                style={{ width:'100%', padding:'10px', borderRadius:10, border:`0.5px solid rgba(255,255,255,.1)`, fontSize:13, color:'rgba(255,255,255,.9)', background:'rgba(255,255,255,.07)', boxSizing:'border-box' }}>
                <option value="">Sin asignar</option>
                {instructores.map(i => <option key={i.id} value={i.id}>{i.nombre} {i.apellido}</option>)}
              </select>
            </div>
          </div>

          {/* Fecha y horario */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={sx.label}>Fecha</label>
              <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`0.5px solid rgba(255,255,255,.1)`, fontSize:14, color:'rgba(255,255,255,.9)', boxSizing:'border-box' }}/>
            </div>
            <div>
              <label style={sx.label}>Entrada</label>
              <input type="time" value={form.hora}
                onChange={e => { set('hora', e.target.value); calcularHoras(e.target.value, form.horaSalida); }}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`0.5px solid rgba(255,255,255,.1)`, fontSize:14, color:'rgba(255,255,255,.9)', boxSizing:'border-box' }}/>
            </div>
            <div>
              <label style={sx.label}>Salida</label>
              <input type="time" value={form.horaSalida}
                onChange={e => { set('horaSalida', e.target.value); calcularHoras(form.hora, e.target.value); }}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`0.5px solid rgba(255,255,255,.1)`, fontSize:14, color:'rgba(255,255,255,.9)', boxSizing:'border-box' }}/>
            </div>
            <div>
              <label style={sx.label}>Horas</label>
              <input type="number" step="0.5" value={form.horas} onChange={e => set('horas', e.target.value)}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`0.5px solid rgba(255,255,255,.1)`, fontSize:14, color:'rgba(255,255,255,.9)', boxSizing:'border-box' }}/>
            </div>
          </div>

          {/* Lugar */}
          <div style={{ marginBottom:12 }}>
            <label style={sx.label}>Lugar / Hotel</label>
            <input type="text" placeholder="Escola, Caburé..." value={form.lugar} onChange={e => set('lugar', e.target.value)}
              style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`0.5px solid rgba(255,255,255,.1)`, fontSize:13, color:'rgba(255,255,255,.9)', boxSizing:'border-box' }}/>
          </div>

          {/* Condiciones económicas */}
          <div style={{ background:NA.darker, borderRadius:12, padding:14, marginBottom:12 }}>
            <p style={{ margin:'0 0 10px', fontSize:10, color:'rgba(255,255,255,.5)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em' }}>Condiciones</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              <div>
                <label style={{ fontSize:11, color:'rgba(255,255,255,.6)', display:'block', marginBottom:4 }}>Tarifa R$/h</label>
                <input type="number" value={form.tarifa} onChange={e => set('tarifa', e.target.value)}
                  style={{ width:'100%', padding:'10px', borderRadius:10, border:'0.5px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.1)', color:'#fff', fontSize:14, boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'rgba(255,255,255,.6)', display:'block', marginBottom:4 }}>Seña</label>
                <input type="number" value={form.horasPagadas} onChange={e => set('horasPagadas', e.target.value)}
                  style={{ width:'100%', padding:'10px', borderRadius:10, border:'0.5px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.1)', color:'#fff', fontSize:14, boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'rgba(255,255,255,.6)', display:'block', marginBottom:4 }}>Total est.</label>
                <div style={{ padding:'10px 12px', borderRadius:10, background:NA.primary, color:'rgba(255,255,255,.9)', fontSize:16, fontWeight:700, textAlign:'right' }}>
                  {totalEst || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label style={sx.label}>Notas</label>
            <textarea rows={2} value={form.notas} onChange={e => set('notas', e.target.value)}
              placeholder="Nivel del alumno, observaciones..."
              style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`0.5px solid rgba(255,255,255,.1)`, fontSize:13, color:'rgba(255,255,255,.9)', background:'rgba(255,255,255,.07)', boxSizing:'border-box', resize:'vertical', fontFamily:'inherit' }}/>
          </div>
        </>}

        footer={
          <div style={{ display:'flex', gap:10 }}>
            <Btn label="Cancelar" bg='#fff' color={NA.text2} onClick={onClose}/>
            <Btn label={guardando ? 'Agendando...' : 'Agendar clase'}
              disabled={guardando || !form.alumno}
              icon="ti-calendar-plus" onClick={() => onSubmit(form)}/>
          </div>
        }
      />
    </Overlay>
  );
};