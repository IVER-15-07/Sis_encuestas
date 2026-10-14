import { reporteRepository } from '../repositories/reporteRepository'
import { ReporteModel } from '../models/reporteModel'

// Función auxiliar: Logaritmo de la función Gamma (Aproximación de Lanczos g=7)
function lnGamma(z) {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z)
  z -= 1
  let x = c[0]
  for (let i = 1; i < 9; i++) x += c[i] / (z + i)
  const t = z + 7.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

// Probabilidad P(X > x) para distribución Chi-cuadrada con k grados de libertad
function pValorChiCuadrada(x, k) {
  if (!(x > 0) || k < 1) return 1
  const a = k / 2
  const z = x / 2
  const gln = lnGamma(a)

  if (z < a + 1) {
    let ap = a
    let sum = 1 / a
    let del = sum
    for (let n = 0; n < 500; n++) {
      ap += 1
      del *= z / ap
      sum += del
      if (Math.abs(del) < Math.abs(sum) * 1e-14) break
    }
    return 1 - sum * Math.exp(-z + a * Math.log(z) - gln)
  }

  const FPMIN = 1e-300
  let b = z + 1 - a
  let c = 1 / FPMIN
  let d = 1 / b
  let h = d
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = b + an / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < 1e-14) break
  }
  return Math.exp(-z + a * Math.log(z) - gln) * h
}

