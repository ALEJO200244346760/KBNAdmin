import React, { useState, useEffect } from 'react';
// import { useAuth } from '../context/AuthContext'; 
// import { Bar, Pie } from 'react-chartjs-2'; 

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
    
    // --- ESTADOS PARA DATOS Y UI ---
    const [ingresosEgresos, setIngresosEgresos] = useState([]);
    const [clasesPendientes, setClasesPendientes] = useState([]);
    const [loadingClases, setLoadingClases] = useState(true);
    const [expandedId, setExpandedId] = useState(null); // Nuevo estado para detalle expandido

    useEffect(() => {
        fetchClases();
    }, []);
    
    // Función para alternar el detalle expandido
    const toggleDetails = (id) => {
        setExpandedId(prevId => prevId === id ? null : id);
    };

    const fetchClases = async () => {
        setLoadingClases(true);
        try {
            const response = await fetch('https://kbnadmin-production.up.railway.app/api/clases/listar');
            const data = await response.json();
            
            // FILTRO PENDIENTES (Ingreso y asignadoA es null, vacío o 'NINGUNO')
            const pendientes = data
                .filter(clase => 
                    clase.tipoTransaccion === 'INGRESO' && 
                    (!clase.asignadoA || clase.asignadoA.trim() === '' || clase.asignadoA.toUpperCase() === 'NINGUNO')
                )
                .map(clase => ({ ...clase, asignadoA: clase.asignadoA || "" }));

            setClasesPendientes(pendientes);
            setIngresosEgresos(data); 

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
            // 1. Obtener el Resumen Financiero
            const urlReporte = `https://kbnadmin-production.up.railway.app/api/clases/reporte?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
            const responseReporte = await fetch(urlReporte);

            if (responseReporte.ok) {
                const dataReporte = await responseReporte.json();
                setReporte(dataReporte);
            } else if (responseReporte.status === 404) {
                 alert("No se encontraron datos de resumen para el rango de fechas seleccionado.");
            } else {
                alert("Error al cargar el resumen del reporte.");
            }
            
            // 2. OBTENER EL DETALLE DE TRANSACCIONES Y FILTRAR POR FECHA (Localmente)
            const responseListar = await fetch('https://kbnadmin-production.up.railway.app/api/clases/listar');
            const allData = await responseListar.json();
            
            const filteredData = allData.filter(clase => {
                const claseDate = clase.fecha;
                return claseDate >= fechaInicio && claseDate <= fechaFin;
            });
            setIngresosEgresos(filteredData);


        } catch (error) {
            console.error("Error en la solicitud:", error);
        } finally {
            setLoadingReporte(false);
        }
    };

    const formatCurrency = (amount) => {
        return `$${(parseFloat(amount) || 0).toFixed(2)}`;
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
    
    // ... (chartData sigue igual)

    return (
        <div className="max-w-7xl mx-auto mt-10 p-6">
            <h1 className="text-3xl font-bold mb-6 text-indigo-700">📊 Reportes y Notificaciones Administrativas</h1>

            {/* --- SECCIÓN DE NOTIFICACIONES/ASIGNACIÓN --- */}
            <div className="bg-white p-6 rounded-lg shadow-xl mb-10">
                <h2 className="text-2xl font-bold mb-4 text-red-600 flex items-center">
                    🔔 Clases Pendientes de Asignación ({clasesPendientes.length})
                </h2>
                
                {/* (La tabla de Pendientes permanece igual) */}
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tipo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Instructor</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Detalles</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Total</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Asignar Ingreso a</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {clasesPendientes.map(clase => (
                                    <tr key={clase.id} className="hover:bg-yellow-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{clase.fecha || "-"}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">INGRESO</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{clase.instructor || "-"}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{clase.actividad} ({clase.detalles})</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">{formatCurrency(clase.total)} ({clase.moneda})</td>
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

            {/* --- SECCIÓN DE GENERACIÓN DE REPORTE Y ESTADÍSTICAS (Resumen) --- */}
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
                    {loadingReporte ? 'Generando...' : 'Generar Reporte'}
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
                    
                    <hr className="my-8" />
                    
                    {/* --- SECCIÓN DE DETALLE DE TRANSACCIONES --- */}
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">📄 Detalle de Transacciones Filtradas</h2>
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actividad</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto Neto</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Moneda</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asignado A</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {ingresosEgresos.length > 0 ? ingresosEgresos.map(clase => (
                                    <React.Fragment key={clase.id}>
                                        <tr className={clase.tipoTransaccion === 'INGRESO' ? "hover:bg-green-50" : "hover:bg-red-50"}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{clase.fecha}</td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${clase.tipoTransaccion === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                                                {clase.tipoTransaccion}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{clase.actividad}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                                                {/* Mostrar el total para INGRESO y el total/gastos para EGRESO */}
                                                {clase.tipoTransaccion === 'INGRESO' ? formatCurrency(clase.total) : `-${formatCurrency(clase.total || clase.gastosAsociados)}`}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{clase.moneda}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{clase.asignadoA || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <button
                                                    onClick={() => toggleDetails(clase.id)}
                                                    className="text-indigo-600 hover:text-indigo-900 font-medium text-xs bg-indigo-100 px-3 py-1 rounded"
                                                >
                                                    {expandedId === clase.id ? 'Ocultar Detalle' : 'Ver Detalle'}
                                                </button>
                                            </td>
                                        </tr>
                                        {/* Fila de detalles extendidos (aparece solo si expandedId coincide) */}
                                        {expandedId === clase.id && (
                                            <tr className="bg-gray-50">
                                                <td colSpan="7" className="px-6 py-4 text-sm text-gray-700 border-t border-gray-200">
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-2">
                                                        {clase.tipoTransaccion === 'INGRESO' && (
                                                            <>
                                                                <p className="font-semibold">Horas: <span className="font-normal">{clase.cantidadHoras || 'N/A'}</span></p>
                                                                <p className="font-semibold">Tarifa/h: <span className="font-normal">{formatCurrency(clase.tarifaPorHora)}</span></p>
                                                                <p className="font-semibold">Gastos Asoc.: <span className="font-normal">{formatCurrency(clase.gastosAsociados)}</span></p>
                                                                <p className="font-semibold">Comisión: <span className="font-normal">{formatCurrency(clase.comision)}</span></p>
                                                            </>
                                                        )}
                                                        {clase.tipoTransaccion === 'EGRESO' && (
                                                            <>
                                                                <p className="font-semibold">Descripción Egreso: <span className="font-normal">{clase.detalles || 'N/A'}</span></p>
                                                                <p className="font-semibold">Forma Pago: <span className="font-normal">{clase.formaPago || 'N/A'}</span></p>
                                                                <p className="font-semibold">Vendedor/Proveedor: <span className="font-normal">{clase.vendedor || 'N/A'}</span></p>
                                                                {/* Para egresos, el campo gastosAsociados puede actuar como un detalle extra si total es el monto principal */}
                                                                <p className="font-semibold">Costo Principal: <span className="font-normal">{formatCurrency(clase.total || clase.gastosAsociados)}</span></p> 
                                                            </>
                                                        )}
                                                        <p className="font-semibold">Autor: <span className="font-normal">{clase.instructor || 'N/A'}</span></p>
                                                        <p className="font-semibold">Forma de Pago: <span className="font-normal">{clase.formaPago || 'N/A'}</span></p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )) : (
                                    <tr>
                                        <td colSpan="7" className="text-center p-4 text-gray-500">No hay transacciones en el rango de fechas seleccionado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* --- SECCIÓN DE GRÁFICOS --- */}
                    <hr className="my-8" />
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">📈 Gráficos de Estadísticas</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* [Gráficos] */}
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