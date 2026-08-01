import React from 'react';
import { useMonitor } from './Monitor/index.js';

const Monitor = ({
  agendaList,
  prepararReasignacion,
  setView
}) => {

  const monitor = useMonitor();


  return (
    <div>

      <MonitorCalendario
        {...monitor}
      />


      <MonitorDia
        {...monitor}
      />


      <MonitorResumen
        {...monitor}
      />


      <MonitorModales
        {...monitor}
      />

    </div>
  );
};


export default Monitor;