// Generador genérico de descarga CSV con delimitador ';' y BOM UTF-8
const descargarCSV = (rows, nombreArchivo) => {
  if (!rows || rows.length === 0) throw new Error('No existen registros para exportar.')

  const headers = Object.keys(rows[0])
  const csvContent = [
    headers.join(';'),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] === null || row[h] === undefined ? '' : String(row[h])
          return `"${val.replace(/"/g, '""')}"`
        })
        .join(';')
    ),
  ].join('\r\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', nombreArchivo)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const reporteService = {
  async obtenerDataSetProcesado() {
    const rawData = await reporteRepository.obtenerDatosCompletos()
    return rawData.map(ReporteModel.fromDatabaseRow)
  },

  generarMatrizContingencia(dataSet) {
    const matriz = {}
    const nivelesPosgrado = new Set()
    const fuentesFinanciamiento = new Set()

    dataSet.forEach((item) => {
      const posgrado = item.nivelPosgrado
      const fuente = item.fuenteFinanciamiento

      nivelesPosgrado.add(posgrado)
      fuentesFinanciamiento.add(fuente)

      if (!matriz[posgrado]) {
        matriz[posgrado] = {}
      }
      matriz[posgrado][fuente] = (matriz[posgrado][fuente] || 0) + 1
    })

    const filas = Array.from(nivelesPosgrado).sort()
    const columnas = Array.from(fuentesFinanciamiento).sort()

    let chiCuadrada = 0
    let celdas = 0
    let celdasEsperadoBajo = 0
    const totalN = dataSet.length

    const totalesFilas = {}
    const totalesColumnas = {}

    filas.forEach((f) => {
      totalesFilas[f] = columnas.reduce((acc, c) => acc + (matriz[f]?.[c] || 0), 0)
    })
    columnas.forEach((c) => {
      totalesColumnas[c] = filas.reduce((acc, f) => acc + (matriz[f]?.[c] || 0), 0)
    })

    if (totalN > 0 && filas.length > 1 && columnas.length > 1) {
      filas.forEach((f) => {
        columnas.forEach((c) => {
          const observado = matriz[f]?.[c] || 0
          const esperado = (totalesFilas[f] * totalesColumnas[c]) / totalN
          celdas += 1
          if (esperado < 5) celdasEsperadoBajo += 1
          if (esperado > 0) chiCuadrada += Math.pow(observado - esperado, 2) / esperado
        })
      })
    }

    const gradosLibertad = (filas.length - 1) * (columnas.length - 1)
    const aplicable = totalN > 0 && filas.length > 1 && columnas.length > 1 && gradosLibertad >= 1
    const pValor = aplicable ? pValorChiCuadrada(chiCuadrada, gradosLibertad) : null
    const minDim = Math.min(filas.length - 1, columnas.length - 1)
    const cramerV = aplicable && minDim > 0 ? Math.sqrt(chiCuadrada / (totalN * minDim)) : null

    return {
      filas,
      columnas,
      matriz,
      totalesFilas,
      totalesColumnas,
      totalGeneral: totalN,
      chiCuadrada: Number(chiCuadrada.toFixed(2)),
      gradosLibertad,
      pValor,
      esSignificativo: pValor !== null && pValor < 0.05,
      cramerV: cramerV === null ? null : Number(cramerV.toFixed(3)),
      advertenciaMuestra: celdas > 0 && celdasEsperadoBajo / celdas > 0.2,
    }
  },

  generarMatrizHeatmap(dataSet) {
    const areas = new Set()
    const sectores = new Set()
    const mapa = {}
    let maximo = 0

    dataSet.forEach((item) => {
      const area = item.areasPriorizadas.find((a) => a.prioridad === 1)?.nombre || 'Sin definir'
      const sector = item.sector

      areas.add(area)
      sectores.add(sector)

      if (!mapa[area]) mapa[area] = {}
      mapa[area][sector] = (mapa[area][sector] || 0) + 1

      if (mapa[area][sector] > maximo) {
        maximo = mapa[area][sector]
      }
    })

    return {
      areas: Array.from(areas).sort(),
      sectores: Array.from(sectores).sort(),
      mapa,
      maximo: maximo || 1,
    }
  },

  calcularPromediosCompetencias(dataSet) {
    const acumulador = {}

    dataSet.forEach((item) =>
      item.competencias.forEach((comp) => {
        acumulador[comp.nombre] ??= { tipo: comp.tipo, puntajes: [] }
        acumulador[comp.nombre].puntajes.push(comp.puntaje)
      })
    )

    return Object.entries(acumulador).map(([nombre, { tipo, puntajes }]) => {
      const n = puntajes.length
      const media = n > 0 ? puntajes.reduce((a, b) => a + b, 0) / n : 0
      const varianza = n > 1 ? puntajes.reduce((a, p) => a + (p - media) ** 2, 0) / (n - 1) : 0
      return {
        competencia: nombre,
        tipo,
        n,
        promedio: Number(media.toFixed(2)),
        desviacion: Number(Math.sqrt(varianza).toFixed(2)),
      }
    })
  },

  // Exportaciones con trazabilidad de metadatos
  exportarACSV(dataSet, nombreArchivo = 'reporte_acreditacion_observatorio_umss.csv') {
    descargarCSV(
      dataSet.map((d) => d.toTabularRow()),
      nombreArchivo
    )
  },

  exportarContingenciaCSV(c, meta, nombreArchivo = 'matriz_posgrado_vs_financiamiento.csv') {
    const rows = c.filas.flatMap((fila) =>
      c.columnas.map((col) => {
        const frecuencia = c.matriz[fila]?.[col] || 0
        const totalFila = c.totalesFilas[fila] || 0
        return {
          nivel_posgrado: fila,
          fuente_financiamiento: col,
          frecuencia_observada: frecuencia,
          porcentaje_del_total: c.totalGeneral ? ((frecuencia / c.totalGeneral) * 100).toFixed(2) : '0.00',
          porcentaje_de_la_fila: totalFila ? ((frecuencia / totalFila) * 100).toFixed(2) : '0.00',
          chi2_calculado: c.chiCuadrada,
          gl: c.gradosLibertad,
          p_valor: c.pValor === null ? 'N/A' : c.pValor.toFixed(4),
          v_cramer: c.cramerV === null ? 'N/A' : c.cramerV,
          ...meta,
        }
      })
    )
    descargarCSV(rows, nombreArchivo)
  },

  exportarHeatmapCSV(h, meta, nombreArchivo = 'matriz_area_vs_sector.csv') {
    const rows = h.areas.flatMap((area) =>
      h.sectores.map((sector) => ({
        area_prioritaria: area,
        sector,
        frecuencia: h.mapa[area]?.[sector] || 0,
        ...meta,
      }))
    )
    descargarCSV(rows, nombreArchivo)
  },

  exportarCompetenciasCSV(comp, meta, nombreArchivo = 'promedios_competencias.csv') {
    descargarCSV(
      comp.map((c) => ({
        competencia: c.competencia,
        tipo: c.tipo,
        n_respuestas: c.n,
        media_muestral: c.promedio,
        desviacion_estandar: c.desviacion,
        ...meta,
      })),
      nombreArchivo
    )
  },
}