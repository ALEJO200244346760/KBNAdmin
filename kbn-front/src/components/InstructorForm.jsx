import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Importación de componentes hijos
import Ingreso from './Ingreso';
import Egreso from './Egreso';
import Agenda from './Agenda';
import Estadisticas from './Estadisticas';

const InstructorForm = () => {
  const { user, loading: authLoading } = useAuth();
  const [view, setView] = useState('AGENDA'); 
  const [agendaItems, setAgendaItems] = useState([]);
  const [clasesFinalizadas, setClasesFinalizadas] = useState([]);
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

  // Sincronizar nombre del instructor desde el AuthContext
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        instructor: `${user.nombre} ${user.apellido}`
      }));
    }
  }, [user]);

  // Cálculos automáticos de totales
  useEffect(() => {
    const h = parseFloat(formData.horas) || 0;
    const t = parseFloat(formData.tarifa) || 0;
    const g = parseFloat(formData.gastos) || 0;
    const calculado = (h * t) - g;
    setFormData(prev => ({ ...prev, total: calculado > 0 ? calculado : 0 }));
  }, [formData.horas, formData.tarifa, formData.gastos]);

  // --- FETCH AGENDA (Monitor de clases asignadas) ---
  const fetchAgenda = useCallback(async () => {
    if (!user?.id) return;
    setLoadingAgenda(true);
    try {
      const res = await axios.get(`https://kbnadmin-production.up.railway.app/api/agenda/instructor/${user.id}`);
      const sorted = res.data.sort((a, b) => {
        const order = { 'PENDIENTE': 0, 'CONFIRMADA': 1, 'RECHAZADA': 2 };
        if (order[a.estado] !== order[b.estado]) return order[a.estado] - order[b.estado];
        return new Date(b.fecha) - new Date(a.fecha);
      });
      setAgendaItems(sorted);
    } catch (error) {
      console.error("Error cargando agenda:", error);
    } finally {
      setLoadingAgenda(false);
    }
  }, [user?.id]);

  // --- FETCH ESTADISTICAS (Historial de cobros para el 30%) ---
  const fetchEstadisticas = useCallback(async () => {
    if (!user?.nombre) return;
    try {
      const res = await axios.get('https://kbnadmin-production.up.railway.app/api/clases/listar');
      // Filtramos solo ingresos de este instructor
      const filtradas = res.data.filter(c => 
        c.instructor === `${user.nombre} ${user.apellido}` && 
        c.tipoTransaccion === 'INGRESO'
      );
      setClasesFinalizadas(filtradas);
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
    }
  }, [user]);

  // Efecto para cargar datos según la vista
  useEffect(() => {
    if (!authLoading) {
      if (view === 'AGENDA') fetchAgenda();
      if (view === 'ESTADISTICAS') fetchEstadisticas();
    }
  }, [view, authLoading, fetchAgenda, fetchEstadisticas]);

  // --- HANDLERS ---
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
      if (nuevoEstado === 'RECHAZADA') fetchAgenda();
    } catch (error) {
      alert("Error al actualizar estado.");
    }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const payload = {
      ...formData,
      tipoTransaccion: view,
      actividad: formData.actividad === 'Otro' ? formData.actividadOtro : formData.actividad,
      formaPago: formData.formaPago === 'Otro' ? formData.formaPagoOtro : formData.formaPago,
      cantidadHoras: String(formData.horas),
      tarifaPorHora: String(formData.tarifa),
      total: String(formData.total),
      gastosAsociados: String(formData.gastos || '0'),
      asignadoA: 'NINGUNO'
    };
    try {
      await axios.post('https://kbnadmin-production.up.railway.app/api/clases/guardar', payload);
      alert(`${view} registrado correctamente.`);
      // Reset campos variables
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
      <p className="font-black text-gray-300 animate-pulse italic uppercase tracking-tighter">Cargando Perfil...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 md:mt-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">
            Panel Instructor
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            <p className="text-indigo-600 font-black text-xs uppercase tracking-widest">{user?.nombre} {user?.apellido}</p>
          </div>
        </div>
        
        {/* Navegación */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
          {['AGENDA', 'INGRESO', 'EGRESO', 'ESTADISTICAS'].map(v => (
            <button 
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 md:flex-none px-5 py-3 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                view === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {v === 'ESTADISTICAS' ? '📊 Estadísticas' : v}
            </button>
          ))}
        </div>
      </div>

      {/* Vistas Dinámicas */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {view === 'AGENDA' && (
          <Agenda 
            agendaItems={agendaItems} 
            loadingAgenda={loadingAgenda} 
            handleStatusChange={handleStatusChange} 
          />
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

        {view === 'ESTADISTICAS' && (
          <Estadisticas clases={clasesFinalizadas} />
        )}
      </div>
    </div>
  );
};

export default InstructorForm;