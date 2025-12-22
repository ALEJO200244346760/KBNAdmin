import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Componentes financieros reutilizados
import Ingreso from './Ingreso';
import Egreso from './Egreso';

const InstructorForm = () => {
  const { user, loading: authLoading } = useAuth();
  const [view, setView] = useState('AGENDA'); 
  const [agendaItems, setAgendaItems] = useState([]);
  const [loadingAgenda, setLoadingAgenda] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({
    tipoTransaccion: 'INGRESO',
    fecha: today,
    actividad: 'Clases',
    actividadOtro: '',
    vendedor: '',
    instructor: '',
    detalles: '',
    horas: 0,
    tarifa: 0,
    total: 0,
    gastos: 0,
    comision: 0,
    formaPago: 'Efectivo',
    formaPagoOtro: '',
    moneda: 'USD'
  });

  // --- SINCRONIZACIÓN DE PERFIL ---
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        instructor: `${user.nombre} ${user.apellido}`
      }));
    }
  }, [user]);

  // --- CÁLCULO AUTOMÁTICO DE TOTAL ---
  useEffect(() => {
    const h = parseFloat(formData.horas) || 0;
    const t = parseFloat(formData.tarifa) || 0;
    const g = parseFloat(formData.gastos) || 0;
    
    // El total es (horas * tarifa) - gastos
    const calculado = (h * t) - g;
    setFormData(prev => ({ 
      ...prev, 
      total: calculado > 0 ? calculado : 0 
    }));
  }, [formData.horas, formData.tarifa, formData.gastos]);

  // --- CARGA DE AGENDA ---
  const fetchAgenda = useCallback(async () => {
    if (!user?.id) return;
    
    setLoadingAgenda(true);
    try {
      const res = await axios.get(`https://kbnadmin-production.up.railway.app/api/agenda/instructor/${user.id}`);
      const sorted = res.data.sort((a, b) => {
        // Orden: Pendientes primero, luego por fecha descendente
        const order = { 'PENDIENTE': 0, 'CONFIRMADA': 1, 'RECHAZADA': 2 };
        if (order[a.estado] !== order[b.estado]) {
          return order[a.estado] - order[b.estado];
        }
        return new Date(b.fecha) - new Date(a.fecha);
      });
      setAgendaItems(sorted);
    } catch (error) {
      console.error("Error cargando agenda:", error);
    } finally {
      setLoadingAgenda(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (view === 'AGENDA' && !authLoading) {
      fetchAgenda();
    }
  }, [view, authLoading, fetchAgenda]);

  // --- GESTIÓN DE ESTADOS DE CLASE ---
  const handleStatusChange = async (id, nuevoEstado) => {
    try {
      await axios.put(
        `https://kbnadmin-production.up.railway.app/api/agenda/${id}/estado`,
        nuevoEstado,
        { headers: { 'Content-Type': 'text/plain' } }
      );

      setAgendaItems(prev => prev.map(item => 
        item.id === id ? { ...item, estado: nuevoEstado } : item
      ));
      alert(`Clase ${nuevoEstado.toLowerCase()} con éxito.`);
      
      // Si se rechaza, refrescamos para que desaparezca o cambie de orden
      if (nuevoEstado === 'RECHAZADA') fetchAgenda();
    } catch (error) {
      alert("Error al actualizar estado.");
    }
  };

  // --- ENVÍO DE FORMULARIO (FINANZAS) ---
  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    
    // Construcción del Payload siguiendo la estructura de Secretaria
    const payload = {
      ...formData,
      tipoTransaccion: view,
      actividad: formData.actividad === 'Otro' ? formData.actividadOtro : formData.actividad,
      formaPago: formData.formaPago === 'Otro' ? formData.formaPagoOtro : formData.formaPago,
      // Aseguramos que los valores numéricos se envíen como String si el backend lo requiere
      cantidadHoras: String(formData.horas),
      tarifaPorHora: String(formData.tarifa),
      total: String(formData.total),
      gastosAsociados: String(formData.gastos || '0'),
      asignadoA: 'NINGUNO' 
    };

    try {
      await axios.post('https://kbnadmin-production.up.railway.app/api/clases/guardar', payload);
      alert(`${view} registrado correctamente.`);
      // Reset de campos variables pero manteniendo el nombre del instructor
      setFormData(prev => ({
        ...prev,
        detalles: '',
        horas: 0,
        tarifa: 0,
        gastos: 0,
        total: 0,
        actividadOtro: '',
        formaPagoOtro: ''
      }));
      setView('AGENDA');
    } catch (error) {
      alert('Error al guardar registro financiero.');
    }
  };

  const InstructorField = () => (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Instructor (Solo Lectura)</label>
      <input
        type="text"
        value={formData.instructor}
        readOnly
        className="p-4 bg-gray-100 rounded-2xl w-full border-none font-bold text-gray-500 cursor-not-allowed"
      />
    </div>
  );

  if (authLoading) return (
    <div className="flex justify-center items-center min-h-screen">
      <p className="font-black text-gray-300 animate-pulse italic">CARGANDO PERFIL...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 md:mt-6">
      {/* Header Estilo Secretaria */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">
            Panel Instructor
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            <p className="text-indigo-600 font-black text-xs uppercase tracking-widest">{user?.nombre} {user?.apellido}</p>
          </div>
        </div>
        
        <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto">
          {['AGENDA','INGRESO','EGRESO'].map(v => (
            <button 
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                view === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido Dinámico */}
      {view === 'AGENDA' && (
        <div className="grid gap-4">
          {loadingAgenda ? (
            <p className="text-center py-10 font-bold text-gray-400 animate-pulse">ACTUALIZANDO CLASES...</p>
          ) : agendaItems.length === 0 ? (
            <div className="bg-white p-16 rounded-[3rem] text-center border-2 border-dashed border-gray-100">
              <span className="text-5xl block mb-4">🏄‍♂️</span>
              <p className="text-gray-400 font-black uppercase text-sm tracking-tighter">No tienes clases asignadas hoy</p>
            </div>
          ) : (
            agendaItems.map(item => (
              <div key={item.id} className={`bg-white p-6 rounded-[2rem] shadow-sm border-t-8 transition-all ${
                item.estado === 'PENDIENTE' ? 'border-amber-400 shadow-amber-50' : 
                item.estado === 'CONFIRMADA' ? 'border-emerald-500' : 'border-gray-200 opacity-60'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                      {item.fecha} • {item.hora?.substring(0,5)} HS
                    </span>
                    <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tighter leading-tight">{item.alumno}</h3>
                  </div>
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${
                    item.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' : 
                    item.estado === 'CONFIRMADA' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {item.estado === 'PENDIENTE' ? '⏳ Pendiente' : item.estado}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] mb-5 bg-gray-50 p-4 rounded-2xl font-bold">
                  <div><p className="text-gray-400 uppercase text-[9px]">📍 Lugar</p><p className="truncate text-gray-700">{item.lugar}</p></div>
                  <div><p className="text-gray-400 uppercase text-[9px]">⏱️ Tiempo</p><p className="text-gray-700">{item.horas}hs</p></div>
                  <div><p className="text-gray-400 uppercase text-[9px]">💵 Tarifa</p><p className="text-gray-700">${item.tarifa}</p></div>
                  <div><p className="text-gray-400 uppercase text-[9px]">💳 Pagado</p><p className="text-emerald-600">${item.horasPagadas || 0}</p></div>
                </div>

                {item.estado === 'PENDIENTE' && (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleStatusChange(item.id, 'CONFIRMADA')} 
                      className="flex-1 bg-emerald-500 text-white py-4 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-600 transition shadow-lg shadow-emerald-100 active:scale-95"
                    >
                      Confirmar Asistencia
                    </button>
                    <button 
                      onClick={() => handleStatusChange(item.id, 'RECHAZADA')} 
                      className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-xl font-black text-[10px] uppercase hover:bg-gray-200 transition active:scale-95"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {view === 'INGRESO' && (
        <Ingreso 
          formData={formData} 
          handleChange={handleChange} 
          handleSubmit={handleSubmit} 
          InstructorField={InstructorField} 
          setView={setView} 
        />
      )}
      
      {view === 'EGRESO' && (
        <Egreso 
          formData={formData} 
          handleChange={handleChange} 
          handleSubmit={handleSubmit} 
          InstructorField={InstructorField} 
          setView={setView} 
        />
      )}
    </div>
  );
};

export default InstructorForm;