import { useState, useEffect } from 'react'
import { reporteService } from '../../data/services/reporteService'

const ReportesAcreditacion = () => {
  const [dataSet, setDataSet] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [contingencia, setContingencia] = useState({ filas: [], columnas: [], matriz: {}, totalGeneral: 0 })
  const [competenciasData, setCompetenciasData] = useState([])
  const [filtroCohorte, setFiltroCohorte] = useState('TODAS')

  useEffect(() => {
    const cargarReportes = async () => {
      try {
        const data = await reporteService.obtenerDataSetProcesado()
        setDataSet(data)
        setContingencia(reporteService.generarMatrizContingencia(data))
        setCompetenciasData(reporteService.calcularPromediosCompetencias(data))
      } catch (err) {
        setError(err.message)
      } finally {
        setCargando(false)
      }
    }
    cargarReportes()
  }, [])

  // Filtrado reactivo por cohorte
  const dataSetFiltrado = dataSet.filter((item) => {
    if (filtroCohorte === 'TODAS') return true
    if (filtroCohorte === 'JUNIOR') return item.antiguedad <= 3
    if (filtroCohorte === 'CONSOLIDADO') return item.antiguedad > 3
    return String(item.anioEgreso) === filtroCohorte
  })

  const contingenciaFiltrada = reporteService.generarMatrizContingencia(dataSetFiltrado)

  const handleDescargar = () => {
    try {
      reporteService.exportarACSV(dataSetFiltrado, `observatorio_umss_${filtroCohorte.toLowerCase()}.csv`)
    } catch (err) {
      alert(err.message)
    }
  }

  if (cargando) {
    return (
      <div className="flex justify-center items-center py-24 text-slate-500 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          Consolidando matrices y reportes analíticos...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 font-sans">
      {/* 1. Cabecera y Controles de Exportación */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold tracking-widest uppercase bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded">
              Historia de Usuario 5 • Acreditación
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#0F2942] tracking-tight">
            Matrices Cruzadas & Reportes Tabulares
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Sustento matemático para el Plan de Desarrollo Estratégico y autoevaluación CEUB / ARCU-SUR.
          </p>
        </div>

        {/* Acciones y Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filtroCohorte}
            onChange={(e) => setFiltroCohorte(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODAS">Todas las Cohortes ({dataSet.length})</option>
            <option value="JUNIOR">Cohortes Recientes (≤ 3 años)</option>
            <option value="CONSOLIDADO">Mandos Consolidados (&gt; 3 años)</option>
          </select>

          <button
            onClick={handleDescargar}
            className="flex items-center gap-2 px-4 py-2 bg-[#0F2942] hover:bg-[#1a3d5f] text-white text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar CSV Limpio
          </button>
        </div>
      </header>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          {error}
        </div>
      )}

      {/* 2. Matriz de Frecuencia Cruzada (Tabla de Contingencia: Posgrado vs Financiamiento) */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Matriz Bivariada: Demanda de Posgrado vs. Mecanismos de Financiamiento
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cruce de frecuencias absolutas y relativas para evaluar viabilidad económica (Base: {dataSetFiltrado.length} titulados).
            </p>
          </div>
          <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md self-start sm:self-auto">
            Chi-Cuadrada ($\chi^2$) en proceso
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse border border-slate-200 rounded-xl">
            <thead className="bg-[#0F2942] text-white uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3 border border-slate-700">Nivel de Posgrado \ Financiamiento</th>
                {contingenciaFiltrada.columnas.map((col) => (
                  <th key={col} className="p-3 border border-slate-700 text-center font-semibold">
                    {col}
                  </th>
                ))}
                <th className="p-3 border border-slate-700 text-center bg-blue-900">Total Fila</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {contingenciaFiltrada.filas.map((fila) => {
                let totalFila = 0
                return (
                  <tr key={fila} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-semibold text-slate-800 border border-slate-200 bg-slate-50/50">
                      {fila}
                    </td>
                    {contingenciaFiltrada.columnas.map((col) => {
                      const cantidad = contingenciaFiltrada.matriz[fila]?.[col] || 0
                      totalFila += cantidad
                      const porcentaje = dataSetFiltrado.length
                        ? ((cantidad / dataSetFiltrado.length) * 100).toFixed(1)
                        : 0

                      return (
                        <td key={col} className="p-3 text-center border border-slate-200 font-medium text-slate-700">
                          <span className="font-bold text-slate-900">{cantidad}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">({porcentaje}%)</span>
                        </td>
                      )
                    })}
                    <td className="p-3 text-center font-bold text-blue-900 bg-blue-50/40 border border-slate-200">
                      {totalFila}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Panel de Competencias y Diagnóstico para Acreditación */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumen de Brechas de Competencias (Likert HU 4) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Diagnóstico de Brechas en Competencias (Escala 1 al 5)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Puntajes medios asignados por egresados para justificar ajustes a la malla.
            </p>
          </div>

          <div className="space-y-3">
            {competenciasData.map((comp) => (
              <div key={comp.competencia} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700">{comp.competencia}</span>
                  <span className="font-bold text-blue-600">{comp.promedio} / 5.0</span>
                </div>
                {/* Barra de progreso visual */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      comp.promedio >= 4.0 ? 'bg-emerald-500' : comp.promedio >= 3.0 ? 'bg-blue-600' : 'bg-amber-500'
                    }`}
                    style={{ width: `${(comp.promedio / 5) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conclusiones Ejecutivas CEUB */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Evidencia Cuantitativa para Acreditación
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Criterios de calidad CEUB / ARCU-SUR basados en la muestra analizada.
              </p>
            </div>

            <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>
                  <strong>Data Wrangling Completo:</strong> Datos filtrados sin registros nulos, listos para cálculo de estadísticos descriptivos.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>
                  <strong>Trazabilidad y Transparencia:</strong> Respuestas mapeadas a IDs únicos de egresados garantizando reproducibilidad empírica.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>
                  <strong>Formato Estándar:</strong> Exportación con delimitador <code>;</code> y codificación UTF-8 compatible con software estadístico.
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Módulo de Decisión DSS</span>
            <span>UMSS • Fac. Cs. y Tecnología</span>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ReportesAcreditacion