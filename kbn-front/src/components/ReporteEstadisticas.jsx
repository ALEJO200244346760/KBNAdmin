import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

// Registro de componentes de gráficos
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const ReporteEstadisticas = () => {
    // --- ESTADOS ---
    const [allData, setAllData] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Listas separadas para facilitar renderizado
    const [pendientes, setPendientes] = useState([]);
    const [egresos, setEgresos] = useState([]);
    const [asignados, setAsignados] = useState([]);
    
    // Estado para expansión de detalles (funciona para todas las listas)
    const [expandedId, setExpandedId] = useState(null);

    // --- EFECTOS ---
    useEffect(() => {
        fetchData();
    }, []);

    // --- LOGICA DE DATOS ---
    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await fetch('https://kbnadmin-production.up.railway.app/api/clases/listar');
            const data = await response.json();
            
            // Procesamiento de datos
            const listPendientes = [];
            const listEgresos = [];
            const listAsignados = [];

            data.forEach(item => {
                if (item.tipoTransaccion === 'EGRESO') {
                    listEgresos.push(item);
                } else if (item.tipoTransaccion === 'INGRESO') {
                    // Lógica para determinar si está pendiente (Null, Vacio o "NINGUNO")
                    if (!item.asignadoA || item.asignadoA.trim() === '' || item.asignadoA.toUpperCase() === 'NINGUNO') {
                        // Aseguramos que el select tenga un valor controlable
                        item.asignadoA = "NINGUNO"; 
                        listPendientes.push(item);
                    } else {
                        listAsignados.push(item);
                    }
                }
            });

            setAllData(data);
            setPendientes(listPendientes);
            setEgresos(listEgresos);
            setAsignados(listAsignados);

        } catch (error) {
            console.error("Error al cargar datos:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- CALCULOS FINANCIEROS (Memoizados para rendimiento) ---
    const financials = useMemo(() => {
        let totalIngresos = 0;
        let totalEgresos = 0;
        let totalIgna = 0;
        let totalJose = 0;

        // Sumar Ingresos (Asignados y Pendientes)
        [...pendientes, ...asignados].forEach(item => {
            totalIngresos += parseFloat(item.total) || 0;
            if (item.asignadoA === 'IGNA') totalIgna += parseFloat(item.total) || 0;
            if (item.asignadoA === 'JOSE') totalJose += parseFloat(item.total) || 0;
        });

        // Sumar Egresos (Usando gastosAsociados si total es 0, segun tu logica de backend)
        egresos.forEach(item => {
            const monto = parseFloat(item.gastosAsociados) || parseFloat(item.total) || 0;
            totalEgresos += monto;
        });

        return {
            ingresos: totalIngresos,
            egresos: totalEgresos,
            balance: totalIngresos - totalEgresos,
            igna: totalIgna,
            jose: totalJose
        };
    }, [pendientes, egresos, asignados]);

    // --- PREPARACIÓN DE DATOS PARA GRÁFICOS ---
    const chartDataDistribution = {
        labels: ['Igna', 'Jose', 'Sin Asignar/Escuela'],
        datasets: [{
            data: [financials.igna, financials.jose, financials.ingresos - financials.igna - financials.jose],
            backgroundColor: ['#3b82f6', '#10b981', '#9ca3af'],
            hoverOffset: 4
        }]
    };

    const chartDataFlow = {
        labels: ['Ingresos Totales', 'Egresos Totales'],
        datasets: [{
            label: 'Flujo de Caja',
            data: [financials.ingresos, financials.egresos],
            backgroundColor: ['#4f46e5', '#ef4444'],
        }]
    };

    // Agrupar egresos por actividad para el gráfico
    const expensesByActivity = egresos.reduce((acc, curr) => {
        const monto = parseFloat(curr.gastosAsociados) || parseFloat(curr.total) || 0;
        const label = curr.actividad || 'Otros';
        acc[label] = (acc[label] || 0) + monto;
        return acc;
    }, {});

    const chartDataExpenses = {
        labels: Object.keys(expensesByActivity),
        datasets: [{
            label: 'Gastos por Actividad',
            data: Object.values(expensesByActivity),
            backgroundColor: ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'],
        }]
    };

    // --- ACCIONES ---
    const toggleDetails = (id) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    const formatCurrency = (val) => `$${(parseFloat(val) || 0).toFixed(2)}`;

    // Manejo de Asignación en Pendientes
    const handlePendienteChange = (id, val) => {
        setPendientes(prev => prev.map(p => p.id === id ? { ...p, asignadoA: val } : p));
    };

    const saveAssignment = async (id, asignadoA) => {
        if (!asignadoA || asignadoA === 'NINGUNO') return alert("Selecciona un instructor válido.");
        try {
            const res = await fetch(`https://kbnadmin-production.up.railway.app/api/clases/asignar/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ asignadoA })
            });
            if (res.ok) {
                alert("Asignado correctamente.");
                fetchData(); // Recargar todo
            }
        } catch (e) {
            alert("Error de conexión");
        }
    };

    const handleDelete = async (id) => {
        if(!window.confirm("¿Seguro que deseas eliminar este registro? Esta acción no se puede deshacer.")) return;
        
        try {
             // Asumo que tienes un endpoint DELETE /api/clases/{id}. Si no, hay que crearlo en SpringBoot.
             // const res = await fetch(`https://kbnadmin-production.up.railway.app/api/clases/${id}`, { method: 'DELETE' });
             // if(res.ok) { alert("Eliminado"); fetchData(); }
             alert("Funcionalidad de eliminar simulada (Requiere endpoint DELETE en backend)");
        } catch (e) {
            console.error(e);
        }
    };

    const handleEdit = (id) => {
        alert(`Funcionalidad de editar ID: ${id}. Aquí podrías abrir un modal con el formulario pre-cargado.`);
    };


    // --- RENDERIZADO DE FILAS (REUTILIZABLE) ---
    const RenderDetails = ({ item }) => (
        <div className="bg-gray-50 p-4 rounded-b-lg border-t border-gray-200 text-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
            <div>
                <span className="font-bold text-gray-700">Descripción:</span> {item.detalles || '-'}
            </div>
            <div>
                <span className="font-bold text-gray-700">Vendedor:</span> {item.vendedor || '-'}
            </div>
            <div>
                <span className="font-bold text-gray-700">Forma Pago:</span> {item.formaPago || '-'}
            </div>
            {item.tipoTransaccion === 'INGRESO' && (
                <>
                    <div><span className="font-bold text-gray-700">Horas:</span> {item.cantidadHoras}</div>
                    <div><span className="font-bold text-gray-700">Tarifa:</span> {formatCurrency(item.tarifaPorHora)}</div>
                    <div><span className="font-bold text-gray-700">Comisión:</span> {formatCurrency(item.comision)}</div>
                    <div><span className="font-bold text-gray-700">Gastos Asoc:</span> {formatCurrency(item.gastosAsociados)}</div>
                </>
            )}
             {item.tipoTransaccion === 'EGRESO' && (
                <div><span className="font-bold text-gray-700">Detalle Pago:</span> {item.detalleFormaPago || '-'}</div>
            )}
             <div><span className="font-bold text-gray-700">Creado por:</span> {item.instructor}</div>
        </div>
    );

    if (loading) return <div className="p-10 text-center text-xl text-indigo-600 font-bold">Cargando datos financieros...</div>;

    return (
        <div className="max-w-7xl mx-auto p-4 space-y-8 pb-20">
            
            {/* --- HEADER Y TOTAL GLOBAL --- */}
            <div className="flex flex-col md:flex-row justify-between items-center border-b pb-4">
                <h1 className="text-3xl font-bold text-gray-800">Panel Financiero</h1>
                <div className="mt-4 md:mt-0 bg-indigo-900 text-white px-6 py-3 rounded-lg shadow-lg text-center">
                    <p className="text-xs uppercase tracking-widest opacity-75">Saldo Total Neto</p>
                    <p className="text-3xl font-bold">{formatCurrency(financials.balance)}</p>
                </div>
            </div>

            {/* --- SECCIÓN 1: PENDIENTES --- */}
            <div className="bg-white rounded-xl shadow-md border-l-4 border-yellow-500 overflow-hidden">
                <div className="bg-yellow-50 px-6 py-3 border-b border-yellow-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-yellow-800 flex items-center gap-2">
                        🔔 Pendientes de Asignación <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded-full">{pendientes.length}</span>
                    </h2>
                </div>
                
                {pendientes.length === 0 ? (
                     <div className="p-6 text-center text-gray-500">✅ No hay clases pendientes.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {pendientes.map(item => (
                            <div key={item.id} className="hover:bg-gray-50 transition-colors">
                                {/* Fila Principal Móvil/Desktop */}
                                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex justify-between md:justify-start md:gap-4 items-baseline">
                                            <span className="font-bold text-gray-800">{item.fecha}</span>
                                            <span className="text-green-600 font-bold">{formatCurrency(item.total)}</span>
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">
                                            {item.actividad} - {item.instructor}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 w-full md:w-auto">
                                        <select 
                                            value={item.asignadoA}
                                            onChange={(e) => handlePendienteChange(item.id, e.target.value)}
                                            className="border rounded px-2 py-1 text-sm w-full md:w-32"
                                        >
                                            <option value="NINGUNO">Elegir...</option>
                                            <option value="IGNA">IGNA</option>
                                            <option value="JOSE">JOSE</option>
                                        </select>
                                        <button 
                                            onClick={() => saveAssignment(item.id, item.asignadoA)}
                                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                                        >
                                            Guardar
                                        </button>
                                        <button 
                                            onClick={() => toggleDetails(item.id)}
                                            className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300"
                                        >
                                            {expandedId === item.id ? '▲' : '▼'}
                                        </button>
                                    </div>
                                </div>
                                {expandedId === item.id && <RenderDetails item={item} />}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- SECCIÓN 2: EGRESOS --- */}
            <div className="bg-white rounded-xl shadow-md border-l-4 border-red-500 overflow-hidden">
                <div className="bg-red-50 px-6 py-3 border-b border-red-100">
                    <h2 className="text-xl font-bold text-red-800">💸 Listado de Egresos</h2>
                </div>
                {egresos.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No hay egresos registrados.</div>
                ) : (
                     <div className="divide-y divide-gray-100">
                        {egresos.map(item => {
                            // Calculamos el monto correcto para mostrar
                            const monto = parseFloat(item.gastosAsociados) || parseFloat(item.total) || 0;
                            return (
                                <div key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-baseline gap-4">
                                                <span className="font-bold text-gray-800">{item.fecha}</span>
                                                <span className="text-red-600 font-bold">-{formatCurrency(monto)}</span>
                                            </div>
                                            <div className="text-sm text-gray-600 mt-1">
                                                {item.detalles || item.actividad} ({item.formaPago})
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => toggleDetails(item.id)}
                                            className="w-full md:w-auto bg-gray-100 text-indigo-600 px-4 py-1 rounded text-sm font-medium hover:bg-indigo-50"
                                        >
                                            {expandedId === item.id ? 'Ocultar Detalle' : 'Ver Detalle'}
                                        </button>
                                    </div>
                                    {expandedId === item.id && <RenderDetails item={item} />}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* --- SECCIÓN 3: INGRESOS ASIGNADOS --- */}
            <div className="bg-white rounded-xl shadow-md border-l-4 border-green-500 overflow-hidden">
                <div className="bg-green-50 px-6 py-3 border-b border-green-100">
                    <h2 className="text-xl font-bold text-green-800">✅ Ingresos Asignados</h2>
                </div>
                {asignados.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No hay ingresos asignados aún.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {asignados.map(item => (
                            <div key={item.id} className="hover:bg-gray-50 transition-colors">
                                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex justify-between md:justify-start md:gap-4 items-baseline">
                                            <span className="font-bold text-gray-800">{item.fecha}</span>
                                            <span className="text-green-600 font-bold">{formatCurrency(item.total)}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${item.asignadoA === 'IGNA' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                                {item.asignadoA}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">
                                            {item.actividad} ({item.moneda})
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2 justify-end w-full md:w-auto">
                                        <button onClick={() => toggleDetails(item.id)} className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 p-2 rounded text-xs font-bold">
                                            DETALLE
                                        </button>
                                        <button onClick={() => handleEdit(item.id)} className="text-yellow-600 bg-yellow-50 hover:bg-yellow-100 p-2 rounded text-xs font-bold">
                                            EDITAR
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded text-xs font-bold">
                                            ELIMINAR
                                        </button>
                                    </div>
                                </div>
                                {expandedId === item.id && <RenderDetails item={item} />}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- SECCIÓN 4: GRÁFICOS Y ESTADÍSTICAS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8">
                {/* Gráfico 1: Distribución Igna vs Jose */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-bold text-gray-700 mb-4 text-center">Distribución de Ingresos</h3>
                    <div className="h-64 flex justify-center">
                        <Doughnut data={chartDataDistribution} options={{ maintainAspectRatio: false }} />
                    </div>
                    <div className="mt-4 text-center text-sm text-gray-600">
                        <p>Igna: {formatCurrency(financials.igna)} | Jose: {formatCurrency(financials.jose)}</p>
                    </div>
                </div>

                {/* Gráfico 2: Flujo de Caja */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-bold text-gray-700 mb-4 text-center">Ingresos vs Egresos</h3>
                    <div className="h-64">
                         <Bar 
                            data={chartDataFlow} 
                            options={{ 
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } }
                            }} 
                        />
                    </div>
                </div>

                {/* Gráfico 3: Gastos por Actividad (Barra Horizontal o Pie) */}
                <div className="bg-white p-6 rounded-xl shadow-md lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-700 mb-4 text-center">Desglose de Gastos</h3>
                    <div className="h-64">
                        <Bar 
                            data={chartDataExpenses}
                            options={{
                                maintainAspectRatio: false,
                                indexAxis: 'y', // Barra horizontal
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReporteEstadisticas;