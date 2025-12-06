import React, { useState, useEffect } from 'react';

const InstructorForm = () => {
  // Estado inicial del formulario
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0], // Fecha actual YYYY-MM-DD
    actividad: 'Clases',
    actividadOtro: '', // Para guardar el texto si elige "Otro"
    vendedor: '',
    instructor: '', // Se llenará con el usuario logueado
    detalles: '',
    horas: 0,
    tarifa: 0,
    total: 0,
    gastos: 0,
    comision: 0,
    formaPago: 'Efectivo',
    formaPagoOtro: ''
  });

  // Simulación: Obtener nombre del instructor desde el JWT/Localstorage al cargar
  useEffect(() => {
    // const user = JSON.parse(localStorage.getItem('user'));
    // if(user) setFormData(prev => ({...prev, instructor: user.nombre}));
    setFormData(prev => ({...prev, instructor: 'Instructor Logueado'}));
  }, []);

  // Calcular TOTAL automáticamente cuando cambian horas o tarifa
  useEffect(() => {
    const totalCalc = (parseFloat(formData.horas) || 0) * (parseFloat(formData.tarifa) || 0);
    setFormData(prev => ({ ...prev, total: totalCalc }));
  }, [formData.horas, formData.tarifa]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Preparar objeto final (manejo de "Otros")
    const payload = {
      ...formData,
      actividad: formData.actividad === 'Otro' ? formData.actividadOtro : formData.actividad,
      formaPago: formData.formaPago === 'Otro' ? formData.formaPagoOtro : formData.formaPago
    };

    console.log("Enviando al backend:", payload);
    // Aquí iría tu fetch/axios al backend
    // await axios.post('http://localhost:8080/api/clases/guardar', payload)...
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md mt-10">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Nueva Planilla de Instructor</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* FECHA */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Fecha</label>
          <input 
            type="date" 
            name="fecha" 
            value={formData.fecha} 
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
          />
        </div>

        {/* ACTIVIDAD */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Actividad</label>
            <select name="actividad" value={formData.actividad} onChange={handleChange} className="mt-1 block w-full rounded-md border p-2 border-gray-300">
              <option value="Clases">Clases</option>
              <option value="Gastos">Gastos</option>
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

        {/* VENDEDOR E INSTRUCTOR */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Vendedor (Opcional)</label>
            <input type="text" name="vendedor" onChange={handleChange} className="mt-1 block w-full rounded-md border p-2 border-gray-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Instructor</label>
            <input type="text" name="instructor" value={formData.instructor} readOnly className="mt-1 block w-full rounded-md border p-2 bg-gray-100 text-gray-500 cursor-not-allowed" />
          </div>
        </div>

        {/* DETALLES */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Detalles (Ej: Clase a Santa Teresa)</label>
          <textarea name="detalles" rows="2" onChange={handleChange} className="mt-1 block w-full rounded-md border p-2 border-gray-300"></textarea>
        </div>

        {/* CÁLCULOS: HORAS, TARIFA, TOTAL */}
        <div className="grid grid-cols-3 gap-4 bg-blue-50 p-4 rounded-md">
          <div>
            <label className="block text-sm font-medium text-gray-700">Cant. Horas</label>
            <input type="number" step="0.5" name="horas" onChange={handleChange} className="mt-1 block w-full rounded-md border p-2 border-gray-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Tarifa ($/h)</label>
            <input type="number" name="tarifa" onChange={handleChange} className="mt-1 block w-full rounded-md border p-2 border-gray-300" />
          </div>
          <div>
            <label className="block text-sm font-bold text-blue-800">TOTAL</label>
            <input type="number" value={formData.total} readOnly className="mt-1 block w-full rounded-md border p-2 bg-white font-bold text-blue-600" />
          </div>
        </div>

        {/* GASTOS Y COMISIÓN (ESTADÍSTICA) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Gastos (Estadística)</label>
            <input type="number" name="gastos" onChange={handleChange} className="mt-1 block w-full rounded-md border p-2 border-gray-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Comisión</label>
            <input type="number" name="comision" onChange={handleChange} className="mt-1 block w-full rounded-md border p-2 border-gray-300" />
          </div>
        </div>

        {/* FORMA DE PAGO */}
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

        <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Guardar Planilla
        </button>

      </form>
    </div>
  );
};

export default InstructorForm;