import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Componentes separados:
import Ingreso from './Ingreso';
import Egreso from './Egreso';

const InstructorForm = () => {
  const { user } = useAuth();

  const [view, setView] = useState('INICIO');
  const [availableInstructors, setAvailableInstructors] = useState([]);
  const [loadingInstructors, setLoadingInstructors] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const initialFormData = {
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

  const [formData, setFormData] = useState(initialFormData);

  // ------------------------------
  // Cargar instructores
  // ------------------------------
  useEffect(() => {
    const fetchInstructors = async () => {
      setLoadingInstructors(true);
      try {
        const res = await axios.get('https://kbnadmin-production.up.railway.app/usuario');
        const names = res.data.map(u => `${u.nombre} ${u.apellido}`);
        setAvailableInstructors(names);

        if (names.length > 0 && user.role === 'ADMINISTRADOR') {
          setFormData(prev => ({ ...prev, instructor: names[0] }));
        }
      } catch (err) {
        console.error('Error fetching instructors:', err);
      } finally {
        setLoadingInstructors(false);
      }
    };

    if (user.role === 'ADMINISTRADOR') fetchInstructors();
    else if (user.role === 'INSTRUCTOR') {
      setFormData(prev => ({ ...prev, instructor: `${user.nombre} ${user.apellido}` }));
    }
  }, [user]);

  // ------------------------------
  // Cálculo automático del TOTAL
  // ------------------------------
  useEffect(() => {
    if (view === 'INGRESO') {
      const totalCalc =
        (parseFloat(formData.horas) || 0) *
        (parseFloat(formData.tarifa) || 0) -
        (parseFloat(formData.gastos) || 0);

      setFormData(prev => ({
        ...prev,
        total: totalCalc >= 0 ? totalCalc : 0
      }));
    }
  }, [formData.horas, formData.tarifa, formData.gastos, view]);

  // ------------------------------
  // Manejador de cambios
  // ------------------------------
  const handleChange = e => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ------------------------------
  // Cambiar vista
  // ------------------------------
  const handleSelectView = type => {
    setFormData(prev => ({
      ...prev,
      tipoTransaccion: type,
      horas: type === 'EGRESO' ? 0 : prev.horas,
      tarifa: type === 'EGRESO' ? 0 : prev.tarifa,
      total: type === 'EGRESO' ? 0 : prev.total,
      gastos: type === 'INGRESO' ? 0 : prev.gastos
    }));
    setView(type);
  };

  // ------------------------------
  // Enviar formulario
  // ------------------------------
  const handleSubmit = async e => {
    e.preventDefault();

    if (!formData.instructor || formData.instructor.trim() === '') {
      return alert('Por favor, selecciona o ingresa el nombre del instructor.');
    }

    const payload = {
      tipoTransaccion: String(view),
      fecha: String(formData.fecha || ''),
      actividad: String(formData.actividad === 'Otro' ? (formData.actividadOtro || 'Otro') : formData.actividad),
      descripcionActividad: String(formData.descripcionActividad || ''),
      instructor: String(formData.instructor),
      moneda: String(formData.moneda || 'USD'),
      detalles: String(formData.detalles || ''),
      cantidadHoras: String(view === 'EGRESO' ? '0' : formData.horas || '0'),
      tarifaPorHora: String(view === 'EGRESO' ? '0' : formData.tarifa || '0'),
      total: String(view === 'EGRESO' ? '0' : formData.total || '0'),
      gastosAsociados: String(formData.gastos || '0'),
      comision: String(formData.comision || '0'),
      formaPago: String(formData.formaPago === 'Otro' ? (formData.formaPagoOtro || 'Otro') : formData.formaPago),
      detalleFormaPago: String(formData.formaPago === 'Otro' ? (formData.formaPagoOtro || '') : ''),
      vendedor: String(formData.vendedor || ''),
      asignadoA: 'NINGUNO'
    };

    try {
      await axios.post('https://kbnadmin-production.up.railway.app/api/clases/guardar', payload);

      alert(`Registro de ${view} guardado con éxito!`);

      setView('INICIO');
      setFormData({
        ...initialFormData,
        fecha: formData.fecha,
        instructor: formData.instructor
      });
    } catch (error) {
      console.error('Error guardando:', error);
      const serverMessage = error.response?.data || '';
      alert(`Hubo un error al guardar el registro. ${serverMessage ? 'Detalle: ' + serverMessage : 'Revisa los campos obligatorios.'}`);
    }
  };

  // ------------------------------
  // Campo Instructor
  // ------------------------------
  const InstructorField = () => {
    if (user.role === 'ADMINISTRADOR') {
      return (
        <div>
          <label className="block text-sm font-bold text-gray-700">Instructor</label>

          {loadingInstructors ? (
            <p>Cargando instructores...</p>
          ) : (
            <select
              name="instructor"
              value={formData.instructor}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border p-2 border-gray-300 shadow-sm"
            >
              <option value="">-- Seleccionar Instructor --</option>
              {availableInstructors.map((name, index) => (
                <option key={index} value={name}>{name}</option>
              ))}
            </select>
          )}
        </div>
      );
    }

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700">Instructor</label>
        <input
          type="text"
          name="instructor"
          value={formData.instructor}
          readOnly
          className="mt-1 block w-full rounded-md border p-2 bg-gray-100 text-gray-500"
        />
      </div>
    );
  };

  // ------------------------------
  // Vista INICIO
  // ------------------------------
  if (view === 'INICIO') {
    return (
      <div className="max-w-xl mx-auto bg-white p-10 rounded-lg shadow-2xl mt-20 text-center">
        <h2 className="text-3xl font-extrabold mb-8 text-indigo-700">
          ¿Qué operación desea registrar?
        </h2>

        <div className="flex justify-center space-x-6">
          <button
            onClick={() => handleSelectView('INGRESO')}
            className="flex flex-col items-center justify-center w-48 h-32 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600"
          >
            💰 Ingreso
            <span className="text-sm mt-1">(Clase, Rental)</span>
          </button>

          <button
            onClick={() => handleSelectView('EGRESO')}
            className="flex flex-col items-center justify-center w-48 h-32 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600"
          >
            💸 Egreso
            <span className="text-sm mt-1">(Gastos, Compras)</span>
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------
  // Render de INGRESO y EGRESO importados
  // ------------------------------
  if (view === 'EGRESO')
    return (
      <Egreso
        formData={formData}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        InstructorField={InstructorField}
        setView={setView}
      />
    );

  return (
    <Ingreso
      formData={formData}
      handleChange={handleChange}
      handleSubmit={handleSubmit}
      InstructorField={InstructorField}
      setView={setView}
    />
  );
};

export default InstructorForm;
