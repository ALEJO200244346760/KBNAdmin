import React, { useState, useEffect } from 'react';
import api from '../axiosConfig';

/* ══════════════════════════════════════════════════════════════════════════
   IMPORTAR MENSAJE DEL GRUPO

   Pegás el resumen que mandan por WhatsApp y la app arma las tarjetas.
   Nada se guarda hasta que confirmás cada una — todo es editable antes.

   Reconoce:
     · clases      "9hs a 10hs APWF 1HS Ceci-Igna"
     · pagos       "Cecí 3,5hs apwf 1.225 R$ crédito stone José"
   ══════════════════════════════════════════════════════════════════════════ */

const NA = {
  dark: '#0F3D3E', darker: '#0A2B2C', mid: '#E1F5EE', light: '#F0FAF7',
  border: '#D4E9E2', text: '#1A3C34', text2: '#6B8F85', accent: '#2ECFC4',
};

// ── Vocabulario ───────────────────────────────────────────────────────────
const TIPOS = {
  APK:   { code: 'APK',   nombre: 'Aula Privada Kite',         actividad: 'Clase de Kite' },
  PAK:   { code: 'APK',   nombre: 'Aula Privada Kite',         actividad: 'Clase de Kite' },
  ASPK:  { code: 'ASPK',  nombre: 'Aula Semiprivada Kite',     actividad: 'Clase de Kite' },
  APWF:  { code: 'APWF',  nombre: 'Aula Privada Wingfoil',     actividad: 'Clase de Wing' },
  ASPWF: { code: 'ASPWF', nombre: 'Aula Semiprivada Wingfoil', actividad: 'Clase de Wing' },
  APWS:  { code: 'APWS',  nombre: 'Aula Privada Windsurf',     actividad: 'Clase de Windsurf' },
  APWD:  { code: 'APWS',  nombre: 'Aula Privada Windsurf',     actividad: 'Clase de Windsurf' },
  ASPWS: { code: 'ASPWS', nombre: 'Aula Semiprivada Windsurf', actividad: 'Clase de Windsurf' },
  RENTAL:{ code: 'RENTAL',nombre: 'Rental',                    actividad: 'Rental' },
};

const CANALES = [
  [/cr[eé]dito\s+stone\s+jos[eé]/i, 'R$_STONE_JOSE', 'Tarjeta Crédito'],
  [/cr[eé]dito\s+stone\s+igna/i,    'R$_STONE_IGNA', 'Tarjeta Crédito'],
  [/d[eé]bito\s+stone\s+jos[eé]/i,  'R$_STONE_JOSE', 'Tarjeta Débito'],
  [/d[eé]bito\s+stone\s+igna/i,     'R$_STONE_IGNA', 'Tarjeta Débito'],
  [/stone\s+jos[eé]/i,              'R$_STONE_JOSE', 'Transferencia'],
  [/stone\s+igna/i,                 'R$_STONE_IGNA', 'Transferencia'],
  [/wi[sz]e\s+igna/i,               'EUR_WIZE_IGNA', 'Transferencia'],
  [/efectivo|dinheiro|cash/i,       'R$_EFECTIVO',   'Efectivo'],
  [/\bpix\b/i,                      'R$_STONE_IGNA', 'Transferencia'],
  [/d[oó]lar|usd/i,                 'USD_EFECTIVO',  'Efectivo'],
];

const RE_TIPO   = new RegExp('\\b(' + Object.keys(TIPOS).join('|') + ')\\b', 'i');
const RE_HORAS  = /(\d+[.,]?\d*)\s*hs?\b/gi;
const RE_RANGO  = /(\d{1,2})\s*hs?\s*a\s*(\d{1,2})\s*hs?/i;
const RE_INICIO = /(?:^|[\s\-])(\d{1,2})\s*hs\b/i;
const RE_FECHA  = /(\d{1,2})[/.](\d{1,2})/;

const normNum = (s) => {
  if (!s) return null;
  let t = String(s).trim();
  if (t.includes('.') && t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (t.includes(',')) t = t.replace(',', '.');
  else if ((t.match(/\./g) || []).length === 1 && t.split('.')[1].length === 3) t = t.replace('.', '');
  const v = parseFloat(t);
  return isNaN(v) ? null : v;
};

const limpiarNombre = (s) =>
  (s || '')
    .replace(/^[\s\-–•*]+|[\s\-–•*]+$/g, '')
    .replace(/[\-–]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^(?:s|hs)\s+|\s+(?:s|hs)$/gi, '')
    .trim()
    .replace(/^[\s\-–:*]+|[\s\-–:*]+$/g, '');

function detectarInstructor(texto, instructores) {
  for (const ins of instructores) {
    const primer = (ins.nombre || '').split(' ')[0];
    if (!primer) continue;
    const alias = [primer, ins.alias].filter(Boolean);
    for (const a of alias) {
      if (new RegExp('\\b' + a + '\\b', 'i').test(texto)) return { ins, match: a };
    }
  }
  return { ins: null, match: null };
}

function parseClase(linea, fecha, instructores) {
  const m = RE_TIPO.exec(linea);
  if (!m) return null;
  const t = TIPOS[m[1].toUpperCase()];

  let hora = null;
  const r = RE_RANGO.exec(linea);
  if (r) hora = String(r[1]).padStart(2, '0') + ':00';
  else {
    const i = RE_INICIO.exec(linea);
    if (i) hora = String(i[1]).padStart(2, '0') + ':00';
  }

  let horas = null;
  RE_HORAS.lastIndex = 0;
  let hm;
  while ((hm = RE_HORAS.exec(linea)) !== null) {
    const v = normNum(hm[1]);
    if (v === null) continue;
    if (r && (v === parseFloat(r[1]) || v === parseFloat(r[2]))) continue;
    if (v <= 8) { horas = v; break; }
  }
  if (horas === null && r) horas = parseFloat(r[2]) - parseFloat(r[1]);

  const { ins, match } = detectarInstructor(linea, instructores);

  let alumno = linea.replace(RE_TIPO, ' ').replace(RE_RANGO, ' ').replace(RE_HORAS, ' ');
  if (match) alumno = alumno.replace(new RegExp('\\b' + match + '\\b', 'ig'), ' ');
  alumno = limpiarNombre(alumno);

  return {
    kind: 'CLASE', code: t.code, nombre: t.nombre, actividad: t.actividad,
    fecha, hora, horas, alumno,
    instructorId: ins ? ins.id : null, instructorNombre: ins ? ins.nombre : null,
    linea: linea.trim(),
  };
}

function parsePago(linea, fecha) {
  let moneda = null, formaPago = null;
  for (const [re, canal, forma] of CANALES) {
    if (re.test(linea)) { moneda = canal; formaPago = forma; break; }
  }
  const m = RE_TIPO.exec(linea);
  const t = m ? TIPOS[m[1].toUpperCase()] : null;

  const nums = [];
  const reNum = /(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)/g;
  let mm;
  while ((mm = reNum.exec(linea)) !== null) {
    const v = normNum(mm[1]);
    if (v === null) continue;
    const resto = linea.slice(mm.index + mm[0].length, mm.index + mm[0].length + 3).toLowerCase();
    if (resto.trim().startsWith('h')) continue;
    nums.push(v);
  }
  const monto = nums.length ? Math.max(...nums) : null;

  let horas = null;
  RE_HORAS.lastIndex = 0;
  let hm2;
  while ((hm2 = RE_HORAS.exec(linea)) !== null) {
    const v = normNum(hm2[1]);
    if (v !== null && v <= 8) { horas = v; break; }
  }

  let alumno = linea.replace(RE_TIPO, ' ').replace(RE_HORAS, ' ').replace(reNum, ' ');
  for (const [re] of CANALES) alumno = alumno.replace(re, ' ');
  alumno = alumno.replace(/R\$|\breais?\b/gi, ' ');
  alumno = limpiarNombre(alumno);

  return {
    kind: 'INGRESO', code: t ? t.code : null, nombre: t ? t.nombre : 'Ingreso',
    actividad: t ? t.actividad : 'Ingreso',
    fecha, horas, monto, moneda, formaPago, alumno, linea: linea.trim(),
  };
}

function parseMensaje(texto, anio, instructores) {
  const out = [];
  let fecha = null, modoPago = false;
  for (const raw of texto.split('\n')) {
    const linea = raw.trim();
    if (!linea) continue;
    const low = linea.toLowerCase();
    const f = RE_FECHA.exec(linea);
    const tieneTipo = RE_TIPO.test(linea);

    if (f && linea.length < 40 && !tieneTipo) {
      fecha = `${anio}-${String(+f[2]).padStart(2, '0')}-${String(+f[1]).padStart(2, '0')}`;
      if (/pagamento|pago/.test(low)) modoPago = true;
      continue;
    }
    if (/\bpagamentos?\b|\bpagos?\b/.test(low) && linea.length < 25) { modoPago = true; continue; }
    if (/\bresumo\b|\baulas?\b|\bamanha\b|\bamanhã\b/.test(low) && !tieneTipo) {
      modoPago = false;
      if (f) fecha = `${anio}-${String(+f[2]).padStart(2, '0')}-${String(+f[1]).padStart(2, '0')}`;
      continue;
    }
    const item = modoPago ? parsePago(linea, fecha) : parseClase(linea, fecha, instructores);
    if (item) out.push({ ...item, _id: Math.random().toString(36).slice(2), estado: 'pendiente' });
  }
  return out;
}

// ══════════════════════════════════════════════════════════════════════════

export default function ImportarMensaje({ onClose, onImportado }) {
  const [texto, setTexto] = useState('');
  const [items, setItems] = useState([]);
  const [instructores, setInstructores] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const anio = new Date().getFullYear();

  useEffect(() => {
    api.get('/api/admin/usuarios')
      .then((r) => setInstructores((r.data || []).map((u) => ({
        id: u.id, nombre: `${u.nombre} ${u.apellido}`.trim(), alias: u.nombre,
      }))))
      .catch(() => setInstructores([]));
  }, []);

  const analizar = () => {
    const parsed = parseMensaje(texto, anio, instructores);
    if (!parsed.length) { alert('No se reconoció ninguna clase ni pago en el mensaje.'); return; }
    setItems(parsed);
  };

  const cambiar = (id, campo, valor) =>
    setItems((prev) => prev.map((it) => (it._id === id ? { ...it, [campo]: valor } : it)));

  const descartar = (id) => setItems((prev) => prev.filter((it) => it._id !== id));

  const confirmarUno = async (it) => {
    setGuardando(true);
    try {
      if (it.kind === 'CLASE') {
        await api.post('/api/agenda/crear', {
          alumno: it.alumno || 'Sin nombre',
          fecha: it.fecha,
          hora: it.hora ? `${it.hora}:00` : null,
          horas: it.horas,
          tipoAula: it.code,
          instructorId: it.instructorId || null,
          tarifa: 120,
          estado: 'PENDIENTE',
        });
      } else {
        await api.post('/api/clases/guardar', {
          tipoTransaccion: 'INGRESO',
          fecha: it.fecha,
          actividad: it.actividad,
          total: String(it.monto || 0),
          moneda: it.moneda || 'BRL',
          formaPago: it.formaPago || '',
          detalles: it.alumno || '',
          asignadoA: it.asignadoA || null,
          comision: '0',
        });
      }
      setItems((prev) => prev.map((x) => (x._id === it._id ? { ...x, estado: 'ok' } : x)));
      if (onImportado) onImportado();
    } catch (e) {
      console.error(e);
      setItems((prev) => prev.map((x) => (x._id === it._id ? { ...x, estado: 'error' } : x)));
    } finally {
      setGuardando(false);
    }
  };

  const confirmarTodos = async () => {
    for (const it of items.filter((x) => x.estado === 'pendiente')) {
      // eslint-disable-next-line no-await-in-loop
      await confirmarUno(it);
    }
  };

  const pendientes = items.filter((x) => x.estado === 'pendiente').length;
  const inp = {
    padding: '7px 9px', borderRadius: 8, border: `1px solid ${NA.border}`,
    fontSize: 13, boxSizing: 'border-box', background: '#fff', width: '100%',
  };
  const lbl = { fontSize: 10, color: NA.text2, display: 'block', marginBottom: 3 };

  return (
    <div style={{ padding: 16, maxWidth: 880, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        {onClose && (
          <button onClick={onClose} style={{ background: '#fff', border: `1px solid ${NA.border}`,
            borderRadius: 10, width: 34, height: 34, cursor: 'pointer', fontSize: 16 }}>←</button>
        )}
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: NA.text, fontWeight: 600 }}>Importar del grupo</h2>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: NA.text2 }}>
            Pegá el resumen de WhatsApp y revisá las tarjetas antes de confirmar
          </p>
        </div>
      </div>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={7}
        placeholder={'Resumo do dia 8/9\n9hs a 10hs APWF 1HS Ceci-Igna\n16hs a 18hs APK Debora Facu 2hs\n\nPagamento\nCecí 3,5hs apwf 1.225 R$ crédito stone José'}
        style={{ width: '100%', padding: 12, borderRadius: 12, border: `1px solid ${NA.border}`,
          fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <button onClick={analizar} disabled={!texto.trim()}
          style={{ background: NA.dark, color: '#fff', border: 'none', borderRadius: 10,
            padding: '10px 18px', fontSize: 13, fontWeight: 600,
            cursor: texto.trim() ? 'pointer' : 'not-allowed', opacity: texto.trim() ? 1 : .5 }}>
          Analizar mensaje
        </button>
        {items.length > 0 && (
          <>
            <button onClick={confirmarTodos} disabled={guardando || pendientes === 0}
              style={{ background: pendientes ? '#047857' : '#9CA3AF', color: '#fff', border: 'none',
                borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600,
                cursor: pendientes ? 'pointer' : 'not-allowed' }}>
              Confirmar todo ({pendientes})
            </button>
            <button onClick={() => { setItems([]); setTexto(''); }}
              style={{ background: '#fff', color: NA.text2, border: `1px solid ${NA.border}`,
                borderRadius: 10, padding: '10px 18px', fontSize: 13, cursor: 'pointer' }}>
              Limpiar
            </button>
          </>
        )}
      </div>

      {items.length > 0 && (
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((it) => {
            const esClase = it.kind === 'CLASE';
            const ok = it.estado === 'ok';
            const err = it.estado === 'error';
            return (
              <div key={it._id} style={{
                background: ok ? '#ECFDF5' : err ? '#FEF2F2' : '#fff',
                border: `1px solid ${ok ? '#A7F3D0' : err ? '#FECACA' : NA.border}`,
                borderLeft: `4px solid ${esClase ? NA.accent : '#F59E0B'}`,
                borderRadius: 12, padding: 12, opacity: ok ? .75 : 1,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 8, gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.05em',
                    color: esClase ? NA.darker : '#92400E',
                    background: esClase ? NA.mid : '#FEF3C7',
                    padding: '3px 9px', borderRadius: 99 }}>
                    {esClase ? `CLASE · ${it.code}` : 'INGRESO'}
                  </span>
                  <span style={{ fontSize: 10, color: NA.text2, flex: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {it.linea}
                  </span>
                  {ok   && <span style={{ fontSize: 11, color: '#047857', fontWeight: 600 }}>✓ guardado</span>}
                  {err  && <span style={{ fontSize: 11, color: '#B91C1C', fontWeight: 600 }}>error</span>}
                </div>

                {!ok && (
                  <>
                    <div style={{ display: 'grid',
                      gridTemplateColumns: esClase ? 'repeat(auto-fit,minmax(130px,1fr))' : 'repeat(auto-fit,minmax(140px,1fr))',
                      gap: 8, marginBottom: 10 }}>
                      <div>
                        <label style={lbl}>Fecha</label>
                        <input type="date" value={it.fecha || ''} style={inp}
                          onChange={(e) => cambiar(it._id, 'fecha', e.target.value)} />
                      </div>
                      <div>
                        <label style={lbl}>{esClase ? 'Alumno' : 'Detalle'}</label>
                        <input type="text" value={it.alumno || ''} style={inp}
                          onChange={(e) => cambiar(it._id, 'alumno', e.target.value)} />
                      </div>

                      {esClase ? (
                        <>
                          <div>
                            <label style={lbl}>Hora</label>
                            <input type="time" value={it.hora || ''} style={inp}
                              onChange={(e) => cambiar(it._id, 'hora', e.target.value)} />
                          </div>
                          <div>
                            <label style={lbl}>Horas</label>
                            <input type="number" step="0.5" value={it.horas ?? ''} style={inp}
                              onChange={(e) => cambiar(it._id, 'horas', parseFloat(e.target.value))} />
                          </div>
                          <div>
                            <label style={lbl}>Tipo</label>
                            <select value={it.code} style={inp}
                              onChange={(e) => cambiar(it._id, 'code', e.target.value)}>
                              {['APK','ASPK','APWF','ASPWF','APWS','ASPWS','RENTAL'].map((c) =>
                                <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={lbl}>Instructor</label>
                            <select value={it.instructorId || ''} style={inp}
                              onChange={(e) => cambiar(it._id, 'instructorId', e.target.value ? Number(e.target.value) : null)}>
                              <option value="">— sin asignar —</option>
                              {instructores.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                            </select>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label style={lbl}>Monto</label>
                            <input type="number" step="0.01" value={it.monto ?? ''} style={inp}
                              onChange={(e) => cambiar(it._id, 'monto', parseFloat(e.target.value))} />
                          </div>
                          <div>
                            <label style={lbl}>Canal de cobro</label>
                            <select value={it.moneda || 'BRL'} style={inp}
                              onChange={(e) => cambiar(it._id, 'moneda', e.target.value)}>
                              <option value="BRL">BRL genérico</option>
                              <option value="R$_STONE_JOSE">R$ Stone José</option>
                              <option value="R$_STONE_IGNA">R$ Stone Igna</option>
                              <option value="R$_EFECTIVO">R$ Efectivo</option>
                              <option value="EUR_WIZE_IGNA">€ Wize Igna</option>
                              <option value="USD_EFECTIVO">USD Efectivo</option>
                            </select>
                          </div>
                          <div>
                            <label style={lbl}>Asignado a</label>
                            <select value={it.asignadoA || ''} style={inp}
                              onChange={(e) => cambiar(it._id, 'asignadoA', e.target.value || null)}>
                              <option value="">— decidir después —</option>
                              <option value="IGNA">Igna (16/8/5)</option>
                              <option value="JOSE">Jose (8/16/5)</option>
                              <option value="AMBOS">Ambos (12,5/12,5/5)</option>
                              <option value="ALE">Ausentes (10/10/5)</option>
                            </select>
                          </div>
                        </>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => confirmarUno(it)} disabled={guardando}
                        style={{ background: NA.dark, color: '#fff', border: 'none', borderRadius: 8,
                          padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {err ? 'Reintentar' : 'Confirmar'}
                      </button>
                      <button onClick={() => descartar(it._id)}
                        style={{ background: '#fff', color: '#B91C1C', border: '1px solid #FECACA',
                          borderRadius: 8, padding: '7px 16px', fontSize: 12, cursor: 'pointer' }}>
                        Descartar
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {items.length > 0 && (
        <p style={{ fontSize: 11, color: NA.text2, marginTop: 14, lineHeight: 1.5 }}>
          Las clases se crean en el Monitor como PENDIENTE, listas para confirmar y liquidar al
          instructor. Los ingresos con asignación reparten automáticamente en las cuentas de
          Igna, José y Hans; si dejás “decidir después”, quedan en Pendientes de Estadísticas.
        </p>
      )}
    </div>
  );
}