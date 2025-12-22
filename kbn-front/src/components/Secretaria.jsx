import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
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

  const [financeData, setFinanceData] = useState({
    tipoTransaccion: 'INGRESO', fecha: today, actividad: 'Clases',
    instructor: '', detalles: '', horas: 0, tarifa: 0, total: 0,
    gastos: 0, comision: 0, formaPago: 'Efectivo', moneda: 'USD'
  });

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
      alert(agendaData.id ? "Clase reasignada!" : "Clase creada!");
      setAgendaData(initialAgendaData);
      setView('MONITOR');
    } catch (err) { alert("Error al guardar"); }
  };

  const prepararReasignacion = (clase) => {
    setAgendaData({ ...clase, estado: 'PENDIENTE' });
    setView('CALENDARIO');
  };

  if (view === 'INICIO') {
    return (
      <div className="max-w-4xl mx-auto p-4 mt-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-gray-800 uppercase italic tracking-tighter">KBN STATION</h1>
          <p className="text-indigo-600 font-bold text-sm uppercase tracking-widest">Secretaría & Control</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MenuCard icon="🖥️" title="Monitor" color="bg-gray-900" onClick={() => setView('MONITOR')} />
          <MenuCard icon="📅" title="Agendar" color="bg-indigo-600" onClick={() => setView('CALENDARIO')} />
          <MenuCard icon="💰" title="Ingreso" color="bg-emerald-500" onClick={() => setView('INGRESO')} />
          <MenuCard icon="💸" title="Egreso" color="bg-rose-500" onClick={() => setView('EGRESO')} />
        </div>
      </div>
    );
  }

  if (view === 'MONITOR') {
    return (
      <div className="max-w-6xl mx-auto p-4 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-gray-800 uppercase">Monitor de Agenda</h2>
          <button onClick={() => setView('INICIO')} className="bg-gray-100 px-4 py-2 rounded-xl font-bold text-xs uppercase">Volver</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agendaList.map(item => (
            <div key={item.id} className={`bg-white p-5 rounded-3xl shadow-sm border-t-8 transition-all ${
              item.estado === 'RECHAZADA' ? 'border-rose-500 ring-2 ring-rose-50' : 
              item.estado === 'CONFIRMADA' ? 'border-emerald-500' : 'border-amber-400'
            }`}>
              <div className="flex justify-between items-start mb-3">
                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${
                  item.estado === 'RECHAZADA' ? 'bg-rose-100 text-rose-600' : 
                  item.estado === 'CONFIRMADA' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                }`}>{item.estado}</span>
                <p className="text-[10px] font-bold text-gray-400 uppercase">{item.fecha} | {item.hora?.substring(0,5)} hs</p>
              </div>

              <h3 className="text-lg font-black text-gray-800 uppercase leading-tight mb-1">{item.alumno}</h3>
              <p className="text-xs font-bold text-indigo-600 uppercase mb-3">🏄‍♂️ {item.nombreInstructor}</p>
              
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-gray-50 p-3 rounded-2xl font-bold text-gray-500 uppercase">
                <div className="flex flex-col"><span>Lugar:</span><span className="text-gray-800">{item.lugar}</span></div>
                <div className="flex flex-col"><span>Hotel:</span><span className="text-gray-800">{item.hotelDerivacion || '-'}</span></div>
                <div className="flex flex-col"><span>Tarifa:</span><span className="text-gray-800">${item.tarifa} ({item.horas}h)</span></div>
                <div className="flex flex-col"><span>Pagado:</span><span className="text-emerald-600">${item.horasPagadas}</span></div>
              </div>

              {item.estado === 'RECHAZADA' && (
                <button onClick={() => prepararReasignacion(item)} className="w-full mt-4 bg-gray-900 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-colors">Reasignar Instructor</button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'CALENDARIO') {
    return (
      <div className="max-w-xl mx-auto p-4 pb-20">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border border-gray-100">
          <h2 className="text-2xl font-black text-center mb-8 uppercase tracking-tighter italic">
            {agendaData.id ? '🔄 Reasignar Clase' : '📅 Nueva Asignación'}
          </h2>
          <form onSubmit={handleAgendaSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 ml-3 uppercase">Información del Alumno</label>
              <input type="text" placeholder="Nombre completo del alumno" value={agendaData.alumno} onChange={e => setAgendaData({...agendaData, alumno: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold focus:ring-2 focus:ring-indigo-500" required />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 ml-3 uppercase">Asignar Profesional</label>
              <select value={agendaData.instructorId} onChange={e => setAgendaData({...agendaData, instructorId: Number(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold" required>
                <option value="">Seleccionar Instructor...</option>
                {instructors.map(i => <option key={i.id} value={i.id}>{i.nombre} {i.apellido}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={agendaData.fecha} onChange={e => setAgendaData({...agendaData, fecha: e.target.value})} className="p-4 bg-gray-50 rounded-2xl border-none font-bold" />
              <input type="time" value={agendaData.hora} onChange={e => setAgendaData({...agendaData, hora: e.target.value})} className="p-4 bg-gray-50 rounded-2xl border-none font-bold" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Lugar (Spot)" value={agendaData.lugar} onChange={e => setAgendaData({...agendaData, lugar: e.target.value})} className="p-4 bg-gray-50 rounded-2xl border-none font-bold" />
              <input type="text" placeholder="Hotel / Origen" value={agendaData.hotelDerivacion} onChange={e => setAgendaData({...agendaData, hotelDerivacion: e.target.value})} className="p-4 bg-gray-50 rounded-2xl border-none font-bold" />
            </div>

            <div className="grid grid-cols-3 gap-2 bg-indigo-50 p-4 rounded-3xl">
              <div className="flex flex-col items-center">
                <label className="text-[9px] font-black text-indigo-400 uppercase mb-1">Tarifa $</label>
                <input type="number" value={agendaData.tarifa} onChange={e => setAgendaData({...agendaData, tarifa: e.target.value})} className="w-full p-2 bg-white rounded-xl text-center font-bold" placeholder="0" />
              </div>
              <div className="flex flex-col items-center">
                <label className="text-[9px] font-black text-indigo-400 uppercase mb-1">Horas</label>
                <input type="number" value={agendaData.horas} onChange={e => setAgendaData({...agendaData, horas: e.target.value})} className="w-full p-2 bg-white rounded-xl text-center font-bold" placeholder="1" />
              </div>
              <div className="flex flex-col items-center">
                <label className="text-[9px] font-black text-indigo-400 uppercase mb-1">Pagado $</label>
                <input type="number" value={agendaData.horasPagadas} onChange={e => setAgendaData({...agendaData, horasPagadas: e.target.value})} className="w-full p-2 bg-white rounded-xl text-center font-bold" placeholder="0" />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button type="submit" className="flex-2 bg-gray-900 text-white p-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-gray-200 w-full">Confirmar</button>
              <button type="button" onClick={() => setView('INICIO')} className="flex-1 bg-gray-100 text-gray-400 p-4 rounded-2xl font-black uppercase">X</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Finanzas: INGRESO / EGRESO
  if (view === 'INGRESO' || view === 'EGRESO') {
    const Component = view === 'INGRESO' ? Ingreso : Egreso;
    return (
      <Component 
        formData={financeData} 
        handleChange={e => setFinanceData({...financeData, [e.target.name]: e.target.value})} 
        handleSubmit={async (e) => {
          e.preventDefault();
          try {
            await axios.post('https://kbnadmin-production.up.railway.app/api/clases/guardar', { ...financeData, tipoTransaccion: view });
            alert("Operación financiera exitosa!");
            setView('INICIO');
          } catch (err) { alert("Error"); }
        }} 
        InstructorField={() => (
          <select className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-none" onChange={e => setFinanceData({...financeData, instructor: e.target.value})}>
            <option value="">Seleccionar Instructor...</option>
            {instructors.map(i => <option key={i.id} value={`${i.nombre} ${i.apellido}`}>{i.nombre} {i.apellido}</option>)}
          </select>
        )}
        setView={setView} 
      />
    );
  }

  return null;
};

const MenuCard = ({ icon, title, color, onClick }) => (
  <button onClick={onClick} className={`${color} aspect-square rounded-[2rem] text-white flex flex-col items-center justify-center transition-all active:scale-95 shadow-xl`}>
    <span className="text-3xl mb-1">{icon}</span>
    <span className="font-black uppercase text-[10px] tracking-tighter">{title}</span>
  </button>
);

export default Secretaria;