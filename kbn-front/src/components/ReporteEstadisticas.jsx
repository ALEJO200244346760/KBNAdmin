import React, { useState } from 'react';

const ReporteEstadisticas = () => {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [fechas, setFechas] = useState({
        fechaInicio: firstDayOfMonth,
        fechaFin: today,
    });
    const [reporte, setReporte] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFechas({ ...fechas, [e.target.name]: e.target.value });
    };

    const generarReporte = async () => {
        setLoading(true);
        setReporte(null);
        const { fechaInicio, fechaFin } = fechas;

        try {
            // URL corregida para usar el nuevo endpoint de reporte con fechas
            const url = `https://kbnadmin-production.up.railway.app/api/clases/reporte?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
            const response = await fetch(url);

            if (response.ok) {
                const data = await response.json();
                setReporte(data);
            } else if (response.status === 404) {
                 alert("No se encontraron datos para el rango de fechas seleccionado.");
            } else {
                alert("Error al cargar el reporte.");
            }
        } catch (error) {
            console.error("Error en la solicitud:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return `$${(amount || 0).toFixed(2)}`;
    };

    const Card = ({ title, value, color }) => (
        <div className={`p-5 rounded-lg shadow-md ${color}`}>
            <p className="text-sm font-medium text-gray-50 uppercase">{title}</p>
            <p className="text-3xl font-extrabold text-white">{formatCurrency(value)}</p>
        </div>
    );

    const ingresosBrutos = reporte?.totalIngresosBrutos || 0;
    const gastosAsociados = reporte?.totalGastos || 0; // Gastos asociados al ingreso
    const egresosOperacionales = reporte?.totalEgresos || 0; // Egreso total de transacciones tipo EGRESO
    const ingresosNetos = ingresosBrutos - gastosAsociados - egresosOperacionales;

    return (
        <div className="max-w-6xl mx-auto mt-10 p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">📈 Reporte de Estadísticas</h1>
            
            <div className="bg-white p-6 rounded-lg shadow mb-8 flex gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Desde</label>
                    <input type="date" name="fechaInicio" value={fechas.fechaInicio} onChange={handleChange} className="mt-1 p-2 border rounded-md" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Hasta</label>
                    <input type="date" name="fechaFin" value={fechas.fechaFin} onChange={handleChange} className="mt-1 p-2 border rounded-md" />
                </div>
                <button 
                    onClick={generarReporte}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 transition-colors"
                >
                    {loading ? 'Cargando...' : 'Generar Reporte'}
                </button>
            </div>

            {reporte && (
                <div className="space-y-8">
                    <h2 className="text-2xl font-semibold border-b pb-2 text-gray-800">Resumen Financiero ({fechas.fechaInicio} a {fechas.fechaFin})</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Card title="Ingresos Brutos" value={ingresosBrutos} color="bg-indigo-600" />
                        <Card title="Gastos Asoc. a Ingreso" value={gastosAsociados} color="bg-orange-500" />
                        <Card title="Total Egresos Operacionales" value={egresosOperacionales} color="bg-red-500" />
                        <Card title="SALDO NETO" value={ingresosNetos} color="bg-green-700" />
                    </div>

                    <h2 className="text-2xl font-semibold border-b pb-2 text-gray-800 pt-4">Asignación de Ingresos (100% de la clase)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card title="Asignado a IGNA" value={reporte.totalAsignadoIgna} color="bg-blue-500" />
                        <Card title="Asignado a JOSE" value={reporte.totalAsignadoJose} color="bg-green-600" />
                    </div>

                    <div className="text-sm pt-4 text-gray-600 border-t mt-6">
                        <p>Total Comisiones: {formatCurrency(reporte.totalComisiones)}</p>
                        <p className="font-bold">Ingresos Escuela (Ninguno): {formatCurrency(ingresosBrutos - reporte.totalAsignadoIgna - reporte.totalAsignadoJose)}</p>
                    </div>

                </div>
            )}
        </div>
    );
};

export default ReporteEstadisticas;