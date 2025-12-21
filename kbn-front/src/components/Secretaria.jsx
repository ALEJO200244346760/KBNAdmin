import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Reutilizamos los componentes existentes
import Ingreso from './Ingreso';
import Egreso from './Egreso';

const Secretaria = () => {
  const { user } = useAuth(); // Para obtener el token si es necesario
  const [view, setView] = useState('INICIO'); // INICIO, INGRESO, EGRESO, CALENDARIO
  const [instructors, setInstructors] = useState([]);

  // --- ESTADO PARA INGRESOS Y EGRESOS (Lógica heredada) ---
  const today = new Date().toISOString().split('T')[0];
  const initialFinanceData = {
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
  };
  const [financeData, setFinanceData] = useState(initialFinanceData);

  // --- ESTADO PARA AGENDA (Nuevo) ---
  const initialAgendaData = {
    alumno: '',
    fecha: today,
    hora: '10:00',
    instructorId: '', // ID del usuario instructor
    lugar: 'Escuela', // o el nombre de la playa
    tarifa: '',
    horas: 1,
    horasPagadas: 0,
    hotelDerivacion: '',
    estado: 'PENDIENTE' // PENDIENTE, CONFIRMADO, RECHAZADO
  };
  const [agendaData, setAgendaData] = useState(initialAgendaData);

  // --- CARGAR INSTRUCTORES AL INICIO ---
  useEffect(() => {
    const fetchInstructors = async () => {
      try {
        // Obtenemos lista completa de usuarios para filtrar instructores
        const res = await axios.get('https://kbnadmin-production.up.railway.app/usuario');
        // Filtramos o mapeamos segun necesites. Aquí asumimos que todos en la lista pueden dar clases
        // O idealmente filtrar por rol si el backend lo permite
        setInstructors(res.data);
      } catch (err) {
        console.error('Error cargando instructores:', err);
      }
    };
    fetchInstructors();
  }, []);

  // --- LÓGICA DE INGRESO/EGRESO (Cálculos automáticos) ---
  useEffect(() => {
    if (view === 'INGRESO') {
      const totalCalc =
        (parseFloat(financeData.horas) || 0) * (parseFloat(financeData.tarifa) || 0) -
        (parseFloat(financeData.gastos) || 0);
      setFinanceData(prev => ({ ...prev, total: totalCalc >= 0 ? totalCalc : 0 }));
    }
  }, [financeData.horas, financeData.tarifa, financeData.gastos, view]);

  const handleFinanceChange = e => {
    setFinanceData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFinanceSubmit = async e => {
    e.preventDefault();
    if (!financeData.instructor) return alert('Selecciona un instructor');

    // Mapeo de datos para el backend de FINANZAS (Ingreso/Egreso)
    const payload = {
      tipoTransaccion: String(view),
      fecha: String(financeData.fecha),
      actividad: String(financeData.actividad === 'Otro' ? financeData.actividadOtro : financeData.actividad),
      instructor: String(financeData.instructor),
      moneda: String(financeData.moneda),
      detalles: String(financeData.detalles),
      cantidadHoras: String(view === 'EGRESO' ? '0' : financeData.horas),
      tarifaPorHora: String(view === 'EGRESO' ? '0' : financeData.tarifa),
      total: String(view === 'EGRESO' ? '0' : financeData.total),
      gastosAsociados: String(financeData.gastos || '0'),
      comision: String(financeData.comision || '0'),
      formaPago: String(financeData.formaPago),
      vendedor: String(financeData.vendedor),
      asignadoA: 'NINGUNO' // Por defecto
    };

    try {
      await axios.post('https://kbnadmin-production.up.railway.app/api/clases/guardar', payload);
      alert(`${view} registrado correctamente.`);
      setView('INICIO');
      setFinanceData(initialFinanceData);
    } catch (error) {
      alert('Error al guardar transacción.');
    }
  };

  // --- LÓGICA DE AGENDA (Nueva) ---
  const handleAgendaChange = e => {
    const { name, value } = e.target;

    setAgendaData(prev => ({
        ...prev,
        [name]: name === "instructorId" ? Number(value) : value
    }));
    };


  const handleAgendaSubmit = async e => {
    e.preventDefault();
    if (!agendaData.instructorId || !agendaData.alumno) return alert("Faltan datos obligatorios");

    try {
      // Endpoint NUEVO para agenda
      await axios.post('https://kbnadmin-production.up.railway.app/api/agenda/crear', agendaData);
      alert(`Clase agendada para ${agendaData.alumno}. El instructor deberá confirmar.`);
      setAgendaData(initialAgendaData);
      setView('INICIO');
    } catch (error) {
      console.error(error);
      alert('Error al agendar la clase.');
    }
  };

  // --- RENDERIZADO DE COMPONENTES AUXILIARES ---
  
  // Selector de Instructor reutilizable para Finanzas
  const FinanceInstructorField = () => (
    <div>
      <label className="block text-sm font-bold text-gray-700">Instructor</label>
      <select
        name="instructor"
        value={financeData.instructor}
        onChange={handleFinanceChange}
        className="mt-1 block w-full rounded-md border p-2 border-gray-300 shadow-sm"
      >
        <option value="">-- Seleccionar --</option>
        {instructors.map((u) => (
          <option key={u.id} value={`${u.nombre} ${u.apellido}`}>{u.nombre} {u.apellido}</option>
        ))}
      </select>
    </div>
  );

  // --- VISTAS ---

  if (view === 'INICIO') {
    return (
      <div className="max-w-4xl mx-auto p-10 mt-10">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-2">Panel de Secretaria</h1>
        <p className="text-center text-gray-500 mb-10">Gestión de Agenda y Caja Diaria</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* BOTON CALENDARIO */}
          <button
            onClick={() => setView('CALENDARIO')}
            className="flex flex-col items-center justify-center h-40 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-transform transform hover:scale-105"
          >
            <span className="text-4xl mb-2">📅</span>
            <span className="text-xl font-bold">Calendario / Agenda</span>
            <span className="text-xs mt-1 opacity-75">Asignar clases a instructores</span>
          </button>

          {/* BOTON INGRESO */}
          <button
            onClick={() => setView('INGRESO')}
            className="flex flex-col items-center justify-center h-40 bg-green-500 text-white rounded-xl shadow-lg hover:bg-green-600 transition-transform transform hover:scale-105"
          >
            <span className="text-4xl mb-2">💰</span>
            <span className="text-xl font-bold">Registrar Ingreso</span>
            <span className="text-xs mt-1 opacity-75">Cobros, Clases finalizadas</span>
          </button>

          {/* BOTON EGRESO */}
          <button
            onClick={() => setView('EGRESO')}
            className="flex flex-col items-center justify-center h-40 bg-red-500 text-white rounded-xl shadow-lg hover:bg-red-600 transition-transform transform hover:scale-105"
          >
            <span className="text-4xl mb-2">💸</span>
            <span className="text-xl font-bold">Registrar Egreso</span>
            <span className="text-xs mt-1 opacity-75">Gastos de caja chica</span>
          </button>
        </div>
      </div>
    );
  }

  // VISTA CALENDARIO (FORMULARIO DE ASIGNACIÓN)
  if (view === 'CALENDARIO') {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-6 bg-white shadow-xl rounded-lg border-t-4 border-indigo-600">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">📅 Nueva Asignación de Clase</h2>
          <button onClick={() => setView('INICIO')} className="text-gray-500 hover:text-gray-800">Cancelar</button>
        </div>

        <form onSubmit={handleAgendaSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Alumno</label>
              <input type="text" name="alumno" required value={agendaData.alumno} onChange={handleAgendaChange} className="w-full border p-2 rounded" placeholder="Nombre completo" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Instructor a Asignar</label>
              <select name="instructorId" required value={agendaData.instructorId} onChange={handleAgendaChange} className="w-full border p-2 rounded">
                <option value="">Seleccionar...</option>
                {instructors.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha</label>
              <input type="date" name="fecha" required value={agendaData.fecha} onChange={handleAgendaChange} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Horario</label>
              <input type="time" name="hora" required value={agendaData.hora} onChange={handleAgendaChange} className="w-full border p-2 rounded" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Lugar / Spot</label>
              <input type="text" name="lugar" value={agendaData.lugar} onChange={handleAgendaChange} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Hotel / Derivación</label>
              <input type="text" name="hotelDerivacion" value={agendaData.hotelDerivacion} onChange={handleAgendaChange} className="w-full border p-2 rounded" placeholder="Ej: Hotel Arakur" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tarifa Pactada</label>
              <input type="number" name="tarifa" value={agendaData.tarifa} onChange={handleAgendaChange} className="w-full border p-2 rounded" placeholder="$" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Horas Solicitadas</label>
              <input type="number" name="horas" value={agendaData.horas} onChange={handleAgendaChange} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Horas Pagadas</label>
              <input type="number" name="horasPagadas" value={agendaData.horasPagadas} onChange={handleAgendaChange} className="w-full border p-2 rounded" placeholder="Seña o total" />
            </div>
          </div>

          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded hover:bg-indigo-700 transition">
            Confirmar Asignación
          </button>
        </form>
      </div>
    );
  }

  // VISTA INGRESO (Reutiliza lógica Instructor.jsx)
  if (view === 'INGRESO') {
    return (
      <Ingreso
        formData={financeData}
        handleChange={handleFinanceChange}
        handleSubmit={handleFinanceSubmit}
        InstructorField={FinanceInstructorField}
        setView={setView}
      />
    );
  }

  // VISTA EGRESO (Reutiliza lógica Instructor.jsx)
  if (view === 'EGRESO') {
    return (
      <Egreso
        formData={financeData}
        handleChange={handleFinanceChange}
        handleSubmit={handleFinanceSubmit}
        InstructorField={FinanceInstructorField}
        setView={setView}
      />
    );
  }

  return <div>Cargando...</div>;
};

export default Secretaria;