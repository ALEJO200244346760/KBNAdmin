import React from 'react';
import useMonitor from './useMonitor';

import MonitorCalendario from './MonitorCalendario';
import MonitorDia from './MonitorDia';
import MonitorResumen from './MonitorResumen';
import MonitorModales from './MonitorModales';

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