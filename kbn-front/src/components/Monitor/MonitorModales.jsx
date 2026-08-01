import React from 'react';
import { NA, TIPOS_AULA, MONEDAS, FORMAS_PAGO, fmt, labelMon, normName, Tag, Btn, Inp } from './MonitorShared';

// ══════════════════════════════════════════════════════════════════════════════
// MODAL: EDITAR CLASE
// Permite cambiar tipoAula, horaSalida, horas, lugar, tarifa
// y vincular/desvincular el cobro de la clase con un ingreso específico.
// ══════════════════════════════════════════════════════════════════════════════
export const ModalEditarClase = ({
  editClase, editForm, setEditForm,
  ingresosDisponiblesEdit, agenda,
  guardandoEdit, guardarEditClase, onClose,
}) => {
  if (!editClase) return null;

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
          <div>
            <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:NA.text }}>Editar clase</h2>
            <p style={{ margin:'3px 0 0', fontSize:12, color:NA.text2 }}>
              <strong>{editClase.alumno}</strong> · {fmt(editClase.fecha?.toString())} · {editClase.nombreInstructor}
            </p>
          </div>
          <button onClick={onClose} style={{ ...closeBtnSx }}>
            <i className="ti ti-x" style={{ fontSize:15 }}/>
          </button>
        </div>

        {/* ── Tipo de aula ── */}
        <label style={labelSx}>Tipo de aula</label>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:14 }}>
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

        {/* ── Horas ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:4 }}>
          <Inp label="Hora entrada" type="time"
            value={editClase.hora?.substring(0,5) || ''}
            style={{ background:'#f9fafb', color:'#9ca3af' }} readOnly/>
          <Inp label="Hora salida" type="time"
            value={editForm.horaSalida}
            onChange={e => setEditForm(p => ({...p, horaSalida: e.target.value}))}/>
          <Inp label="Duración (h)" type="number" step="0.5"
            value={editForm.horas}
            onChange={e => setEditForm(p => ({...p, horas: e.target.value}))}/>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:4 }}>
          <Inp label="Lugar" type="text"
            value={editForm.lugar}
            onChange={e => setEditForm(p => ({...p, lugar: e.target.value}))}/>
          <Inp label="Tarifa (R$/h)" type="number"
            value={editForm.tarifa}
            onChange={e => setEditForm(p => ({...p, tarifa: e.target.value}))}/>
        </div>

        {/* ── Selector de cobro ── */}
        <div style={{ marginTop:18, marginBottom:4 }}>
          <label style={{ ...labelSx, fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em' }}>
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

          {/* Lista de ingresos */}
          {ingresosDisponiblesEdit.length === 0 ? (
            <p style={{ fontSize:12, color:'#9ca3af', padding:'4px 0 8px' }}>No hay ingresos de este instructor aún.</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:260, overflowY:'auto' }}>
              {ingresosDisponiblesEdit.map(i => {
                const sel = String(editForm.ingresoIdSelec) === String(i.id);
                const clasesVinc = agenda.filter(a => a.ingresoId === i.id && a.id !== editClase?.id);
                const esMismoDia = i.fecha === editClase?.fecha?.toString();
                return (
                  <button key={i.id} type="button"
                    onClick={() => setEditForm(p => ({...p, ingresoIdSelec: String(i.id), cobrada:true}))}
                    style={{
                      padding:'11px 14px', borderRadius:10, textAlign:'left', cursor:'pointer',
                      border:`1.5px solid ${sel ? NA.dark : NA.border}`,
                      background: sel ? NA.light : '#fff',
                    }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginBottom:3 }}>
                          <span style={{ fontSize:13, fontWeight:700, color: sel ? NA.darker : NA.text }}>
                            #{i.id} · {parseFloat(i.total||0).toFixed(2)} {labelMon(i.moneda)}
                          </span>
                          {esMismoDia && (
                            <Tag label="mismo día" color="#065F46" bg="#D1FAE5" small/>
                          )}
                          {clasesVinc.length > 0 && (
                            <Tag label={`${clasesVinc.length} clase${clasesVinc.length>1?'s':''} más`} color="#4338CA" bg="#EEF2FF" small/>
                          )}
                        </div>
                        <span style={{ fontSize:11, color:NA.text2 }}>
                          {i.fecha} · {i.detalles?.split('|')[0].trim() || i.actividad || '—'}
                        </span>
                        {clasesVinc.length > 0 && (
                          <p style={{ margin:'3px 0 0', fontSize:10, color:'#6366F1' }}>
                            {clasesVinc.map(c => c.alumno).join(', ')}
                          </p>
                        )}
                      </div>
                      {sel && <i className="ti ti-check" style={{ color:NA.dark, fontSize:16, flexShrink:0, marginTop:2 }}/>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Botones */}
        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          <Btn label="Cancelar" bg='#fff' color={NA.text2} onClick={onClose}/>
          <Btn
            label={guardandoEdit ? 'Guardando...' : 'Guardar cambios'}
            disabled={guardandoEdit} icon="ti-check"
            onClick={guardarEditClase}/>
        </div>
      </Modal>
    </Overlay>
  );
};


// ══════════════════════════════════════════════════════════════════════════════
// MODAL: NUEVO INGRESO con selector de clases
// Permite registrar un cobro y vincularlo con una o varias clases del período,
// cubriendo casos como "Igo pagó por 3 clases de sus hijos juntas".
// ══════════════════════════════════════════════════════════════════════════════
export const ModalNuevoIngreso = ({
  ingresoFecha, ingresoForm, setIngresoForm,
  clasesParaIngreso, clasesSelec, toggleClaseSelec,
  agenda, tieneCobro, instructores,
  enviando, guardarIngreso, onClose,
}) => {
  if (!ingresoFecha) return null;

  const descuento = ingresoForm.formaPago === 'Tarjeta Crédito'
    ? (parseFloat(ingresoForm.total||0) * 0.05)
    : 0;
  const totalFinal = parseFloat(ingresoForm.total||0) - descuento;

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={e => e.stopPropagation()} maxWidth={500}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
          <div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:NA.text }}>Registrar cobro</h2>
            <p style={{ margin:'3px 0 0', fontSize:12, color:NA.text2 }}>{ingresoFecha}</p>
          </div>
          <button onClick={onClose} style={{ ...closeBtnSx }}>
            <i className="ti ti-x" style={{ fontSize:15 }}/>
          </button>
        </div>

        {/* ── Selector de clases ── */}
        {clasesParaIngreso.length > 0 && (
          <div style={{ marginBottom:18 }}>
            <label style={{ ...labelSx, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', fontSize:11 }}>
              Clases que cubre este pago
            </label>
            <p style={{ margin:'0 0 8px', fontSize:11, color:NA.text2 }}>
              Un pago puede cubrir varias clases (ej: Igo paga por sus hijos de una vez).
            </p>
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
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                      <div>
                        <span style={{ fontWeight:600, fontSize:13, color:NA.text }}>{a.alumno}</span>
                        <span style={{ fontSize:11, color:NA.text2, marginLeft:8 }}>
                          {a.nombreInstructor}
                          {a.tipoAula && ` · ${a.tipoAula}`}
                          {a.horas    && ` · ${a.horas}h`}
                          {a.hora     && ` · ${String(a.hora).substring(0,5)}`}
                        </span>
                        {cobrado && <span style={{ display:'block', fontSize:10, color:'#9ca3af' }}>Ya tiene cobro registrado</span>}
                      </div>
                      <div style={{
                        width:20, height:20, borderRadius:'50%', flexShrink:0,
                        border:`2px solid ${sel ? NA.dark : NA.border}`,
                        background: sel ? NA.dark : '#fff',
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
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

        {/* ── Monto ── */}
        <div style={{ background:NA.darker, borderRadius:14, padding:16, marginBottom:14 }}>
          <p style={{ margin:'0 0 12px', fontSize:10, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:600 }}>
            Monto cobrado
          </p>
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

        {/* ── Forma de pago ── */}
        <div style={{ marginBottom:14 }}>
          <label style={labelSx}>Forma de pago</label>
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

        {/* ── Instructor + Asignado ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div>
            <label style={labelSx}>Instructor</label>
            <select value={ingresoForm.instructor}
              onChange={e => setIngresoForm(p => ({...p, instructor:e.target.value}))}
              style={{ width:'100%', padding:'10px 10px', borderRadius:10, border:`0.5px solid ${NA.border}`, fontSize:13, color:NA.text, background:'#fff', boxSizing:'border-box' }}>
              <option value="">Sin especificar</option>
              {instructores.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label style={labelSx}>Asignado a</label>
            <select value={ingresoForm.asignadoA}
              onChange={e => setIngresoForm(p => ({...p, asignadoA:e.target.value}))}
              style={{ width:'100%', padding:'10px 10px', borderRadius:10, border:`0.5px solid ${NA.border}`, fontSize:13, color:NA.text, background:'#fff', boxSizing:'border-box' }}>
              <option value="IGNA">IGNA</option>
              <option value="JOSE">JOSE</option>
              <option value="AMBOS">AMBOS</option>
              <option value="ALE">ALE (ausentes)</option>
              <option value="NINGUNO">Sin asignar</option>
            </select>
          </div>
        </div>

        {/* ── Actividad + Detalles ── */}
        <Inp label="Actividad" type="text"
          value={ingresoForm.actividad}
          onChange={e => setIngresoForm(p => ({...p, actividad:e.target.value}))}/>
        <div style={{ marginBottom:18 }}>
          <label style={labelSx}>Detalles / Alumnos</label>
          <textarea rows={2} value={ingresoForm.detalles}
            onChange={e => setIngresoForm(p => ({...p, detalles:e.target.value}))}
            style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`0.5px solid ${NA.border}`, fontSize:13, color:NA.text, background:'#fff', boxSizing:'border-box', resize:'vertical', fontFamily:'inherit' }}/>
        </div>

        {/* Botones */}
        <div style={{ display:'flex', gap:10 }}>
          <Btn label="Cancelar" bg='#fff' color={NA.text2} onClick={onClose}/>
          <Btn
            label={enviando
              ? 'Guardando...'
              : `Guardar cobro${clasesSelec.length>0 ? ` (${clasesSelec.length} clase${clasesSelec.length>1?'s':''})` : ''}`}
            disabled={enviando || !ingresoForm.total || parseFloat(ingresoForm.total||0) <= 0}
            icon="ti-check"
            onClick={guardarIngreso}/>
        </div>
      </Modal>
    </Overlay>
  );
};


// ── Helpers de layout ─────────────────────────────────────────────────────────
const Overlay = ({ onClick, children }) => (
  <div onClick={onClick}
    style={{ position:'fixed', inset:0, background:'rgba(8,80,65,.45)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:16 }}>
    {children}
  </div>
);

const Modal = ({ onClick, children, maxWidth = 440 }) => (
  <div onClick={onClick}
    style={{ background:'#fff', borderRadius:20, padding:24, width:'100%', maxWidth, maxHeight:'92vh', overflowY:'auto', boxSizing:'border-box' }}>
    {children}
  </div>
);

const labelSx = { fontSize:11, color:NA.text2, display:'block', marginBottom:5, fontWeight:500 };
const closeBtnSx = { width:28, height:28, borderRadius:8, border:'none', background:'#f3f4f6', color:'#6b7280', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 };