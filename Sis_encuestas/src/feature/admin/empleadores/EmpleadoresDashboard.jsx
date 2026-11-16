import { useState, useEffect, useCallback } from 'react';
import { analisisService } from '../../../services/analisis';
import { CsvUploader } from '../dashboar/components/CsvUploader';
import ValoracionCarreraTab from './components/ValoracionCarreraTab';
import BrechasEmpleadoresTab from './components/BrechasEmpleadoresTab';
import CrucesEmpleadoresTab from './components/CrucesEmpleadoresTab';
import { Scale, BarChart2, FileSpreadsheet, History, RotateCcw } from 'lucide-react';

const TABS_EMPLEADORES = [
  { id: 'valoracion', label: 'Valoración de la Carrera', Icon: Scale },
  { id: 'brechas', label: 'Brechas de competencias', Icon: BarChart2 },
  { id: 'cruces', label: 'Cruces y exportar', Icon: FileSpreadsheet },
];

const FILTROS_INICIALES = {
  importacionId: '',
  tipoOrganizacion: 'Todos',
  tamano: 'Todos',
  rubro: 'Todos',
  contratoUltimos5: '',
  probContratacion: 'Todos',
};

const EmpleadoresDashboard = () => {
  const [tabActiva, setTabActiva] = useState('valoracion');
  const [archivosGuardados, setArchivosGuardados] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);

  const [dataValoracion, setDataValoracion] = useState(null);
  const [dataBrechas, setDataBrechas] = useState(null);

  const [variablesEmp, setVariablesEmp] = useState([]);
  const [varFila, setVarFila] = useState('EMP_TIPO_ORG');
  const [varCol, setVarCol] = useState('EMP_TAMANO');
  const [dataCruce, setDataCruce] = useState(null);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      analisisService.listarHistorialArchivos('empleadores'),
      analisisService.listarVariablesEmpleadores(),
    ])
      .then(([hist, vars]) => {
        setArchivosGuardados(hist || []);
        setVariablesEmp(vars || []);
      })
      .catch((err) => setError(err.message));
  }, []);

  const cargarDatosTab = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      if (tabActiva === 'valoracion') {
        const res = await analisisService.obtenerValoracionCarreraEmpleadores(filtros);
        setDataValoracion(res);
      } else if (tabActiva === 'brechas') {
        const res = await analisisService.obtenerBrechasCompetenciasEmpleadores(filtros);
        setDataBrechas(res);
      } else if (tabActiva === 'cruces') {
        if (varFila !== varCol) {
          const res = await analisisService.calcularCruceEmpleadores(varFila, varCol, filtros);
          setDataCruce(res);
        }
      }
    } catch (err) {
      setError(err.message || 'Error al calcular análisis de empleadores.');
    } finally {
      setCargando(false);
    }
  }, [tabActiva, filtros, varFila, varCol]);

  useEffect(() => {
    cargarDatosTab();
  }, [cargarDatosTab]);

  const actualizarFiltro = (campo, valor) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  };

  const limpiarFiltros = () => {
    setFiltros((prev) => ({
      ...FILTROS_INICIALES,
      importacionId: prev.importacionId,
    }));
  };

  const handleImportSuccess = async (tipoImportado, importacion) => {
    if (tipoImportado !== 'empleadores') return;
    try {
      const historial = await analisisService.listarHistorialArchivos('empleadores');
      setArchivosGuardados(historial || []);
      if (importacion?.id) {
        actualizarFiltro('importacionId', String(importacion.id));
      } else {
        await cargarDatosTab();
      }
    } catch (err) {
      setError(err.message || 'Error al refrescar historial de empleadores.');
    }
  };

  const totalUniverso = dataValoracion?.totalUniverso ?? dataBrechas?.totalUniverso ?? 80;
  const totalFiltrado = dataValoracion?.totalFiltrado ?? dataBrechas?.totalFiltrado ?? totalUniverso;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado y selector de archivo */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Observatorio de Empleadores</h1>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200 rounded-full">
              Empleadores
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Valoración institucional, brechas de competencias y cruces estadísticos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600" />
          <select
            value={filtros.importacionId}
            onChange={(e) => actualizarFiltro('importacionId', e.target.value)}
            className="text-xs font-medium border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 text-slate-700"
          >
            <option value="">Todos los archivos (Histórico acumulado)</option>
            {archivosGuardados.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre_archivo} ({a.filas_cargadas} reg.)
              </option>
            ))}
          </select>
        </div>
      </div>

      <CsvUploader tipoFijo="empleadores" onImportSuccess={handleImportSuccess} />

      {/* Navegación de pestañas */}
      <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
        {TABS_EMPLEADORES.map(({ id, label, Icon }) => {
          const activa = tabActiva === id;
          return (
            <button
              key={id}
              onClick={() => setTabActiva(id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activa
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Barra de Filtros Globales */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tipo de organización</label>
            <select
              value={filtros.tipoOrganizacion}
              onChange={(e) => actualizarFiltro('tipoOrganizacion', e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2"
            >
              <option value="Todos">Todos</option>
              <option value="Público">Público</option>
              <option value="Privado">Privado</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tamaño</label>
            <select
              value={filtros.tamano}
              onChange={(e) => actualizarFiltro('tamano', e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2"
            >
              <option value="Todos">Todos</option>
              <option value="Micro (hasta 10 funcionarios)">Micro (hasta 10)</option>
              <option value="Pequeña (entre 11 a 30 funcionarios)">Pequeña (11 a 30)</option>
              <option value="Mediana (entre 31 a 99 funcionarios)">Mediana (31 a 99)</option>
              <option value="Grande (100 funcionarios o más)">Grande (100 o más)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Rubro</label>
            <select
              value={filtros.rubro}
              onChange={(e) => actualizarFiltro('rubro', e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2"
            >
              <option value="Todos">Todos</option>
              <option value="Desarrollo de software">Desarrollo de software</option>
              <option value="Servicios de tecnologías de información (TI)">Servicios de TI</option>
              <option value="Telecomunicaciones y redes">Telecomunicaciones y redes</option>
              <option value="Instituciones públicas / gobierno">Instituciones públicas / gobierno</option>
              <option value="Salud">Salud</option>
              <option value="Startups o emprendimientos tecnológicos">Startups / emprendimientos</option>
              <option value="Banca y servicios financieros">Banca y servicios financieros</option>
              <option value="Educación e investigación">Educación e investigación</option>
              <option value="Otros">Otros</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Contrató en últimos 5 años</label>
            <select
              value={filtros.contratoUltimos5}
              onChange={(e) => actualizarFiltro('contratoUltimos5', e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2"
            >
              <option value="">Todos</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Posibilidad de contratar</label>
            <select
              value={filtros.probContratacion}
              onChange={(e) => actualizarFiltro('probContratacion', e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2"
            >
              <option value="Todos">Todos</option>
              <option value="Sí, existe una alta probabilidad de contratación">Alta probabilidad</option>
              <option value="Sí, dependiendo del crecimiento o nuevos proyectos de la organización">Según crecimiento / proyectos</option>
              <option value="No se tiene prevista la contratación actualmente">No prevista actualmente</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Mostrando <strong className="text-slate-800">{totalFiltrado}</strong> de{' '}
            <strong className="text-slate-800">{totalUniverso}</strong> respuestas
          </span>
          <button
            onClick={limpiarFiltros}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Limpiar filtros
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
          {error}
        </div>
      )}

      {cargando && (
        <div className="text-center py-8 text-xs font-semibold text-slate-500">
          Procesando indicadores estadísticos de empleadores...
        </div>
      )}

      {!cargando && tabActiva === 'valoracion' && dataValoracion && (
        <ValoracionCarreraTab dataValoracion={dataValoracion} />
      )}

      {!cargando && tabActiva === 'brechas' && dataBrechas && (
        <BrechasEmpleadoresTab dataBrechas={dataBrechas} />
      )}

      {!cargando && tabActiva === 'cruces' && (
        <CrucesEmpleadoresTab
          variablesEmp={variablesEmp}
          varFila={varFila}
          setVarFila={setVarFila}
          varCol={varCol}
          setVarCol={setVarCol}
          dataCruce={dataCruce}
          importacionId={filtros.importacionId || null}
        />
      )}
    </div>
  );
};

export default EmpleadoresDashboard;