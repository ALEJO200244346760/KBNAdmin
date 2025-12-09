import React, { useState, useEffect } from 'react';

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
    const [expandedId, setExpandedId] = useState(null); // Detalle de Reporte
    const [expandedPendingId, setExpandedPendingId] = useState(null); // Detalle de Pendientes

    useEffect(() => {
        fetchClases();
    }, []);
    
    // Función para alternar detalles
    const toggleDetails = (id, type) => {
        if (type === 'PENDING') {
            setExpandedPendingId(prevId => prevId === id ? null : id);
        } else {
            setExpandedId(prevId => prevId === id ? null : id);
        }
    };

    const formatCurrency = (amount) => {
        return `$${(parseFloat(amount) || 0).toFixed(2)}`;
    };

    // Función principal para cargar clases y filtrar pendientes
    const fetchClases = async () => {
        setLoadingClases(true);
        try {
            const response = await fetch('https://kbnadmin-production.up.railway.app/api/clases/listar');
            const data = await response.json();
            
            // FILTRO PENDIENTES: Ingreso y asignadoA es NULO/VACÍO/NINGUNO
            const pendientes = data
                .filter(clase => 
                    clase.tipoTransaccion === 'INGRESO' && 
                    (!clase.asignadoA || clase.asignadoA.trim() === '' || clase.asignadoA.toUpperCase() === 'NINGUNO')
                )
                .map(clase => ({ ...clase, asignadoA: clase.asignadoA || "NINGUNO" })); // Asegurar que el select tenga un valor

            setClasesPendientes(pendientes);
            // setIngresosEgresos(data); // No establecer aquí, para no confundir con el reporte
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
        if (!asignadoA || asignadoA === 'NINGUNO') return alert("Selecciona IGNA o JOSE para asignar el ingreso.");

        try {
            const response = await fetch(`https://kbnadmin-production.up.railway.app/api/clases/asignar/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ asignadoA })
            });

            if (response.ok) {
                alert(`¡Asignado correctamente a ${asignadoA}!`);
                setClasesPendientes(prev => prev.filter(clase => clase.id !== id));
                // Recargar el reporte completo para actualizar el resumen (si ya estaba generado)
                if (reporte) {
                    generarReporte();
                } else {
                    fetchClases();
                }
            } else {
                alert("Error al guardar la asignación. Intenta de nuevo.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Error de conexión al servidor.");
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
            
            // 2. OBTENER EL DETALLE DE TRANSACCIONES Y FILTRAR POR FECHA
            const responseListar = await fetch('https://kbnadmin-production.up.railway.app/api/clases/listar');
            const allData = await responseListar.json();
            
            const filteredData = allData.filter(clase => {
                const claseDate = clase.fecha;
                // Si la fecha de la clase es igual o posterior a la fecha de inicio
                // Y la fecha de la clase es igual o anterior a la fecha fin
                return claseDate >= fechaInicio && claseDate <= fechaFin;
            });
            setIngresosEgresos(filteredData);
            // DEBUG: Mostrar en consola cuántas transacciones se encontraron
            console.log(`Reporte generado: ${filteredData.length} transacciones encontradas entre ${fechaInicio} y ${fechaFin}`);


        } catch (error) {
            console.error("Error en la solicitud:", error);
        } finally {
            setLoadingReporte(false);
        }
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

    // --- Componente de Detalle para INGRESOS (Usado en ambas tablas) ---
    const IngresoDetails = ({ clase }) => (
        <>
            <p className="font-semibold">Horas: <span className="font-normal">{clase.cantidadHoras || 'N/A'}</span></p>
            <p className="font-semibold">Tarifa/h: <span className="font-normal">{formatCurrency(clase.tarifaPorHora)}</span></p>
            <p className="font-semibold text-orange-600">Gastos Asoc.: <span className="font-normal">{formatCurrency(clase.gastosAsociados)}</span></p>
            <p className="font-semibold">Comisión: <span className="font-normal">{formatCurrency(clase.comision)}</span></p>
        </>
    );

    // --- Componente de Detalle para EGRESOS (Usado en tabla de Detalles) ---
    const EgresoDetails = ({ clase }) => (
        <>
            {/* CORRECCIÓN: Usar clase.detalles para la descripción del egreso */}
            <p className="font-semibold">Descripción Egreso: <span className="font-normal">{clase.detalles || 'N/A'}</span></p>
            <p className="font-semibold">Forma Pago: <span className="font-normal">{clase.formaPago || 'N/A'}</span></p>
            <p className="font-semibold">Vendedor/Proveedor: <span className="font-normal">{clase.vendedor || 'N/A'}</span></p>
            {/* CORRECCIÓN: Usar gastosAsociados si total es 0 */}
            <p className="font-semibold text-red-600">Costo Principal: <span className="font-normal">{formatCurrency(clase.gastosAsociados || clase.total)}</span></p> 
        </>
    );
    
    // --- Renderizado optimizado para móvil de la fila de Pendientes ---
    const RenderPendingRow = ({ clase }) => (
        <React.Fragment key={clase.id}>
            {/* Fila principal de la tabla (solo visible en desktop/tablet) */}
            <tr className="hidden md:table-row hover:bg-yellow-50">
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
                        <option value="NINGUNO">NINGUNO (Escuela)</option>
                        <option value="IGNA">IGNA</option>
                        <option value="JOSE">JOSE</option>
                    </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                    <button 
                        onClick={() => guardarAsignacion(clase.id, clase.asignadoA)}
                        className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
                        disabled={clase.asignadoA === 'NINGUNO' || !clase.asignadoA}
                    >
                        Asignar
                    </button>
                    <button
                        onClick={() => toggleDetails(clase.id, 'PENDING')}
                        className="text-indigo-600 hover:text-indigo-900 font-medium text-xs bg-indigo-100 px-3 py-1 rounded"
                    >
                        {expandedPendingId === clase.id ? 'Ocultar' : 'Detalle'}
                    </button>
                </td>
            </tr>
            
            {/* Card de móvil */}
            <li className="md:hidden bg-white shadow-md rounded-lg p-4 mb-4 border border-red-200">
                <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-red-700 text-lg">PENDIENTE: {clase.fecha}</span>
                    <span className="font-bold text-green-600">{formatCurrency(clase.total)}</span>
                </div>
                <p className="text-sm text-gray-700">**Actividad:** {clase.actividad} ({clase.detalles})</p>
                <p className="text-sm text-gray-700">**Instructor:** {clase.instructor}</p>
                
                <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700">Asignar a:</label>
                    <select 
                        value={clase.asignadoA} 
                        onChange={(e) => handleAssignmentChange(clase.id, e.target.value)}
                        className="block w-full py-2 px-3 border border-gray-300 rounded text-sm mt-1"
                    >
                        <option value="NINGUNO">NINGUNO (Escuela)</option>
                        <option value="IGNA">IGNA</option>
                        <option value="JOSE">JOSE</option>
                    </select>
                </div>
                
                <div className="flex gap-2 mt-3">
                    <button 
                        onClick={() => guardarAsignacion(clase.id, clase.asignadoA)}
                        className="flex-1 text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
                        disabled={clase.asignadoA === 'NINGUNO' || !clase.asignadoA}
                    >
                        Asignar
                    </button>
                    <button
                        onClick={() => toggleDetails(clase.id, 'PENDING')}
                        className="flex-1 text-indigo-600 hover:text-indigo-900 font-medium text-sm bg-indigo-100 px-3 py-1 rounded"
                    >
                        {expandedPendingId === clase.id ? 'Ocultar Detalle' : 'Ver Detalle'}
                    </button>
                </div>
            </li>
            
            {/* Fila de detalles extendidos (visible en desktop y móvil) */}
            {(expandedPendingId === clase.id) && (
                <tr className="bg-red-50/50">
                    <td colSpan="7" className="px-6 py-4 text-sm text-gray-700 border-t border-red-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-2">
                            <IngresoDetails clase={clase} />
                            <p className="font-semibold">Forma de Pago: <span className="font-normal">{clase.formaPago || 'N/A'}</span></p>
                            <p className="font-semibold">Detalle Pago: <span className="font-normal">{clase.detalleFormaPago || 'N/A'}</span></p>
                            <p className="font-semibold">Vendedor: <span className="font-normal">{clase.vendedor || 'N/A'}</span></p>
                        </div>
                    </td>
                </tr>
            )}
        </React.Fragment>
    );

    // --- Renderizado optimizado para móvil de la fila de Reporte Detalle ---
    const RenderReporteRow = ({ clase }) => (
        <React.Fragment key={clase.id}>
            {/* Fila principal de la tabla (solo visible en desktop/tablet) */}
            <tr className={clase.tipoTransaccion === 'INGRESO' ? "hidden md:table-row hover:bg-green-50" : "hidden md:table-row hover:bg-red-50"}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{clase.fecha}</td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${clase.tipoTransaccion === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                    {clase.tipoTransaccion}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{clase.actividad}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                    {/* CORRECCIÓN: Usar gastosAsociados si es EGRESO y total es 0 */}
                    {clase.tipoTransaccion === 'INGRESO' ? formatCurrency(clase.total) : `-${formatCurrency(clase.gastosAsociados || clase.total)}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{clase.moneda}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{clase.asignadoA || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                        onClick={() => toggleDetails(clase.id, 'REPORT')}
                        className="text-indigo-600 hover:text-indigo-900 font-medium text-xs bg-indigo-100 px-3 py-1 rounded"
                    >
                        {expandedId === clase.id ? 'Ocultar' : 'Detalle'}
                    </button>
                </td>
            </tr>

            {/* Card de móvil */}
            <li className={`md:hidden shadow-md rounded-lg p-4 mb-4 ${clase.tipoTransaccion === 'INGRESO' ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-lg text-gray-800">{clase.tipoTransaccion}</span>
                    <span className="font-bold text-xl">
                        {clase.tipoTransaccion === 'INGRESO' ? formatCurrency(clase.total) : `-${formatCurrency(clase.gastosAsociados || clase.total)}`}
                    </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">**Fecha:** {clase.fecha} | **Actividad:** {clase.actividad}</p>
                <p className="text-sm text-gray-700 mb-2">**Asignado a:** {clase.asignadoA || 'N/A'} | **Moneda:** {clase.moneda}</p>
                
                <button
                    onClick={() => toggleDetails(clase.id, 'REPORT')}
                    className="w-full text-indigo-600 hover:text-indigo-900 font-medium text-sm bg-indigo-100 px-3 py-1 rounded mt-2"
                >
                    {expandedId === clase.id ? 'Ocultar Detalle' : 'Ver Detalle Completo'}
                </button>
            </li>

            {/* Fila de detalles extendidos (visible en desktop y móvil) */}
            {expandedId === clase.id && (
                <tr className="bg-gray-100">
                    <td colSpan="7" className="px-6 py-4 text-sm text-gray-700 border-t border-gray-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-2">
                            {clase.tipoTransaccion === 'INGRESO' ? <IngresoDetails clase={clase} /> : <EgresoDetails clase={clase} />}
                            <p className="font-semibold">Autor: <span className="font-normal">{clase.instructor || 'N/A'}</span></p>
                            <p className="font-semibold">Forma de Pago: <span className="font-normal">{clase.formaPago || 'N/A'}</span></p>
                            <p className="font-semibold">Detalle Pago: <span className="font-normal">{clase.detalleFormaPago || 'N/A'}</span></p>
                            <p className="font-semibold col-span-full">Detalles: <span className="font-normal">{clase.detalles || 'N/A'}</span></p>
                        </div>
                    </td>
                </tr>
            )}
        </React.Fragment>
    );

    return (
        <div className="max-w-7xl mx-auto mt-10 p-4 md:p-6">
            <h1 className="text-3xl font-bold mb-6 text-indigo-700">📊 Reportes y Notificaciones Administrativas</h1>

            {/* --- SECCIÓN DE NOTIFICACIONES/ASIGNACIÓN --- */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-xl mb-10">
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
                    <>
                        {/* Vista Desktop/Tablet (Tabla) */}
                        <div className="hidden md:block overflow-x-auto">
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
                                    {clasesPendientes.map(clase => <RenderPendingRow key={clase.id} clase={clase} />)}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Vista Móvil (Lista de Cards) */}
                        <ul className="md:hidden">
                             {clasesPendientes.map(clase => <RenderPendingRow key={clase.id} clase={clase} />)}
                        </ul>
                    </>
                )}
            </div>
            
            <hr className="my-10" />

            {/* --- SECCIÓN DE GENERACIÓN DE REPORTE Y ESTADÍSTICAS (Resumen) --- */}
            <h2 className="text-2xl font-bold mb-6 text-gray-800">🔍 Generador de Reporte Financiero</h2>
            
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md mb-8 flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-auto">
                    <label className="block text-sm font-medium text-gray-700">Desde</label>
                    <input type="date" name="fechaInicio" value={fechas.fechaInicio} onChange={handleChange} className="mt-1 p-2 border rounded-md w-full" />
                </div>
                <div className="w-full md:w-auto">
                    <label className="block text-sm font-medium text-gray-700">Hasta</label>
                    <input type="date" name="fechaFin" value={fechas.fechaFin} onChange={handleChange} className="mt-1 p-2 border rounded-md w-full" />
                </div>
                <button 
                    onClick={generarReporte}
                    disabled={loadingReporte}
                    className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 transition-colors"
                >
                    {loadingReporte ? 'Generando...' : 'Generar Reporte'}
                </button>
            </div>

            {reporte && (
                <div className="space-y-8">
                    <h2 className="text-2xl font-semibold border-b pb-2 text-gray-800">Resumen Financiero ({fechas.fechaInicio} a {fechas.fechaFin})</h2>
                    
                    {/* Tarjetas de Resumen (Responsivas) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                        <Card title="Ingresos Brutos" value={ingresosBrutos} color="bg-indigo-600" />
                        <Card title="Gastos Asoc. a Ingreso" value={gastosAsociados} color="bg-orange-500" />
                        <Card title="Total Egresos Operacionales" value={egresosOperacionales} color="bg-red-500" />
                        <Card title="SALDO NETO" value={ingresosNetos} color="bg-green-700" />
                    </div>

                    <h2 className="text-2xl font-semibold border-b pb-2 text-gray-800 pt-4">Asignación de Ingresos (100% de la clase)</h2>
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-6">
                        <Card title="Asignado a IGNA" value={reporte.totalAsignadoIgna} color="bg-blue-500" />
                        <Card title="Asignado a JOSE" value={reporte.totalAsignadoJose} color="bg-green-600" />
                    </div>
                    
                    <hr className="my-8" />
                    
                    {/* --- SECCIÓN DE DETALLE DE TRANSACCIONES --- */}
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">📄 Detalle de Transacciones Filtradas</h2>
                    
                    {/* Vista Desktop/Tablet (Tabla) */}
                    <div className="hidden md:block overflow-x-auto">
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
                                {ingresosEgresos.length > 0 ? ingresosEgresos.map(clase => <RenderReporteRow key={clase.id} clase={clase} />) : (
                                    <tr>
                                        <td colSpan="7" className="text-center p-4 text-gray-500">No hay transacciones en el rango de fechas seleccionado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Vista Móvil (Lista de Cards) */}
                    <ul className="md:hidden">
                         {ingresosEgresos.length > 0 ? ingresosEgresos.map(clase => <RenderReporteRow key={clase.id} clase={clase} />) : (
                            <li className="text-center p-4 text-gray-500 bg-white shadow rounded-lg">No hay transacciones en el rango de fechas seleccionado.</li>
                        )}
                    </ul>

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