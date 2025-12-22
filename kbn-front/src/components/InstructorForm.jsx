import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

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

  // Sincronizar nombre del instructor cuando el usuario carga
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        instructor: `${user.nombre} ${user.apellido}`
      }));
    }
  }, [user]);

  const fetchAgenda = useCallback(async () => {
    if (!user?.id) return;
    
    setLoadingAgenda(true);
    try {
      const res = await axios.get(`https://kbnadmin-production.up.railway.app/api/agenda/instructor/${user.id}`);
      const sorted = res.data.sort((a, b) => {
        // Pendientes arriba
        if (a.estado === 'PENDIENTE' && b.estado !== 'PENDIENTE') return -1;
        if (a.estado !== 'PENDIENTE' && b.estado === 'PENDIENTE') return 1;
        // Luego por fecha descendente
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
    } catch (error) {
      alert("Error al actualizar estado.");
      fetchAgenda();
    }
  };

  useEffect(() => {
    if (view === 'INGRESO') {
      const totalCalc = (parseFloat(formData.horas) || 0) * (parseFloat(formData.tarifa) || 0) - (parseFloat(formData.gastos) || 0);
      setFormData(prev => ({ ...prev, total: totalCalc >= 0 ? totalCalc : 0 }));
    }
  }, [formData.horas, formData.tarifa, formData.gastos, view]);

  const handleChange = e => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const payload = {
      ...formData,
      tipoTransaccion: view,
      actividad: formData.actividad === 'Otro' ? formData.actividadOtro : formData.actividad,
      formaPago: formData.formaPago === 'Otro' ? formData.formaPagoOtro : formData.formaPago,
      cantidadHoras: view === 'EGRESO' ? '0' : String(formData.horas),
      tarifaPorHora: view === 'EGRESO' ? '0' : String(formData.tarifa),
      total: view === 'EGRESO' ? '0' : String(formData.total),
      gastosAsociados: String(formData.gastos || '0'),
      asignadoA: 'NINGUNO'
    };

    try {
      await axios.post('https://kbnadmin-production.up.railway.app/api/clases/guardar', payload);
      alert(`${view} guardado correctamente.`);
      setView('AGENDA');
    } catch (error) {
      alert('Error al guardar registro.');
    }
  };

  const InstructorField = () => (
    <div className="mb-4">
      <label className="block text-sm font-bold text-gray-700 uppercase mb-1">Instructor</label>
      <input
        type="text"
        value={formData.instructor}
        readOnly
        className="w-full p-2 bg-gray-100 border rounded text-gray-600 font-semibold"
      />
    </div>
  );

  if (authLoading) return <div className="text-center mt-20">Cargando perfil...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-6 rounded-xl shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">
            Panel Instructor
          </h1>
          <p className="text-indigo-600 font-medium">{user?.nombre} {user?.apellido}</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl">
          {['AGENDA','INGRESO','EGRESO'].map(v => (
            <button 
              key={v}
              onClick={() => setView(v)}
              className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                view === v ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-200'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'AGENDA' && (
        <div className="grid gap-4">
          {loadingAgenda ? (
            <p className="text-center py-10">Actualizando agenda...</p>
          ) : agendaItems.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl text-center border-2 border-dashed">
              <span className="text-4xl">🏝️</span>
              <p className="mt-2 text-gray-500 font-medium">No tienes clases asignadas por ahora.</p>
            </div>
          ) : (
            agendaItems.map(item => (
              <div key={item.id} className={`bg-white p-5 rounded-2xl shadow-sm border-l-8 ${
                item.estado === 'PENDIENTE' ? 'border-amber-400' : 
                item.estado === 'CONFIRMADA' ? 'border-emerald-500' : 'border-gray-300'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{item.fecha} - {item.hora?.substring(0,5)} HS</span>
                    <h3 className="text-xl font-bold text-gray-800">{item.alumno}</h3>
                  </div>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${
                    item.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {item.estado}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4 bg-gray-50 p-3 rounded-xl">
                  <div><p className="text-gray-400 text-[10px] uppercase font-bold">Lugar</p><p className="font-semibold">{item.lugar}</p></div>
                  <div><p className="text-gray-400 text-[10px] uppercase font-bold">Horas</p><p className="font-semibold">{item.horas}h</p></div>
                  <div><p className="text-gray-400 text-[10px] uppercase font-bold">Tarifa</p><p className="font-semibold">${item.tarifa}</p></div>
                  <div><p className="text-gray-400 text-[10px] uppercase font-bold">Pagado</p><p className="font-semibold text-emerald-600">${item.horasPagadas}</p></div>
                </div>

                {item.estado === 'PENDIENTE' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleStatusChange(item.id, 'CONFIRMADA')} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold text-xs uppercase hover:bg-emerald-600 transition shadow-md shadow-emerald-100">Confirmar</button>
                    <button onClick={() => handleStatusChange(item.id, 'RECHAZADA')} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-xs uppercase hover:bg-gray-200 transition">Rechazar</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {view === 'INGRESO' && <Ingreso formData={formData} handleChange={handleChange} handleSubmit={handleSubmit} InstructorField={InstructorField} setView={setView} />}
      {view === 'EGRESO' && <Egreso formData={formData} handleChange={handleChange} handleSubmit={handleSubmit} InstructorField={InstructorField} setView={setView} />}
    </div>
  );
};

export default InstructorForm;