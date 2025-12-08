import React, { useState, useEffect } from 'react';
// import { useAuth } from '../context/AuthContext'; // Descomentar en la implementación final
// import { Bar, Pie } from 'react-chartjs-2'; // Asumiendo que usarás una librería de gráficos

const ReporteEstadisticas = () => {
    // --- LÓGICA DE REPORTE Y FECHAS ---
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [fechas, setFechas] = useState({
        fechaInicio: firstDayOfMonth,
        fechaFin: today,
    });
    const [reporte, setReporte] = useState(null);
    const [loadingReporte, setLoadingReporte] = useState(false);
    
    // --- LÓGICA DE NOTIFICACIONES/ASIGNACIÓN ---
    const [clasesPendientes, setClasesPendientes] = useState([]);
    const [loadingClases, setLoadingClases] = useState(true);

    useEffect(() => {
        fetchClases();
    }, []);

    // ReporteEstadisticas.jsx

    const fetchClases = async () => {
        setLoadingClases(true);
        try {
            const response = await fetch('https://kbnadmin-production.up.railway.app/api/clases/listar');
            const data = await response.json();
            
            // --- CAMBIO EN LA LÓGICA DE FILTRADO ---
            const pendientes = data
                .filter(clase => 
                    clase.tipoTransaccion === 'INGRESO' && 
                    (!clase.asignadoA || clase.asignadoA.trim() === '') // La clase es pendiente si es null O si es una cadena vacía
                )
                .map(clase => ({ ...clase, asignadoA: clase.asignadoA || "" }));
            // --- FIN CAMBIO ---

            setClasesPendientes(pendientes);
        } catch (error) {
            console.error("Error cargando clases:", error);
        } finally {
            setLoadingClases(false);
        }
    };

    const handleAssignmentChange = (id, nuevoValor) => {
        setClasesPendientes(prev => prev.map(clase => clase.id === id ? { ...clase, asignadoA: nuevoValor } : clase));
    };

    const guardarAsignacion = async (id, asignadoA) => {
        if (!asignadoA) return alert("Selecciona una opción primero");

        try {
            const response = await fetch(`https://kbnadmin-production.up.railway.app/api/clases/asignar/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ asignadoA })
            });

            if (response.ok) {
                alert("¡Asignado correctamente! La tabla se actualizará.");
                // Recargar solo las clases pendientes
                fetchClases(); 
            } else {
                alert("Error al guardar la asignación.");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    };

    const handleChange = (e) => {
        setFechas({ ...fechas, [e.target.name]: e.target.value });
    };

    const generarReporte = async () => {
        setLoadingReporte(true);
        setReporte(null);
        const { fechaInicio, fechaFin } = fechas;

        try {
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
            setLoadingReporte(false);
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

    // Cálculos para el reporte
    const ingresosBrutos = reporte?.totalIngresosBrutos || 0;
    const gastosAsociados = reporte?.totalGastos || 0; 
    const egresosOperacionales = reporte?.totalEgresos || 0; 
    const ingresosNetos = ingresosBrutos - gastosAsociados - egresosOperacionales;
    
    // --- DATOS PARA GRÁFICOS (SIMULACIÓN) ---
    const chartData = {
        labels: ['Ingresos Brutos', 'Egresos Totales', 'Gastos Asociados', 'Saldo Neto'],
        datasets: [
            {
                label: 'Monto ($)',
                data: [ingresosBrutos, egresosOperacionales, gastosAsociados, ingresosNetos],
                backgroundColor: [
                    'rgba(79, 70, 229, 0.7)', // Indigo
                    'rgba(239, 68, 68, 0.7)',  // Red
                    'rgba(245, 158, 11, 0.7)', // Orange
                    'rgba(16, 185, 129, 0.7)', // Green
                ],
                borderColor: [
                    'rgba(79, 70, 229, 1)',
                    'rgba(239, 68, 68, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(16, 185, 129, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };


    return (
        <div className="max-w-7xl mx-auto mt-10 p-6">
            <h1 className="text-3xl font-bold mb-6 text-indigo-700">📊 Reportes y Notificaciones Administrativas</h1>

            {/* --- SECCIÓN DE NOTIFICACIONES/ASIGNACIÓN --- */}
            <div className="bg-white p-6 rounded-lg shadow-xl mb-10">
                <h2 className="text-2xl font-bold mb-4 text-red-600 flex items-center">
                    🔔 Clases Pendientes de Asignación ({clasesPendientes.length})
                </h2>
                
                {loadingClases ? (
                    <p className="text-center text-gray-500">Cargando notificaciones...</p>
                ) : clasesPendientes.length === 0 ? (
                    <p className="p-4 bg-green-50 text-green-700 border-l-4 border-green-500">
                        ✅ No hay clases de ingreso pendientes de asignar.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-red-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Instructor (Autor)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actividad / Detalles</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Total</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Asignar Ingreso a</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {clasesPendientes.map(clase => (
                                    <tr key={clase.id} className="hover:bg-yellow-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{clase.fecha || "-"}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{clase.instructor || "-"}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{clase.actividad} ({clase.detalles})</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">{formatCurrency(clase.total)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <select 
                                                value={clase.asignadoA} 
                                                onChange={(e) => handleAssignmentChange(clase.id, e.target.value)}
                                                className="block w-full py-2 px-3 border border-gray-300 rounded"
                                            >
                                                <option value="" disabled>Seleccionar...</option>
                                                <option value="IGNA">IGNA</option>
                                                <option value="JOSE">JOSE</option>
                                                <option value="NINGUNO">NINGUNO (Escuela)</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button 
                                                onClick={() => guardarAsignacion(clase.id, clase.asignadoA)}
                                                className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
                                                disabled={!clase.asignadoA}
                                            >
                                                Asignar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            <hr className="my-10" />

            {/* --- SECCIÓN DE GENERACIÓN DE REPORTE Y ESTADÍSTICAS --- */}
            <h2 className="text-2xl font-bold mb-6 text-gray-800">🔍 Generador de Reporte Financiero</h2>
            
            <div className="bg-white p-6 rounded-lg shadow-md mb-8 flex gap-4 items-end">
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
                    disabled={loadingReporte}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 transition-colors"
                >
                    {loadingReporte ? 'Cargando...' : 'Generar Reporte'}
                </button>
            </div>

            {reporte && (
                <div className="space-y-8">
                    <h2 className="text-2xl font-semibold border-b pb-2 text-gray-800">Resumen Financiero ({fechas.fechaInicio} a {fechas.fechaFin})</h2>
                    
                    {/* Tarjetas de Resumen */}
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

                    <hr className="my-8" />
                    
                    {/* --- SECCIÓN DE GRÁFICOS (Implementación simulada) --- */}
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">📈 Gráficos de Estadísticas</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* <div className="bg-white p-6 rounded-lg shadow-md h-96">
                            <h3 className="text-lg font-semibold mb-4">Resumen de Flujo de Caja</h3>
                            <Bar data={chartData} options={{ maintainAspectRatio: false }} />
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-md h-96">
                            <h3 className="text-lg font-semibold mb-4">Distribución de Ingresos</h3>
                            <Pie data={{ labels: ['Igna', 'Jose', 'Escuela'], datasets: [{ data: [reporte.totalAsignadoIgna, reporte.totalAsignadoJose, ingresosBrutos - reporte.totalAsignadoIgna - reporte.totalAsignadoJose], backgroundColor: ['#3b82f6', '#10b981', '#4f46e5'] }] }} options={{ maintainAspectRatio: false }}/>
                        </div> */}
                        <div className="bg-gray-100 p-8 rounded-lg text-center h-64 flex items-center justify-center">
                            [Aquí iría el gráfico de barras de Ingresos vs Egresos]
                        </div>
                         <div className="bg-gray-100 p-8 rounded-lg text-center h-64 flex items-center justify-center">
                            [Aquí iría el gráfico de torta de Asignación de Ingresos (Igna vs Jose vs Escuela)]
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReporteEstadisticas;