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
    
    // Listas
    const [pendientes, setPendientes] = useState([]);
    const [egresos, setEgresos] = useState([]);
    const [asignados, setAsignados] = useState([]);
    
    // UI Helpers
    const [expandedId, setExpandedId] = useState(null);
    const [showOtherCurrencies, setShowOtherCurrencies] = useState(false); // Para el botón de otras monedas

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
            
            const listPendientes = [];
            const listEgresos = [];
            const listAsignados = [];

            data.forEach(item => {
                if (item.tipoTransaccion === 'EGRESO') {
                    listEgresos.push(item);
                } else if (item.tipoTransaccion === 'INGRESO') {
                    if (!item.asignadoA || item.asignadoA.trim() === '' || item.asignadoA.toUpperCase() === 'NINGUNO') {
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

    // --- CÁLCULO DE TOTALES POR MONEDA ---
    const totalesPorMoneda = useMemo(() => {
        const totales = {};

        // Función auxiliar para sumar/restar
        const procesarMonto = (moneda, monto) => {
            const mon = moneda || 'USD'; // Default a USD si no tiene
            if (!totales[mon]) totales[mon] = 0;
            totales[mon] += monto;
        };

        // Procesar Ingresos (Suman)
        [...pendientes, ...asignados].forEach(item => {
            const total = parseFloat(item.total) || 0;
            // OJO: Si quieres restar los gastos del ingreso para el total neto, descomenta la siguiente linea:
            // const gasto = parseFloat(item.gastosAsociados) || 0;
            // procesarMonto(item.moneda, total - gasto); 
            
            // Por ahora sumamos el Total bruto del ingreso:
            procesarMonto(item.moneda, total);
        });

        // Procesar Egresos (Restan)
        egresos.forEach(item => {
            const monto = parseFloat(item.gastosAsociados) || parseFloat(item.total) || 0;
            procesarMonto(item.moneda, -monto);
        });

        return totales;
    }, [pendientes, egresos, asignados]);

    // --- ACCIONES ---
    const toggleDetails = (id) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    const formatCurrency = (val) => {
        // Formateo simple, se podría agregar el símbolo de moneda dinámicamente si se desea
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(val) || 0).replace('US', '');
    };

    const handlePendienteChange = (id, val) => {
        setPendientes(prev => prev.map(p => p.id === id ? { ...p, asignadoA: val } : p));
    };

    const saveAssignment = async (id, asignadoA) => {
        if (!asignadoA || asignadoA === 'NINGUNO') return alert("Selecciona un instructor válido.");
        try {
            const res = await fetch(`https://kbnadmin-production.up.railway.app/api/clases/asignar/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ asignadoA }) // Usando el DTO correcto
            });
            if (res.ok) {
                alert("Asignado correctamente.");
                fetchData();
            }
        } catch (e) {
            alert("Error de conexión");
        }
    };

    const handleDelete = async (id) => {
        if(!window.confirm("¿Eliminar registro?")) return;
        alert("Funcionalidad pendiente de Endpoint DELETE");
        // Lógica real aquí
    };

    const handleEdit = (id) => {
        alert(`Editar ID: ${id}`);
    };

    // --- RENDERIZADO DE DETALLES ---
    const RenderDetails = ({ item }) => (
        <div className="bg-gray-50 p-4 rounded-b-lg border-t border-gray-200 text-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
            <div><span className="font-bold text-gray-700">Detalle:</span> {item.detalles || '-'}</div>
            <div><span className="font-bold text-gray-700">Vendedor:</span> {item.vendedor || '-'}</div>
            <div><span className="font-bold text-gray-700">Forma Pago:</span> {item.formaPago || '-'}</div>
            
            {item.tipoTransaccion === 'INGRESO' && (
                <>
                    <div><span className="font-bold text-gray-700">Horas:</span> {item.cantidadHoras}</div>
                    <div><span className="font-bold text-gray-700">Tarifa:</span> {formatCurrency(item.tarifaPorHora)}</div>
                    <div><span className="font-bold text-gray-700">Comisión:</span> {formatCurrency(item.comision)}</div>
                    <div><span className="font-bold text-red-600">Gastos:</span> {formatCurrency(item.gastosAsociados)}</div>
                </>
            )}
             {item.tipoTransaccion === 'EGRESO' && (
                <div><span className="font-bold text-gray-700">Pago a:</span> {item.detalleFormaPago || '-'}</div>
            )}
             <div className="col-span-1 md:col-span-2"><span className="font-bold text-gray-700">Creado por:</span> {item.instructor}</div>
        </div>
    );

    if (loading) return <div className="p-10 text-center text-xl text-indigo-600 font-bold">Cargando datos...</div>;

    return (
        <div className="max-w-7xl mx-auto p-4 space-y-8 pb-20">
            
            {/* --- HEADER CON TOTALES POR MONEDA --- */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b pb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Panel Financiero</h1>
                
                <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
                    {/* Total USD */}
                    <div className="bg-green-600 text-white px-5 py-3 rounded-lg shadow-md flex-1 lg:flex-none text-center min-w-[140px]">
                        <p className="text-xs uppercase opacity-80 font-semibold">Total USD</p>
                        <p className="text-2xl font-bold">{formatCurrency(totalesPorMoneda['USD'] || 0)}</p>
                    </div>

                    {/* Total Reales */}
                    <div className="bg-yellow-500 text-white px-5 py-3 rounded-lg shadow-md flex-1 lg:flex-none text-center min-w-[140px]">
                        <p className="text-xs uppercase opacity-80 font-semibold">Total BRL</p>
                        <p className="text-2xl font-bold">R$ {formatCurrency(totalesPorMoneda['BRL'] || 0).replace('$','')}</p>
                    </div>

                    {/* Botón Otras Monedas */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowOtherCurrencies(!showOtherCurrencies)}
                            className="bg-indigo-600 text-white p-3 rounded-lg shadow-md hover:bg-indigo-700 transition-colors flex items-center gap-2 h-full"
                            title="Ver otras monedas"
                        >
                            <span>🌐</span> Other
                        </button>
                        
                        {/* Dropdown de Otras Monedas */}
                        {showOtherCurrencies && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200 p-2">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 border-b pb-1">Otras Monedas</h4>
                                {Object.entries(totalesPorMoneda).map(([moneda, valor]) => {
                                    if (moneda === 'USD' || moneda === 'BRL') return null;
                                    return (
                                        <div key={moneda} className="flex justify-between text-sm py-1">
                                            <span className="font-semibold">{moneda}:</span>
                                            <span>{formatCurrency(valor)}</span>
                                        </div>
                                    );
                                })}
                                {Object.keys(totalesPorMoneda).every(m => m === 'USD' || m === 'BRL') && (
                                    <p className="text-xs text-gray-400 italic">No hay otras monedas.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- SECCIÓN 1: PENDIENTES --- */}
            <div className="bg-white rounded-xl shadow-md border-l-4 border-yellow-500 overflow-hidden">
                <div className="bg-yellow-50 px-6 py-3 border-b border-yellow-100">
                    <h2 className="text-xl font-bold text-yellow-800 flex items-center gap-2">
                        🔔 Pendientes de Asignación <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded-full">{pendientes.length}</span>
                    </h2>
                </div>
                
                {pendientes.length === 0 ? (
                     <div className="p-6 text-center text-gray-500">✅ Todo al día.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {pendientes.map(item => (
                            <div key={item.id} className="hover:bg-gray-50 transition-colors">
                                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex justify-between md:justify-start md:gap-4 items-baseline">
                                            <span className="font-bold text-gray-800">{item.fecha}</span>
                                            <span className="text-green-600 font-bold">{formatCurrency(item.total)} <span className="text-xs text-gray-500">{item.moneda}</span></span>
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">
                                            {item.actividad} - {item.instructor}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 w-full md:w-auto">
                                        <select 
                                            value={item.asignadoA}
                                            onChange={(e) => handlePendienteChange(item.id, e.target.value)}
                                            className="border rounded px-2 py-1 text-sm w-full md:w-32 bg-white"
                                        >
                                            <option value="NINGUNO">Elegir...</option>
                                            <option value="IGNA">IGNA</option>
                                            <option value="JOSE">JOSE</option>
                                        </select>
                                        <button onClick={() => saveAssignment(item.id, item.asignadoA)} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">Guardar</button>
                                        <button onClick={() => toggleDetails(item.id)} className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm">▼</button>
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
                    <h2 className="text-xl font-bold text-red-800">💸 Egresos</h2>
                </div>
                {egresos.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No hay egresos.</div>
                ) : (
                     <div className="divide-y divide-gray-100">
                        {egresos.map(item => {
                            const monto = parseFloat(item.gastosAsociados) || parseFloat(item.total) || 0;
                            return (
                                <div key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-baseline gap-4">
                                                <span className="font-bold text-gray-800">{item.fecha}</span>
                                                <span className="text-red-600 font-bold">-{formatCurrency(monto)} <span className="text-xs text-gray-500">{item.moneda}</span></span>
                                            </div>
                                            <div className="text-sm text-gray-600 mt-1">
                                                {item.detalles || item.actividad}
                                            </div>
                                        </div>
                                        <button onClick={() => toggleDetails(item.id)} className="w-full md:w-auto bg-gray-100 text-indigo-600 px-4 py-1 rounded text-sm font-medium hover:bg-indigo-50">
                                            {expandedId === item.id ? 'Ocultar' : 'Ver Detalle'}
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
                    <div className="p-6 text-center text-gray-500">No hay ingresos asignados.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {asignados.map(item => (
                            <div key={item.id} className="hover:bg-gray-50 transition-colors">
                                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex justify-between md:justify-start md:gap-4 items-center">
                                            <span className="font-bold text-gray-800 w-24">{item.fecha}</span>
                                            
                                            {/* MONTO Y GASTOS (VISUALIZACIÓN CLAVE) */}
                                            <div className="flex flex-col">
                                                <span className="text-green-600 font-bold text-lg">
                                                    {formatCurrency(item.total)} <span className="text-xs text-gray-500">{item.moneda}</span>
                                                </span>
                                                {/* MOSTRAR GASTOS AQUÍ MISMO SI EXISTEN */}
                                                {parseFloat(item.gastosAsociados) > 0 && (
                                                    <span className="text-red-500 text-xs font-semibold flex items-center">
                                                        📉 Gastos: -{formatCurrency(item.gastosAsociados)}
                                                    </span>
                                                )}
                                            </div>

                                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${item.asignadoA === 'IGNA' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                                {item.asignadoA}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1 pl-0 md:pl-28">
                                            {item.actividad}
                                        </div>
                                    </div>
                                    
                                    {/* BOTONES DE ACCIÓN */}
                                    <div className="flex gap-2 justify-end w-full md:w-auto mt-2 md:mt-0">
                                        <button onClick={() => toggleDetails(item.id)} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1 rounded text-xs font-bold border border-indigo-200">
                                            DETALLE
                                        </button>
                                        <button onClick={() => handleEdit(item.id)} className="bg-yellow-50 text-yellow-600 hover:bg-yellow-100 px-3 py-1 rounded text-xs font-bold border border-yellow-200">
                                            EDITAR
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded text-xs font-bold border border-red-200">
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
                {/* Nota: Los gráficos simples agregan todo a USD. Para multi-moneda se requeriría conversión */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-bold text-gray-700 mb-4 text-center">Distribución Ingresos (Global)</h3>
                    <div className="h-64 flex justify-center">
                        <Doughnut 
                            data={{
                                labels: ['Igna', 'Jose'],
                                datasets: [{
                                    data: [
                                        asignados.filter(i => i.asignadoA === 'IGNA').reduce((acc, curr) => acc + parseFloat(curr.total||0), 0),
                                        asignados.filter(i => i.asignadoA === 'JOSE').reduce((acc, curr) => acc + parseFloat(curr.total||0), 0)
                                    ],
                                    backgroundColor: ['#3b82f6', '#10b981'],
                                }]
                            }} 
                            options={{ maintainAspectRatio: false }} 
                        />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-bold text-gray-700 mb-4 text-center">Ingresos vs Egresos (Global)</h3>
                    <div className="h-64">
                         <Bar 
                            data={{
                                labels: ['Ingresos', 'Egresos'],
                                datasets: [{
                                    label: 'Monto Estimado',
                                    data: [
                                        asignados.reduce((acc, curr) => acc + parseFloat(curr.total||0), 0),
                                        egresos.reduce((acc, curr) => acc + (parseFloat(curr.gastosAsociados)||parseFloat(curr.total)||0), 0)
                                    ],
                                    backgroundColor: ['#4f46e5', '#ef4444'],
                                }]
                            }} 
                            options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReporteEstadisticas;