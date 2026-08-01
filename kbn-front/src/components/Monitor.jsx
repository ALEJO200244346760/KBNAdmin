import React from 'react';
import {
  useMonitor,
  MonitorCalendario,
  MonitorDia,
  MonitorModales,
  MonitorResumen
} from './Monitor';

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