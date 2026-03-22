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
    
    // --- ESTADOS DE DATOS ---
    const [allData, setAllData] = useState([]);
    const [instructoresDB, setInstructoresDB] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // UI Helpers
    const [expandedId, setExpandedId] = useState(null);
    const [showOtherCurrencies, setShowOtherCurrencies] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // --- ESTADO DE FILTROS ---
    const [filters, setFilters] = useState({
        moneda: '',
        formaPago: '',
        instructor: '',
        actividad: '',
        fechaInicio: '',
        fechaFin: ''
    });

    // --- EFECTOS ---
    useEffect(() => {
        if (token) {
            fetchData();
            fetchInstructores();
        }
    }, [token]);

    // --- LOGICA DE DATOS ---
    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('https://kbnadmin-production.up.railway.app/api/clases/listar', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAllData(response.data);
        } catch (error) {
            console.error("Error al cargar datos:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchInstructores = async () => {
        try {
            const res = await axios.get('https://kbnadmin-production.up.railway.app/usuario', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInstructoresDB(res.data);
        } catch (e) {
            console.error("Error cargando instructores:", e);
        }
    };

    // --- FILTRADO MAESTRO ---
    const filteredData = useMemo(() => {
        return allData.filter(item => {
            const matchMoneda = !filters.moneda || item.moneda === filters.moneda;
            const matchPago = !filters.formaPago || item.formaPago === filters.formaPago;
            const matchActividad = !filters.actividad || item.actividad === filters.actividad;
            // Busca tanto en quien la creó como en quien está asignado
            const matchInstructor = !filters.instructor || 
                                    item.instructor === filters.instructor || 
                                    item.asignadoA === filters.instructor;
            
            const itemFecha = item.fecha; // Formato YYYY-MM-DD
            const matchInicio = !filters.fechaInicio || itemFecha >= filters.fechaInicio;
            const matchFin = !filters.fechaFin || itemFecha <= filters.fechaFin;

            return matchMoneda && matchPago && matchActividad && matchInstructor && matchInicio && matchFin;
        });
    }, [allData, filters]);

    // --- CLASIFICACIÓN DE DATOS (Basado en el filtro) ---
    const { pendientes, egresos, asignados } = useMemo(() => {
        const listPendientes = [];
        const listEgresos = [];
        const listAsignados = [];

        filteredData.forEach(item => {
            if (item.tipoTransaccion === 'EGRESO') {
                listEgresos.push(item);
            } else if (item.tipoTransaccion === 'INGRESO') {
                if (!item.asignadoA || item.asignadoA.trim() === '' || item.asignadoA.toUpperCase() === 'NINGUNO') {
                    listPendientes.push({ ...item, asignadoA: "NINGUNO" });
                } else {
                    listAsignados.push(item);
                }
            }
        });
        return { pendientes: listPendientes, egresos: listEgresos, asignados: listAsignados };
    }, [filteredData]);

    // --- CÁLCULO DE TOTALES POR MONEDA ---
    const totalesPorMoneda = useMemo(() => {
        const totales = {};
        const procesarMonto = (moneda, monto) => {
            const mon = moneda || 'USD';
            if (!totales[mon]) totales[mon] = 0;
            totales[mon] += monto;
        };

        [...pendientes, ...asignados].forEach(item => {
            procesarMonto(item.moneda, parseFloat(item.total) || 0);
        });

        egresos.forEach(item => {
            const monto = parseFloat(item.gastosAsociados) || parseFloat(item.total) || 0;
            procesarMonto(item.moneda, -monto);
        });

        return totales;
    }, [pendientes, egresos, asignados]);

    // --- ACCIONES ---
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetFilters = () => {
        setFilters({ moneda: '', formaPago: '', instructor: '', actividad: '', fechaInicio: '', fechaFin: '' });
    };

    const toggleDetails = (id) => setExpandedId(prev => prev === id ? null : id);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(val) || 0).replace('US', '');
    };

    const handlePendienteChange = (id, val) => {
        // Esta función actualiza el estado local de los pendientes antes de guardar
        setAllData(prev => prev.map(item => item.id === id ? { ...item, asignadoA: val } : item));
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
            alert("Error al asignar.");
        }
    };

    const handleDelete = async (id) => {
        if(!window.confirm("¿Eliminar registro?")) return;
        alert("Funcionalidad pendiente de Backend (DELETE)");
    };

    const handleEdit = (id) => alert(`Editar ID: ${id}`);

    // --- RENDERIZADO DE DETALLES ---
    const RenderDetails = ({ item }) => (
        <div className="bg-gray-50 p-4 rounded-b-lg border-t border-gray-200 text-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
            <div><span className="font-bold text-gray-700 uppercase text-[10px]">Detalle:</span> {item.detalles || '-'}</div>
            <div><span className="font-bold text-gray-700 uppercase text-[10px]">Vendedor:</span> {item.vendedor || '-'}</div>
            <div><span className="font-bold text-gray-700 uppercase text-[10px]">Forma Pago:</span> {item.formaPago || '-'}</div>
            
            {item.tipoTransaccion === 'INGRESO' && (
                <>
                    <div><span className="font-bold text-gray-700 uppercase text-[10px]">Horas:</span> {item.cantidadHoras}</div>
                    <div><span className="font-bold text-gray-700 uppercase text-[10px]">Tarifa:</span> {formatCurrency(item.tarifaPorHora)}</div>
                    <div><span className="font-bold text-gray-700 uppercase text-[10px]">Comisión:</span> {formatCurrency(item.comision)}</div>
                    <div><span className="font-bold text-red-600 uppercase text-[10px]">Gastos:</span> {formatCurrency(item.gastosAsociados)}</div>
                </>
            )}
             {item.tipoTransaccion === 'EGRESO' && (
                <div><span className="font-bold text-gray-700 uppercase text-[10px]">Pago a:</span> {item.detalleFormaPago || '-'}</div>
            )}
             <div className="col-span-1 md:col-span-2"><span className="font-bold text-gray-700 uppercase text-[10px]">Creado por:</span> {item.instructor}</div>
        </div>
    );

    if (loading) return <div className="p-10 text-center text-xl text-indigo-600 font-black italic uppercase">Cargando datos...</div>;

    return (
        <div className="max-w-7xl mx-auto p-4 space-y-8 pb-20">
            
            {/* --- CABECERA CON BOTÓN DE AJUSTES Y TOTALES --- */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-50">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-4 rounded-2xl transition-all border-2 ${showFilters ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-white'}`}
                    >
                        {showFilters ? '✕' : '⚙️'}
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 uppercase italic leading-none tracking-tighter">Panel Financiero</h1>
                        {Object.values(filters).some(v => v !== '') && (
                            <button onClick={resetFilters} className="text-[10px] font-black text-red-500 uppercase mt-1 hover:underline">Limpiar Filtros ×</button>
                        )}
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
                    {/* Tarjetas de Totales */}
                    <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-lg shadow-emerald-100 flex-1 lg:flex-none text-center">
                        <p className="text-[10px] uppercase font-black opacity-80 italic">Total USD</p>
                        <p className="text-2xl font-black italic tracking-tight">{formatCurrency(totalesPorMoneda['USD'] || 0)}</p>
                    </div>

                    <div className="bg-yellow-400 text-white px-6 py-4 rounded-2xl shadow-lg shadow-yellow-100 flex-1 lg:flex-none text-center">
                        <p className="text-[10px] uppercase font-black opacity-80 italic">Total BRL</p>
                        <p className="text-2xl font-black italic tracking-tight">R$ {formatCurrency(totalesPorMoneda['BRL'] || 0).replace('$','')}</p>
                    </div>

                    <div className="relative">
                        <button 
                            onClick={() => setShowOtherCurrencies(!showOtherCurrencies)}
                            className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all font-black text-[10px] uppercase"
                        >
                            🌐 Otras
                        </button>
                        
                        {showOtherCurrencies && (
                            <div className="absolute right-0 mt-3 w-56 bg-white rounded-3xl shadow-2xl z-50 border border-gray-100 p-4 animate-in zoom-in-95 duration-200">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase mb-3 border-b pb-2 italic">Otras Divisas</h4>
                                {Object.entries(totalesPorMoneda).map(([moneda, valor]) => {
                                    if (moneda === 'USD' || moneda === 'BRL') return null;
                                    return (
                                        <div key={moneda} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-none">
                                            <span className="font-black text-gray-700 text-xs">{moneda}</span>
                                            <span className={`font-black text-xs ${valor >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(valor)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- PANEL DE FILTROS DESPLEGABLE --- */}
            {showFilters && (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 animate-in slide-in-from-top-4 duration-300">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 italic">Moneda</label>
                        <select name="moneda" value={filters.moneda} onChange={handleFilterChange} className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">TODAS</option>
                            <option value="BRL">REALES (BRL)</option>
                            <option value="USD">DÓLARES (USD)</option>
                            <option value="ARS">PESOS (ARS)</option>
                            <option value="CLP">CHILENOS (CLP)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 italic">Pago</label>
                        <select name="formaPago" value={filters.formaPago} onChange={handleFilterChange} className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">TODAS</option>
                            <option value="Efectivo">EFECTIVO</option>
                            <option value="MercadoPago">MERCADOPAGO</option>
                            <option value="Transferencia">TRANSFERENCIA</option>
                            <option value="USD">USD</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 italic">Instructor</label>
                        <select name="instructor" value={filters.instructor} onChange={handleFilterChange} className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">TODOS</option>
                            {instructoresDB.map(ins => (
                                <option key={ins.id} value={`${ins.nombre} ${ins.apellido}`}>{ins.nombre.toUpperCase()} {ins.apellido.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 italic">Actividad</label>
                        <select name="actividad" value={filters.actividad} onChange={handleFilterChange} className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">TODAS</option>
                            <option value="Clase de Kite">KITE</option>
                            <option value="Clase de Wing">WING</option>
                            <option value="Clase de Windsurf">WINDSURF</option>
                            <option value="Rental">RENTAL</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 italic">Desde</label>
                        <input type="date" name="fechaInicio" value={filters.fechaInicio} onChange={handleFilterChange} className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 italic">Hasta</label>
                        <input type="date" name="fechaFin" value={filters.fechaFin} onChange={handleFilterChange} className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                </div>
            )}

            {/* --- SECCIÓN 1: PENDIENTES --- */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-yellow-50 px-8 py-5 border-b border-yellow-100">
                    <h2 className="text-xs font-black text-yellow-700 uppercase italic flex items-center gap-2">
                        🔔 Pendientes de Asignación <span className="bg-yellow-200 px-2 py-0.5 rounded-full">{pendientes.length}</span>
                    </h2>
                </div>
                {pendientes.length === 0 ? <div className="p-10 text-center text-gray-400 font-bold italic">No hay ingresos pendientes para asignar.</div> : (
                    <div className="divide-y divide-gray-50">
                        {pendientes.map(item => (
                            <div key={item.id} className="hover:bg-gray-50 transition-colors">
                                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-4">
                                            <span className="font-black text-gray-900 italic uppercase">{item.fecha}</span>
                                            <span className="text-emerald-600 font-black text-lg">{formatCurrency(item.total)} <span className="text-[10px] text-gray-400 italic">{item.moneda}</span></span>
                                        </div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{item.actividad} • Creado por: {item.instructor}</p>
                                    </div>
                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <select 
                                            value={item.asignadoA}
                                            onChange={(e) => handlePendienteChange(item.id, e.target.value)}
                                            className="p-3 bg-gray-100 rounded-xl border-none font-bold text-[10px] w-full md:w-40 outline-none"
                                        >
                                            <option value="NINGUNO">ELEGIR INSTRUCTOR...</option>
                                            {instructoresDB.map(ins => (
                                                <option key={ins.id} value={`${ins.nombre} ${ins.apellido}`}>{ins.nombre.toUpperCase()} {ins.apellido.toUpperCase()}</option>
                                            ))}
                                        </select>
                                        <button onClick={() => saveAssignment(item.id, item.asignadoA)} className="bg-emerald-500 text-white p-3 rounded-xl font-black text-[10px] hover:bg-emerald-600">GUARDAR</button>
                                        <button onClick={() => toggleDetails(item.id)} className="bg-gray-200 text-gray-700 p-3 rounded-xl text-xs">{expandedId === item.id ? '▲' : '▼'}</button>
                                    </div>
                                </div>
                                {expandedId === item.id && <RenderDetails item={item} />}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- SECCIÓN 2: EGRESOS --- */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-red-50 px-8 py-5 border-b border-red-100">
                    <h2 className="text-xs font-black text-red-700 uppercase italic">💸 Registro de Egresos</h2>
                </div>
                {egresos.length === 0 ? <div className="p-10 text-center text-gray-400 font-bold italic">No hay egresos registrados.</div> : (
                    <div className="divide-y divide-gray-50">
                        {egresos.map(item => {
                            const monto = parseFloat(item.gastosAsociados) || parseFloat(item.total) || 0;
                            return (
                                <div key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-4">
                                                <span className="font-black text-gray-900 italic uppercase">{item.fecha}</span>
                                                <span className="text-red-500 font-black text-lg">-{formatCurrency(monto)} <span className="text-[10px] text-gray-400 italic">{item.moneda}</span></span>
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{item.detalles || item.actividad}</p>
                                        </div>
                                        <button onClick={() => toggleDetails(item.id)} className="bg-gray-100 text-gray-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase hover:bg-white hover:shadow-sm transition-all">
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
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-emerald-50 px-8 py-5 border-b border-emerald-100">
                    <h2 className="text-xs font-black text-emerald-700 uppercase italic">✅ Ingresos Confirmados</h2>
                </div>
                {asignados.length === 0 ? <div className="p-10 text-center text-gray-400 font-bold italic">No hay ingresos asignados todavía.</div> : (
                    <div className="divide-y divide-gray-50">
                        {asignados.map(item => (
                            <div key={item.id} className="hover:bg-gray-50 transition-colors">
                                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-6">
                                            <span className="font-black text-gray-900 italic uppercase w-20">{item.fecha}</span>
                                            <div className="flex flex-col">
                                                <span className="text-emerald-600 font-black text-xl">{formatCurrency(item.total)} <span className="text-[10px] text-gray-400 italic">{item.moneda}</span></span>
                                                {parseFloat(item.gastosAsociados) > 0 && (
                                                    <span className="text-red-400 text-[10px] font-black uppercase italic">📉 Gastos: -{formatCurrency(item.gastosAsociados)}</span>
                                                )}
                                            </div>
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase italic ${item.asignadoA === 'IGNA' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                {item.asignadoA}
                                            </span>
                                        </div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 md:pl-28">{item.actividad}</p>
                                    </div>
                                    <div className="flex gap-2 justify-end w-full md:w-auto">
                                        <button onClick={() => toggleDetails(item.id)} className="bg-gray-100 text-gray-600 p-3 rounded-xl font-black text-[10px]">DETALLE</button>
                                        <button onClick={() => handleEdit(item.id)} className="bg-yellow-100 text-yellow-600 p-3 rounded-xl font-black text-[10px]">EDITAR</button>
                                        <button onClick={() => handleDelete(item.id)} className="bg-red-100 text-red-600 p-3 rounded-xl font-black text-[10px]">BORRAR</button>
                                    </div>
                                </div>
                                {expandedId === item.id && <RenderDetails item={item} />}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- SECCIÓN 4: GRÁFICOS --- */}
            <ReportesEstadisticasGraficos asignados={asignados} egresos={egresos} />
        </div>
    );
};

export default ReporteEstadisticas;