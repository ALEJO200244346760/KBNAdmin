// hooks/usePresencia.js
// Maneja el estado de presencia del día (quién está presente).
// Se puede usar en Secretaria, Ingreso, Estadísticas — cualquier lugar
// que necesite saber quién está presente para autocompletar asignadoA.

import { useState, useEffect, useCallback } from 'react';
import api from '../axiosConfig';

export const OPCIONES_PRESENCIA = [
  { value: 'JOSE',     label: 'José presente',    short: 'JOSE',   color: '#0F6E56', bg: '#E1F5EE' },
  { value: 'IGNA',     label: 'Igna presente',    short: 'IGNA',   color: '#2563EB', bg: '#DBEAFE' },
  { value: 'AMBOS',    label: 'Ambos presentes',  short: 'AMBOS',  color: '#7C3AED', bg: '#EDE9FE' },
  { value: 'AUSENTES', label: 'Ambos ausentes',   short: 'ALE',    color: '#6B7280', bg: '#F3F4F6' },
];

export function usePresencia() {
  const [presencia, setPresencia] = useState(null); // { id, fecha, presentes, modificadoPor }
  const [loading,   setLoading]   = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await api.get('/api/presencia/hoy');
      setPresencia(res.data);
    } catch (e) {
      console.error('usePresencia:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const setPresentes = async (valor, modificadoPor = '') => {
    if (guardando) return;
    setGuardando(true);
    try {
      const res = await api.put('/api/presencia/hoy', { presentes: valor, modificadoPor });
      setPresencia(res.data);
    } catch (e) {
      console.error('setPresentes:', e);
    } finally {
      setGuardando(false);
    }
  };

  // Devuelve el asignadoA que corresponde a la presencia actual
  // (útil para precargar el campo en Ingreso)
  const asignadoAuto = presencia?.presentes || 'AUSENTES';

  const opcionActual = OPCIONES_PRESENCIA.find(o => o.value === asignadoAuto)
    || OPCIONES_PRESENCIA[3];

  return { presencia, loading, guardando, setPresentes, asignadoAuto, opcionActual };
}