import React, { useMemo } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';

const ReportesEstadisticasGraficos = ({ asignados = [], egresos = [] }) => {

  /* =========================
     HELPERS
  ========================= */

  const sum = (arr, fn) => arr.reduce((acc, el) => acc + fn(el), 0);

  const groupSum = (arr, keyFn, valFn) =>
    arr.reduce((acc, el) => {
      const key = keyFn(el);
      acc[key] = (acc[key] || 0) + valFn(el);
      return acc;
    }, {});

  /* =========================
     MEMOS
  ========================= */

  const ingresosPorInstructor = useMemo(() => ([
    sum(asignados.filter(a => a.asignadoA === 'IGNA'), a => Number(a.total || 0)),
    sum(asignados.filter(a => a.asignadoA === 'JOSE'), a => Number(a.total || 0)),
  ]), [asignados]);

  const ingresosTotales = useMemo(
    () => sum(asignados, a => Number(a.total || 0)),
    [asignados]
  );

  const egresosTotales = useMemo(
    () => sum(egresos, e => Number(e.gastosAsociados) || Number(e.total) || 0),
    [egresos]
  );

  const gastosPorActividad = useMemo(
    () => groupSum(
      egresos,
      e => e.actividad || 'Otros',
      e => Number(e.gastosAsociados) || Number(e.total) || 0
    ),
    [egresos]
  );

  const ingresosPorActividad = useMemo(
    () => groupSum(
      asignados,
      a => a.actividad || 'Sin actividad',
      a => Number(a.total || 0)
    ),
    [asignados]
  );

  const ingresosPorMes = useMemo(
    () => groupSum(
      asignados,
      a => a.fecha?.slice(0, 7) || 'Fecha inválida',
      a => Number(a.total || 0)
    ),
    [asignados]
  );

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 pt-10">

      {/* 🎯 Distribución por Instructor */}
      <Card title="Distribución de Ingresos por Instructor">
        <Doughnut
          data={{
            labels: ['Igna', 'Jose'],
            datasets: [{
              data: ingresosPorInstructor,
              backgroundColor: ['#2563eb', '#16a34a'],
              borderWidth: 2,
              hoverOffset: 10,
            }]
          }}
          options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
        />
      </Card>

      {/* 📉 Ingresos vs Egresos */}
      <Card title="Comparación de Ingresos vs Egresos">
        <Bar
          data={{
            labels: ['Ingresos', 'Egresos'],
            datasets: [{
              data: [ingresosTotales, egresosTotales],
              backgroundColor: ['#4f46e5', '#dc2626'],
              borderRadius: 8,
            }]
          }}
          options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }}
        />
      </Card>

      {/* 🧾 Gastos por Actividad */}
      <Card title="Gastos por Actividad" wide>
        <Bar
          data={{
            labels: Object.keys(gastosPorActividad),
            datasets: [{
              data: Object.values(gastosPorActividad),
              backgroundColor: '#f87171',
              borderRadius: 6,
            }]
          }}
          options={{
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { legend: { display: false } }
          }}
        />
      </Card>

      {/* 🎨 Ingresos por Actividad */}
      <Card title="Ingresos por Actividad">
        <Doughnut
          data={{
            labels: Object.keys(ingresosPorActividad),
            datasets: [{
              data: Object.values(ingresosPorActividad),
              backgroundColor: [
                '#3b82f6', '#10b981', '#fbbf24',
                '#ef4444', '#8b5cf6', '#ec4899'
              ],
              hoverOffset: 10
            }]
          }}
          options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
        />
      </Card>

      {/* 📈 Ingresos por Mes */}
      <Card title="Ingresos por Mes">
        <Bar
          data={{
            labels: Object.keys(ingresosPorMes),
            datasets: [{
              label: 'Ingresos ($)',
              data: Object.values(ingresosPorMes),
              backgroundColor: '#2563eb',
              borderRadius: 6,
            }]
          }}
          options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
        />
      </Card>

    </div>
  );
};

export default ReportesEstadisticasGraficos;

/* =========================
   COMPONENTE CARD
========================= */

const Card = ({ title, children, wide }) => (
  <div className={`bg-white p-6 rounded-xl shadow-lg border ${wide ? 'xl:col-span-2' : ''}`}>
    <h3 className="text-lg font-bold text-gray-700 mb-4 text-center">
      {title}
    </h3>
    <div className="h-72">
      {children}
    </div>
  </div>
);
