import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Componentes financieros reutilizados
import Ingreso from './Ingreso';
import Egreso from './Egreso';

const Secretaria = () => {
  const { user } = useAuth();
  const [view, setView] = useState('INICIO'); 
  const [instructors, setInstructors] = useState([]);
  const [agendaList, setAgendaList] = useState([]);
  const [loadingAgenda, setLoadingAgenda] = useState(false);

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
      const sorted = res.data.sort((a, b) => {
        const order = { 'RECHAZADA': 0, 'PENDIENTE': 1, 'CONFIRMADA': 2 };
        return order[a.estado] - order[b.estado] || new Date(b.fecha) - new Date(a.fecha);
      });
      setAgendaList(sorted);
    } catch (err) { console.error('Error agenda:', err); }
    setLoadingAgenda(false);
  };

  const handleAgendaSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://kbnadmin-production.up.railway.app/api/agenda/crear', agendaData);
      alert(agendaData.id ? "Clase reasignada con éxito" : "Clase agendada con éxito");
      setAgendaData(initialAgendaData);
      setView('MONITOR');
    } catch (err) { alert("Error al guardar en agenda"); }
  };

  const prepararReasignacion = (clase) => {
    setAgendaData({ ...clase, estado: 'PENDIENTE' });
    setView('CALENDARIO');
  };

  const handleFinanceSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://kbnadmin-production.up.railway.app/api/clases/guardar', financeData);
      alert(`${view} registrado.`);
      setView('INICIO');
    } catch (err) { alert("Error en finanzas"); }
  };

  // --- VISTA INICIO ---
  if (view === 'INICIO') {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-10 mt-5">
        <h1 className="text-2xl md:text-3xl font-black text-gray-800 mb-8 text-center uppercase italic tracking-tighter">Estación Secretaria KBN</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          <MenuCard icon="🖥️" title="Monitor" sub="Estados" color="bg-gray-900" onClick={() => setView('MONITOR')} />
          <MenuCard icon="📅" title="Agendar" sub="Nueva" color="bg-indigo-600" onClick={() => setView('CALENDARIO')} />
          <MenuCard icon="💰" title="Ingreso" sub="Caja" color="bg-emerald-600" onClick={() => setView('INGRESO')} />
          <MenuCard icon="💸" title="Egreso" sub="Gastos" color="bg-rose-600" onClick={() => setView('EGRESO')} />
        </div>
      </div>
    );
  }

  // --- VISTA MONITOR (RESPONSIVE) ---
  if (view === 'MONITOR') {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black uppercase text-gray-800 italic">Monitor de Operaciones</h2>
          <button onClick={() => setView('INICIO')} className="text-indigo-600 font-bold text-sm">← VOLVER</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loadingAgenda ? <p className="col-span-full text-center py-10">Cargando agenda...</p> : 
            agendaList.map(item => (
            <div key={item.id} className={`bg-white rounded-2xl p-5 shadow-sm border-t-4 transition-all ${
              item.estado === 'RECHAZADA' ? 'border-rose-500 bg-rose-50' : 
              item.estado === 'PENDIENTE' ? 'border-amber-400' : 'border-emerald-500'
            }`}>
              <div className="flex justify-between items-start mb-3">
                <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter ${
                  item.estado === 'RECHAZADA' ? 'bg-rose-100 text-rose-700' : 
                  item.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {item.estado === 'PENDIENTE' ? '⏳ Pendiente Confirmar' : item.estado}
                </span>
                <p className="text-[10px] font-bold text-gray-400">{item.fecha}</p>
              </div>

              <h3 className="font-black text-gray-800 uppercase truncate">{item.alumno}</h3>
              <p className="text-xs font-bold text-indigo-600 mb-2">🏄‍♂️ {item.nombreInstructor}</p>
              
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/50 p-2 rounded-lg border border-gray-100 font-bold text-gray-500 mb-3">
                <p>📍 {item.lugar}</p>
                <p>🏨 {item.hotelDerivacion || 'Sin Hotel'}</p>
                <p>⏱️ {item.horas} hs</p>
                <p className="text-emerald-600">💵 ${item.tarifa}</p>
              </div>

              <div className="flex justify-between items-center border-t pt-3 mt-auto">
                <p className="text-[10px] font-black text-gray-400 uppercase">Pagado: ${item.horasPagadas || 0}</p>
                {item.estado === 'RECHAZADA' && (
                  <button onClick={() => prepararReasignacion(item)} className="bg-rose-600 text-white text-[10px] px-3 py-1.5 rounded-lg font-black uppercase hover:bg-rose-700">Reasignar Instructor</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- VISTA AGENDAR (FORMULARIO PROLIJO) ---
  if (view === 'CALENDARIO') {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8 bg-white shadow-2xl rounded-[2rem] mt-5 md:mt-10 border border-gray-100">
        <h2 className="text-xl font-black text-center mb-8 uppercase italic">{agendaData.id ? '🔄 Reasignar Clase' : '📅 Nueva Asignación'}</h2>
        <form onSubmit={handleAgendaSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Alumno</label>
              <input type="text" placeholder="Nombre completo" value={agendaData.alumno} onChange={e => setAgendaData({...agendaData, alumno: e.target.value})} className="p-4 bg-gray-50 rounded-2xl w-full border-none focus:ring-2 focus:ring-indigo-500 font-bold" required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Instructor</label>
              <select value={agendaData.instructorId} onChange={e => setAgendaData({...agendaData, instructorId: Number(e.target.value)})} className="p-4 bg-gray-50 rounded-2xl w-full border-none focus:ring-2 focus:ring-indigo-500 font-bold" required>
                <option value="">Seleccionar...</option>
                {instructors.map(i => <option key={i.id} value={i.id}>{i.nombre} {i.apellido}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Fecha</label>
              <input type="date" value={agendaData.fecha} onChange={e => setAgendaData({...agendaData, fecha: e.target.value})} className="p-4 bg-gray-50 rounded-2xl w-full border-none font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Hora</label>
              <input type="time" value={agendaData.hora} onChange={e => setAgendaData({...agendaData, hora: e.target.value})} className="p-4 bg-gray-50 rounded-2xl w-full border-none font-bold" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Spot / Lugar de clase" value={agendaData.lugar} onChange={e => setAgendaData({...agendaData, lugar: e.target.value})} className="p-4 bg-gray-50 rounded-2xl w-full border-none font-bold shadow-inner" />
            <input type="text" placeholder="Hotel o Derivación" value={agendaData.hotelDerivacion} onChange={e => setAgendaData({...agendaData, hotelDerivacion: e.target.value})} className="p-4 bg-gray-50 rounded-2xl w-full border-none font-bold shadow-inner" />
          </div>

          <div className="grid grid-cols-3 gap-2 bg-indigo-50/50 p-4 rounded-[1.5rem] border border-indigo-100">
            <div>
              <label className="text-[9px] font-black text-indigo-400 uppercase ml-1">Tarifa $</label>
              <input type="number" placeholder="0" value={agendaData.tarifa} onChange={e => setAgendaData({...agendaData, tarifa: e.target.value})} className="w-full bg-transparent border-none text-lg font-black text-indigo-700 p-1" />
            </div>
            <div>
              <label className="text-[9px] font-black text-indigo-400 uppercase ml-1">Horas</label>
              <input type="number" value={agendaData.horas} onChange={e => setAgendaData({...agendaData, horas: e.target.value})} className="w-full bg-transparent border-none text-lg font-black text-indigo-700 p-1" />
            </div>
            <div>
              <label className="text-[9px] font-black text-indigo-400 uppercase ml-1">Seña $</label>
              <input type="number" value={agendaData.horasPagadas} onChange={e => setAgendaData({...agendaData, horasPagadas: e.target.value})} className="w-full bg-transparent border-none text-lg font-black text-indigo-700 p-1" />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 pt-4">
            <button type="submit" className="flex-1 bg-indigo-600 text-white p-5 rounded-2xl font-black uppercase shadow-lg shadow-indigo-100 hover:scale-[1.02] transition-all">Confirmar Asignación</button>
            <button type="button" onClick={() => setView('INICIO')} className="bg-gray-100 text-gray-500 p-5 rounded-2xl font-black uppercase hover:bg-gray-200 transition-all">Cancelar</button>
          </div>
        </form>
      </div>
    );
  }

  // --- VISTAS FINANZAS ---
  if (view === 'INGRESO' || view === 'EGRESO') {
    const Component = view === 'INGRESO' ? Ingreso : Egreso;
    return (
      <Component 
        formData={financeData} 
        handleChange={e => setFinanceData({...financeData, [e.target.name]: e.target.value})} 
        handleSubmit={handleFinanceSubmit} 
        InstructorField={() => (
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Asociar Instructor</label>
            <select className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold" onChange={e => setFinanceData({...financeData, instructor: e.target.value})}>
              <option value="">Seleccionar...</option>
              {instructors.map(i => <option key={i.id} value={`${i.nombre} ${i.apellido}`}>{i.nombre} {i.apellido}</option>)}
            </select>
          </div>
        )}
        setView={setView} 
      />
    );
  }
  return null;
};

const MenuCard = ({ icon, title, sub, color, onClick }) => (
  <button onClick={onClick} className={`${color} p-5 md:p-8 rounded-[2rem] text-white text-center transition-all active:scale-95 shadow-xl hover:shadow-2xl`}>
    <div className="text-3xl md:text-5xl mb-2">{icon}</div>
    <div className="font-black uppercase text-sm md:text-xl tracking-tighter leading-none">{title}</div>
    <div className="text-[9px] md:text-[10px] opacity-60 uppercase font-black tracking-widest mt-1">{sub}</div>
  </button>
);

export default Secretaria;