import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const InstructorForm = () => {
  const { user } = useAuth(); // Usuario logueado
  const [view, setView] = useState('INICIO');
  const [availableInstructors, setAvailableInstructors] = useState([]);
  const [loadingInstructors, setLoadingInstructors] = useState(false);

  const [formData, setFormData] = useState({
    tipoTransaccion: 'INGRESO',
    fecha: new Date().toISOString().split('T')[0],
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

  // Cargar instructores desde backend si es ADMIN
  useEffect(() => {
    const fetchInstructors = async () => {
      setLoadingInstructors(true);
      try {
        const res = await axios.get('https://kbnadmin-production.up.railway.app/api/usuario');
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

    if (user.role === 'ADMINISTRADOR') {
      fetchInstructors();
    } else if (user.role === 'INSTRUCTOR') {
      setFormData(prev => ({ ...prev, instructor: `${user.nombre} ${user.apellido}` }));
    }
  }, [user]);

  // Calcular total automáticamente al cambiar horas o tarifa
  useEffect(() => {
    if (view === 'INGRESO') {
      const totalCalc = (parseFloat(formData.horas) || 0) * (parseFloat(formData.tarifa) || 0);
      setFormData(prev => ({ ...prev, total: totalCalc }));
    }
  }, [formData.horas, formData.tarifa, view]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectView = (type) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.instructor || formData.instructor.trim() === '') {
      alert("Por favor, selecciona o ingresa el nombre del instructor.");
      return;
    }

    let payload = {
      ...formData,
      tipoTransaccion: view,
      actividad: formData.actividad === 'Otro' ? formData.actividadOtro : formData.actividad,
      formaPago: formData.formaPago === 'Otro' ? formData.formaPagoOtro : formData.formaPago,
    };

    if (view === 'EGRESO') {
      payload = {
        ...payload,
        horas: 0,
        tarifa: 0,
        total: 0,
        comision: 0,
        actividad: 'Egreso',
        gastosAsociados: parseFloat(formData.gastos) || 0
      };
    }

    try {
      await axios.post('https://kbnadmin-production.up.railway.app/api/clases/guardar', payload);
      alert(`Registro de ${view} guardado con éxito!`);
      setView('INICIO');
      setFormData(prev => ({
        ...prev,
        horas: 0,
        tarifa: 0,
        total: 0,
        gastos: 0,
        comision: 0,
        actividadOtro: '',
        formaPagoOtro: ''
      }));
    } catch (error) {
      console.error("Error guardando:", error);
      alert("Hubo un error al guardar el registro.");
    }
  };

  const InstructorField = () => {
    if (user.role === 'ADMINISTRADOR') {
      return (
        <div>
          <label className="block text-sm font-bold text-gray-700">Instructor (Realizó la Operación)</label>
          {loadingInstructors ? (
            <p>Cargando instructores...</p>
          ) : (
            <select
              name="instructor"
              value={formData.instructor}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border p-2 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
          className="mt-1 block w-full rounded-md border p-2 bg-gray-100 text-gray-500 cursor-not-allowed"
        />
      </div>
    );
  };

  // Vista inicial
  if (view === 'INICIO') {
    return (
      <div className="max-w-xl mx-auto bg-white p-10 rounded-lg shadow-2xl mt-20 text-center">
        <h2 className="text-3xl font-extrabold mb-8 text-indigo-700">¿Qué operación desea registrar?</h2>
        <div className="flex justify-center space-x-6">
          <button
            onClick={() => handleSelectView('INGRESO')}
            className="flex flex-col items-center justify-center w-48 h-32 bg-green-500 hover:bg-green-600 text-white text-xl font-bold py-4 px-6 rounded-xl transition duration-300 transform hover:scale-105 shadow-lg"
          >
            💰 Ingreso
            <span className="text-sm font-normal mt-1">(Clase, Rental)</span>
          </button>
          <button
            onClick={() => handleSelectView('EGRESO')}
            className="flex flex-col items-center justify-center w-48 h-32 bg-red-500 hover:bg-red-600 text-white text-xl font-bold py-4 px-6 rounded-xl transition duration-300 transform hover:scale-105 shadow-lg"
          >
            💸 Egreso
            <span className="text-sm font-normal mt-1">(Gastos, Compras)</span>
          </button>
        </div>
      </div>
    );
  }

  // Formulario EGRESO
  if (view === 'EGRESO') {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md mt-10">
        <button onClick={() => setView('INICIO')} className="text-indigo-600 hover:text-indigo-800 mb-4 flex items-center">
          ← Volver a selección
        </button>
        <h2 className="text-2xl font-bold mb-6 text-red-600">💸 Registro de Egreso</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <InstructorField />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha</label>
              <input type="date" name="fecha" value={formData.fecha} onChange={handleChange} className="mt-1 block w-full rounded-md border p-2 border-gray-300" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700">Monto del Egreso</label>
              <input
                type="number"
                name="gastos"
                value={formData.gastos}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border p-2 border-gray-300 text-red-600 font-bold"
                placeholder="Monto a descontar"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Concepto / Detalles</label>
            <textarea name="detalles" rows="3" onChange={handleChange} className="mt-1 block w-full rounded-md border p-2 border-gray-300" placeholder="Ej: Compra de chalecos o Pago de lancha"></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Forma de Pago</label>
            <select name="formaPago" onChange={handleChange} className="mt-1 block w-full rounded-md border p-2 border-gray-300">
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="USD">USD</option>
              <option value="Otro">Otro...</option>
            </select>
            {formData.formaPago === 'Otro' && (
              <input type="text" placeholder="Detalle forma de pago" name="formaPagoOtro" onChange={handleChange} className="mt-2 block w-full rounded-md border p-2 border-gray-300" />
            )}
          </div>

          <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700">
            Registrar Egreso
          </button>
        </form>
      </div>
    );
  }

  // Formulario INGRESO
  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md mt-10">
      <button onClick={() => setView('INICIO')} className="text-indigo-600 hover:text-indigo-800 mb-4 flex items-center">
        ← Volver a selección
      </button>
      <h2 className="text-2xl font-bold mb-6 text-green-600">💰 Nueva Planilla de Ingreso</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <InstructorField />

        <div>
          <label className="block text-sm font-medium text-gray-700">Fecha</label>
          <input type="date" name="fecha" value={formData.fecha} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Actividad</label>
            <select name="actividad" value={formData.actividad} onChange={handleChange} className="mt-1 block w-full rounded-md border p-2 border-gray-300">
              <option value="Clases">Clases</option>
              <option value="Aula Kite">Aula Kite</option>
              <option value="Rental">Rental</option>
              <option value="Otro">Otro...</option>
            </select>
          </div>
          {formData.actividad === 'Otro' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Especifique Actividad</label>
              <input type="text" name="actividadOtro" onChange={handleChange} className="mt-1 block w-full rounded-md border p-2 border-gray-300" />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Vendedor (Opcional)</label>
          <input type="text" name="vendedor" onChange={handleChange} className="mt-1 block w-full rounded-md border p-2 border-gray-300" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Detalles</label>
          <textarea name="detalles" rows="2" onChange={handleChange} className="mt-1 block w-full rounded-md border p-2 border-gray-300" placeholder="Ej: Clase a José"></textarea>
        </div>

        <div className="grid grid-cols-3 gap-4 bg-green-50 p-4 rounded-md">
          <div>
            <label className="block text-sm font-medium text-gray-700">Cant. Horas</label>
            <input type="number" step="0.5" name="horas" onChange={handleChange} className="mt-1 block w-full rounded-md border p-2 border-gray-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Tarifa ($/h)</label>
            <input type="number" name="tarifa" onChange={handleChange} className="mt-1 block w-full rounded-md border p-2 border-gray-300" />
          </div>
          <div>
            <label className="block text-sm font-bold text-green-800">TOTAL</label>
            <input type="number" value={formData.total} readOnly className="mt-1 block w-full rounded-md border p-2 bg-white font-bold text-green-600" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Gastos (Asociados al Ingreso)</label>
            <input type="number" name="gastos" onChange={handleChange} className="mt-1 block w-full rounded-md border p-2 border-gray-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Comisión</label>
            <input type="number" name="comision" onChange={handleChange} className="mt-1 block w-full rounded-md border p-2 border-gray-300" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Forma de Pago</label>
          <select name="formaPago" onChange={handleChange} className="mt-1 block w-full rounded-md border p-2 border-gray-300">
            <option value="Efectivo">Efectivo</option>
            <option value="MercadoPago">MercadoPago</option>
            <option value="Transferencia">Transferencia</option>
            <option value="USD">USD</option>
            <option value="Otro">Otro...</option>
          </select>
          {formData.formaPago === 'Otro' && (
            <input type="text" placeholder="Detalle forma de pago" name="formaPagoOtro" onChange={handleChange} className="mt-2 block w-full rounded-md border p-2 border-gray-300" />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Moneda</label>
          <select name="moneda" value={formData.moneda} onChange={handleChange} className="mt-1 block w-full rounded-md border p-2 border-gray-300">
            <option value="BRL">Reales Brasileños (BRL)</option>
            <option value="USD">Dólares (USD)</option>
            <option value="ARS">Pesos Argentinos (ARS)</option>
            <option value="CLP">Pesos Chilenos (CLP)</option>
          </select>
        </div>

        <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
          Guardar Ingreso
        </button>
      </form>
    </div>
  );
};

export default InstructorForm;
