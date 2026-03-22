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
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ReportesEstadisticasGraficos from './ReportesEstadisticasGraficos';

// Registro de componentes de gráficos
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const ReporteEstadisticas = () => {
    const { token } = useAuth();
    
    // --- ESTADOS ---
    const [allData, setAllData] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Listas Originales
    const [pendientes, setPendientes] = useState([]);
    const [egresos, setEgresos] = useState([]);
    const [asignados, setAsignados] = useState([]);
    
    // Filtros
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [filtros, setFiltros] = useState({
        moneda: '',
        formaPago: '',
        instructor: '',
        actividad: '',
        fechaInicio: '',
        fechaFin: ''
    });
    
    // UI Helpers
    const [expandedId, setExpandedId] = useState(null);
    const [showOtherCurrencies, setShowOtherCurrencies] = useState(false);

    // --- EFECTOS ---
    useEffect(() => {
        if (token) {
            fetchData();
        }
    }, [token]);

    // --- LOGICA DE DATOS ---
    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('https://kbnadmin-production.up.railway.app/api/clases/listar', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const data = response.data;
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

    // --- EXTRAER INSTRUCTORES ÚNICOS PARA EL FILTRO ---
    const instructoresDisponibles = useMemo(() => {
        const instructoresSet = new Set(allData.map(item => item.instructor).filter(Boolean));
        return Array.from(instructoresSet);
    }, [allData]);

    // --- LOGICA DE FILTRADO ---
    const handleFiltroChange = (e) => {
        const { name, value } = e.target;
        setFiltros(prev => ({ ...prev, [name]: value }));
    };

    const limpiarFiltros = () => {
        setFiltros({
            moneda: '',
            formaPago: '',
            instructor: '',
            actividad: '',
            fechaInicio: '',
            fechaFin: ''
        });
    };

    const aplicarFiltros = (lista) => {
        return lista.filter(item => {
            let match = true;
            if (filtros.moneda && item.moneda !== filtros.moneda) match = false;
            if (filtros.formaPago && item.formaPago !== filtros.formaPago) match = false;
            if (filtros.instructor && item.instructor !== filtros.instructor) match = false;
            if (filtros.actividad && item.actividad !== filtros.actividad) match = false;
            if (filtros.fechaInicio && item.fecha < filtros.fechaInicio) match = false;
            if (filtros.fechaFin && item.fecha > filtros.fechaFin) match = false;
            return match;
        });
    };

    // Listas filtradas reactivas
    const pendientesFiltrados = useMemo(() => aplicarFiltros(pendientes), [pendientes, filtros]);
    const egresosFiltrados = useMemo(() => aplicarFiltros(egresos), [egresos, filtros]);
    const asignadosFiltrados = useMemo(() => aplicarFiltros(asignados), [asignados, filtros]);

    // --- CÁLCULO DE TOTALES POR MONEDA (SOBRE DATOS FILTRADOS) ---
    const totalesPorMoneda = useMemo(() => {
        const totales = {};

        const procesarMonto = (moneda, monto) => {
            const mon = moneda || 'USD';
            if (!totales[mon]) totales[mon] = 0;
            totales[mon] += monto;
        };

        [...pendientesFiltrados, ...asignadosFiltrados].forEach(item => {
            const total = parseFloat(item.total) || 0;
            procesarMonto(item.moneda, total);
        });

        egresosFiltrados.forEach(item => {
            const monto = parseFloat(item.gastosAsociados) || parseFloat(item.total) || 0;
            procesarMonto(item.moneda, -monto);
        });

        return totales;
    }, [pendientesFiltrados, egresosFiltrados, asignadosFiltrados]);

    // --- ACCIONES ---
    const toggleDetails = (id) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(val) || 0).replace('US', '');
    };

    const handlePendienteChange = (id, val) => {
        // Actualizamos la lista original para mantener el estado sincronizado
        setPendientes(prev => prev.map(p => p.id === id ? { ...p, asignadoA: val } : p));
    };

    const saveAssignment = async (id, asignadoA) => {
        if (!asignadoA || asignadoA === 'NINGUNO') return alert("Selecciona un instructor válido.");
        try {
            await axios.put(`https://kbnadmin-production.up.railway.app/api/clases/asignar/${id}`, 
                { asignadoA }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert("Asignado correctamente.");
            fetchData();
        } catch (e) {
            alert("Error de red o no autorizado");
        }
    };

    const handleDelete = async (id) => {
        if(!window.confirm("¿Eliminar registro?")) return;
        alert("Funcionalidad pendiente de Endpoint DELETE");
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
            
            {/* --- HEADER CON TOTALES POR MONEDA Y FILTROS --- */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b pb-6 gap-4">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setMostrarFiltros(!mostrarFiltros)}
                        className={`p-2 rounded-lg transition-colors flex items-center justify-center shadow-sm border ${mostrarFiltros ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                        title="Filtros"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">Panel Financiero</h1>
                </div>
                
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
                            <span>🌐</span> Otras
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

            {/* --- PANEL DE FILTROS DESPLEGABLE --- */}
            {mostrarFiltros && (
                <div className="bg-white p-5 rounded-xl shadow-md border border-indigo-100 animate-fadeIn relative">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-sm font-black text-gray-500 uppercase tracking-wider">Filtros de Búsqueda</h3>
                        <button onClick={limpiarFiltros} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                            <span>✕</span> Limpiar Todo
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        {/* Fecha Inicio */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Desde Fecha</label>
                            <input type="date" name="fechaInicio" value={filtros.fechaInicio} onChange={handleFiltroChange} className="w-full p-2.5 bg-gray-50 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold" />
                        </div>

                        {/* Fecha Fin */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Hasta Fecha</label>
                            <input type="date" name="fechaFin" value={filtros.fechaFin} onChange={handleFiltroChange} className="w-full p-2.5 bg-gray-50 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold" />
                        </div>

                        {/* Moneda */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Moneda</label>
                            <select name="moneda" value={filtros.moneda} onChange={handleFiltroChange} className="w-full p-2.5 bg-gray-50 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold">
                                <option value="">Todas</option>
                                <option value="BRL">Reales (BRL)</option>
                                <option value="USD">Dólares (USD)</option>
                                <option value="EUR">Euros (EUR)</option>
                                <option value="ARS">Pesos (ARS)</option>
                                <option value="CLP">Pesos Chilenos (CLP)</option>
                            </select>
                        </div>

                        {/* Forma de Pago */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Forma de Pago</label>
                            <select name="formaPago" value={filtros.formaPago} onChange={handleFiltroChange} className="w-full p-2.5 bg-gray-50 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold">
                                <option value="">Todas</option>
                                <option value="Efectivo">Efectivo</option>
                                <option value="MercadoPago">MercadoPago</option>
                                <option value="Transferencia">Transferencia</option>
                                <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                                <option value="USD">USD</option>
                                <option value="Otro">Otro...</option>
                            </select>
                        </div>

                        {/* Instructor */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Instructor</label>
                            <select name="instructor" value={filtros.instructor} onChange={handleFiltroChange} className="w-full p-2.5 bg-gray-50 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold">
                                <option value="">Todos</option>
                                {instructoresDisponibles.map(inst => (
                                    <option key={inst} value={inst}>{inst}</option>
                                ))}
                            </select>
                        </div>

                        {/* Actividad */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Actividad</label>
                            <select name="actividad" value={filtros.actividad} onChange={handleFiltroChange} className="w-full p-2.5 bg-gray-50 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold">
                                <option value="">Todas</option>
                                <option value="Clase de Kite">Clase de Kite</option>
                                <option value="Clase de Wing">Clase de Wing</option>
                                <option value="Clase de Windsurf">Clase de Windsurf</option>
                                <option value="Rental">Rental</option>
                                <option value="Otro">Otro...</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SECCIÓN 1: PENDIENTES --- */}
            <div className="bg-white rounded-xl shadow-md border-l-4 border-yellow-500 overflow-hidden">
                <div className="bg-yellow-50 px-6 py-3 border-b border-yellow-100">
                    <h2 className="text-xl font-bold text-yellow-800 flex items-center gap-2">
                        🔔 Pendientes de Asignación <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded-full">{pendientesFiltrados.length}</span>
                    </h2>
                </div>
                
                {pendientesFiltrados.length === 0 ? (
                     <div className="p-6 text-center text-gray-500">✅ No hay registros que coincidan con los filtros.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {pendientesFiltrados.map(item => (
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
                {egresosFiltrados.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No hay egresos que coincidan con los filtros.</div>
                ) : (
                     <div className="divide-y divide-gray-100">
                        {egresosFiltrados.map(item => {
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
                {asignadosFiltrados.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No hay ingresos asignados que coincidan.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {asignadosFiltrados.map(item => (
                            <div key={item.id} className="hover:bg-gray-50 transition-colors">
                                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex justify-between md:justify-start md:gap-4 items-center">
                                            <span className="font-bold text-gray-800 w-24">{item.fecha}</span>
                                            
                                            <div className="flex flex-col">
                                                <span className="text-green-600 font-bold text-lg">
                                                    {formatCurrency(item.total)} <span className="text-xs text-gray-500">{item.moneda}</span>
                                                </span>
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
            {/* Los gráficos ahora reciben los datos filtrados en tiempo real */}
            <ReportesEstadisticasGraficos 
            asignados={asignadosFiltrados} 
            egresos={egresosFiltrados} 
            />

        </div>
    );
};

export default ReporteEstadisticas;