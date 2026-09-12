import React, { useState, useEffect } from 'react';
import api from '../axiosConfig';
import { usePresencia } from '../hooks/usePresencia';

/* ══════════════════════════════════════════════════════════════════════════
   IMPORTAR DEL GRUPO

   Pegás el resumen que mandan por WhatsApp y salen las tarjetas listas para
   revisar. Nada toca la base hasta que confirmás.

   Formatos que entiende, todos sacados de mensajes reales:
     Thalissa 11:20-12:20 Facu          · sin código de tipo
     APKFrancesca 09:00-11:00 - Facu    · tipo pegado al nombre
     Apwf Augusto 10:00:-11:00 José     · con typo en el rango
     Rental wind Renata 10:00-11:00hs   · tipo de dos palabras
     10hs APK Hana 10:00-12:00 Hans     · hora suelta más rango
     Breno 12:30-  Igna                 · sin hora de salida
     [28/8/26, 3:22 p.m.] Jose: ...     · encabezado de WhatsApp
   ══════════════════════════════════════════════════════════════════════════ */

const C = {
  fondo:  'rgba(255,255,255,.05)',
  borde:  'rgba(255,255,255,.12)',
  texto:  'rgba(255,255,255,.92)',
  suave:  'rgba(255,255,255,.55)',
  tenue:  'rgba(255,255,255,.35)',
  clase:  '#2ECFC4',
  pago:   '#FBBF24',
  ok:     '#34D399',
  error:  '#F87171',
};

// ── Vocabulario ───────────────────────────────────────────────────────────
const TIPOS = {
  ASPWF:{code:'ASPWF',act:'Clase de Wing'},     ASPWD:{code:'ASPWS',act:'Clase de Windsurf'},
  ASPWS:{code:'ASPWS',act:'Clase de Windsurf'}, ASPK: {code:'ASPK', act:'Clase de Kite'},
  APWF: {code:'APWF', act:'Clase de Wing'},     APWG: {code:'APWF', act:'Clase de Wing'},
  APWD: {code:'APWS', act:'Clase de Windsurf'}, APWS: {code:'APWS', act:'Clase de Windsurf'},
  APK:  {code:'APK',  act:'Clase de Kite'},     PAK:  {code:'APK',  act:'Clase de Kite'},
};
// Códigos largos primero: si no, APK se comería mal "APKFrancesca"
const CODIGOS = Object.keys(TIPOS).sort((a, b) => b.length - a.length);
const RE_CODIGO = new RegExp('(' + CODIGOS.join('|') + ')', 'i');
const RE_RENTAL = /\b(rental|aluguel|alquil\w*)\s*(wind\w*|wing\w*|kite|foil)?/i;

const CANALES = [
  [/cr[eé]dito\s+stone\s+jos[eé]|carta\s+stone\s+jos[eé]/i, 'R$_STONE_JOSE', 'Tarjeta Crédito'],
  [/cr[eé]dito\s+stone\s+igna|carta\s+stone\s+igna/i,       'R$_STONE_IGNA', 'Tarjeta Crédito'],
  [/d[eé]bito\s+stone\s+jos[eé]/i, 'R$_STONE_JOSE', 'Tarjeta Débito'],
  [/d[eé]bito\s+stone\s+igna/i,    'R$_STONE_IGNA', 'Tarjeta Débito'],
  [/pix\s+stone\s+igna/i,          'R$_STONE_IGNA', 'Transferencia'],
  [/pix\s+stone\s+jos[eé]/i,       'R$_STONE_JOSE', 'Transferencia'],
  [/stone\s+jos[eé]/i,             'R$_STONE_JOSE', 'Transferencia'],
  [/stone\s+igna/i,                'R$_STONE_IGNA', 'Transferencia'],
  [/wi[sz]e\s+igna/i,              'EUR_WIZE_IGNA', 'Transferencia'],
  [/\befectivo\b|\bdinheiro\b|\bcash\b/i, 'R$_EFECTIVO', 'Efectivo'],
  [/\bpix\b/i,                     'R$_STONE_IGNA', 'Transferencia'],
  [/\bd[oó]lar\w*\b|\busd\b/i,     'USD_EFECTIVO',  'Efectivo'],
];

