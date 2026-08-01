import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import api from '../../axiosConfig';

const toYMD = (d) => d.toISOString().split('T')[0];

const HOY = toYMD(new Date());

const normName = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();


export default function useMonitor() {

  const [mes, setMes] = useState(() => {
    const d = new Date();
    return {
      y: d.getFullYear(),
      m: d.getMonth()
    };
  });


  const [agenda, setAgenda] = useState([]);
  const [clases, setClases] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);


  const [diaSelec, setDiaSelec] = useState(null);

  const [filtroInst, setFiltroInst] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('TODO');


  const [editClase, setEditClase] = useState(null);
  const [editForm, setEditForm] = useState({});

  const guardandoEditRef = useRef(false);
  const [guardandoEdit, setGuardandoEdit] = useState(false);


  const [showIngreso, setShowIngreso] = useState(false);
  const [ingresoFecha, setIngresoFecha] = useState(null);
  const [ingresoForm, setIngresoForm] = useState({});
  const [clasesSelec, setClasesSelec] = useState([]);

  const enviandoRef = useRef(false);
  const [enviando, setEnviando] = useState(false);



  const cargar = useCallback(async () => {

    setLoading(true);

    try {

      const [
        rA,
        rC,
        rU
      ] = await Promise.all([
        api.get('/api/agenda/listar'),
        api.get('/api/clases/listar'),
        api.get('/usuario')
      ]);


      setAgenda(rA.data);
      setClases(rC.data);
      setUsuarios(rU.data);


    } catch(e) {

      console.error('Monitor:', e);

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    cargar();

  }, [cargar]);




  const ingresos = useMemo(
    () => clases.filter(c => c.tipoTransaccion === 'INGRESO'),
    [clases]
  );


  const egresos = useMemo(
    () => clases.filter(c => c.tipoTransaccion === 'EGRESO'),
    [clases]
  );



  const tieneCobro = useCallback((clase)=>{

    return Boolean(
      clase?.cobrada &&
      clase?.ingresoId
    );

  },[]);



  const ingresoDeClase = useCallback((clase)=>{

    if(!tieneCobro(clase))
      return null;


    return ingresos.find(
      i => String(i.id) === String(clase.ingresoId)
    ) || null;


  },[
    ingresos,
    tieneCobro
  ]);




  const instructores = useMemo(()=>{

    const set = new Set();


    agenda.forEach(a=>{
      if(a.nombreInstructor)
        set.add(a.nombreInstructor);
    });


    usuarios.forEach(u=>{

      set.add(
        `${u.nombre} ${u.apellido}`
          .replace(/\s+/g,' ')
          .trim()
      );

    });


    return Array.from(set)
      .filter(Boolean)
      .sort();


  },[
    agenda,
    usuarios
  ]);





  const alertas = useMemo(()=>{


    return agenda.filter(a=>{

      const f=a.fecha?.toString();


      return (
        f &&
        f < HOY &&
        a.estado !== 'RECHAZADA' &&
        !tieneCobro(a)
      );

    });


  },[
    agenda,
    tieneCobro
  ]);






  const navMes=(dir)=>{

    setMes(prev=>{

      let m=prev.m+dir;
      let y=prev.y;


      if(m<0){
        m=11;
        y--;
      }


      if(m>11){
        m=0;
        y++;
      }


      return {
        y,
        m
      };

    });


    setDiaSelec(null);

  };




  return {

    agenda,
    setAgenda,

    clases,
    setClases,

    usuarios,

    loading,

    cargar,


    mes,
    setMes,
    navMes,


    diaSelec,
    setDiaSelec,


    filtroInst,
    setFiltroInst,

    filtroTipo,
    setFiltroTipo,


    ingresos,
    egresos,


    instructores,

    alertas,

    tieneCobro,
    ingresoDeClase,



    editClase,
    setEditClase,

    editForm,
    setEditForm,

    guardandoEdit,
    setGuardandoEdit,

    guardandoEditRef,


    showIngreso,
    setShowIngreso,

    ingresoFecha,
    setIngresoFecha,

    ingresoForm,
    setIngresoForm,

    clasesSelec,
    setClasesSelec,

    enviando,
    setEnviando,

    enviandoRef

  };

}