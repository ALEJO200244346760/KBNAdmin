import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Importamos los formularios existentes
import Ingreso from './Ingreso';
import Egreso from './Egreso';

const InstructorForm = () => {
  const { user } = useAuth();
  
  // Vistas: 'AGENDA', 'INGRESO', 'EGRESO'
  const [view, setView] = useState('AGENDA'); 
  const [agendaItems, setAgendaItems] = useState([]);
  const [loadingAgenda, setLoadingAgenda] = useState(false);
  
  // Datos compartidos para formularios de Ingreso/Egreso
  const today = new Date().toISOString().split('T')[0];
  const initialFormData = {
    tipoTransaccion: 'INGRESO',
    fecha: today,
    actividad: 'Clases',
    actividadOtro: '',
    vendedor: '',
    instructor: user ? `${user.nombre} ${user.apellido}` : '', // Pre-llenamos con el usuario logueado
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

  const [formData, setFormData] = useState(initialFormData);

  // --- EFECTO: Cargar Agenda al entrar o al volver a la vista AGENDA ---
  useEffect(() => {
    if (view === 'AGENDA' && user && user.id) {
      fetchAgenda();
    }
  }, [view, user]);

  const fetchAgenda = async () => {
    setLoadingAgenda(true);
    try {
      // Endpoint que creamos en el paso anterior
      const res = await axios.get(`https://kbnadmin-production.up.railway.app/api/agenda/instructor/${user.id}`);
      // Ordenar: Pendientes primero, luego por fecha
      const sorted = res.data.sort((a, b) => {
        if (a.estado === 'PENDIENTE' && b.estado !== 'PENDIENTE') return -1;
        if (a.estado !== 'PENDIENTE' && b.estado === 'PENDIENTE') return 1;
        return new Date(b.fecha) - new Date(a.fecha);
      });
      setAgendaItems(sorted);
    } catch (error) {
      console.error("Error cargando agenda:", error);
    } finally {
      setLoadingAgenda(false);
    }
  };

  // --- ACCIONES DE AGENDA (Confirmar / Rechazar) ---
  const handleStatusChange = async (id, nuevoEstado) => {
    try {
      // Enviamos el string directo (el backend lo limpia)
      await axios.put(`https://kbnadmin-production.up.railway.app/api/agenda/${id}/estado`, nuevoEstado, {
        headers: { 'Content-Type': 'text/plain' }
      });
      
      // Actualización optimista (Visual inmediata)
      setAgendaItems(prev => prev.map(item => 
        item.id === id ? { ...item, estado: nuevoEstado } : item
      ));
      
      alert(`Clase ${nuevoEstado.toLowerCase()} correctamente.`);
    } catch (error) {
      console.error(error);
      alert("Error al actualizar estado.");
      fetchAgenda(); // Revertir si falla
    }
  };

  // --- LOGICA DE FORMULARIOS (Ingreso/Egreso) ---
  // (Mantuvimos la lógica que ya tenías funcionando)
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
    // Validación básica
    if (!formData.instructor) return alert('Error: Instructor no identificado.');

    const payload = {
      tipoTransaccion: String(view),
      fecha: String(formData.fecha),
      actividad: String(formData.actividad === 'Otro' ? formData.actividadOtro : formData.actividad),
      instructor: String(formData.instructor),
      moneda: String(formData.moneda),
      detalles: String(formData.detalles),
      cantidadHoras: String(view === 'EGRESO' ? '0' : formData.horas),
      tarifaPorHora: String(view === 'EGRESO' ? '0' : formData.tarifa),
      total: String(view === 'EGRESO' ? '0' : formData.total),
      gastosAsociados: String(formData.gastos || '0'),
      comision: String(formData.comision || '0'),
      formaPago: String(formData.formaPago === 'Otro' ? formData.formaPagoOtro : formData.formaPago),
      vendedor: String(formData.vendedor || ''),
      asignadoA: 'NINGUNO'
    };

    try {
      await axios.post('https://kbnadmin-production.up.railway.app/api/clases/guardar', payload);
      alert(`${view} registrado exitosamente!`);
      // Volver a la agenda después de guardar (opcional)
      setView('AGENDA');
      setFormData(initialFormData);
    } catch (error) {
      alert('Error al guardar. Revisa la conexión.');
    }
  };

  // Helper para mostrar input de instructor (Solo lectura para instructor)
  const InstructorField = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700">Instructor</label>
      <input
        type="text"
        name="instructor"
        value={formData.instructor}
        readOnly
        className="mt-1 block w-full rounded-md border p-2 bg-gray-100 text-gray-500 cursor-not-allowed"
      />
    </div>
  );

  // --- RENDERIZADO PRINCIPAL ---

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20">
      
      {/* HEADER Y NAVEGACIÓN */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">
          Hola, {user.nombre} 👋
        </h1>
        
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => setView('AGENDA')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'AGENDA' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            📅 Mi Agenda
          </button>
          <button 
            onClick={() => setView('INGRESO')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'INGRESO' ? 'bg-white shadow text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            💰 Ingreso
          </button>
          <button 
            onClick={() => setView('EGRESO')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'EGRESO' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            💸 Egreso
          </button>
        </div>
      </div>

      {/* --- VISTA: AGENDA --- */}
      {view === 'AGENDA' && (
        <div className="space-y-4">
          {loadingAgenda ? (
            <div className="text-center p-10 text-gray-500">Cargando tus clases...</div>
          ) : agendaItems.length === 0 ? (
            <div className="text-center p-10 bg-white rounded-lg shadow border border-gray-100">
              <p className="text-gray-500 text-lg">📭 No tienes clases asignadas próximamente.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {agendaItems.map((item) => (
                <div 
                  key={item.id} 
                  className={`relative p-5 rounded-xl border-l-4 shadow-sm bg-white transition-all hover:shadow-md 
                    ${item.estado === 'PENDIENTE' ? 'border-yellow-400 ring-1 ring-yellow-100' : 
                      item.estado === 'CONFIRMADA' ? 'border-green-500' : 'border-red-400 opacity-75'}`}
                >
                  {/* Badge de Estado */}
                  <div className="absolute top-4 right-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider 
                      ${item.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' : 
                        item.estado === 'CONFIRMADA' ? 'bg-green-100 text-green-800' : 
                        'bg-red-100 text-red-800'}`}>
                      {item.estado}
                    </span>
                  </div>

                  {/* Contenido Card */}
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Fecha y Hora */}
                    <div className="flex-shrink-0 flex flex-col items-center justify-center bg-gray-50 p-3 rounded-lg min-w-[80px]">
                      <span className="text-xs font-bold text-gray-400 uppercase">{new Date(item.fecha).toLocaleString('es-ES', { weekday: 'short' })}</span>
                      <span className="text-xl font-bold text-gray-800">{new Date(item.fecha).getDate()}</span>
                      <span className="text-xs text-gray-500">{item.hora?.substring(0,5)} hs</span>
                    </div>

                    {/* Detalles */}
                    <div className="flex-grow">
                      <h3 className="text-lg font-bold text-gray-800">{item.alumno}</h3>
                      <p className="text-sm text-gray-600 mb-2">📍 {item.lugar} {item.hotelDerivacion && `(Desde: ${item.hotelDerivacion})`}</p>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                        <div>⏳ {item.horas} Horas</div>
                        <div>💵 Tarifa: ${item.tarifa}</div>
                        <div>💳 Pagado: ${item.horasPagadas || 0}</div>
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción (Solo si está PENDIENTE) */}
                  {item.estado === 'PENDIENTE' && (
                    <div className="mt-4 flex gap-3 border-t pt-3">
                      <button 
                        onClick={() => handleStatusChange(item.id, 'CONFIRMADA')}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 transition"
                      >
                        ✅ Confirmar
                      </button>
                      <button 
                        onClick={() => handleStatusChange(item.id, 'RECHAZADA')}
                        className="flex-1 bg-red-100 text-red-600 py-2 rounded-lg font-bold hover:bg-red-200 transition"
                      >
                        ❌ Rechazar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- VISTA: FORMULARIOS --- */}
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