const RE_RANGO       = /(\d{1,2})\s*[:.]?\s*(\d{2})?\s*:?\s*(?:-|–|—|\ba\b|hasta)\s*(?:(\d{1,2})\s*[:.]?\s*(\d{2})?)?/i;
const RE_HORA_SUELTA = /(?:^|\s)(\d{1,2})\s*[:.]?(\d{2})?\s*hs?\b/i;
// "09:00" suelto, sin "hs" ni rango — típico de "APK Giuseppe 09:00 Hans 2hs"
const RE_HORA_RELOJ  = /(?:^|\s)(\d{1,2})[:.](\d{2})\b/;
const RE_HORAS_DUR   = /(\d+(?:[.,]\d+)?)\s*h(?:s|rs)?\b/i;
const RE_FECHA       = /\[?(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?/;
const RE_MONTO       = /(?:R\$\s*)(\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d+(?:[.,]\d{1,2})?)\b|(\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d+(?:[.,]\d{1,2})?)\s*R\$/gi;

const pad = (n) => String(n).padStart(2, '0');
const num = (s) => {
  if (s == null) return null;
  let t = String(s).trim();
  if (t.includes('.') && t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (t.includes(',')) t = t.replace(',', '.');
  else if ((t.match(/\./g) || []).length === 1 && t.split('.')[1].length === 3) t = t.replace('.', '');
  const v = parseFloat(t);
  return isNaN(v) ? null : v;
};

// Apodos que usan en el grupo. Sirven de respaldo si la lista de usuarios
// no cargó, y se cruzan con los nombres reales para asignar el id.
const APODOS = {
  igna:  ['igna', 'ignacio'],
  facu:  ['facu', 'facundo', 'facu.'],
  jose:  ['jose', 'josé', 'jose.'],
  hans:  ['hans'],
  ale:   ['ale', 'alejo'],
};

function detectarInstructor(txt, instructores) {
  const pega = (a) => new RegExp('(^|[\\s\\-–])' + a.replace(/\./g, '\\.') + '([\\s\\-–.,!]|$)', 'i').test(txt);

  // 1) por los nombres reales de los usuarios
  for (const ins of instructores) {
    for (const a of (ins.aliases || [])) if (pega(a)) return { ins, alias: a };
  }
  // 2) por los apodos del grupo, buscando a quién corresponden
  for (const [clave, lista] of Object.entries(APODOS)) {
    const hit = lista.find(pega);
    if (!hit) continue;
    const ins = instructores.find((u) =>
      u.nombre.toLowerCase().replace(/[áéíóú]/g, (m) => 'aeiou'['áéíóú'.indexOf(m)])
        .startsWith(clave.slice(0, 3)));
    return { ins: ins || null, alias: hit };
  }
  return { ins: null, alias: null };
}

function detectarTipo(linea) {
  const r = RE_RENTAL.exec(linea);
  if (r) {
    const d = (r[2] || '').toLowerCase();
    const act = d.startsWith('wind') ? 'Rental Windsurf'
              : d.startsWith('wing') ? 'Rental Wingfoil'
              : d.startsWith('kite') ? 'Rental Kite' : 'Rental';
    return { code: 'RENTAL', act, match: r[0] };
  }
  const m = RE_CODIGO.exec(linea);
  if (m) { const t = TIPOS[m[1].toUpperCase()]; return { code: t.code, act: t.act, match: m[1] }; }
  return null;
}

function parseClase(lineaOriginal, fecha, instructores) {
  // Sacar viñetas del principio: "-9hs APK…" hacía que el guion se leyera
  // como separador de rango y la hora saliera mal.
  const linea = lineaOriginal.replace(/^[\s\-–—•*·]+/, '');
  const tipo = detectarTipo(linea);

  let hIni = null, hFin = null, usoRango = false;
  // Solo es rango si hay guion o "a" entre dos horas. "09:00 Hans 2hs" no lo es.
  // Un rango real lleva guion o " a " entre las dos horas. Un espacio no
  // alcanza: en "09:00 2hs" el 2 es la duración, no la hora de salida.
  const tieneSeparador = /\d\s*[:.]?\s*\d*\s*(?:-|–|—|hasta|\sa\s)\s*\d/i.test(linea)
                      || /\d\s*[:.]?\s*\d*\s*[-–—]\s*$/.test(linea.trim());
  const r = tieneSeparador ? RE_RANGO.exec(linea) : null;
  if (r && r[1] != null) {
    usoRango = true;
    hIni = `${pad(Math.min(23, +r[1]))}:${pad(r[2] ? +r[2] : 0)}`;
    if (r[3] != null) hFin = `${pad(Math.min(23, +r[3]))}:${pad(r[4] ? +r[4] : 0)}`;
  } else {
    const reloj = RE_HORA_RELOJ.exec(linea);
    if (reloj) hIni = `${pad(Math.min(23, +reloj[1]))}:${pad(+reloj[2])}`;
    else {
      const s = RE_HORA_SUELTA.exec(linea);
      if (s) hIni = `${pad(Math.min(23, +s[1]))}:${pad(s[2] ? +s[2] : 0)}`;
    }
  }
  const { ins, alias } = detectarInstructor(linea, instructores);
  if (!hIni && !tipo) return null;

  let horas = null;
  if (hIni && hFin) {
    const a = +hIni.split(':')[0] * 60 + +hIni.split(':')[1];
    const b = +hFin.split(':')[0] * 60 + +hFin.split(':')[1];
    if (b > a) horas = Math.round(((b - a) / 60) * 100) / 100;
  }
  if (horas == null) {
    let base = usoRango ? linea.replace(RE_RANGO, ' ') : linea;
    // No confundir la hora de inicio con la duración: en "9hs Hans 2hs"
    // el 9 es la hora y el 2 son las horas de clase.
    if (hIni) {
      const hh = +hIni.split(':')[0];
      base = base.replace(new RegExp('(^|\\s)' + hh + '\\s*[:.]?(00)?\\s*hs?\\b', 'i'), ' ');
    }
    const d = RE_HORAS_DUR.exec(base);
    if (d) { const v = num(d[1]); if (v != null && v > 0 && v <= 8) horas = v; }
  }
  // Con entrada y duración se deduce la salida
  if (hIni && !hFin && horas) {
    const t = +hIni.split(':')[0] * 60 + +hIni.split(':')[1] + horas * 60;
    if (t < 24 * 60) hFin = `${pad(Math.floor(t / 60))}:${pad(Math.round(t % 60))}`;
  }

  let al = linea;
  if (tipo) al = al.replace(tipo.match, ' ');
  if (usoRango) al = al.replace(RE_RANGO, ' ');
  al = al.replace(RE_HORA_RELOJ, ' ').replace(RE_HORA_SUELTA, ' ').replace(RE_HORAS_DUR, ' ');
  if (alias) al = al.replace(new RegExp('(^|[\\s\\-–])' + alias + '([\\s\\-–.,!]|$)', 'ig'), ' ');
  al = al.replace(/\d+\s*hs?\b/ig, ' ')          // "1HS", "2hs" residuales
         .replace(/\b(hs|h)\b/ig, ' ')
         .replace(/^\s*a\s+/i, ' ')                // la "a" de "9hs a 10hs"
         .replace(/\s+a\s+(?=$)/i, ' ')
         .replace(/[-–—:]+/g, ' ')
         .replace(/\s{2,}/g, ' ').trim().replace(/^[\s\-–:,.]+|[\s\-–:,.]+$/g, '');

  // Texto libre del tipo "No pago porq mañana alquila!" va a nota, no al nombre
  let nota = null;
  const mN = al.match(/\b(no pago|n[aã]o pago|falta pagar|pendiente)\b.*/i);
  if (mN) { nota = mN[0].trim(); al = al.slice(0, mN.index).trim(); }
  if (al && al.split(/\s+/).length > 4) { nota = nota ? `${al} · ${nota}` : al; al = null; }
  if (al) al = al.replace(/R\$\s*\d[\d.,]*/g, '').replace(/\s{2,}/g, ' ').trim();

  return {
    kind: 'CLASE', code: tipo ? tipo.code : null, actividad: tipo ? tipo.act : null,
    fecha, hora: hIni, horaSalida: hFin, horas, alumno: al || null, nota,
    instructorId: ins ? ins.id : null, linea: lineaOriginal.trim(),
  };
}

function parsePago(linea, fecha) {
  let moneda = null, formaPago = null;
  for (const [re, c, f] of CANALES) if (re.test(linea)) { moneda = c; formaPago = f; break; }
  const tipo = detectarTipo(linea);

  // El PRIMER importe con R$. En "R$422 ... En total foi R$740" vale 422.
  let monto = null, mm;
  RE_MONTO.lastIndex = 0;
  while ((mm = RE_MONTO.exec(linea)) !== null) {
    const v = num(mm[1] != null ? mm[1] : mm[2]);
    if (v != null && v > 0) { monto = v; break; }
  }
  if (monto == null) {
    const cand = []; const reN = /(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)/g; let n;
    while ((n = reN.exec(linea)) !== null) {
      const sig = linea.slice(n.index + n[0].length, n.index + n[0].length + 3).toLowerCase();
      if (/^\s*h/.test(sig)) continue;              // no confundir horas con plata
      const v = num(n[1]); if (v != null) cand.push(v);
    }
    if (cand.length) monto = Math.max(...cand);
  }

  let horas = null;
  const d = RE_HORAS_DUR.exec(linea);
  if (d) { const v = num(d[1]); if (v != null && v > 0 && v <= 12) horas = v; }

  let al = linea.replace(/\bpagamentos?\b|\bpagos?\b|\bse[nñ]a\b/ig, ' ');
  if (tipo) al = al.replace(tipo.match, ' ');
  al = al.replace(RE_MONTO, ' ').replace(RE_HORAS_DUR, ' ');
  for (const [re] of CANALES) al = al.replace(re, ' ');
  al = al.replace(/R\$|\breais?\b|\bcarta\b|\bde\b/ig, ' ')
         .replace(/\b(en total foi|menos reserva ontem|total)\b.*/i, '')
         .replace(/\d+/g, ' ').replace(/[-–—:]+/g, ' ').replace(/\s{2,}/g, ' ')
         .trim().replace(/^[\s\-–:,.]+|[\s\-–:,.]+$/g, '');

  return {
    kind: 'INGRESO', code: tipo ? tipo.code : null, actividad: tipo ? tipo.act : 'Ingreso',
    fecha, horas, monto, moneda, formaPago, alumno: al || null, linea: linea.trim(),
  };
}

function parseMensaje(texto, anioDef, instructores, fechaFallback, asignadoDefault) {
  const out = []; let fecha = null, modo = 'clase';

  for (const raw of texto.split('\n')) {
    const l = raw.trim(); if (!l) continue;

    // Encabezado de WhatsApp: [28/8/26, 3:22:04 p. m.] Jose Sanchez: resto
    const wa = l.match(/^\[(\d{1,2})[/.](\d{1,2})[/.](\d{2,4}),[^\]]*\]\s*[^:]*:\s*(.*)$/);
    if (wa) {
      const y = wa[3].length === 2 ? 2000 + +wa[3] : +wa[3];
      fecha = `${y}-${pad(+wa[2])}-${pad(+wa[1])}`;
      const resto = wa[4].trim(); if (!resto) continue;
      const it = /pagamento|pago/i.test(resto)
        ? parsePago(resto, fecha) : parseClase(resto, fecha, instructores);
      if (it) out.push(it);
      continue;
    }

    const f = RE_FECHA.exec(l);
    if (f && l.replace(RE_FECHA, '').replace(/[\s\-–]/g, '').length === 0) {
      const y = f[3] ? (f[3].length === 2 ? 2000 + +f[3] : +f[3]) : anioDef;
      fecha = `${y}-${pad(+f[2])}-${pad(+f[1])}`;
      continue;
    }
    if (/^\s*(aulas?|resumo|clases?)\b/i.test(l) && !RE_CODIGO.test(l)) {
      modo = 'clase';
      if (f) {
        const y = f[3] ? (f[3].length === 2 ? 2000 + +f[3] : +f[3]) : anioDef;
        fecha = `${y}-${pad(+f[2])}-${pad(+f[1])}`;
      }
      continue;
    }
    if (/^\s*pagamentos?\s*$|^\s*pagos?\s*$/i.test(l)) { modo = 'pago'; continue; }
    if (/^\s*(amanha|amanhã|manhã)\b/i.test(l)) { modo = 'clase'; continue; }

    const inline = /^\s*pagamentos?\b/i.test(l);
    const item = (modo === 'pago' || inline)
      ? parsePago(l, fecha || fechaFallback)
      : parseClase(l, fecha || fechaFallback, instructores);
    if (item) out.push(item);
  }

  return out.map((i) => ({
    ...i,
    _id: Math.random().toString(36).slice(2),
    estado: 'pendiente',
    sinFecha: !i.fecha,
    fecha: i.fecha || fechaFallback,
    ...(i.kind === 'INGRESO' ? { asignadoA: asignadoDefault } : {}),
  }));
}

// ══════════════════════════════════════════════════════════════════════════

const Campo = ({ label, ancho, children }) => (
  <div style={ancho ? { gridColumn: 'span 2' } : undefined}>
    <label style={{ fontSize: 10, color: C.tenue, display: 'block', marginBottom: 4 }}>{label}</label>
    {children}
  </div>
);

const Seccion = ({ titulo, cantidad, color, pie, children }) => (
  <section style={{ marginTop: 24 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.texto }}>{titulo}</h3>
      <span style={{ fontSize: 12, color: C.tenue }}>{cantidad}</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>{children}</div>
    {pie && <p style={{ fontSize: 11, color: C.tenue, margin: '9px 0 0', lineHeight: 1.5 }}>{pie}</p>}
  </section>
);

const Tarjeta = ({ it, color, inp, onCambiar, onDescartar, onConfirmar, guardando, children }) => {
  const ok = it.estado === 'ok';
  const err = it.estado === 'error';
  return (
    <article style={{
      background: ok ? 'rgba(52,211,153,.08)' : err ? 'rgba(248,113,113,.08)' : C.fondo,
      border: `1px solid ${ok ? 'rgba(52,211,153,.3)' : err ? 'rgba(248,113,113,.35)' : C.borde}`,
      borderLeft: `3px solid ${ok ? C.ok : err ? C.error : color}`,
      borderRadius: 13, padding: 13, opacity: ok ? .7 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: ok ? 0 : 11 }}>
        <strong style={{ fontSize: 15, color: C.texto, fontWeight: 600 }}>
          {it.alumno || <span style={{ color: C.tenue, fontWeight: 400 }}>sin nombre</span>}
        </strong>
        <span style={{ fontSize: 11, color: C.tenue, flex: 1, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.linea}</span>
        {ok && <span style={{ fontSize: 12, color: C.ok }}>guardado</span>}
        {err && <span style={{ fontSize: 12, color: C.error }}>no se pudo guardar</span>}
      </div>

      {it.nota && !ok && (
        <p style={{ margin: '0 0 9px', fontSize: 11, color: C.pago,
          background: 'rgba(251,191,36,.1)', padding: '6px 9px', borderRadius: 7 }}>{it.nota}</p>
      )}

      {!ok && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 11 }}>
            <Campo label={it.sinFecha ? 'Fecha — poner a mano' : 'Fecha'} ancho>
              <input type="date" value={it.fecha || ''}
                style={{ ...inp, borderColor: it.sinFecha ? 'rgba(251,191,36,.5)' : C.borde }}
                onChange={(e) => onCambiar(it._id, 'fecha', e.target.value)} />
            </Campo>
            <Campo label={it.kind === 'CLASE' ? 'Alumno' : 'Detalle'} ancho>
              <input type="text" value={it.alumno || ''} style={inp}
                onChange={(e) => onCambiar(it._id, 'alumno', e.target.value)} />
            </Campo>
            {children}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onConfirmar(it)} disabled={guardando}
              style={{ background: '#047857', color: '#fff', border: 'none', borderRadius: 9,
                padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {err ? 'Reintentar' : 'Confirmar'}
            </button>
            <button onClick={() => onDescartar(it._id)}
              style={{ background: 'transparent', color: C.suave, border: `1px solid ${C.borde}`,
                borderRadius: 9, padding: '8px 18px', fontSize: 13, cursor: 'pointer' }}>
              Descartar
            </button>
          </div>
        </>
      )}
    </article>
  );
};

export default function ImportarMensaje({ onClose, onImportado }) {
  const [texto, setTexto] = useState('');
  const [items, setItems] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const { asignadoAuto, opcionActual } = usePresencia();

  const hoy = new Date().toISOString().slice(0, 10);
  const anio = new Date().getFullYear();
  // Igual que en Ingreso: arranca con quien está presente hoy
  const asignadoDefault = asignadoAuto === 'AUSENTES' ? 'ALE' : asignadoAuto;

  useEffect(() => {
    // /usuario es el listado que ya usa el Monitor. El de admin no existe.
    api.get('/usuario')
      .then((r) => setUsuarios((r.data || [])
        // Fuera la cuenta de sistema y la de la escuela: no dan clases
        .filter((u) => {
          const rol = (u.rol?.nombre || '').toUpperCase();
          const nom = `${u.nombre || ''}`.trim().toLowerCase();
          if (['admin', 'nautica', 'nautica atins'].includes(nom)) return false;
          return rol ? rol === 'INSTRUCTOR' : true;
        })
        .map((u) => {
        const nombre = `${u.nombre || ''} ${u.apellido || ''}`.replace(/\s+/g, ' ').trim();
        const pila   = (u.nombre || '').trim();
        // Apodos: el nombre entero y los primeros 4 y 3 caracteres, para que
        // "Facu"/"Facu." peguen con Facundo e "Igna" con Ignacio.
        const aliases = [...new Set([
          pila, pila.slice(0, 4), pila.slice(0, 3),
        ].filter((x) => x && x.length >= 3))]
          .sort((a, b) => b.length - a.length);   // el más largo primero
        return { id: u.id, nombre, aliases };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre))))
      .catch((e) => { console.error('[Importar] no se pudo traer usuarios:', e); setUsuarios([]); });
  }, []);

  const analizar = () => {
    const r = parseMensaje(texto, anio, usuarios, hoy, asignadoDefault);
    if (!r.length) {
      alert('No se reconoció ninguna clase ni pago. Revisá que las líneas tengan horario o monto.');
      return;
    }
    setItems(r);
  };

  const cambiar = (id, campo, valor) =>
    setItems((p) => p.map((it) => (it._id === id ? { ...it, [campo]: valor } : it)));
  const descartar = (id) => setItems((p) => p.filter((it) => it._id !== id));

  const confirmarUno = async (it) => {
    setGuardando(true);
    try {
      if (it.kind === 'CLASE') {
        await api.post('/api/agenda/crear', {
          alumno: it.alumno || 'Sin nombre',
          fecha: it.fecha,
          hora: it.hora ? `${it.hora}:00` : null,
          horaSalida: it.horaSalida ? `${it.horaSalida}:00` : null,
          horas: it.horas,
          tipoAula: it.code || 'OTRO',
          instructorId: it.instructorId || null,
          lugar: it.nota || null,
          tarifa: 120,
          estado: 'PENDIENTE',
        });
      } else {
        // Con tarjeta de crédito el banco se queda el 5%: se guarda el NETO,
        // igual que en la pantalla de Ingreso. Si no, entra el monto entero.
        const bruto    = Number(it.monto) || 0;
        const descuento = it.formaPago === 'Tarjeta Crédito' ? bruto * 0.05 : 0;
        const neto     = Math.round((bruto - descuento) * 100) / 100;

        await api.post('/api/clases/guardar', {
          tipoTransaccion: 'INGRESO',
          fecha: it.fecha,
          actividad: it.actividad || 'Ingreso',
          // instructor es obligatorio en la base: sin esto el guardado da 500
          instructor: opcionActual?.label || 'Importado del grupo',
          total: String(neto),
          moneda: it.moneda || 'BRL',
          formaPago: it.formaPago || 'Efectivo',
          detalles: it.alumno || '',
          asignadoA: it.asignadoA || null,
          comision: String(Math.round(descuento * 100) / 100),
        });
      }
      setItems((p) => p.map((x) => (x._id === it._id ? { ...x, estado: 'ok' } : x)));
      if (onImportado) onImportado();
    } catch (e) {
      console.error('[Importar] no se pudo guardar:', e);
      setItems((p) => p.map((x) => (x._id === it._id ? { ...x, estado: 'error' } : x)));
    } finally { setGuardando(false); }
  };

  const confirmarTodos = async () => {
    for (const it of items.filter((x) => x.estado === 'pendiente')) {
      // eslint-disable-next-line no-await-in-loop
      await confirmarUno(it);
    }
  };

  const clases = items.filter((i) => i.kind === 'CLASE');
  const pagos  = items.filter((i) => i.kind === 'INGRESO');
  const pend   = items.filter((i) => i.estado === 'pendiente').length;
  const listos = items.filter((i) => i.estado === 'ok').length;

  const inp = {
    width: '100%', padding: '9px 11px', borderRadius: 9, fontSize: 14,
    border: `1px solid ${C.borde}`, background: 'rgba(255,255,255,.06)',
    color: C.texto, fontFamily: 'inherit', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '16px 16px 60px', maxWidth: 900, margin: '0 auto', color: C.texto }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        {onClose && (
          <button onClick={onClose} aria-label="Volver"
            style={{ background: C.fondo, border: `1px solid ${C.borde}`, borderRadius: 11,
              width: 36, height: 36, cursor: 'pointer', color: C.texto, fontSize: 17 }}>←</button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 600, color: C.texto }}>Importar del grupo</h2>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: C.suave }}>
            Pegá el mensaje de WhatsApp y revisá antes de confirmar
          </p>
        </div>
        {opcionActual && (
          <span style={{ fontSize: 11, padding: '5px 11px', borderRadius: 99, whiteSpace: 'nowrap',
            background: 'rgba(255,255,255,.08)', color: C.suave }}>
            {opcionActual.label}
          </span>
        )}
      </div>

      <textarea
        value={texto} onChange={(e) => setTexto(e.target.value)} rows={8} spellCheck={false}
        placeholder={'27/08\n\nAulas\nAPK Giuseppe 09:00-11:00 - Hans\nRental wind Renata 10:00-11:00hs\n\nPagamento\nGiuseppe 8h Apk 2.800 R$'}
        style={{ width: '100%', padding: 14, borderRadius: 14, fontSize: 14, lineHeight: 1.6,
          border: `1px solid ${C.borde}`, background: 'rgba(0,0,0,.25)', color: C.texto,
          fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button onClick={analizar} disabled={!texto.trim()}
          style={{ background: texto.trim() ? C.clase : 'rgba(255,255,255,.1)',
            color: texto.trim() ? '#06302E' : C.tenue, border: 'none', borderRadius: 11,
            padding: '11px 20px', fontSize: 14, fontWeight: 600,
            cursor: texto.trim() ? 'pointer' : 'default' }}>
          Analizar mensaje
        </button>
        {items.length > 0 && (
          <>
            <button onClick={confirmarTodos} disabled={guardando || !pend}
              style={{ background: pend ? '#047857' : 'rgba(255,255,255,.08)',
                color: pend ? '#fff' : C.tenue, border: 'none', borderRadius: 11,
                padding: '11px 20px', fontSize: 14, fontWeight: 600,
                cursor: pend ? 'pointer' : 'default' }}>
              {guardando ? 'Guardando…' : `Confirmar ${pend}`}
            </button>
            <button onClick={() => { setItems([]); setTexto(''); }}
              style={{ background: 'transparent', color: C.suave, border: `1px solid ${C.borde}`,
                borderRadius: 11, padding: '11px 20px', fontSize: 14, cursor: 'pointer' }}>
              Limpiar
            </button>
          </>
        )}
      </div>

      {listos > 0 && (
        <p style={{ fontSize: 12, color: C.ok, margin: '12px 0 0' }}>
          {listos} {listos === 1 ? 'guardado' : 'guardados'}{pend > 0 && ` · quedan ${pend}`}
        </p>
      )}

      {clases.length > 0 && (
        <Seccion titulo="Clases" cantidad={clases.length} color={C.clase}
          pie="Se crean en el Monitor como pendientes, listas para liquidar al instructor.">
          {clases.map((it) => (
            <Tarjeta key={it._id} it={it} color={C.clase} inp={inp}
              onCambiar={cambiar} onDescartar={descartar} onConfirmar={confirmarUno} guardando={guardando}>
              <Campo label="Hora">
                <input type="time" value={it.hora || ''} style={inp}
                  onChange={(e) => cambiar(it._id, 'hora', e.target.value)} />
              </Campo>
              <Campo label="Salida">
                <input type="time" value={it.horaSalida || ''} style={inp}
                  onChange={(e) => cambiar(it._id, 'horaSalida', e.target.value)} />
              </Campo>
              <Campo label="Horas">
                <input type="number" step="0.5" value={it.horas ?? ''} style={inp}
                  onChange={(e) => cambiar(it._id, 'horas', e.target.value === '' ? null : parseFloat(e.target.value))} />
              </Campo>
              <Campo label="Tipo">
                <select value={it.code || ''} style={inp}
                  onChange={(e) => cambiar(it._id, 'code', e.target.value)}>
                  <option value="" style={{ color: '#111' }}>— elegir —</option>
                  {['APK','ASPK','APWF','ASPWF','APWS','ASPWS','RENTAL','OTRO'].map((c) =>
                    <option key={c} value={c} style={{ color: '#111' }}>{c}</option>)}
                </select>
              </Campo>
              <Campo label="Instructor" ancho>
                <select value={it.instructorId || ''} style={inp}
                  onChange={(e) => cambiar(it._id, 'instructorId', e.target.value ? Number(e.target.value) : null)}>
                  <option value="" style={{ color: '#111' }}>— sin asignar —</option>
                  {usuarios.map((u) =>
                    <option key={u.id} value={u.id} style={{ color: '#111' }}>{u.nombre}</option>)}
                </select>
              </Campo>
            </Tarjeta>
          ))}
        </Seccion>
      )}

      {pagos.length > 0 && (
        <Seccion titulo="Pagos" cantidad={pagos.length} color={C.pago}
          pie="Al confirmar, la asignación reparte en las cuentas de Igna, José y Hans.">
          {pagos.map((it) => (
            <Tarjeta key={it._id} it={it} color={C.pago} inp={inp}
              onCambiar={cambiar} onDescartar={descartar} onConfirmar={confirmarUno} guardando={guardando}>
              <Campo label="Monto">
                <input type="number" step="0.01" value={it.monto ?? ''} style={inp}
                  onChange={(e) => cambiar(it._id, 'monto', e.target.value === '' ? null : parseFloat(e.target.value))} />
              </Campo>
              <Campo label="Canal de cobro">
                <select value={it.moneda || 'BRL'} style={inp}
                  onChange={(e) => cambiar(it._id, 'moneda', e.target.value)}>
                  {[['BRL','BRL genérico'], ['R$_STONE_JOSE','R$ Stone José'],
                    ['R$_STONE_IGNA','R$ Stone Igna'], ['R$_EFECTIVO','R$ Efectivo'],
                    ['EUR_WIZE_IGNA','€ Wize Igna'], ['USD_EFECTIVO','USD Efectivo']]
                    .map(([v, t]) => <option key={v} value={v} style={{ color: '#111' }}>{t}</option>)}
                </select>
              </Campo>
              <Campo label="Forma de pago">
                <select value={it.formaPago || 'Efectivo'} style={inp}
                  onChange={(e) => cambiar(it._id, 'formaPago', e.target.value)}>
                  {['Efectivo', 'Transferencia', 'MercadoPago', 'Tarjeta Crédito', 'Tarjeta Débito']
                    .map((f) => <option key={f} value={f} style={{ color: '#111' }}>{f}</option>)}
                </select>
              </Campo>
              <Campo label="Asignado a">
                <select value={it.asignadoA || ''} style={inp}
                  onChange={(e) => cambiar(it._id, 'asignadoA', e.target.value || null)}>
                  <option value=""      style={{ color: '#111' }}>— decidir después —</option>
                  <option value="IGNA"  style={{ color: '#111' }}>Igna · 16 / 8 / 5</option>
                  <option value="JOSE"  style={{ color: '#111' }}>José · 8 / 16 / 5</option>
                  <option value="AMBOS" style={{ color: '#111' }}>Ambos · 12,5 / 12,5 / 5</option>
                  <option value="ALE"   style={{ color: '#111' }}>Ausentes · 10 / 10 / 5</option>
                </select>
              </Campo>
              {it.formaPago === 'Tarjeta Crédito' && it.monto > 0 && (
                <div style={{ gridColumn: 'span 4', fontSize: 11, color: C.pago,
                  background: 'rgba(251,191,36,.1)', padding: '7px 10px', borderRadius: 7 }}>
                  Tarjeta de crédito: se descuenta 5% del banco.{' '}
                  {Number(it.monto).toFixed(2)} − {(it.monto * 0.05).toFixed(2)} ={' '}
                  <strong>{(it.monto * 0.95).toFixed(2)}</strong> a caja
                </div>
              )}
            </Tarjeta>
          ))}
        </Seccion>
      )}
    </div>
  );
}