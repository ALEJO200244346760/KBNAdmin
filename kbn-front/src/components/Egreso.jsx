import React from 'react';

const Egreso = ({ formData, handleChange, handleSubmit, InstructorField, setView }) => {
  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md mt-10">
      <button
        onClick={() => setView('INICIO')}
        className="text-indigo-600 hover:text-indigo-800 mb-4 flex items-center"
      >
        ← Volver a selección
      </button>
      <h2 className="text-2xl font-bold mb-6 text-red-600">💸 Registro de Egreso</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <InstructorField />

        {/* Fecha & Monto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Fecha</label>
            <input
              type="date"
              name="fecha"
              value={formData.fecha}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border p-2 border-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700">Monto del Egreso</label>
            <input
              type="number"
              name="gastos"
              inputMode="decimal"
              value={formData.gastos}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border p-2 border-gray-300 text-red-600 font-bold"
              placeholder="Monto a descontar"
            />
          </div>
        </div>

        {/* Moneda */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Moneda</label>
          <select
            name="moneda"
            value={formData.moneda}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border p-2 border-gray-300"
          >
            <option value="BRL">Reales Brasileños (BRL)</option>
            <option value="USD">Dólares (USD)</option>
            <option value="ARS">Pesos Argentinos (ARS)</option>
            <option value="CLP">Pesos Chilenos (CLP)</option>
          </select>
        </div>

        {/* Detalles */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Concepto / Detalles</label>
          <textarea
            name="detalles"
            rows="3"
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border p-2 border-gray-300"
            placeholder="Ej: Compra de chalecos o Pago de lancha"
          />
        </div>

        {/* Forma de Pago */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Forma de Pago</label>
          <select
            name="formaPago"
            value={formData.formaPago}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border p-2 border-gray-300"
          >
            <option value="Efectivo">Efectivo</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Otro">Otro...</option>
          </select>

          {formData.formaPago === 'Otro' && (
            <input
              type="text"
              placeholder="Detalle forma de pago"
              name="formaPagoOtro"
              onChange={handleChange}
              className="mt-2 block w-full rounded-md border p-2 border-gray-300"
            />
          )}
        </div>

        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
        >
          Registrar Egreso
        </button>
      </form>
    </div>
  );
};

export default Egreso;
