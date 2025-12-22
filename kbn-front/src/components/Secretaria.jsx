import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Componentes financieros
import Ingreso from './Ingreso';
import Egreso from './Egreso';

const Secretaria = () => {
  const { user } = useAuth();
  const [view, setView] = useState('INICIO'); // INICIO, INGRESO, EGRESO, CALENDARIO, MONITOR
  const [instructors, setInstructors] = useState([]);
  const [agendaList, setAgendaList] = useState([]);
  const [loadingAgenda, setLoadingAgenda] = useState(false);

  // --- ESTADOS DE FORMULARIOS ---
  const today = new Date().toISOString().split('T')[0];
  
  const initialAgendaData = {
    alumno: '', fecha: today, hora: '10:00', instructorId: '',
    lugar: 'Escuela', tarifa: '', horas: 1, horasPagadas: 0,
    hotelDerivacion: '', estado: 'PENDIENTE'
  };
  const [agendaData, setAgendaData] = useState(initialAgendaData);

  const initialFinanceData = {
    tipoTransaccion: 'INGRESO', fecha: today, actividad: 'Clases',
    actividadOtro: '', vendedor: '', instructor: '', detalles: '',
    horas: 0, tarifa: 0, total: 0, gastos: 0, comision: 0,
    formaPago: 'Efectivo', formaPagoOtro: '', moneda: 'USD'
  };
  const [financeData, setFinanceData] = useState(initialFinanceData);

  // --- CARGA DE DATOS ---
  useEffect(() => {
    fetchInstructors();
    if (view === 'MONITOR') fetchAgenda();
  }, [view]);

  const fetchInstructors = async () => {
    try {
      const res = await axios.get('https://kbnadmin-production.up.railway.app/usuario');
      setInstructors(res.data);
    } catch (err) { console.error('Error instructores:', err); }
  };

  const fetchAgenda = async () => {
    setLoadingAgenda(true);
    try {
      const res = await axios.get('https://kbnadmin-production.up.railway.app/api/agenda/listar');
      // Ordenar: Rechazadas primero (para llamar la atención), luego pendientes, luego confirmadas
      const sorted = res.data.sort((a, b) => {
        const order = { 'RECHAZADA': 0, 'PENDIENTE': 1, 'CONFIRMADA': 2 };
        return order[a.estado] - order[b.estado];
      });
      setAgendaList(sorted);
    } catch (err) { console.error('Error agenda:', err); }
    setLoadingAgenda(false);
  };

  // --- LÓGICA DE AGENDA ---
  const handleAgendaSubmit = async (e) => {
    e.preventDefault();
    try {
      if (agendaData.id) {
        // Si tiene ID, es una edición (reasignación)
        await axios.post('https://kbnadmin-production.up.railway.app/api/agenda/crear', agendaData);
        alert("Clase reasignada exitosamente.");
      } else {
        await axios.post('https://kbnadmin-production.up.railway.app/api/agenda/crear', agendaData);
        alert("Clase creada exitosamente.");
      }
      setAgendaData(initialAgendaData);
      setView('MONITOR');
    } catch (err) { alert("Error al guardar en agenda"); }
  };

  const prepararReasignacion = (clase) => {
    setAgendaData({
      ...clase,
      estado: 'PENDIENTE' // Al reasignar, vuelve a estar pendiente
    });
    setView('CALENDARIO');
  };

  // --- LÓGICA FINANCIERA ---
  const handleFinanceSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://kbnadmin-production.up.railway.app/api/clases/guardar', financeData);
      alert(`${view} registrado.`);
      setView('INICIO');
    } catch (err) { alert("Error en finanzas"); }
  };

  // --- RENDER VISTAS ---

  if (view === 'INICIO') {
    return (
      <div className="max-w-5xl mx-auto p-6 mt-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center uppercase tracking-wider">Centro de Mandos Secretaria</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MenuCard icon="🖥️" title="Monitor" sub="Ver estados" color="bg-gray-800" onClick={() => setView('MONITOR')} />
          <MenuCard icon="📅" title="Agendar" sub="Nueva clase" color="bg-indigo-600" onClick={() => setView('CALENDARIO')} />
          <MenuCard icon="💰" title="Ingreso" sub="Caja" color="bg-green-600" onClick={() => setView('INGRESO')} />
          <MenuCard icon="💸" title="Egreso" sub="Gastos" color="bg-red-600" onClick={() => setView('EGRESO')} />
        </div>
      </div>
    );
  }

  if (view === 'MONITOR') {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">📋 Monitor de Clases</h2>
          <button onClick={() => setView('INICIO')} className="text-indigo-600 font-bold">← Volver</button>
        </div>

        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
              <tr>
                <th className="p-4">Estado</th>
                <th className="p-4">Alumno</th>
                <th className="p-4">Instructor</th>
                <th className="p-4">Fecha/Hora</th>
                <th className="p-4">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agendaList.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition">
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      item.estado === 'CONFIRMADA' ? 'bg-green-100 text-green-700' : 
                      item.estado === 'RECHAZADA' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.estado}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-gray-700">{item.alumno}</td>
                  <td className="p-4 text-gray-600">{item.nombreInstructor}</td>
                  <td className="p-4 text-sm text-gray-500">{item.fecha} - {item.hora.substring(0,5)} hs</td>
                  <td className="p-4">
                    {item.estado === 'RECHAZADA' && (
                      <button 
                        onClick={() => prepararReasignacion(item)}
                        className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg font-bold hover:bg-indigo-700"
                      >
                        Reasignar
                      </button>
                    )}
                    {item.estado === 'PENDIENTE' && (
                      <span className="text-xs text-gray-400 italic">Esperando...</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {agendaList.length === 0 && <p className="p-10 text-center text-gray-400">No hay clases en la agenda.</p>}
        </div>
      </div>
    );
  }

  if (view === 'CALENDARIO') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white shadow-2xl rounded-3xl mt-10">
        <h2 className="text-2xl font-black text-center mb-6 uppercase">{agendaData.id ? '🔄 Reasignar Clase' : '📅 Nueva Clase'}</h2>
        <form onSubmit={handleAgendaSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Alumno" value={agendaData.alumno} onChange={e => setAgendaData({...agendaData, alumno: e.target.value})} className="p-3 bg-gray-50 rounded-xl w-full border" required />
            <select value={agendaData.instructorId} onChange={e => setAgendaData({...agendaData, instructorId: Number(e.target.value)})} className="p-3 bg-gray-50 rounded-xl w-full border" required>
              <option value="">Seleccionar Instructor</option>
              {instructors.map(i => <option key={i.id} value={i.id}>{i.nombre} {i.apellido}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input type="date" value={agendaData.fecha} onChange={e => setAgendaData({...agendaData, fecha: e.target.value})} className="p-3 bg-gray-50 rounded-xl w-full border" />
            <input type="time" value={agendaData.hora} onChange={e => setAgendaData({...agendaData, hora: e.target.value})} className="p-3 bg-gray-50 rounded-xl w-full border" />
          </div>
          <input type="text" placeholder="Lugar" value={agendaData.lugar} onChange={e => setAgendaData({...agendaData, lugar: e.target.value})} className="p-3 bg-gray-50 rounded-xl w-full border" />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-indigo-600 text-white p-4 rounded-2xl font-bold uppercase">Confirmar</button>
            <button type="button" onClick={() => setView('MONITOR')} className="bg-gray-100 p-4 rounded-2xl font-bold uppercase">Cancelar</button>
          </div>
        </form>
      </div>
    );
  }

  // Vistas de ingreso/egreso (reutilizando componentes pasados)
  if (view === 'INGRESO' || view === 'EGRESO') {
    const Component = view === 'INGRESO' ? Ingreso : Egreso;
    return (
      <Component 
        formData={financeData} 
        handleChange={e => setFinanceData({...financeData, [e.target.name]: e.target.value})} 
        handleSubmit={handleFinanceSubmit} 
        InstructorField={() => (
          <select className="w-full border p-2 rounded" onChange={e => setFinanceData({...financeData, instructor: e.target.value})}>
            <option value="">Seleccionar...</option>
            {instructors.map(i => <option key={i.id} value={`${i.nombre} ${i.apellido}`}>{i.nombre} {i.apellido}</option>)}
          </select>
        )}
        setView={setView} 
      />
    );
  }

  return null;
};

// Componente visual pequeño
const MenuCard = ({ icon, title, sub, color, onClick }) => (
  <button onClick={onClick} className={`${color} p-6 rounded-3xl text-white text-center transition-transform hover:scale-105 shadow-xl`}>
    <div className="text-4xl mb-2">{icon}</div>
    <div className="font-black uppercase text-lg">{title}</div>
    <div className="text-[10px] opacity-70 uppercase font-bold tracking-widest">{sub}</div>
  </button>
);

export default Secretaria;