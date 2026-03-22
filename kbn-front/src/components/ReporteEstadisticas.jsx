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

    // --- LÓGICA DE FILTRADO MAESTRO (INSTRUCTOR + ASIGNADO) ---
    const filteredData = useMemo(() => {
        return allData.filter(item => {
            const matchMoneda = !filters.moneda || item.moneda === filters.moneda;
            const matchPago = !filters.formaPago || item.formaPago === filters.formaPago;
            const matchActividad = !filters.actividad || item.actividad === filters.actividad;
            
            // Busca si el instructor dio la clase O si el socio la tiene asignada
            const matchInstructor = !filters.instructor || 
                                    item.instructor === filters.instructor || 
                                    item.asignadoA === filters.instructor;
            
            const matchInicio = !filters.fechaInicio || item.fecha >= filters.fechaInicio;
            const matchFin = !filters.fechaFin || item.fecha <= filters.fechaFin;

            return matchMoneda && matchPago && matchActividad && matchInstructor && matchInicio && matchFin;
        });
    }, [allData, filters]);

    // --- CLASIFICACIÓN DE LISTAS ---
    const { pendientes, egresos, asignados } = useMemo(() => {
        const p = []; const e = []; const a = [];
        filteredData.forEach(item => {
            if (item.tipoTransaccion === 'EGRESO') {
                e.push(item);
            } else if (item.tipoTransaccion === 'INGRESO') {
                if (!item.asignadoA || item.asignadoA.trim() === '' || item.asignadoA.toUpperCase() === 'NINGUNO') {
                    p.push({ ...item, asignadoA: "NINGUNO" });
                } else {
                    a.push(item);
                }
            }
        });
        return { pendientes: p, egresos: e, asignados: a };
    }, [filteredData]);

    // --- TOTALES ---
    const totalesPorMoneda = useMemo(() => {
        const totales = {};
        const sumarMonto = (moneda, monto) => {
            const mon = moneda || 'USD';
            totales[mon] = (totales[mon] || 0) + monto;
        };

        [...pendientes, ...asignados].forEach(i => sumarMonto(i.moneda, parseFloat(i.total) || 0));
        egresos.forEach(i => sumarMonto(i.moneda, -(parseFloat(i.gastosAsociados) || parseFloat(i.total) || 0)));

        return totales;
    }, [pendientes, egresos, asignados]);

    // --- ACCIONES ---
    const handleFilterChange = (e) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const resetFilters = () => setFilters({ moneda: '', formaPago: '', instructor: '', actividad: '', fechaInicio: '', fechaFin: '' });
    const toggleDetails = (id) => setExpandedId(prev => prev === id ? null : id);
    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(val) || 0).replace('US', '');

    const handlePendienteChange = (id, val) => {
        setAllData(prev => prev.map(p => p.id === id ? { ...p, asignadoA: val } : p));
    };

    const saveAssignment = async (id, asignadoA) => {
        if (!asignadoA || asignadoA === 'NINGUNO') return alert("Selecciona un instructor válido.");
        try {
            await axios.put(`https://kbnadmin-production.up.railway.app/api/clases/asignar/${id}`, 
                { asignadoA }, { headers: { Authorization: `Bearer ${token}` } }
            );
            alert("Asignado correctamente.");
            fetchData();
        } catch (e) { alert("Error al asignar."); }
    };

    const handleDelete = (id) => { if(window.confirm("¿Eliminar registro?")) alert("Endpoint DELETE pendiente."); };
    const handleEdit = (id) => alert(`Editar ID: ${id}`);

    const RenderDetails = ({ item }) => (
        <div className="bg-gray-50 p-6 rounded-b-2xl border-t border-gray-200 text-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
            <div><span className="font-bold text-gray-500 uppercase text-[10px]">Detalle:</span> <p className="font-bold text-gray-800">{item.detalles || '-'}</p></div>
            <div><span className="font-bold text-gray-500 uppercase text-[10px]">Vendedor:</span> <p className="font-bold text-gray-800">{item.vendedor || '-'}</p></div>
            <div><span className="font-bold text-gray-500 uppercase text-[10px]">Forma Pago:</span> <p className="font-bold text-gray-800">{item.formaPago || '-'}</p></div>
            {item.tipoTransaccion === 'INGRESO' && (
                <>
                    <div><span className="font-bold text-gray-500 uppercase text-[10px]">Tarifa/H:</span> <p className="font-bold text-gray-800">{formatCurrency(item.tarifaPorHora)}</p></div>
                    <div><span className="font-bold text-gray-500 uppercase text-[10px]">Comisión:</span> <p className="font-bold text-gray-800">{formatCurrency(item.comision)}</p></div>
                    <div><span className="font-bold text-red-500 uppercase text-[10px]">Gastos:</span> <p className="font-bold text-red-600">{formatCurrency(item.gastosAsociados)}</p></div>
                </>
            )}
            <div className="col-span-full"><span className="font-bold text-gray-500 uppercase text-[10px]">Registro creado por:</span> <p className="font-bold text-gray-800">{item.instructor}</p></div>
        </div>
    );

    if (loading) return <div className="p-20 text-center text-2xl text-indigo-600 font-black uppercase italic animate-pulse">Cargando Sistema KBN...</div>;

    return (
        <div className="max-w-7xl mx-auto p-4 space-y-8 pb-20">
            
            {/* --- CABECERA Y TOTALES (USD, BRL, EUR) --- */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 gap-6">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-4 rounded-2xl transition-all border-2 ${showFilters ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-50 border-gray-100 text-gray-400 hover:text-indigo-600'}`}
                    >
                        {showFilters ? '✕' : '⚙️'}
                    </button>
                    <h1 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter">Panel Financiero</h1>
                </div>
                
                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-lg flex-1 lg:flex-none text-center">
                        <p className="text-[10px] uppercase font-black opacity-80 italic">Total USD</p>
                        <p className="text-2xl font-black italic">{formatCurrency(totalesPorMoneda['USD'] || 0)}</p>
                    </div>
                    <div className="bg-yellow-400 text-white px-6 py-4 rounded-2xl shadow-lg flex-1 lg:flex-none text-center">
                        <p className="text-[10px] uppercase font-black opacity-80 italic">Total BRL</p>
                        <p className="text-2xl font-black italic">R$ {formatCurrency(totalesPorMoneda['BRL'] || 0).replace('$','')}</p>
                    </div>
                    <div className="bg-blue-600 text-white px-6 py-4 rounded-2xl shadow-lg flex-1 lg:flex-none text-center">
                        <p className="text-[10px] uppercase font-black opacity-80 italic">Total EUR</p>
                        <p className="text-2xl font-black italic">€ {formatCurrency(totalesPorMoneda['EUR'] || 0).replace('$','')}</p>
                    </div>

                    <div className="relative">
                        <button onClick={() => setShowOtherCurrencies(!showOtherCurrencies)} className="bg-gray-800 text-white p-4 rounded-2xl shadow-lg font-black text-[10px] h-full uppercase">🌐 Otras</button>
                        {showOtherCurrencies && (
                            <div className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-2xl z-50 border p-4 animate-in zoom-in-95">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2 border-b pb-1 italic">Otras Divisas</h4>
                                {Object.entries(totalesPorMoneda).map(([mon, val]) => {
                                    if (['USD', 'BRL', 'EUR'].includes(mon)) return null;
                                    return <div key={mon} className="flex justify-between py-1 border-b border-gray-50 last:border-none">
                                        <span className="font-black text-xs text-gray-600">{mon}</span>
                                        <span className="font-black text-xs text-emerald-600">{formatCurrency(val)}</span>
                                    </div>;
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- PANEL DE FILTROS --- */}
            {showFilters && (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 animate-in slide-in-from-top-5">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase italic ml-2">Moneda</label>
                        <select name="moneda" value={filters.moneda} onChange={handleFilterChange} className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">TODAS</option>
                            <option value="USD">DÓLARES (USD)</option>
                            <option value="BRL">REALES (BRL)</option>
                            <option value="EUR">EUROS (EUR)</option>
                            <option value="ARS">PESOS (ARS)</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase italic ml-2">Instructor / Socio</label>
                        <select name="instructor" value={filters.instructor} onChange={handleFilterChange} className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">TODOS</option>
                            <option value="JOSE">JOSE</option>
                            <option value="IGNA">IGNA</option>
                            {instructoresDB.map(i => <option key={i.id} value={`${i.nombre} ${i.apellido}`}>{i.nombre} {i.apellido}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase italic ml-2">Actividad</label>
                        <select name="actividad" value={filters.actividad} onChange={handleFilterChange} className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">TODAS</option>
                            <option value="Clase de Kite">KITE</option>
                            <option value="Clase de Wing">WING</option>
                            <option value="Rental">RENTAL</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase italic ml-2">Desde</label>
                        <input type="date" name="fechaInicio" value={filters.fechaInicio} onChange={handleFilterChange} className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase italic ml-2">Hasta</label>
                        <input type="date" name="fechaFin" value={filters.fechaFin} onChange={handleFilterChange} className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="flex items-end">
                        <button onClick={resetFilters} className="w-full p-4 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase hover:bg-red-500 hover:text-white transition-all">Limpiar</button>
                    </div>
                </div>
            )}

            {/* --- SECCIÓN 1: PENDIENTES --- */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-yellow-50 px-8 py-5 border-b border-yellow-100">
                    <h2 className="text-xs font-black text-yellow-700 uppercase italic flex items-center gap-2">🔔 Pendientes de Asignación ({pendientes.length})</h2>
                </div>
                {pendientes.length === 0 ? <p className="p-10 text-center text-gray-400 font-bold italic">No hay ingresos pendientes.</p> : (
                    <div className="divide-y divide-gray-50">
                        {pendientes.map(item => (
                            <div key={item.id} className="hover:bg-gray-50 transition-colors p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-4">
                                        <span className="font-black text-gray-900 italic uppercase">{item.fecha}</span>
                                        <span className="text-emerald-600 font-black text-lg">{formatCurrency(item.total)} <span className="text-[10px] text-gray-400">{item.moneda}</span></span>
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{item.actividad} • {item.instructor}</p>
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <select 
                                        value={item.asignadoA} 
                                        onChange={(e) => handlePendienteChange(item.id, e.target.value)}
                                        className="p-3 bg-gray-100 rounded-xl border-none font-black text-[10px] w-full md:w-40 outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="NINGUNO">ASIGNAR A...</option>
                                        <option value="JOSE">JOSE</option>
                                        <option value="IGNA">IGNA</option>
                                    </select>
                                    <button onClick={() => saveAssignment(item.id, item.asignadoA)} className="bg-emerald-500 text-white p-3 rounded-xl font-black text-[10px] hover:bg-emerald-600">GUARDAR</button>
                                    <button onClick={() => toggleDetails(item.id)} className="bg-gray-200 text-gray-700 p-3 rounded-xl text-xs">{expandedId === item.id ? '▲' : '▼'}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- SECCIÓN 2: EGRESOS --- */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-red-50 px-8 py-5 border-b border-red-100 font-black text-red-700 uppercase italic text-xs">💸 Registro de Egresos</div>
                {egresos.map(item => (
                    <div key={item.id} className="p-6 border-b last:border-none flex justify-between items-center hover:bg-gray-50">
                        <div>
                            <span className="font-black text-gray-900 italic uppercase">{item.fecha}</span>
                            <span className="ml-4 text-red-500 font-black text-lg">-{formatCurrency(item.total)} <span className="text-[10px] text-gray-400">{item.moneda}</span></span>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{item.detalles || item.actividad}</p>
                        </div>
                        <button onClick={() => toggleDetails(item.id)} className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all uppercase">Detalle</button>
                    </div>
                ))}
            </div>

            {/* --- SECCIÓN 3: ASIGNADOS (CON BOTONES) --- */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-emerald-50 px-8 py-5 border-b border-emerald-100 font-black text-emerald-700 uppercase italic text-xs">✅ Ingresos Confirmados</div>
                <div className="divide-y divide-gray-50">
                    {asignados.map(item => (
                        <div key={item.id} className="hover:bg-gray-50 transition-colors">
                            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-6">
                                        <span className="font-black text-gray-900 italic uppercase w-20">{item.fecha}</span>
                                        <div className="flex flex-col">
                                            <span className="text-emerald-600 font-black text-xl">{formatCurrency(item.total)} <span className="text-[10px] text-gray-400">{item.moneda}</span></span>
                                            {parseFloat(item.gastosAsociados) > 0 && <span className="text-red-400 text-[10px] font-black uppercase italic">📉 Gastos: -{formatCurrency(item.gastosAsociados)}</span>}
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase italic ${item.asignadoA === 'IGNA' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            {item.asignadoA}
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 md:pl-28 tracking-widest">{item.actividad}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => toggleDetails(item.id)} className="bg-indigo-50 text-indigo-600 p-3 rounded-xl font-black text-[10px] uppercase">Detalle</button>
                                    <button onClick={() => handleEdit(item.id)} className="bg-yellow-50 text-yellow-600 p-3 rounded-xl font-black text-[10px] uppercase">Editar</button>
                                    <button onClick={() => handleDelete(item.id)} className="bg-red-50 text-red-600 p-3 rounded-xl font-black text-[10px] uppercase">Borrar</button>
                                </div>
                            </div>
                            {expandedId === item.id && <RenderDetails item={item} />}
                        </div>
                    ))}
                </div>
            </div>

            {/* --- GRÁFICOS --- */}
            <ReportesEstadisticasGraficos asignados={asignados} egresos={egresos} />
        </div>
    );
};

export default ReporteEstadisticas;