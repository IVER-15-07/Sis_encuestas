import { useState, useEffect, useMemo } from 'react'
import { reporteService } from '../../data/services/reporteService'

const ReportesAcreditacion = () => {
    const [dataSet, setDataSet] = useState([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState('')
    const [filtroCohorte, setFiltroCohorte] = useState('TODAS')
    const [hoverCell, setHoverCell] = useState(null)

    useEffect(() => {
        const cargarReportes = async () => {
            try {
                const data = await reporteService.obtenerDataSetProcesado()
                setDataSet(data)
            } catch (err) {
                setError(err.message)
            } finally {
                setCargando(false)
            }
        }
        cargarReportes()
    }, [])

    // Años únicos presentes en la muestra
    const aniosDisponibles = useMemo(() => {
        const setAnios = new Set(dataSet.map((d) => d.anioEgreso).filter(Boolean))
        return Array.from(setAnios).sort((a, b) => b - a)
    }, [dataSet])

    // Filtrado reactivo
    const dataSetFiltrado = useMemo(() => {
        return dataSet.filter((item) => {
            if (filtroCohorte === 'TODAS') return true
            if (filtroCohorte === 'JUNIOR') return item.antiguedad <= 3
            if (filtroCohorte === 'CONSOLIDADO') return item.antiguedad > 3
            return String(item.anioEgreso) === filtroCohorte
        })
    }, [dataSet, filtroCohorte])

    const contingencia = useMemo(
        () => reporteService.generarMatrizContingencia(dataSetFiltrado),
        [dataSetFiltrado]
    )

    const heatmap = useMemo(
        () => reporteService.generarMatrizHeatmap(dataSetFiltrado),
        [dataSetFiltrado]
    )

    const competencias = useMemo(
        () => reporteService.calcularPromediosCompetencias(dataSetFiltrado),
        [dataSetFiltrado]
    )

    // Metadatos de trazabilidad
    const armarMeta = () => ({
        filtro_cohorte: filtroCohorte,
        n_muestral: dataSetFiltrado.length,
        fecha_generacion_iso: new Date().toISOString(),
        unidad_academica: 'Ingenieria de Sistemas - UMSS',
    })

    const ejecutarDescarga = (fn) => () => {
        try {
            fn()
        } catch (err) {
            alert(err.message)
        }
    }

    // Geometría del Radar SVG
    const radarDimensions = { size: 300, center: 150, radius: 100 }
    const totalComp = competencias.length || 1

    const getCoordinates = (index, value, maxVal = 5) => {
        const angle = (Math.PI * 2 / totalComp) * index - Math.PI / 2
        const r = (value / maxVal) * radarDimensions.radius
        const x = radarDimensions.center + r * Math.cos(angle)
        const y = radarDimensions.center + r * Math.sin(angle)
        return { x, y }
    }

    const radarPoints = competencias
        .map((c, i) => {
            const { x, y } = getCoordinates(i, c.promedio)
            return `${x},${y}`
        })
        .join(' ')

    // Síntesis Dinámica para Acreditación
    const sintesis = useMemo(() => {
        const total = dataSetFiltrado.length
        if (total === 0) return null

        // Top 2 áreas de interés
        const conteoAreas = {}
        dataSetFiltrado.forEach((d) => {
            const a = d.areasPriorizadas.find((x) => x.prioridad === 1)?.nombre || 'Sin definir'
            conteoAreas[a] = (conteoAreas[a] || 0) + 1
        })
        const ordenAreas = Object.entries(conteoAreas).sort((a, b) => b[1] - a[1])
        const top2Count = (ordenAreas[0]?.[1] || 0) + (ordenAreas[1]?.[1] || 0)
        const top2Pct = ((top2Count / total) * 100).toFixed(1)
        const top2Nombres = [ordenAreas[0]?.[0], ordenAreas[1]?.[0]].filter(Boolean).join(' y ')

        // Brecha crítica de competencias
        const menorComp = [...competencias].sort((a, b) => a.promedio - b.promedio)[0]

        // Inserción laboral
        const ocupados = dataSetFiltrado.filter((d) => d.esOcupado).length
        const tasaOcupacion = ((ocupados / total) * 100).toFixed(1)

        return {
            top2Nombres,
            top2Pct,
            menorComp,
            tasaOcupacion,
        }
    }, [dataSetFiltrado, competencias])

    if (cargando) {
        return (
            <div className="flex justify-center items-center py-24 text-slate-500 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Procesando datos y matrices analíticas...
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 font-sans">
            {/* 1. Cabecera y Exportadores Trazables */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between pb-6 border-b border-slate-200 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold tracking-widest uppercase bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded">
                            Historia de Usuario 5 • Acreditación CEUB / ARCU-SUR
                        </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-[#0F2942] tracking-tight">
                        Matrices Cruzadas & Reportes Tabulares
                    </h1>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">
                        Sustento matemático y trazabilidad metodológica para el Plan de Desarrollo Estratégico.
                    </p>
                </div>

                {/* Selector de Cohortes Dinámico */}
                <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-600">Cohorte:</label>
                    <select
                        value={filtroCohorte}
                        onChange={(e) => setFiltroCohorte(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                        <option value="TODAS">Todas las Cohortes (N = {dataSet.length})</option>
                        <option value="JUNIOR">Recientes: Junior (≤ 3 años)</option>
                        <option value="CONSOLIDADO">Mandos Consolidados (&gt; 3 años)</option>
                        <optgroup label="Año de Egreso Individual">
                            {aniosDisponibles.map((a) => (
                                <option key={a} value={String(a)}>
                                    Promoción {a}
                                </option>
                            ))}
                        </optgroup>
                    </select>
                </div>
            </header>

            {/* Botones de Descarga Tabular */}
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase text-slate-400 mr-2 tracking-wider">
                    Exportar Tabular:
                </span>
                <button
                    onClick={ejecutarDescarga(() =>
                        reporteService.exportarACSV(dataSetFiltrado, `observatorio_umss_${filtroCohorte.toLowerCase()}.csv`)
                    )}
                    className="px-3 py-2 bg-[#0F2942] hover:bg-[#1a3d5f] text-white text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer"
                >
                    Dataset Completo
                </button>
                <button
                    onClick={ejecutarDescarga(() =>
                        reporteService.exportarContingenciaCSV(contingencia, armarMeta())
                    )}
                    className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer"
                >
                    Matriz Posgrado × Financiamiento
                </button>
                <button
                    onClick={ejecutarDescarga(() =>
                        reporteService.exportarHeatmapCSV(heatmap, armarMeta())
                    )}
                    className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer"
                >
                    Matriz Área × Sector
                </button>
                <button
                    onClick={ejecutarDescarga(() =>
                        reporteService.exportarCompetenciasCSV(competencias, armarMeta())
                    )}
                    className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer"
                >
                    Competencias (Media y Desviación)
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                    {error}
                </div>
            )}

            {/* 2. Matriz Bivariada con Margen Completo e Inferencia Chi-Cuadrada */}
            <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">
                            Matriz Bivariada: Demanda de Posgrado vs. Mecanismos de Financiamiento
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Cruce de frecuencias absolutas y porcentajes fila sobre N = {dataSetFiltrado.length} egresados.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                        <span className="font-mono font-bold text-[#0F2942]">χ² = {contingencia.chiCuadrada}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-slate-600">gl = {contingencia.gradosLibertad}</span>
                        <span className="text-slate-300">|</span>
                        <span className="font-mono text-slate-700">
                            p = {contingencia.pValor === null ? 'n/a' : contingencia.pValor < 0.001 ? '< 0.001' : contingencia.pValor.toFixed(3)}
                        </span>
                        {contingencia.cramerV !== null && (
                            <>
                                <span className="text-slate-300">|</span>
                                <span className="text-slate-600">V = {contingencia.cramerV}</span>
                            </>
                        )}
                        <span
                            className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${contingencia.pValor === null
                                ? 'bg-slate-200 text-slate-700'
                                : contingencia.esSignificativo
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                        >
                            {contingencia.pValor === null
                                ? 'Tabla insuficiente'
                                : contingencia.esSignificativo
                                    ? 'Dependencia significativa (p < 0.05)'
                                    : 'No se rechaza independencia'}
                        </span>
                    </div>
                </div>

                {contingencia.advertenciaMuestra && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <strong>Advertencia metodológica (Regla de Cochran):</strong> Más del 20% de las celdas presentan una frecuencia esperada menor a 5. Se sugiere ampliar el tamaño muestral o colapsar categorías antes de emitir dictamen definitivo.
                    </p>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse border border-slate-200 rounded-xl">
                        <thead className="bg-[#0F2942] text-white uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="p-3 border border-slate-700">Nivel de Posgrado \ Financiamiento</th>
                                {contingencia.columnas.map((col) => (
                                    <th key={col} className="p-3 border border-slate-700 text-center font-semibold">
                                        {col}
                                    </th>
                                ))}
                                <th className="p-3 border border-slate-700 text-center bg-blue-900 font-bold">Total Fila</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {contingencia.filas.map((fila) => {
                                const totalFila = contingencia.totalesFilas[fila] || 0
                                return (
                                    <tr key={fila} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="p-3 font-semibold text-slate-800 border border-slate-200 bg-slate-50/50">
                                            {fila}
                                        </td>
                                        {contingencia.columnas.map((col) => {
                                            const cantidad = contingencia.matriz[fila]?.[col] || 0
                                            const pctFila = totalFila > 0 ? ((cantidad / totalFila) * 100).toFixed(1) : 0
                                            return (
                                                <td key={col} className="p-3 text-center border border-slate-200 text-slate-700">
                                                    <span className="font-bold text-slate-900">{cantidad}</span>
                                                    <span className="text-[10px] text-slate-400 block mt-0.5">({pctFila}% fila)</span>
                                                </td>
                                            )
                                        })}
                                        <td className="p-3 text-center font-bold text-blue-900 bg-blue-50/40 border border-slate-200">
                                            {totalFila}
                                            <span className="text-[10px] text-slate-400 block font-normal">
                                                ({contingencia.totalGeneral ? ((totalFila / contingencia.totalGeneral) * 100).toFixed(1) : 0}%)
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}

                            {/* Fila Marginal de Totales por Columna */}
                            <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                                <td className="p-3 border border-slate-200">Total Columna</td>
                                {contingencia.columnas.map((col) => {
                                    const totalCol = contingencia.totalesColumnas[col] || 0
                                    const pctTotal = contingencia.totalGeneral
                                        ? ((totalCol / contingencia.totalGeneral) * 100).toFixed(1)
                                        : 0
                                    return (
                                        <td key={col} className="p-3 text-center border border-slate-200">
                                            <span>{totalCol}</span>
                                            <span className="text-[10px] text-slate-500 block font-normal">({pctTotal}%)</span>
                                        </td>
                                    )
                                })}
                                <td className="p-3 text-center text-blue-900 bg-blue-100/60 border border-slate-200 text-sm">
                                    N = {contingencia.totalGeneral}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* 3. Visualizaciones: Heatmap y Diagrama de Radar con Tabla de Dispersión */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Mapa de Calor */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4 flex flex-col justify-between">
                    <div>
                        <div className="border-b border-slate-100 pb-3 mb-4">
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">
                                Gráfico 1 • Mapa de Calor
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 mt-1">
                                Demanda Tecnológica por Sector Productivo
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Cruce de Áreas Prioritarias (1ª opción) frente a los sectores laborales declarados.
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-[11px] border-collapse">
                                <thead>
                                    <tr>
                                        <th className="p-1.5 text-left text-slate-400 font-medium">Área Temática</th>
                                        {heatmap.sectores.map((sec) => (
                                            <th key={sec} className="p-1.5 text-center text-slate-600 font-semibold truncate max-w-[85px]" title={sec}>
                                                {sec}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {heatmap.areas.map((area) => (
                                        <tr key={area}>
                                            <td className="p-1.5 font-semibold text-slate-700 truncate max-w-[130px]" title={area}>
                                                {area}
                                            </td>
                                            {heatmap.sectores.map((sec) => {
                                                const valor = heatmap.mapa[area]?.[sec] || 0
                                                const ratio = valor / heatmap.maximo
                                                const bgStyle =
                                                    valor === 0
                                                        ? 'bg-slate-50 text-slate-300'
                                                        : ratio > 0.6
                                                            ? 'bg-blue-700 text-white font-bold'
                                                            : ratio > 0.3
                                                                ? 'bg-blue-400 text-white font-semibold'
                                                                : 'bg-blue-100 text-blue-900'

                                                return (
                                                    <td
                                                        key={sec}
                                                        onMouseEnter={() => setHoverCell({ area, sector: sec, valor })}
                                                        onMouseLeave={() => setHoverCell(null)}
                                                        className={`p-2 text-center rounded-lg m-0.5 transition-all cursor-pointer ${bgStyle}`}
                                                    >
                                                        {valor}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="min-h-[28px] mt-3">
                            {hoverCell ? (
                                <div className="text-[11px] bg-slate-800 text-white px-3 py-1.5 rounded-lg flex items-center justify-between shadow">
                                    <span><strong>{hoverCell.area}</strong> en <em>{hoverCell.sector}</em>:</span>
                                    <span className="font-bold text-blue-300">{hoverCell.valor} titulados</span>
                                </div>
                            ) : (
                                <span className="text-[11px] text-slate-400 italic">Pasa el cursor sobre una celda para ver el detalle.</span>
                            )}
                        </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Escala de concentración (0 a {heatmap.maximo})</span>
                        <div className="flex items-center gap-1">
                            <span className="w-3 h-3 bg-blue-100 rounded"></span>
                            <span className="w-3 h-3 bg-blue-400 rounded"></span>
                            <span className="w-3 h-3 bg-blue-700 rounded"></span>
                        </div>
                    </div>
                </div>

                {/* Diagrama de Radar y Tabla de Estadísticos */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4 flex flex-col justify-between">
                    <div>
                        <div className="border-b border-slate-100 pb-3 mb-2">
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">
                                Gráfico 2 • Diagrama de Radar
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 mt-1">
                                Evaluación de Competencias de Grado (HU 4)
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Estimación de Media (x̄) y Desviación Estándar (s) sobre escala Likert (1-5).
                            </p>
                        </div>

                        {/* Gráfico SVG */}
                        <div className="flex justify-center items-center py-2">
                            <svg width={radarDimensions.size} height={radarDimensions.size} className="overflow-visible">
                                {[1, 2, 3, 4, 5].map((lvl) => (
                                    <circle
                                        key={lvl}
                                        cx={radarDimensions.center}
                                        cy={radarDimensions.center}
                                        r={(lvl / 5) * radarDimensions.radius}
                                        fill="none"
                                        stroke="#e2e8f0"
                                        strokeWidth="1"
                                        strokeDasharray={lvl === 5 ? 'none' : '3 3'}
                                    />
                                ))}

                                {competencias.map((comp, i) => {
                                    const edge = getCoordinates(i, 5)
                                    return (
                                        <line
                                            key={comp.competencia}
                                            x1={radarDimensions.center}
                                            y1={radarDimensions.center}
                                            x2={edge.x}
                                            y2={edge.y}
                                            stroke="#cbd5e1"
                                            strokeWidth="1"
                                        />
                                    )
                                })}

                                {radarPoints && (
                                    <>
                                        <polygon
                                            points={radarPoints}
                                            fill="rgba(37, 99, 235, 0.25)"
                                            stroke="#2563eb"
                                            strokeWidth="2"
                                        />
                                        {competencias.map((comp, i) => {
                                            const pt = getCoordinates(i, comp.promedio)
                                            return (
                                                <circle
                                                    key={comp.competencia}
                                                    cx={pt.x}
                                                    cy={pt.y}
                                                    r="4"
                                                    className="fill-blue-600 stroke-white stroke-2"
                                                >
                                                    <title>{`${comp.competencia}: x̄=${comp.promedio}, s=${comp.desviacion}`}</title>
                                                </circle>
                                            )
                                        })}
                                    </>
                                )}
                            </svg>
                        </div>

                        {/* Tabla Detallada con x̄ y s para resolver la confusión de nombres truncados */}
                        <div className="mt-3 overflow-x-auto">
                            <table className="w-full text-[11px] text-left border-collapse border border-slate-200">
                                <thead className="bg-slate-50 text-slate-600 font-semibold">
                                    <tr>
                                        <th className="p-1.5 border border-slate-200">Competencia Evaluada</th>
                                        <th className="p-1.5 border border-slate-200 text-center">Tipo</th>
                                        <th className="p-1.5 border border-slate-200 text-center">Media (x̄)</th>
                                        <th className="p-1.5 border border-slate-200 text-center">Desv. (s)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {competencias.map((c) => (
                                        <tr key={c.competencia} className="hover:bg-slate-50">
                                            <td className="p-1.5 font-medium text-slate-800 border border-slate-200">
                                                {c.competencia}
                                            </td>
                                            <td className="p-1.5 text-center text-slate-500 border border-slate-200 uppercase text-[9px]">
                                                {c.tipo}
                                            </td>
                                            <td className="p-1.5 text-center font-bold text-blue-900 border border-slate-200">
                                                {c.promedio.toFixed(2)}
                                            </td>
                                            <td className="p-1.5 text-center font-mono text-slate-600 border border-slate-200">
                                                ±{c.desviacion.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Escala: 1.0 (Muy Deficiente) a 5.0 (Óptimo)</span>
                        <span>Varianza Muestral ($n-1$)</span>
                    </div>
                </div>
            </section>

            {/* 4. Diagnóstico Ejecutivo Basado Estrictamente en los Datos Calculados */}
            <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7">
                <div className="border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-sm font-bold text-slate-900">
                        Diagnóstico Cuantitativo para el Plan de Desarrollo Estratégico (UMSS)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Hallazgos empíricos deducidos del análisis actual (Muestra N = {dataSetFiltrado.length}).
                    </p>
                </div>

                {sintesis ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-slate-600">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                            <p className="font-bold text-[#0F2942] mb-1">Concentración Tecnológica</p>
                            <p className="leading-relaxed">
                                El <strong>{sintesis.top2Pct}%</strong> de las solicitudes de formación continua se concentra en <strong>{sintesis.top2Nombres}</strong>, justificando la priorización curricular de estas áreas ante comités evaluadores.
                            </p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                            <p className="font-bold text-[#0F2942] mb-1">Brecha Formativa Prioritaria</p>
                            <p className="leading-relaxed">
                                La competencia con menor puntuación media es <strong>{sintesis.menorComp?.competencia || 'N/A'}</strong> con media x̄ = <strong>{sintesis.menorComp?.promedio || 0}</strong> (desviación s = ±{sintesis.menorComp?.desviacion || 0}), señalando la principal oportunidad de mejora curricular.
                            </p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                            <p className="font-bold text-[#0F2942] mb-1">Inserción al Mercado</p>
                            <p className="leading-relaxed">
                                Se registra una tasa de ocupación activa del <strong>{sintesis.tasaOcupacion}%</strong> dentro de la cohorte analizada, respaldando la pertinencia laboral del perfil de egreso actual.
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-slate-400 italic">No hay suficientes registros para formular el diagnóstico.</p>
                )}
            </section>
        </div>
    )
}

export default ReportesAcreditacion