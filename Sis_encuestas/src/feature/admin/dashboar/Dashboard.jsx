import { useState, useEffect, useCallback } from 'react';
import { analisisService } from '../../../services/analisis';
import { CsvUploader } from './components/CsvUploader';
import {
  Briefcase,
  GraduationCap,
  Scale,
  BarChart2,
  FileSpreadsheet,
  GitBranch,
  History,
  RotateCcw,
  Play,
  ArrowLeftRight,
  X,
} from 'lucide-react';

const TABS_TITULADOS = [
  { id: 'perfil', label: 'Perfil de empleabilidad', Icon: Briefcase },
  { id: 'formacion', label: 'Formación continua', Icon: GraduationCap },
  { id: 'financiamiento', label: 'Financiamiento', Icon: Scale },
  { id: 'brechas', label: 'Brechas de competencias', Icon: BarChart2 },
  { id: 'cruces', label: 'Cruces y exportación', Icon: FileSpreadsheet },
  { id: 'simulacion', label: 'Simulación de escenarios', Icon: GitBranch },
];

const FILTROS_INICIALES = {
  importacionId: '',
  anioTitulacion: '',
  situacion: 'Todos',
  sector: 'Todos',
  genero: 'Todos',
  edadRango: 'Todos',
  interesadoPosgrado: '',
  umbralAnios: 5,
};

const PALETA_DONUT = ['#0d9488', '#2563eb', '#f59e0b', '#7c3aed', '#e11d48', '#0891b2'];
const PALETA_LIKERT_4 = ['#ef4444', '#f97316', '#38bdf8', '#1d4ed8'];

