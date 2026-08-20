// ── Paleta NA ─────────────────────────────────────────────────────────────────
export const NA = {
  primary: '#1ABFA0', dark: '#0F6E56', darker: '#085041',
  light: '#E1F5EE', mid: '#9FE1CB', bg: '#f0faf7',
  text: '#0a2e27', text2: '#3a6b5e', border: '#c5e8df',
};

// ── Constantes ────────────────────────────────────────────────────────────────
export const TIPOS_AULA = [
  { v: 'APK',   l: 'APK — Privada Kite'          },
  { v: 'ASPK',  l: 'ASPK — Semiprivada Kite'     },
  { v: 'APWF',  l: 'APWF — Privada Wingfoil'     },
  { v: 'ASPWF', l: 'ASPWF — Semiprivada Wingfoil' },
  { v: 'APWS',  l: 'APWS — Privada Windsurf'     },
  { v: 'ASPWS', l: 'ASPWS — Semiprivada Windsurf' },
  { v: 'RENTAL',l: 'Rental de equipo'             },
  { v: 'OTRO',  l: 'Otro'                         },
];

export const MONEDAS = [
  { v: 'R$_STONE_JOSE', l: 'R$ Stone José' },
  { v: 'R$_STONE_IGNA', l: 'R$ Stone Igna' },
  { v: 'R$_EFECTIVO',   l: 'R$ Efectivo'   },
  { v: 'USD_EFECTIVO',  l: 'USD Efectivo'  },
  { v: 'USD_MARIANA',   l: 'USD Mariana'   },
  { v: 'EUR_WIZE_IGNA', l: '€ Wize Igna'  },
  { v: 'BRL', l: 'BRL genérico' },
  { v: 'USD', l: 'USD genérico' },
  { v: 'EUR', l: 'EUR' },
  { v: 'ARS', l: 'ARS' },
];

export const FORMAS_PAGO = ['Efectivo', 'Transferencia', 'MercadoPago', 'Tarjeta Crédito'];

export const DIAS_S  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
export const MESES   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const MESES_S = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// ── Helpers ───────────────────────────────────────────────────────────────────
export const toYMD    = (d) => d.toISOString().split('T')[0];
export const HOY      = toYMD(new Date());
export const fmt      = (ymd) => { if (!ymd) return ''; const [y,m,d] = ymd.split('-'); return `${d}/${m}/${y}`; };
export const esHoy    = (ymd) => ymd === HOY;
export const esPasado = (ymd) => ymd < HOY;
export const normName = (s) => (s||'').toLowerCase().replace(/\s+/g,' ').trim();
export const labelMon = (m) => {
  const MAP = {
    R$_STONE_JOSE:'R$ Stone José', R$_STONE_IGNA:'R$ Stone Igna', R$_EFECTIVO:'R$ Efect.',
    USD_EFECTIVO:'USD Efect.', USD_MARIANA:'USD Mariana', EUR_WIZE_IGNA:'€ Wize',
    BRL:'R$', USD:'US$', EUR:'€',
  };
  return MAP[m] || m;
};

// ── Componentes atómicos compartidos ─────────────────────────────────────────
import React from 'react';

export const Tag = ({ label, color, bg, small }) => (
  <span style={{
    fontSize: small ? 10 : 11, fontWeight: 600,
    padding: small ? '1px 6px' : '2px 8px',
    borderRadius: 99, background: bg, color,
    whiteSpace: 'nowrap', display: 'inline-block',
  }}>{label}</span>
);

export const Dot = ({ color, n }) => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:1 }}>
    <span style={{ width:6, height:6, borderRadius:'50%', background:color, display:'inline-block' }}/>
    {n > 1 && <span style={{ fontSize:9, color, fontWeight:700 }}>{n}</span>}
  </span>
);

export const Btn = ({ label, color='#fff', bg=NA.dark, onClick, small, icon, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    style={{
      padding: small ? '5px 10px' : '9px 16px', borderRadius:9, border:'none',
      background: disabled ? '#e5e7eb' : bg,
      color: disabled ? '#9ca3af' : color,
      fontSize: small ? 11 : 13, fontWeight:600,
      cursor: disabled ? 'default' : 'pointer',
      display:'flex', alignItems:'center', gap:5,
    }}>
    {icon && <i className={`ti ${icon}`} style={{ fontSize: small ? 12 : 15 }}/>}
    {label}
  </button>
);

export const Inp = ({ label, ...props }) => (
  <div style={{ marginBottom:12 }}>
    {label && <label style={{ fontSize:11, color:'rgba(255,255,255,.5)', display:'block', marginBottom:4, fontWeight:500 }}>{label}</label>}
    <input {...props} style={{
      width:'100%', padding:'10px 12px', borderRadius:10,
      border:`0.5px solid rgba(255,255,255,.1)`, fontSize:14, color:'rgba(255,255,255,.9)',
      background:'rgba(255,255,255,.06)', boxSizing:'border-box', fontFamily:'inherit',
      ...(props.style||{}),
    }}/>
  </div>
);