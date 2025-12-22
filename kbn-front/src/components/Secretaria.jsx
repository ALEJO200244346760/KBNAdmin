import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Reutilizamos los componentes existentes
import Ingreso from './Ingreso';
import Egreso from './Egreso';

const Secretaria = () => {
  const { user } = useAuth();
  const [view, setView] = useState('INICIO'); // INICIO, INGRESO, EGRESO, CALENDARIO, MONITOR
  const [instructors, setInstructors] = useState([]);
  const [agendaList, setAgendaList] = useState([]);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // --- ESTADOS INICIALES ---
  const initialFinanceData = {
    tipoTransaccion: 'INGRESO', fecha: today, actividad: 'Clases',
    actividadOtro: '', vendedor: '', instructor: '', detalles: '',
    horas: 0, tarifa: 0, total: 0, gastos: 0, comision: 0,
    formaPago: 'Efectivo', formaPagoOtro: '', moneda: 'USD'
  };
  const [financeData, setFinanceData] = useState(initialFinanceData);

  const initialAgendaData = {
    alumno: '', fecha: today, hora: '10:00', instructorId: '',
    lugar: 'Escuela', tarifa: '', horas: 1, horasPagadas: 0,
    hotelDerivacion: '', estado: 'PENDIENTE'
  };
  const [agendaData, setAgendaData] = useState(initialAgendaData);

  // --- CARGA DE DATOS CENTRALIZADA ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resUsers, resAgenda] = await Promise.all([
        axios.get('https://kbnadmin-production.up.railway.app/usuario'),
        axios.get('https://kbnadmin-production.up.railway.app/api/agenda/listar')
      ]);
      
      setInstructors(resUsers.data);
      
      const sorted = resAgenda.data.sort((a, b) => {
        const order = { 'PENDIENTE': 0, 'CONFIRMADA': 1, 'RECHAZADA': 2 };
        return order[a.estado] - order[b.estado] || new Date(b.fecha) - new Date(a.fecha);
      });
      setAgendaList(sorted);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- LÓGICA DE FINANZAS ---
  useEffect(() => {
    if (view === 'INGRESO') {
      const h = parseFloat(financeData.horas) || 0;
      const t = parseFloat(financeData.tarifa) || 0;
      const g = parseFloat(financeData.gastos) || 0;
      setFinanceData(prev => ({ ...prev, total: (h * t) - g }));
    }
  }, [financeData.horas, financeData.tarifa, financeData.gastos, view]);

  const handleFinanceSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { 
        ...financeData, 
        tipoTransaccion: view,
        actividad: financeData.actividad === 'Otro' ? financeData.actividadOtro : financeData.actividad,
        formaPago: financeData.formaPago === 'Otro' ? financeData.formaPagoOtro : financeData.formaPago,
        total: String(financeData.total) 
      };
      await axios.post('https://kbnadmin-production.up.railway.app/api/clases/guardar', payload);
      alert(`${view} registrado correctamente.`);
      setFinanceData(initialFinanceData);
      setView('INICIO');
    } catch (err) { alert("Error en finanzas"); }
  };

  // --- LÓGICA DE AGENDA ---
  const handleAgendaSubmit = async (e) => {
    e.preventDefault();
    if (!agendaData.instructorId) return alert("Selecciona un instructor");
    try {
      await axios.post('https://kbnadmin-production.up.railway.app/api/agenda/crear', agendaData);
      alert("Clase agendada con éxito");
      setAgendaData(initialAgendaData);
      fetchData(); // Refrescar lista
      setView('MONITOR');
    } catch (err) { alert("Error al agendar"); }
  };

  const prepararReasignacion = (clase) => {
    setAgendaData({ ...clase, estado: 'PENDIENTE' });
    setView('CALENDARIO');
  };

  // --- SUB-COMPONENTES ---
  const InstructorSelector = ({ value, onChange, label, name, isId = false }) => (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-gray-400 uppercase ml-2">{label}</label>
      <select 
        name={name}
        value={value} 
        onChange={onChange} 
        className="p-4 bg-gray-50 rounded-2xl w-full border-none focus:ring-2 focus:ring-indigo-500 font-bold" 
        required
      >
        <option value="">{instructors.length > 0 ? "Seleccionar..." : "Cargando..."}</option>
        {instructors.map(i => (
          <option key={i.id} value={isId ? i.id : `${i.nombre} ${i.apellido}`}>
            {i.nombre} {i.apellido}
          </option>
        ))}
      </select>
    </div>
  );

  // --- VISTAS ---

  if (view === 'INICIO') {
    return (
      <div className="max-w-5xl mx-auto p-6 mt-10 text-center">
        <h1 className="text-3xl font-black text-gray-800 mb-2 uppercase italic tracking-tighter">Panel Secretaria</h1>
        <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-8">Gestión de Clases y Caja</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MenuCard icon="🖥️" title="Monitor" sub="Ver Estados" color="bg-gray-900" onClick={() => setView('MONITOR')} />
          <MenuCard icon="📅" title="Agendar" sub="Nueva Clase" color="bg-indigo-600" onClick={() => setView('CALENDARIO')} />
          <MenuCard icon="💰" title="Ingreso" sub="Cobros" color="bg-emerald-600" onClick={() => setView('INGRESO')} />
          <MenuCard icon="💸" title="Egreso" sub="Gastos" color="bg-rose-600" onClick={() => setView('EGRESO')} />
        </div>
      </div>
    );
  }

  if (view === 'MONITOR') {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black uppercase text-gray-800 italic">Monitor de Operaciones</h2>
          <button onClick={() => setView('INICIO')} className="bg-gray-100 px-4 py-2 rounded-xl text-gray-500 font-bold text-xs uppercase">← Volver</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? <p className="col-span-full text-center py-10 font-bold text-gray-400">Actualizando...</p> : 
            agendaList.map(item => (
            <div key={item.id} className={`bg-white rounded-[2rem] p-6 shadow-sm border-t-8 transition-all ${
              item.estado === 'RECHAZADA' ? 'border-rose-500' : 
              item.estado === 'PENDIENTE' ? 'border-amber-400' : 'border-emerald-500'
            }`}>
              <div className="flex justify-between mb-2">
                <span className="text-[10px] font-black text-gray-400 uppercase">{item.fecha}</span>
                <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase ${
                  item.estado === 'RECHAZADA' ? 'bg-rose-100 text-rose-600' : 'bg-gray-100'
                }`}>{item.estado}</span>
              </div>
              <h3 className="font-black text-gray-800 uppercase text-lg leading-tight">{item.alumno}</h3>
              <p className="text-xs font-bold text-indigo-600 mb-4 tracking-wide">INSTRUCTOR: {item.nombreInstructor}</p>
              
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-gray-50 p-4 rounded-2xl font-bold text-gray-500 mb-4">
                <p className="truncate">📍 {item.lugar}</p>
                <p>⏱️ {item.horas} hs / {item.hora?.substring(0,5)}</p>
                <p className="text-emerald-600">💵 ${item.tarifa}</p>
                <p>🏨 {item.hotelDerivacion || 'Sin Hotel'}</p>
              </div>

              {item.estado === 'RECHAZADA' && (
                <button onClick={() => prepararReasignacion(item)} className="w-full bg-rose-600 text-white text-[10px] py-3 rounded-xl font-black uppercase shadow-lg shadow-rose-100">Reasignar Instructor</button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'CALENDARIO') {
    return (
      <div className="max-w-2xl mx-auto p-6 md:p-10 bg-white shadow-2xl rounded-[2.5rem] mt-5">
        <h2 className="text-2xl font-black text-center mb-8 uppercase italic tracking-tighter">📅 {agendaData.id ? 'Reasignar Clase' : 'Agendar Nueva Clase'}</h2>
        <form onSubmit={handleAgendaSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Alumno</label>
              <input type="text" value={agendaData.alumno} onChange={e => setAgendaData({...agendaData, alumno: e.target.value})} className="p-4 bg-gray-50 rounded-2xl w-full border-none font-bold" required />
            </div>
            <InstructorSelector label="Instructor" name="instructorId" isId={true} value={agendaData.instructorId} onChange={e => setAgendaData({...agendaData, instructorId: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input type="date" value={agendaData.fecha} onChange={e => setAgendaData({...agendaData, fecha: e.target.value})} className="p-4 bg-gray-50 rounded-2xl w-full border-none font-bold" />
            <input type="time" value={agendaData.hora} onChange={e => setAgendaData({...agendaData, hora: e.target.value})} className="p-4 bg-gray-50 rounded-2xl w-full border-none font-bold" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Lugar" value={agendaData.lugar} onChange={e => setAgendaData({...agendaData, lugar: e.target.value})} className="p-4 bg-gray-50 rounded-2xl w-full border-none font-bold" />
            <input type="text" placeholder="Hotel/Derivación" value={agendaData.hotelDerivacion} onChange={e => setAgendaData({...agendaData, hotelDerivacion: e.target.value})} className="p-4 bg-gray-50 rounded-2xl w-full border-none font-bold" />
          </div>
          <div className="grid grid-cols-3 gap-3 bg-indigo-50 p-6 rounded-[2rem]">
            <input type="number" placeholder="Tarifa" value={agendaData.tarifa} onChange={e => setAgendaData({...agendaData, tarifa: e.target.value})} className="bg-transparent border-none text-xl font-black text-indigo-700 w-full" />
            <input type="number" placeholder="Horas" value={agendaData.horas} onChange={e => setAgendaData({...agendaData, horas: e.target.value})} className="bg-transparent border-none text-xl font-black text-indigo-700 w-full" />
            <input type="number" placeholder="Pagado" value={agendaData.horasPagadas} onChange={e => setAgendaData({...agendaData, horasPagadas: e.target.value})} className="bg-transparent border-none text-xl font-black text-indigo-700 w-full" />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black uppercase shadow-xl hover:bg-indigo-700 transition-all">Confirmar Agenda</button>
          <button type="button" onClick={() => setView('INICIO')} className="w-full text-gray-400 font-bold text-[10px] uppercase py-2 tracking-widest">Volver al Inicio</button>
        </form>
      </div>
    );
  }

  if (view === 'INGRESO' || view === 'EGRESO') {
    const Component = view === 'INGRESO' ? Ingreso : Egreso;
    return (
      <Component 
        formData={financeData} 
        handleChange={e => setFinanceData({...financeData, [e.target.name]: e.target.value})} 
        handleSubmit={handleFinanceSubmit} 
        InstructorField={() => (
          <InstructorSelector 
            label="Instructor Relacionado" 
            name="instructor"
            value={financeData.instructor} 
            onChange={e => setFinanceData({...financeData, instructor: e.target.value})} 
          />
        )}
        setView={setView} 
      />
    );
  }

  return null;
};

const MenuCard = ({ icon, title, sub, color, onClick }) => (
  <button onClick={onClick} className={`${color} p-6 md:p-8 rounded-[2rem] text-white text-center transition-all active:scale-95 shadow-xl hover:shadow-2xl`}>
    <div className="text-4xl mb-3">{icon}</div>
    <div className="font-black uppercase text-sm md:text-xl tracking-tighter">{title}</div>
    <div className="text-[10px] opacity-60 uppercase font-black tracking-widest mt-1">{sub}</div>
  </button>
);

export default Secretaria;