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
  const [dataFinanciamiento, setDataFinanciamiento] = useState(null);
  const [dataBrechas, setDataBrechas] = useState(null);

  // Estados de Cruces y Chi-cuadrado / Fisher
  const [varFila, setVarFila] = useState('TIT_SITUACION_LABORAL');
  const [varCol, setVarCol] = useState('TIT_POSGRADO_INTERES');
  const [metricaCelda, setMetricaCelda] = useState('cantidad'); // 'cantidad' | 'pctFila'
  const [dataCruce, setDataCruce] = useState(null);

  // Estados de Simulación Monte Carlo
  const [varSimular, setVarSimular] = useState('TIT_GENERO');
  const [personasN, setPersonasN] = useState(100);
  const [replicasR, setReplicasR] = useState(1000);
  const [semilla, setSemilla] = useState(42);
  const [probsCustom, setProbsCustom] = useState({});
  const [dataSimulacion, setDataSimulacion] = useState(null);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Carga inicial de archivos y catálogo de preguntas
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

  // Recarga automática según la pestaña activa y los filtros
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
          <p className="text-xs text-slate-500">Cálculos estadísticos ejecutados en servidor (Spring Boot + PostgreSQL)</p>
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

      {/* Barra de Filtros Globales conectada al backend */}
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
      {/* MÓDULO 1: PERFIL DE EMPLEABILIDAD (5 SUBPESTAÑAS)                     */}
      {/* ===================================================================== */}
      {!cargando && tabActiva === 'perfil' && dataPerfil && (
        <div className="space-y-5">
          <div className="flex gap-4 border-b border-slate-200 text-xs font-semibold">
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Tarjeta Trayectoria */}
              <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Experiencia profesional declarada</h3>
                    <p className="text-xs text-slate-500">n = {dataPerfil.tabPerfil.trayectoria.n_exp} titulados con dato válido</p>
                  </div>
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
                    <p className="text-[11px] text-slate-500">Dispersión (DE)</p>
                    <p className="text-xl font-bold text-slate-900">{dataPerfil.tabPerfil.trayectoria.de_exp ?? 0} años</p>
                  </div>
                </div>
              </div>

              {/* Segmentación Junior / Consolidado paramétrica */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-800">Segmentación por umbral</h3>
                  <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded">
                    {filtros.umbralAnios} años
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={15}
                  value={filtros.umbralAnios}
                  onChange={(e) => actualizarFiltro('umbralAnios', Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-[10px] font-bold text-blue-700 uppercase">Junior / Reciente</p>
                    <p className="text-lg font-bold text-slate-900">{dataPerfil.tabPerfil.trayectoria.juniorPct} %</p>
                    <p className="text-[11px] text-slate-500">
                      {dataPerfil.tabPerfil.trayectoria.junior_count} de {dataPerfil.tabPerfil.trayectoria.n_exp} (≤ {filtros.umbralAnios}a)
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-[10px] font-bold text-slate-600 uppercase">Consolidado</p>
                    <p className="text-lg font-bold text-slate-900">{dataPerfil.tabPerfil.trayectoria.consolidadoPct} %</p>
                    <p className="text-[11px] text-slate-500">
                      {dataPerfil.tabPerfil.trayectoria.consolidado_count} de {dataPerfil.tabPerfil.trayectoria.n_exp} (&gt; {filtros.umbralAnios}a)
                    </p>
                  </div>
                </div>
              </div>

              {/* Estado Laboral y Sector */}
              <ListaBarrasCard
                titulo={`Estado laboral (n = ${dataPerfil.tabPerfil.estadoLaboral.n})`}
                items={dataPerfil.tabPerfil.estadoLaboral.items}
              />
              <ListaBarrasCard
                titulo={`Sector de inserción (n = ${dataPerfil.tabPerfil.sectorInsercion.n})`}
                items={dataPerfil.tabPerfil.sectorInsercion.items}
              />
              <ListaBarrasCard
                titulo={`Distribución por género (n = ${dataPerfil.tabPerfil.distribucionGenero.n})`}
                items={dataPerfil.tabPerfil.distribucionGenero.items}
              />
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
                                backgroundColor: cel.frecuencia > 0 ? `rgba(13, 148, 136, ${Math.min(0.85, cel.porcentajeFila / 100 + 0.1)})` : '#f8fafc',
                                color: cel.porcentajeFila > 45 ? '#fff' : '#0f172a',
                              }}
                            >
                              {cel.frecuencia} ({cel.porcentajeFila}%)
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
                  titulo="Áreas dentro de la organización (Selección múltiple)"
                  items={dataPerfil.tabTrabajoActual.areasOrganizacion.map((a) => ({
                    categoria: a.area,
                    frecuencia: a.frecuencia,
                    porcentaje: a.porcentaje,
                  }))}
                />
                <ListaBarrasCard
                  titulo="Pertinencia de la formación para el cargo"
                  items={dataPerfil.tabTrabajoActual.pertinenciaCargo}
                />
              </div>
            </div>
          )}

          {subTabPerfil === 'sinEmpleo' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
                <p className="text-xs font-bold text-blue-700 uppercase">Experiencia laboral previa</p>
                <p className="text-3xl font-bold text-slate-900">
                  {dataPerfil.tabSinEmpleo.resumen.con_exp_previa} de {dataPerfil.tabSinEmpleo.resumen.n}
                </p>
                <p className="text-xs text-slate-500">
                  ({dataPerfil.tabSinEmpleo.resumen.conExpPreviaPct} %) tuvieron trabajo antes
                </p>
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
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
                <p className="text-xs font-bold text-blue-700 uppercase">Continuidad primer empleo</p>
                <p className="text-3xl font-bold text-slate-900">
                  {dataPerfil.tabPrimerEmpleo.continuidadPrimerEmpleo.sigue_primer_empleo} de{' '}
                  {dataPerfil.tabPrimerEmpleo.continuidadPrimerEmpleo.n_respondieron}
                </p>
                <p className="text-xs text-slate-500">
                  ({dataPerfil.tabPrimerEmpleo.continuidadPrimerEmpleo.porcentaje} %) continúan en su primer empleo
                </p>
              </div>
              <div className="md:col-span-2">
                <ListaBarrasCard
                  titulo={`Tiempo hasta conseguir el primer empleo (n = ${dataPerfil.tabPrimerEmpleo.n})`}
                  items={dataPerfil.tabPrimerEmpleo.tiempoHastaPrimerEmpleo}
                />
              </div>
            </div>
          )}

          {subTabPerfil === 'emprendimiento' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ListaBarrasCard titulo="Origen del emprendimiento" items={dataPerfil.tabEmprendimiento.origen.items} />
              <ListaBarrasCard titulo="Tipo de entregable" items={dataPerfil.tabEmprendimiento.entregable.items} />
              <ListaBarrasCard titulo="Financiamiento inicial" items={dataPerfil.tabEmprendimiento.financiamiento.items} />
              <ListaBarrasCard titulo="Satisfacción con rendimiento" items={dataPerfil.tabEmprendimiento.satisfaccionNegocio} />
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MÓDULO 2: FORMACIÓN CONTINUA                                          */}
      {/* ===================================================================== */}
      {!cargando && tabActiva === 'formacion' && dataFormacion && (
        <div className="space-y-4">
          <div className="flex gap-4 border-b border-slate-200 text-xs font-semibold">
            {[
              { id: 'cursado', label: 'Posgrado cursado' },
              { id: 'interes', label: 'Interés en posgrado' },
              { id: 'opinion', label: 'Opinión sobre el posgrado FCyT' },
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
              <ListaBarrasCard
                titulo={`Nivel más alto cursado (n = ${dataFormacion.tabPosgradoCursado.nivelMasAlto.n})`}
                items={dataFormacion.tabPosgradoCursado.nivelMasAlto.items}
              />
              <ListaBarrasCard
                titulo={`Institución donde lo cursó (n = ${dataFormacion.tabPosgradoCursado.institucion.n})`}
                items={dataFormacion.tabPosgradoCursado.institucion.items}
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
            <ListaBarrasCard
              titulo={`Afinidad oferta de Posgrado FCyT (n = ${dataFormacion.tabOpinionPosgrado.n} · Acuerdo: ${dataFormacion.tabOpinionPosgrado.acuerdoPct} %)`}
              items={dataFormacion.tabOpinionPosgrado.items}
            />
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MÓDULO 3: FINANCIAMIENTO + KRUSKAL-WALLIS MONTE CARLO                 */}
      {/* ===================================================================== */}
      {!cargando && tabActiva === 'financiamiento' && dataFinanciamiento && (
        <div className="space-y-4">
          <ListaBarrasCard
            titulo={`Fuente de financiamiento (n = ${dataFinanciamiento.distribucionFinanciamiento.n})`}
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
                  ε² = {dataFinanciamiento.cruce.pruebaEstadistica.epsilonCuadrado}
                </p>
              </div>
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
                  {dataFinanciamiento.cruce.filas.map((f, idx) => (
                    <tr key={f} className="border-b border-slate-100">
                      <td className="p-2.5 font-semibold">{f}</td>
                      {dataFinanciamiento.cruce.observados[idx].map((val, j) => (
                        <td key={j} className="p-2.5 text-center">{val}</td>
                      ))}
                      <td className="p-2.5 text-right font-bold">{dataFinanciamiento.cruce.totalesFila[idx]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MÓDULO 4: BRECHAS DE COMPETENCIAS (LIKERT + SPEARMAN + ASIGNATURAS)   */}
      {/* ===================================================================== */}
      {!cargando && tabActiva === 'brechas' && dataBrechas && (
        <div className="space-y-4">
          <div className="flex gap-4 border-b border-slate-200 text-xs font-semibold">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                dataBrechas.tabSatisfaccionPertinencia.valoracionGlobal,
                dataBrechas.tabSatisfaccionPertinencia.concordanciaMercado,
                dataBrechas.tabSatisfaccionPertinencia.pertinenciaTrabajo,
              ].map((ind) => (
                <div key={ind.preguntaCodigo} className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
                  <p className="text-xs font-semibold text-slate-600">{ind.titulo}</p>
                  <p className="text-3xl font-bold text-slate-900">{ind.favorablePct} %</p>
                  <p className="text-[11px] text-slate-500">
                    Favorable: {ind.favorableCount} · Desfavorable: {ind.desfavorableCount} (n = {ind.n})
                  </p>
                  <p className="text-xs text-slate-700 pt-1 border-t border-slate-100">{ind.diagnostico}</p>
                </div>
              ))}
            </div>
          )}

          {subTabBrechas === 'malla' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ListaBarrasCard
                  titulo={`Señales de utilidad de la Carrera (n = ${dataBrechas.tabMallaAsignaturas.senalesUtilidad.n})`}
                  items={dataBrechas.tabMallaAsignaturas.senalesUtilidad.items}
                />
                <ListaBarrasCard
                  titulo={`Prioridades de mejora (n = ${dataBrechas.tabMallaAsignaturas.prioridadesMejora.n})`}
                  items={dataBrechas.tabMallaAsignaturas.prioridadesMejora.items}
                />
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 overflow-x-auto">
                <h3 className="text-sm font-bold text-slate-800 mb-3">
                  Asignaturas: ventaja competitiva vs poco útil o desactualizada
                </h3>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left p-2.5">Asignatura</th>
                      <th className="text-center p-2.5">Ventaja competitiva</th>
                      <th className="text-center p-2.5">Poco útil o desactualizada</th>
                      <th className="text-right p-2.5">Total menciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataBrechas.tabMallaAsignaturas.matrizAsignaturas.map((asig) => (
                      <tr key={asig.asignatura} className="border-b border-slate-100">
                        <td className="p-2.5 font-semibold text-slate-800">{asig.asignatura}</td>
                        <td className="p-2 text-center">
                          <span className="inline-block px-3 py-1 rounded bg-teal-600/15 text-teal-900 font-bold">
                            {asig.ventajaCount} ({asig.ventajaPct} %)
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="inline-block px-3 py-1 rounded bg-rose-600/15 text-rose-900 font-bold">
                            {asig.pocoUtilCount} ({asig.pocoUtilPct} %)
                          </span>
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
      {/* MÓDULO 5: CRUCES Y EXPORTACIÓN (FISHER-FREEMAN-HALTON / CHI-CUADRADO) */}
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

                {/* Tarjeta resultado prueba estadística */}
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
      {/* MÓDULO 6: SIMULACIÓN DE ESCENARIOS MONTE CARLO                        */}
      {/* ===================================================================== */}
      {!cargando && tabActiva === 'simulacion' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Parámetros de simulación</h3>

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

          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            {dataSimulacion && (
              <>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Observado contra escenario simulado</h3>
                    <p className="text-xs text-slate-500">
                      Base observada: {dataSimulacion.baseObservadaN} · Simulado: {dataSimulacion.personasSimularN}{' '}
                      personas × {dataSimulacion.replicasR} réplicas (semilla {dataSimulacion.semilla})
                    </p>
                  </div>
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
                      <tr key={c.categoria} className="border-b border-slate-100">
                        <td className="p-2.5 font-semibold">{c.categoria}</td>
                        <td className="p-2.5 text-right">{c.observadoPct} %</td>
                        <td className="p-2.5 text-right font-bold text-blue-700">{c.simuladoMediaPct} %</td>
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
    </div>
  );
};

// Componente auxiliar reutilizable para barras horizontales de frecuencia
const ListaBarrasCard = ({ titulo, items = [] }) => (
  <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
    <h3 className="text-sm font-bold text-slate-800">{titulo}</h3>
    <div className="space-y-2.5">
      {items.map((it, idx) => (
        <div key={idx} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-700 font-medium">{it.categoria}</span>
            <span className="font-bold text-slate-900">
              {it.frecuencia} ({it.porcentaje} %)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full"
              style={{ width: `${Math.min(100, it.porcentaje || 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Dashboard;