export const Dashboard = () => {
  const [tabActiva, setTabActiva] = useState('perfil');
  const [subTabPerfil, setSubTabPerfil] = useState('perfil');
  const [subTabFormacion, setSubTabFormacion] = useState('cursado');
  const [subTabBrechas, setSubTabBrechas] = useState('satisfaccion');

  const [archivosGuardados, setArchivosGuardados] = useState([]);
  const [preguntasCatalogo, setPreguntasCatalogo] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);

  // Estados de datos desde backend
  const [dataPerfil, setDataPerfil] = useState(null);
  const [dataFormacion, setDataFormacion] = useState(null);
  const [colFinanciamiento, setColFinanciamiento] = useState('nivel');
  const [mapaCalorFinanc, setMapaCalorFinanc] = useState(true);
  const [dataFinanciamiento, setDataFinanciamiento] = useState(null);
  const [dataBrechas, setDataBrechas] = useState(null);

  // Estados de Cruces y Chi-cuadrado / Fisher
  const [varFila, setVarFila] = useState('TIT_SITUACION_LABORAL');
  const [varCol, setVarCol] = useState('TIT_POSGRADO_INTERES');
  const [metricaCelda, setMetricaCelda] = useState('cantidad'); // 'cantidad' | 'pctFila'
  const [subVistaCruce, setSubVistaCruce] = useState('barras'); // 'barras' | 'tabla'
  const [dataCruce, setDataCruce] = useState(null);

  // Estados de Simulación Monte Carlo
  const [varSimular, setVarSimular] = useState('TIT_GENERO');
  const [personasN, setPersonasN] = useState(100);
  const [replicasR, setReplicasR] = useState(1000);
  const [semilla, setSemilla] = useState(42);
  const [probsCustom, setProbsCustom] = useState({});
  const [moverDe, setMoverDe] = useState('');
  const [moverA, setMoverA] = useState('');
  const [puntosMover, setPuntosMover] = useState(10);
  const [dataSimulacion, setDataSimulacion] = useState(null);
  const [categoriaHistograma, setCategoriaHistograma] = useState(null);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      analisisService.listarHistorialArchivos('titulados'),
      analisisService.listarPreguntas('titulados'),
    ])
      .then(([hist, pregs]) => {
        setArchivosGuardados(hist || []);
        setPreguntasCatalogo((pregs || []).filter((p) => p.tipo !== 'multiple'));
      })
      .catch((err) => setError(err.message));
  }, []);

  const cargarDatosPestana = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      if (tabActiva === 'perfil') {
        const res = await analisisService.obtenerPerfilEmpleabilidad(filtros);
        setDataPerfil(res);
      } else if (tabActiva === 'formacion') {
        const res = await analisisService.obtenerFormacionContinua(filtros);
        setDataFormacion(res);
      } else if (tabActiva === 'financiamiento') {
        const res = await analisisService.obtenerFinanciamiento(colFinanciamiento, filtros);
        setDataFinanciamiento(res);
      } else if (tabActiva === 'brechas') {
        const res = await analisisService.obtenerBrechasCompetencias(filtros);
        setDataBrechas(res);
      } else if (tabActiva === 'cruces') {
        if (varFila !== varCol) {
          const res = await analisisService.calcularCruceAvanzado('titulados', varFila, varCol, filtros);
          setDataCruce(res);
        }
      } else if (tabActiva === 'simulacion') {
        const res = await analisisService.simularMonteCarlo({
          preguntaCodigo: varSimular,
          personasN,
          replicasR,
          semilla,
          probabilidadesPersonalizadasPct: Object.keys(probsCustom).length > 0 ? probsCustom : null,
          filtros,
        });
        setDataSimulacion(res);
        if (res?.categorias?.length >= 2) {
          setMoverDe((prev) => prev || res.categorias[0].categoria);
          setMoverA((prev) => prev || res.categorias[1].categoria);
        }
      }
    } catch (err) {
      setError(err.message || 'Error al cargar los cálculos del servidor.');
    } finally {
      setCargando(false);
    }
  }, [tabActiva, filtros, colFinanciamiento, varFila, varCol, varSimular, personasN, replicasR, semilla, probsCustom]);

  useEffect(() => {
    cargarDatosPestana();
  }, [cargarDatosPestana]);

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
    if (tipoImportado !== 'titulados') return;
    try {
      const historial = await analisisService.listarHistorialArchivos('titulados');
      setArchivosGuardados(historial || []);
      if (importacion?.id) {
        actualizarFiltro('importacionId', String(importacion.id));
      } else {
        await cargarDatosPestana();
      }
    } catch (err) {
      setError(err.message || 'El archivo se importó, pero no se pudo actualizar el historial.');
    }
  };

  const aplicarMoverPuntos = () => {
    if (!dataSimulacion || !moverDe || !moverA || moverDe === moverA) return;
    const base = {};
    dataSimulacion.categorias.forEach((c) => {
      base[c.categoria] = probsCustom[c.categoria] ?? c.observadoPct;
    });
    const delta = Math.min(Number(puntosMover) || 0, base[moverDe] || 0);
    base[moverDe] = Number((base[moverDe] - delta).toFixed(2));
    base[moverA] = Number((base[moverA] + delta).toFixed(2));
    setProbsCustom(base);
  };

  const totalUniverso =
    dataPerfil?.totalUniverso ??
    dataFormacion?.totalUniverso ??
    dataBrechas?.totalUniverso ??
    148;
  const totalFiltrado =
    dataPerfil?.totalFiltrado ??
    dataFormacion?.totalFiltrado ??
    dataBrechas?.totalFiltrado ??
    totalUniverso;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabecera y selector de lote */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Observatorio de Titulados — Ingeniería de Sistemas</h1>
          <p className="text-xs text-slate-500">Análisis estadístico integral ejecutado en servidor (Spring Boot + PostgreSQL)</p>
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

      <CsvUploader tipoFijo="titulados" onImportSuccess={handleImportSuccess} />

      {/* Navegación de módulos de Titulados */}
      <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
        {TABS_TITULADOS.map(({ id, label, Icon }) => {
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
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Estado laboral</label>
            <select
              value={filtros.situacion}
              onChange={(e) => actualizarFiltro('situacion', e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2"
            >
              <option value="Todos">Todos</option>
              <option value="Actualmente me encuentro trabajando un una organización">Trabaja en organización</option>
              <option value="Actualmente dedico mi tiempo COMPLETO a un emprendimiento propio">Emprendimiento propio</option>
              <option value="Actualmente NO trabajo">Sin empleo</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Sector</label>
            <select
              value={filtros.sector}
              onChange={(e) => actualizarFiltro('sector', e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2"
            >
              <option value="Todos">Todos</option>
              <option value="PRIVADO">Privado</option>
              <option value="PÚBLICO">Público</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Género</label>
            <select
              value={filtros.genero}
              onChange={(e) => actualizarFiltro('genero', e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2"
            >
              <option value="Todos">Todos</option>
              <option value="Hombre">Hombre</option>
              <option value="Mujer">Mujer</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Rango de edad</label>
            <select
              value={filtros.edadRango}
              onChange={(e) => actualizarFiltro('edadRango', e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2"
            >
              <option value="Todos">Todos</option>
              <option value="19 - 22 años">19 - 22 años</option>
              <option value="23 - 26 años">23 - 26 años</option>
              <option value="27 - 30 años">27 - 30 años</option>
              <option value="31 - 34 años">31 - 34 años</option>
              <option value="35 años o más">35 años o más</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Interés en posgrado</label>
            <select
              value={filtros.interesadoPosgrado}
              onChange={(e) => actualizarFiltro('interesadoPosgrado', e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2"
            >
              <option value="">Todos</option>
              <option value="true">Sí (Interesado)</option>
              <option value="false">No</option>
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
          Calculando indicadores estadísticos en el servidor...
        </div>
      )}

      {/* ===================================================================== */}
      {/* MÓDULO 1: PERFIL DE EMPLEABILIDAD (5 SUBPESTAÑAS + TODOS LOS GRÁFICOS)*/}
      {/* ===================================================================== */}
      {!cargando && tabActiva === 'perfil' && dataPerfil && (
        <div className="space-y-5">
          <div className="flex gap-6 border-b border-slate-200 text-xs font-semibold">
            {[
              { id: 'perfil', label: 'Perfil' },
              { id: 'trabajo', label: 'Trabajo actual' },
              { id: 'sinEmpleo', label: 'Sin empleo' },
              { id: 'primerEmpleo', label: 'Primer empleo' },
              { id: 'emprendimiento', label: 'Emprendimiento' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSubTabPerfil(st.id)}
                className={`pb-2.5 border-b-2 transition cursor-pointer ${
                  subTabPerfil === st.id
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {subTabPerfil === 'perfil' && (
            <div className="space-y-4">
              {/* Fila 1: Dispersión experiencia + Segmentación umbral */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Experiencia profesional frente a antigüedad desde titulación
                    </h3>
                    <p className="text-xs text-slate-500">
                      Compara años declarados de experiencia con años activos · n = {dataPerfil.tabPerfil.trayectoria.n_exp}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl text-center">
                    <div>
                      <p className="text-[11px] text-slate-500">Media declarada</p>
                      <p className="text-xl font-bold text-slate-900">{dataPerfil.tabPerfil.trayectoria.media_exp ?? 0} años</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500">Mediana declarada</p>
                      <p className="text-xl font-bold text-slate-900">{dataPerfil.tabPerfil.trayectoria.mediana_exp ?? 0} años</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500">Dispersión declarada</p>
                      <p className="text-xl font-bold text-slate-900">{dataPerfil.tabPerfil.trayectoria.de_exp ?? 0} años</p>
                    </div>
                  </div>

                  <ScatterExperienciaChart serie={dataPerfil.tabPerfil.serieExperiencia || []} />
                </div>

                {/* Segmentación Junior / Consolidado paramétrica */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Segmentación por experiencia</h3>
                        <p className="text-[11px] text-slate-500">Clasificación según umbral declarado</p>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-bold bg-blue-100 text-blue-700 rounded-lg">
                        {filtros.umbralAnios} años
                      </span>
                    </div>

                    <input
                      type="range"
                      min={1}
                      max={15}
                      value={filtros.umbralAnios}
                      onChange={(e) => actualizarFiltro('umbralAnios', Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>3 años (Reciente)</span>
                      <span>5 años (Estándar)</span>
                      <span>8 años (Senior)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-2">
                      <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
                        <p className="text-[10px] font-bold text-blue-700 uppercase">Junior / Reciente</p>
                        <p className="text-xl font-bold text-slate-900 mt-1">{dataPerfil.tabPerfil.trayectoria.juniorPct} %</p>
                        <p className="text-[11px] text-slate-500">
                          {dataPerfil.tabPerfil.trayectoria.junior_count} de {dataPerfil.tabPerfil.trayectoria.n_exp} (≤ {filtros.umbralAnios}a)
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-600 uppercase">Consolidado</p>
                        <p className="text-xl font-bold text-slate-900 mt-1">{dataPerfil.tabPerfil.trayectoria.consolidadoPct} %</p>
                        <p className="text-[11px] text-slate-500">
                          {dataPerfil.tabPerfil.trayectoria.consolidado_count} de {dataPerfil.tabPerfil.trayectoria.n_exp} (&gt; {filtros.umbralAnios}a)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span>Corte metodológico parametrizable</span>
                    <span className="font-bold text-slate-800">Total = {dataPerfil.tabPerfil.trayectoria.n_exp}</span>
                  </div>
                </div>
              </div>

              {/* Fila 2: Donut Estado laboral + Sector de inserción */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <DonutChartCard
                  titulo="Estado laboral"
                  subtitulo={`Situación ocupacional declarada · n = ${dataPerfil.tabPerfil.estadoLaboral.n}`}
                  items={dataPerfil.tabPerfil.estadoLaboral.items}
                  centroLabel="OCUPADOS"
                  calcularCentroPct={(items) => {
                    const tot = items.reduce((acc, i) => acc + i.frecuencia, 0);
                    const des = items
                      .filter((i) => String(i.categoria).toLowerCase().includes('no trabajo'))
                      .reduce((acc, i) => acc + i.frecuencia, 0);
                    return tot > 0 ? `${(((tot - des) * 100) / tot).toFixed(1)} %` : '0 %';
                  }}
                />

                <ListaBarrasCard
                  titulo="Sector de inserción laboral"
                  subtitulo={`Sector del trabajo actual de personas ocupadas · n = ${dataPerfil.tabPerfil.sectorInsercion.n}`}
                  items={dataPerfil.tabPerfil.sectorInsercion.items}
                />
              </div>

              {/* Fila 3: Columnas Edad + Donut Género + Trayectoria y búsqueda */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <ColumnBarChartCard
                  titulo={`Distribución por edad (n = ${dataPerfil.tabPerfil.distribucionEdad.n})`}
                  subtitulo="Rangos de edad en orden cronológico"
                  items={ordenarRangosEdad(dataPerfil.tabPerfil.distribucionEdad.items)}
                />

                <DonutChartCard
                  titulo={`Género (n = ${dataPerfil.tabPerfil.distribucionGenero.n})`}
                  subtitulo="Composición declarada en encuesta"
                  items={dataPerfil.tabPerfil.distribucionGenero.items}
                  centroLabel="TOTAL"
                  calcularCentroPct={(items) => String(items.reduce((acc, i) => acc + i.frecuencia, 0))}
                />

                <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Trayectoria y búsqueda</h3>
                    <p className="text-xs text-slate-500">Años de ejercicio y periodos sin empleo</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-blue-700">Vida profesional</span>
                      <span className="text-slate-500">DE: ± {dataPerfil.tabPerfil.trayectoria.de_exp ?? 0} años</span>
                    </div>
                    <p className="text-sm text-slate-800">
                      Media: <strong>{dataPerfil.tabPerfil.trayectoria.media_exp ?? 0}</strong> años · Mediana:{' '}
                      <strong>{dataPerfil.tabPerfil.trayectoria.mediana_exp ?? 0}</strong> años
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-blue-700">Tiempo en búsqueda activa</span>
                      <span className="text-slate-500">DE: ± {dataPerfil.tabPerfil.trayectoria.de_desemp ?? 0} años</span>
                    </div>
                    <p className="text-sm text-slate-800">
                      Media: <strong>{dataPerfil.tabPerfil.trayectoria.media_desemp ?? 0}</strong> años · Mediana:{' '}
                      <strong>{dataPerfil.tabPerfil.trayectoria.mediana_desemp ?? 0}</strong> años
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {subTabPerfil === 'trabajo' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 overflow-x-auto">
                <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Remuneración por rubro de organización (n = {dataPerfil.tabTrabajoActual.matrizRemuneracionRubro.nValidas})
                    </h3>
                    <p className="text-xs text-slate-500">
                      H de Kruskal-Wallis: H = {dataPerfil.tabTrabajoActual.matrizRemuneracionRubro.kruskalWallis.h} · p ={' '}
                      {dataPerfil.tabTrabajoActual.matrizRemuneracionRubro.kruskalWallis.pValor} · ε² ={' '}
                      {dataPerfil.tabTrabajoActual.matrizRemuneracionRubro.kruskalWallis.epsilonCuadrado}
                    </p>
                  </div>
                </div>

                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="text-left p-2.5">Rubro</th>
                      {dataPerfil.tabTrabajoActual.matrizRemuneracionRubro.columnas.map((col) => (
                        <th key={col} className="p-2.5 text-center">{col}</th>
                      ))}
                      <th className="p-2.5 text-right">n</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataPerfil.tabTrabajoActual.matrizRemuneracionRubro.filas.map((fila) => (
                      <tr key={fila.rubro} className="border-b border-slate-100">
                        <td className="p-2.5 font-semibold text-slate-800">{fila.rubro}</td>
                        {fila.celdas.map((cel) => (
                          <td key={cel.tramo} className="p-2 text-center">
                            <div
                              className="rounded py-1.5 px-2 font-semibold"
                              style={{
                                backgroundColor:
                                  cel.frecuencia > 0
                                    ? `rgba(13, 148, 136, ${Math.min(0.85, cel.porcentajeFila / 100 + 0.12)})`
                                    : '#f8fafc',
                                color: cel.porcentajeFila > 45 ? '#fff' : '#0f172a',
                              }}
                            >
                              <div>{cel.frecuencia}</div>
                              <div className="text-[10px] opacity-80">{cel.porcentajeFila} %</div>
                            </div>
                          </td>
                        ))}
                        <td className="p-2.5 text-right font-bold">{fila.nFila}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ListaBarrasCard
                  titulo="Áreas dentro de la organización"
                  subtitulo={`Prioridades declaradas · selección múltiple · n = ${dataPerfil.tabTrabajoActual.n}`}
                  items={dataPerfil.tabTrabajoActual.areasOrganizacion.map((a) => ({
                    categoria: a.area,
                    frecuencia: a.frecuencia,
                    porcentaje: a.porcentaje,
                  }))}
                  numerado
                />
                <StackedLikertCard
                  titulo="Pertinencia de formación para el cargo"
                  subtitulo={`Escala de acuerdo · n = ${dataPerfil.tabTrabajoActual.n}`}
                  niveles={dataPerfil.tabTrabajoActual.pertinenciaCargo}
                />
              </div>
            </div>
          )}

          {subTabPerfil === 'sinEmpleo' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-blue-700 uppercase">Experiencia laboral previa</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {dataPerfil.tabSinEmpleo.resumen.con_exp_previa} de {dataPerfil.tabSinEmpleo.resumen.n}{' '}
                    <span className="text-sm font-normal text-slate-500">
                      ({dataPerfil.tabSinEmpleo.resumen.conExpPreviaPct} %)
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Han tenido trabajo formal con anterioridad al periodo actual de búsqueda.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <p className="text-slate-400">Media</p>
                    <p className="font-bold">{dataPerfil.tabSinEmpleo.resumen.media_busqueda ?? 0} a</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Mediana</p>
                    <p className="font-bold">{dataPerfil.tabSinEmpleo.resumen.mediana_busqueda ?? 0} a</p>
                  </div>
                  <div>
                    <p className="text-slate-400">DE</p>
                    <p className="font-bold">{dataPerfil.tabSinEmpleo.resumen.de_busqueda ?? 0} a</p>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <ListaBarrasCard
                  titulo={`Razones por las que no trabaja (n = ${dataPerfil.tabSinEmpleo.resumen.n})`}
                  items={dataPerfil.tabSinEmpleo.razonesNoTrabaja}
                />
              </div>
            </div>
          )}

          {subTabPerfil === 'primerEmpleo' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
                <p className="text-xs font-bold text-blue-700 uppercase">Continuidad primer empleo</p>
                <p className="text-3xl font-bold text-slate-900">
                  {dataPerfil.tabPrimerEmpleo.continuidadPrimerEmpleo.sigue_primer_empleo} de{' '}
                  {dataPerfil.tabPrimerEmpleo.continuidadPrimerEmpleo.n_respondieron}{' '}
                  <span className="text-sm font-normal text-slate-500">
                    ({dataPerfil.tabPrimerEmpleo.continuidadPrimerEmpleo.porcentaje} %)
                  </span>
                </p>
                <p className="text-xs text-slate-500">
                  De los titulados actualmente ocupados, continúan trabajando en su primer empleo.
                </p>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${dataPerfil.tabPrimerEmpleo.continuidadPrimerEmpleo.porcentaje}%` }}
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <ColumnBarChartCard
                  titulo={`Tiempo hasta el primer empleo (n = ${dataPerfil.tabPrimerEmpleo.n})`}
                  subtitulo="Tiempo transcurrido desde titulación hasta la primera contratación"
                  items={dataPerfil.tabPrimerEmpleo.tiempoHastaPrimerEmpleo}
                />
              </div>
            </div>
          )}

          {subTabPerfil === 'emprendimiento' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ListaBarrasCard titulo="Origen del emprendimiento" items={dataPerfil.tabEmprendimiento.origen.items} />
              <ColumnBarChartCard
                titulo="Nivel de satisfacción con el emprendimiento"
                items={dataPerfil.tabEmprendimiento.satisfaccionNegocio}
              />
              <ListaBarrasCard titulo="Tipo de producto/entregable" items={dataPerfil.tabEmprendimiento.entregable.items} />
              <ColumnBarChartCard
                titulo="Importancia de la formación universitaria"
                items={dataPerfil.tabEmprendimiento.importanciaFormacion}
              />
              <ListaBarrasCard titulo="Financiamiento inicial" items={dataPerfil.tabEmprendimiento.financiamiento.items} />
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MÓDULO 2: FORMACIÓN CONTINUA (3 SUBPESTAÑAS + COLUMNAS Y BARRAS)      */}
      {/* ===================================================================== */}
      {!cargando && tabActiva === 'formacion' && dataFormacion && (
        <div className="space-y-4">
          <div className="flex gap-6 border-b border-slate-200 text-xs font-semibold">
            {[
              { id: 'cursado', label: 'Posgrado cursado' },
              { id: 'interes', label: 'Interés en posgrado' },
              { id: 'opinion', label: 'Opinión sobre el posgrado' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSubTabFormacion(st.id)}
                className={`pb-2.5 border-b-2 transition cursor-pointer ${
                  subTabFormacion === st.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {subTabFormacion === 'cursado' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
                <p className="text-xs font-semibold text-slate-600">Formación complementaria activa</p>
                <p className="text-3xl font-bold text-slate-900">
                  {dataFormacion.tabPosgradoCursado.formacionActiva.si_count} de{' '}
                  {dataFormacion.tabPosgradoCursado.formacionActiva.n_total}
                </p>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${dataFormacion.tabPosgradoCursado.formacionActiva.porcentajeSi}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Sí: {dataFormacion.tabPosgradoCursado.formacionActiva.si_count}</span>
                  <span>No: {dataFormacion.tabPosgradoCursado.formacionActiva.no_count}</span>
                </div>
              </div>

              <ColumnBarChartCard
                titulo="Nivel más alto cursado"
                subtitulo={`Orden natural · n = ${dataFormacion.tabPosgradoCursado.nivelMasAlto.n}`}
                items={dataFormacion.tabPosgradoCursado.nivelMasAlto.items}
              />

              <ListaBarrasCard
                titulo={`Institución donde lo cursó (n = ${dataFormacion.tabPosgradoCursado.institucion.n})`}
                items={dataFormacion.tabPosgradoCursado.institucion.items}
              />

              <StackedLikertCard
                titulo="Fuente principal de financiamiento"
                subtitulo={`Con beca: ${dataFormacion.tabPosgradoCursado.financiamiento.conBeca} de ${dataFormacion.tabPosgradoCursado.financiamiento.n}`}
                niveles={dataFormacion.tabPosgradoCursado.financiamiento.items}
                colores={['#2563eb', '#7c3aed', '#f59e0b']}
              />
            </div>
          )}

          {subTabFormacion === 'interes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ListaBarrasCard
                titulo={`Áreas de interés (n = ${dataFormacion.tabInteresPosgrado.areasInteres.n})`}
                items={dataFormacion.tabInteresPosgrado.areasInteres.items}
              />
              <ListaBarrasCard
                titulo={`Institución educativa preferida (n = ${dataFormacion.tabInteresPosgrado.organizacionPreferida.n})`}
                items={dataFormacion.tabInteresPosgrado.organizacionPreferida.items}
              />
            </div>
          )}

          {subTabFormacion === 'opinion' && (
            <StackedLikertCard
              titulo={`Opinión sobre el posgrado de la FCyT (n = ${dataFormacion.tabOpinionPosgrado.n})`}
              subtitulo={`Desacuerdo: ${dataFormacion.tabOpinionPosgrado.desacuerdoPct} % · De acuerdo: ${dataFormacion.tabOpinionPosgrado.acuerdoPct} %`}
              niveles={dataFormacion.tabOpinionPosgrado.items}
            />
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MÓDULO 3: FINANCIAMIENTO + HEATMAP + KRUSKAL-WALLIS MONTE CARLO       */}
      {/* ===================================================================== */}
      {!cargando && tabActiva === 'financiamiento' && dataFinanciamiento && (
        <div className="space-y-4">
          <ListaBarrasCard
            titulo={`Fuente de financiamiento de la formación complementaria cursada (n = ${dataFinanciamiento.distribucionFinanciamiento.n})`}
            items={dataFinanciamiento.distribucionFinanciamiento.items}
          />

          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {dataFinanciamiento.cruce.tituloFila} × {dataFinanciamiento.cruce.tituloColumna}
                </h3>
                <p className="text-xs text-slate-500">
                  H = {dataFinanciamiento.cruce.pruebaEstadistica.h} (gl = {dataFinanciamiento.cruce.pruebaEstadistica.gl}) ·{' '}
                  p = {dataFinanciamiento.cruce.pruebaEstadistica.pValor} ({dataFinanciamiento.cruce.pruebaEstadistica.metodo}) ·{' '}
                  ε² = {dataFinanciamiento.cruce.pruebaEstadistica.epsilonCuadrado} (
                  {dataFinanciamiento.cruce.pruebaEstadistica.magnitudEfecto})
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mapaCalorFinanc}
                    onChange={(e) => setMapaCalorFinanc(e.target.checked)}
                  />
                  Mapa de calor
                </label>
                <select
                  value={colFinanciamiento}
                  onChange={(e) => setColFinanciamiento(e.target.value)}
                  className="text-xs border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="nivel">Columnas: Nivel de formación cursada</option>
                  <option value="lugar">Columnas: Institución donde cursó</option>
                  <option value="sector">Columnas: Sector laboral actual</option>
                  <option value="remuneracion">Columnas: Remuneración mensual</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left p-2.5">Financiamiento</th>
                    {dataFinanciamiento.cruce.columnas.map((c) => (
                      <th key={c} className="text-center p-2.5">{c}</th>
                    ))}
                    <th className="text-right p-2.5">Total fila</th>
                  </tr>
                </thead>
                <tbody>
                  {dataFinanciamiento.cruce.filas.map((f, idx) => {
                    const totF = dataFinanciamiento.cruce.totalesFila[idx] || 0;
                    return (
                      <tr key={f} className="border-b border-slate-100">
                        <td className="p-2.5 font-semibold">{f}</td>
                        {dataFinanciamiento.cruce.observados[idx].map((val, j) => {
                          const ratio = totF > 0 ? val / totF : 0;
                          return (
                            <td key={j} className="p-2 text-center">
                              <div
                                className="rounded py-1.5 font-semibold"
                                style={{
                                  backgroundColor:
                                    mapaCalorFinanc && val > 0 ? `rgba(37, 99, 235, ${Math.min(0.8, ratio + 0.1)})` : 'transparent',
                                  color: mapaCalorFinanc && ratio > 0.5 ? '#fff' : '#0f172a',
                                }}
                              >
                                {val}
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-2.5 text-right font-bold">{totF}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MÓDULO 4: BRECHAS DE COMPETENCIAS (LIKERT + HEATMAPS + ASIGNATURAS)   */}
      {/* ===================================================================== */}
      {!cargando && tabActiva === 'brechas' && dataBrechas && (
        <div className="space-y-4">
          <div className="flex gap-6 border-b border-slate-200 text-xs font-semibold">
            {[
              { id: 'satisfaccion', label: 'Satisfacción y pertinencia' },
              { id: 'malla', label: 'Malla y asignaturas' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSubTabBrechas(st.id)}
                className={`pb-2.5 border-b-2 transition cursor-pointer ${
                  subTabBrechas === st.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {subTabBrechas === 'satisfaccion' && (
            <div className="space-y-5">
              {/* 3 tarjetas Likert apiladas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  dataBrechas.tabSatisfaccionPertinencia.valoracionGlobal,
                  dataBrechas.tabSatisfaccionPertinencia.concordanciaMercado,
                  dataBrechas.tabSatisfaccionPertinencia.pertinenciaTrabajo,
                ].map((ind) => (
                  <StackedLikertCard
                    key={ind.preguntaCodigo}
                    titulo={ind.titulo}
                    subtitulo={`Favorables: ${ind.favorablePct} % · n = ${ind.n}`}
                    niveles={ind.niveles}
                    footer={ind.diagnostico}
                  />
                ))}
              </div>

              {/* 2 Matrices Heatmap con Spearman y Kruskal-Wallis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <HeatmapMatrizCard
                  titulo="Valoración global y concordancia con el mercado"
                  subtitulo={`ρ de Spearman = ${dataBrechas.tabSatisfaccionPertinencia.cruceGlobalConcordancia.prueba.rho} · p = ${dataBrechas.tabSatisfaccionPertinencia.cruceGlobalConcordancia.prueba.pValor}`}
                  columnas={dataBrechas.tabSatisfaccionPertinencia.cruceGlobalConcordancia.columnas}
                  filas={dataBrechas.tabSatisfaccionPertinencia.cruceGlobalConcordancia.filas}
                />
                <HeatmapMatrizCard
                  titulo="Valoración global según situación laboral"
                  subtitulo={`H de Kruskal-Wallis = ${dataBrechas.tabSatisfaccionPertinencia.cruceSituacionGlobal.prueba.h} · p = ${dataBrechas.tabSatisfaccionPertinencia.cruceSituacionGlobal.prueba.pValor} · ε² = ${dataBrechas.tabSatisfaccionPertinencia.cruceSituacionGlobal.prueba.epsilonCuadrado}`}
                  columnas={dataBrechas.tabSatisfaccionPertinencia.cruceSituacionGlobal.columnas}
                  filas={dataBrechas.tabSatisfaccionPertinencia.cruceSituacionGlobal.filas}
                />
              </div>

              <HeatmapMatrizCard
                titulo="Valoración global y pertinencia del trabajo"
                subtitulo={`ρ de Spearman = ${dataBrechas.tabSatisfaccionPertinencia.cruceGlobalPertinencia.prueba.rho} · p = ${dataBrechas.tabSatisfaccionPertinencia.cruceGlobalPertinencia.prueba.pValor}`}
                columnas={dataBrechas.tabSatisfaccionPertinencia.cruceGlobalPertinencia.columnas}
                filas={dataBrechas.tabSatisfaccionPertinencia.cruceGlobalPertinencia.filas}
              />
            </div>
          )}

          {subTabBrechas === 'malla' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ListaBarrasCard
                  titulo={`Señales de utilidad de la Carrera (n = ${dataBrechas.tabMallaAsignaturas.senalesUtilidad.n})`}
                  items={dataBrechas.tabMallaAsignaturas.senalesUtilidad.items}
                  numerado
                />
                <ListaBarrasCard
                  titulo={`Prioridades de mejora (n = ${dataBrechas.tabMallaAsignaturas.prioridadesMejora.n})`}
                  items={dataBrechas.tabMallaAsignaturas.prioridadesMejora.items}
                  numerado
                />
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 overflow-x-auto">
                <h3 className="text-sm font-bold text-slate-800 mb-3">
                  Asignaturas: ventaja competitiva y actualización
                </h3>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left p-2.5">Asignatura</th>
                      <th className="text-center p-2.5">Ventaja competitiva</th>
                      <th className="text-center p-2.5">Poco útil o desactualizada</th>
                      <th className="text-right p-2.5">n</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataBrechas.tabMallaAsignaturas.matrizAsignaturas.map((asig) => (
                      <tr key={asig.asignatura} className="border-b border-slate-100">
                        <td className="p-2.5 font-semibold text-slate-800">{asig.asignatura}</td>
                        <td className="p-2 text-center">
                          <div
                            className="rounded py-1.5 font-bold"
                            style={{
                              backgroundColor:
                                asig.ventajaCount > 0 ? `rgba(13, 148, 136, ${Math.min(0.85, asig.ventajaPct / 100 + 0.1)})` : '#f8fafc',
                              color: asig.ventajaPct > 45 ? '#fff' : '#0f172a',
                            }}
                          >
                            {asig.ventajaCount} ({asig.ventajaPct} %)
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          <div
                            className="rounded py-1.5 font-bold"
                            style={{
                              backgroundColor:
                                asig.pocoUtilCount > 0 ? `rgba(244, 63, 94, ${Math.min(0.85, asig.pocoUtilPct / 100 + 0.15)})` : '#f8fafc',
                              color: asig.pocoUtilPct > 35 ? '#fff' : '#0f172a',
                            }}
                          >
                            {asig.pocoUtilCount} ({asig.pocoUtilPct} %)
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-bold">{asig.totalMenciones}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MÓDULO 5: CRUCES Y EXPORTACIÓN (BARRAS APILADAS + TABLA + FISHER)     */}
      {/* ===================================================================== */}
      {!cargando && tabActiva === 'cruces' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold uppercase text-slate-500">Configurar cruce</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Filas</label>
              <select
                value={varFila}
                onChange={(e) => setVarFila(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2"
              >
                {preguntasCatalogo.map((p) => (
                  <option key={p.codigo} value={p.codigo}>{p.etiqueta_corta}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                const tmp = varFila;
                setVarFila(varCol);
                setVarCol(tmp);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" /> Invertir ejes
            </button>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Columnas</label>
              <select
                value={varCol}
                onChange={(e) => setVarCol(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2"
              >
                {preguntasCatalogo.map((p) => (
                  <option key={p.codigo} value={p.codigo}>{p.etiqueta_corta}</option>
                ))}
              </select>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Métrica de celda</p>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="radio"
                  checked={metricaCelda === 'cantidad'}
                  onChange={() => setMetricaCelda('cantidad')}
                />
                Cantidad absoluta
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="radio"
                  checked={metricaCelda === 'pctFila'}
                  onChange={() => setMetricaCelda('pctFila')}
                />
                % por fila
              </label>
            </div>

            <button
              onClick={() =>
                analisisService.descargarMatrizCruzadaCsv('titulados', varFila, varCol, filtros.importacionId || null)
              }
              className="w-full py-2 px-3 bg-teal-700 text-white rounded-lg text-xs font-semibold hover:bg-teal-800 cursor-pointer"
            >
              Exportar Matriz CSV
            </button>
          </div>

          <div className="lg:col-span-3 space-y-4">
            {dataCruce && (
              <>
                <div className="flex gap-4 border-b border-slate-200 text-xs font-semibold">
                  <button
                    onClick={() => setSubVistaCruce('barras')}
                    className={`pb-2 border-b-2 cursor-pointer ${
                      subVistaCruce === 'barras' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'
                    }`}
                  >
                    Barras comparativas
                  </button>
                  <button
                    onClick={() => setSubVistaCruce('tabla')}
                    className={`pb-2 border-b-2 cursor-pointer ${
                      subVistaCruce === 'tabla' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'
                    }`}
                  >
                    Tabla de contingencia
                  </button>
                </div>

                {subVistaCruce === 'barras' && (
                  <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-slate-800">Distribución agregada por categoría</h3>
                      <span className="text-xs text-slate-500">n = {dataCruce.totalN}</span>
                    </div>

                    <div className="space-y-4">
                      {dataCruce.filas.map((f) => (
                        <div key={f.etiqueta} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-slate-800">
                              {f.etiqueta} (n = {f.nFila})
                            </span>
                            <span className="text-slate-500">{f.porcentajeSobreTotal} % del total</span>
                          </div>
                          <div className="w-full h-6 rounded-lg overflow-hidden flex bg-slate-100">
                            {f.celdas.map((cel, cIdx) => {
                              if (cel.frecuencia <= 0) return null;
                              return (
                                <div
                                  key={cel.columna}
                                  style={{
                                    width: `${cel.porcentajeFila}%`,
                                    backgroundColor: PALETA_DONUT[cIdx % PALETA_DONUT.length],
                                  }}
                                  className="h-full flex items-center justify-center text-[11px] font-bold text-white"
                                  title={`${cel.columna}: ${cel.frecuencia} (${cel.porcentajeFila}%)`}
                                >
                                  {metricaCelda === 'cantidad' ? cel.frecuencia : `${cel.porcentajeFila}%`}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100 text-xs">
                      {dataCruce.categoriasColumna.map((col, idx) => (
                        <div key={col} className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: PALETA_DONUT[idx % PALETA_DONUT.length] }}
                          />
                          <span className="text-slate-600">{col}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {subVistaCruce === 'tabla' && (
                  <div className="bg-white p-5 rounded-xl border border-slate-200 overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left p-2.5">Categoría</th>
                          {dataCruce.categoriasColumna.map((col) => (
                            <th key={col} className="text-center p-2.5">{col}</th>
                          ))}
                          <th className="text-right p-2.5">Total fila</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataCruce.filas.map((f) => (
                          <tr key={f.etiqueta} className="border-b border-slate-100">
                            <td className="p-2.5 font-semibold">{f.etiqueta}</td>
                            {f.celdas.map((cel) => (
                              <td key={cel.columna} className="p-2.5 text-center">
                                {metricaCelda === 'cantidad' ? cel.frecuencia : `${cel.porcentajeFila} %`}
                              </td>
                            ))}
                            <td className="p-2.5 text-right font-bold">{f.nFila}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="bg-white p-5 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-slate-500">Prueba aplicada</p>
                    <p className="font-bold text-slate-900">{dataCruce.prueba.nombre}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">p-valor</p>
                    <p className="font-bold text-slate-900">{dataCruce.prueba.pValor}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">V de Cramér</p>
                    <p className="font-bold text-slate-900">
                      {dataCruce.prueba.vCramer} ({dataCruce.prueba.magnitudEfecto})
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Celdas esperada &lt; 5</p>
                    <p className="font-bold text-slate-900">
                      {dataCruce.prueba.celdasEsperadaMenor5} de {dataCruce.prueba.totalCeldas}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MÓDULO 6: SIMULACIÓN MONTE CARLO (TORTAS DUALES + HISTOGRAMA)         */}
      {/* ===================================================================== */}
      {!cargando && tabActiva === 'simulacion' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Parámetros de la simulación</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Variable a simular</label>
              <select
                value={varSimular}
                onChange={(e) => {
                  setVarSimular(e.target.value);
                  setProbsCustom({});
                }}
                className="w-full text-xs border border-slate-300 rounded-lg p-2"
              >
                {preguntasCatalogo.map((p) => (
                  <option key={p.codigo} value={p.codigo}>{p.etiqueta_corta}</option>
                ))}
              </select>
            </div>

            {dataSimulacion && dataSimulacion.categorias.length >= 2 && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <p className="text-[11px] font-bold text-slate-700">Mover puntos</p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={moverDe}
                    onChange={(e) => setMoverDe(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg p-1.5 bg-white"
                  >
                    {dataSimulacion.categorias.map((c) => (
                      <option key={c.categoria} value={c.categoria}>De: {c.categoria}</option>
                    ))}
                  </select>
                  <select
                    value={moverA}
                    onChange={(e) => setMoverA(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg p-1.5 bg-white"
                  >
                    {dataSimulacion.categorias.map((c) => (
                      <option key={c.categoria} value={c.categoria}>A: {c.categoria}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={100}
                    value={puntosMover}
                    onChange={(e) => setPuntosMover(Number(e.target.value))}
                    className="w-24 text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                  />
                  <button
                    onClick={aplicarMoverPuntos}
                    className="flex-1 bg-blue-600 text-white text-xs font-semibold rounded-lg py-1.5 hover:bg-blue-700 cursor-pointer"
                  >
                    Aplicar puntos
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Personas (N)</label>
                <input
                  type="number"
                  min={10}
                  max={50000}
                  value={personasN}
                  onChange={(e) => setPersonasN(Number(e.target.value))}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Réplicas (R)</label>
                <input
                  type="number"
                  min={10}
                  max={10000}
                  value={replicasR}
                  onChange={(e) => setReplicasR(Number(e.target.value))}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Semilla</label>
                <input
                  type="number"
                  value={semilla}
                  onChange={(e) => setSemilla(Number(e.target.value))}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>
            </div>

            {dataSimulacion && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">Ajustar probabilidades (%)</span>
                  <button
                    onClick={() => {
                      const k = dataSimulacion.categorias.length;
                      const eq = {};
                      dataSimulacion.categorias.forEach((c) => {
                        eq[c.categoria] = Number((100 / k).toFixed(2));
                      });
                      setProbsCustom(eq);
                    }}
                    className="text-[11px] text-blue-600 font-semibold hover:underline cursor-pointer"
                  >
                    Igualar categorías
                  </button>
                </div>

                {dataSimulacion.categorias.map((cat) => (
                  <div key={cat.categoria} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-slate-600">{cat.categoria}</span>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      max={100}
                      value={probsCustom[cat.categoria] ?? cat.observadoPct}
                      onChange={(e) =>
                        setProbsCustom((prev) => ({
                          ...prev,
                          [cat.categoria]: Number(e.target.value),
                        }))
                      }
                      className="w-20 text-right border border-slate-300 rounded px-2 py-1"
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={cargarDatosPestana}
              className="w-full flex items-center justify-center gap-2 py-2 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" /> Ejecutar simulación
            </button>
          </div>

          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 space-y-5">
            {dataSimulacion && (
              <>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Observado contra escenario</h3>
                  <p className="text-xs text-slate-500">
                    Base observada: {dataSimulacion.baseObservadaN} · Simulado: {dataSimulacion.personasSimularN}{' '}
                    personas × {dataSimulacion.replicasR} réplicas (semilla {dataSimulacion.semilla}). Haz clic en una
                    categoría para abrir el histograma de sus réplicas.
                  </p>
                </div>

                {/* Tortas duales SVG: Observado vs Simulado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-2">
                  <PieChartSVG
                    titulo="Observado (Encuesta real)"
                    datos={dataSimulacion.categorias.map((c) => ({
                      label: c.categoria,
                      pct: c.observadoPct,
                      raw: c,
                    }))}
                    onSelectCategoria={(item) => setCategoriaHistograma(item.raw)}
                  />
                  <PieChartSVG
                    titulo="Escenario simulado (Media réplicas)"
                    datos={dataSimulacion.categorias.map((c) => ({
                      label: c.categoria,
                      pct: c.simuladoMediaPct,
                      raw: c,
                    }))}
                    onSelectCategoria={(item) => setCategoriaHistograma(item.raw)}
                  />
                </div>

                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left p-2.5">Categoría</th>
                      <th className="text-right p-2.5">Observado (%)</th>
                      <th className="text-right p-2.5">Simulado media (%)</th>
                      <th className="text-right p-2.5">IC 95 % réplicas</th>
                      <th className="text-right p-2.5">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataSimulacion.categorias.map((c) => (
                      <tr
                        key={c.categoria}
                        onClick={() => setCategoriaHistograma(c)}
                        className="border-b border-slate-100 hover:bg-blue-50/50 cursor-pointer"
                      >
                        <td className="p-2.5 font-semibold text-blue-700 underline">{c.categoria}</td>
                        <td className="p-2.5 text-right">{c.observadoPct} %</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">{c.simuladoMediaPct} %</td>
                        <td className="p-2.5 text-right text-slate-500">
                          [{c.ic95InferiorPct} % – {c.ic95SuperiorPct} %]
                        </td>
                        <td className="p-2.5 text-right font-semibold">
                          {c.diferenciaVsObservadoPct > 0 ? `+${c.diferenciaVsObservadoPct}` : c.diferenciaVsObservadoPct} %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Histograma de Réplicas Monte Carlo */}
      {categoriaHistograma && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Distribución de réplicas: {categoriaHistograma.categoria}
                </h4>
                <p className="text-xs text-slate-500">
                  Media: {categoriaHistograma.simuladoMediaPct} % · IC 95 %: [{categoriaHistograma.ic95InferiorPct} % –{' '}
                  {categoriaHistograma.ic95SuperiorPct} %]
                </p>
              </div>
              <button
                onClick={() => setCategoriaHistograma(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ColumnBarChartCard
              titulo="Histograma de frecuencias en R réplicas"
              items={(categoriaHistograma.histogramaReplicas || []).map((b) => ({
                categoria: `${b.desdePct}%-${b.hastaPct}%`,
                frecuencia: b.replicas,
              }))}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPONENTES DE VISUALIZACIÓN (SVG + TAILWIND SIN DEPENDENCIAS EXTERNAS)
// ============================================================================

const ListaBarrasCard = ({ titulo, subtitulo, items = [], numerado = false }) => (
  <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
    <div>
      <h3 className="text-sm font-bold text-slate-800">{titulo}</h3>
      {subtitulo && <p className="text-xs text-slate-500">{subtitulo}</p>}
    </div>
    <div className="space-y-2.5">
      {items.map((it, idx) => (
        <div key={idx} className="space-y-1">
          <div className="flex justify-between text-xs gap-2">
            <span className="text-slate-700 font-medium">
              {numerado ? `${idx + 1}. ` : ''}
              {it.categoria}
            </span>
            <span className="font-bold text-slate-900 whitespace-nowrap">
              {it.frecuencia} ({it.porcentaje} %)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${Math.min(100, it.porcentaje || 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ColumnBarChartCard = ({ titulo, subtitulo, items = [] }) => {
  const maxVal = Math.max(1, ...items.map((i) => Number(i.frecuencia || 0)));
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-800">{titulo}</h3>
        {subtitulo && <p className="text-xs text-slate-500">{subtitulo}</p>}
      </div>
      <div className="flex items-end justify-around gap-2 h-44 pt-6 border-b border-slate-200">
        {items.map((it, idx) => {
          const val = Number(it.frecuencia || 0);
          const heightPct = Math.round((val / maxVal) * 100);
          return (
            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end">
              <span className="text-[11px] font-bold text-slate-800 mb-1">{val}</span>
              <div
                className="w-full max-w-[42px] bg-blue-600 rounded-t-md transition-all"
                style={{ height: `${Math.max(val > 0 ? 6 : 2, heightPct)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-around gap-1 text-[10px] text-slate-600 text-center">
        {items.map((it, idx) => (
          <span key={idx} className="flex-1 truncate" title={it.categoria}>
            {it.categoria}
          </span>
        ))}
      </div>
    </div>
  );
};

const DonutChartCard = ({ titulo, subtitulo, items = [], centroLabel, calcularCentroPct }) => {
  const total = items.reduce((acc, i) => acc + Number(i.frecuencia || 0), 0);
  const radio = 46;
  const circunferencia = 2 * Math.PI * radio;
  let acumulado = 0;

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-800">{titulo}</h3>
        {subtitulo && <p className="text-xs text-slate-500">{subtitulo}</p>}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-32 h-32 flex-shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r={radio} fill="none" stroke="#f1f5f9" strokeWidth="14" />
            {total > 0 &&
              items.map((it, idx) => {
                const frac = Number(it.frecuencia || 0) / total;
                const dash = frac * circunferencia;
                const offset = -acumulado * circunferencia;
                acumulado += frac;
                return (
                  <circle
                    key={idx}
                    cx="60"
                    cy="60"
                    r={radio}
                    fill="none"
                    stroke={PALETA_DONUT[idx % PALETA_DONUT.length]}
                    strokeWidth="14"
                    strokeDasharray={`${dash} ${circunferencia}`}
                    strokeDashoffset={offset}
                  />
                );
              })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-bold text-slate-900">
              {calcularCentroPct ? calcularCentroPct(items) : total}
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase">{centroLabel}</span>
          </div>
        </div>

        <div className="flex-1 w-full space-y-2">
          {items.map((it, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PALETA_DONUT[idx % PALETA_DONUT.length] }}
                />
                <span className="text-slate-700 font-medium">{it.categoria}</span>
              </div>
              <span className="font-bold text-slate-900">
                {it.frecuencia} ({it.porcentaje} %)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StackedLikertCard = ({ titulo, subtitulo, niveles = [], footer, colores = PALETA_LIKERT_4 }) => (
  <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
    <div>
      <h3 className="text-sm font-bold text-slate-800">{titulo}</h3>
      {subtitulo && <p className="text-xs text-slate-500">{subtitulo}</p>}
    </div>

    <div className="w-full h-7 rounded-lg overflow-hidden flex bg-slate-100">
      {niveles.map((niv, idx) => {
        const pct = Number(niv.porcentaje || 0);
        if (pct <= 0) return null;
        return (
          <div
            key={idx}
            style={{ width: `${pct}%`, backgroundColor: colores[idx % colores.length] }}
            className="h-full flex items-center justify-center text-[10px] font-bold text-white px-1"
            title={`${niv.categoria}: ${niv.frecuencia} (${pct}%)`}
          >
            {pct >= 12 ? `${pct}%` : ''}
          </div>
        );
      })}
    </div>

    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
      {niveles.map((niv, idx) => (
        <div key={idx} className="flex items-center justify-between text-slate-600">
          <div className="flex items-center gap-1.5 truncate">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: colores[idx % colores.length] }}
            />
            <span className="truncate">{niv.categoria}</span>
          </div>
          <span className="font-bold text-slate-800">{niv.frecuencia}</span>
        </div>
      ))}
    </div>

    {footer && <p className="text-xs text-slate-600 pt-2 border-t border-slate-100">{footer}</p>}
  </div>
);

const HeatmapMatrizCard = ({ titulo, subtitulo, columnas = [], filas = [] }) => (
  <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 overflow-x-auto">
    <div>
      <h3 className="text-sm font-bold text-slate-800">{titulo}</h3>
      {subtitulo && <p className="text-xs text-slate-500">{subtitulo}</p>}
    </div>
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          <th className="text-left p-2">Categoría</th>
          {columnas.map((col) => (
            <th key={col} className="p-2 text-center">{col}</th>
          ))}
          <th className="p-2 text-right">n</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f) => (
          <tr key={f.etiqueta} className="border-b border-slate-100">
            <td className="p-2 font-semibold text-slate-800">{f.etiqueta}</td>
            {f.celdas.map((cel) => (
              <td key={cel.columna} className="p-1.5 text-center">
                <div
                  className="rounded py-1.5 px-2 font-semibold"
                  style={{
                    backgroundColor:
                      cel.frecuencia > 0
                        ? `rgba(13, 148, 136, ${Math.min(0.85, cel.porcentajeFila / 100 + 0.12)})`
                        : '#f8fafc',
                    color: cel.porcentajeFila > 45 ? '#fff' : '#0f172a',
                  }}
                >
                  <div>{cel.frecuencia}</div>
                  <div className="text-[10px] opacity-80">{cel.porcentajeFila} %</div>
                </div>
              </td>
            ))}
            <td className="p-2 text-right font-bold">{f.nFila}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ScatterExperienciaChart = ({ serie = [] }) => {
  if (!serie.length) return null;
  const maxX = Math.max(1, ...serie.map((s) => Number(s.aniosExperiencia || 0)));
  const maxY = Math.max(1, ...serie.map((s) => Number(s.aniosActivos || 0)));

  return (
    <div className="pt-2">
      <svg viewBox="0 0 420 150" className="w-full h-36 bg-slate-50/70 rounded-lg border border-slate-100">
        <line x1="35" y1="125" x2="400" y2="125" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="35" y1="15" x2="35" y2="125" stroke="#cbd5e1" strokeWidth="1" />
        {serie.map((pt, idx) => {
          const cx = 35 + (Number(pt.aniosExperiencia || 0) / maxX) * 355;
          const cy = 125 - (Number(pt.aniosActivos || 0) / maxY) * 100;
          return (
            <circle key={idx} cx={cx} cy={cy} r="3.5" fill="#2563eb" fillOpacity="0.65">
              <title>{`Exp: ${pt.aniosExperiencia}a · Activo: ${pt.aniosActivos}a`}</title>
            </circle>
          );
        })}
        <text x="215" y="143" textAnchor="middle" fontSize="9" fill="#64748b">
          Años de vida profesional declarados (0 – {maxX} años)
        </text>
      </svg>
    </div>
  );
};

const PieChartSVG = ({ titulo, datos = [], onSelectCategoria }) => {
  const total = datos.reduce((acc, d) => acc + Number(d.pct || 0), 0);
  let anguloAcum = 0;

  const polarToCartesian = (cx, cy, r, angleDeg) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180.0;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <p className="text-xs font-bold text-slate-700">{titulo}</p>
      <svg viewBox="0 0 140 140" className="w-40 h-40">
        {total > 0 &&
          datos.map((d, idx) => {
            const val = Number(d.pct || 0);
            if (val <= 0) return null;
            const angulo = (val / total) * 360;
            const inicio = anguloAcum;
            const fin = anguloAcum + angulo;
            anguloAcum = fin;

            if (angulo >= 359.9) {
              return (
                <circle
                  key={idx}
                  cx="70"
                  cy="70"
                  r="58"
                  fill={PALETA_DONUT[idx % PALETA_DONUT.length]}
                  className="cursor-pointer"
                  onClick={() => onSelectCategoria && onSelectCategoria(d)}
                />
              );
            }

            const p1 = polarToCartesian(70, 70, 58, fin);
            const p2 = polarToCartesian(70, 70, 58, inicio);
            const largeArc = angulo > 180 ? 1 : 0;
            const pathData = `M 70 70 L ${p2.x} ${p2.y} A 58 58 0 ${largeArc} 1 ${p1.x} ${p1.y} Z`;

            return (
              <path
                key={idx}
                d={pathData}
                fill={PALETA_DONUT[idx % PALETA_DONUT.length]}
                stroke="#ffffff"
                strokeWidth="1.5"
                className="cursor-pointer hover:opacity-85 transition"
                onClick={() => onSelectCategoria && onSelectCategoria(d)}
              >
                <title>{`${d.label}: ${d.pct} %`}</title>
              </path>
            );
          })}
      </svg>
      <div className="flex flex-wrap justify-center gap-3 text-[11px]">
        {datos.map((d, idx) => (
          <button
            key={idx}
            onClick={() => onSelectCategoria && onSelectCategoria(d)}
            className="flex items-center gap-1 text-slate-700 hover:underline cursor-pointer"
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: PALETA_DONUT[idx % PALETA_DONUT.length] }}
            />
            <span>
              {d.label}: <strong>{d.pct}%</strong>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

const ordenarRangosEdad = (items = []) => {
  const orden = ['19 - 22 años', '23 - 26 años', '27 - 30 años', '31 - 34 años', '35 años o más'];
  return [...items].sort((a, b) => {
    const ia = orden.indexOf(a.categoria);
    const ib = orden.indexOf(b.categoria);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
};

export default Dashboard;