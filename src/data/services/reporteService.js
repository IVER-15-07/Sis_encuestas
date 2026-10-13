import { reporteRepository } from '../repositories/reporteRepository'
import { ReporteModel } from '../models/reporteModel'

export const reporteService = {
  async obtenerDataSetProcesado() {
    const rawData = await reporteRepository.obtenerDatosCompletos()
    return rawData.map(ReporteModel.fromDatabaseRow)
  },

  // Construye la matriz de frecuencia cruzada (HU 3 vs HU 2): Posgrado vs Financiamiento
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

    const listaPosgrados = Array.from(nivelesPosgrado)
    const listaFuentes = Array.from(fuentesFinanciamiento)

    return {
      filas: listaPosgrados,
      columnas: listaFuentes,
      matriz,
      totalGeneral: dataSet.length,
    }
  },

  // Consolida promedios para el diagrama de radar (HU 4)
  calcularPromediosCompetencias(dataSet) {
    const acumulador = {}

    dataSet.forEach((item) => {
      item.competencias.forEach((comp) => {
        if (!acumulador[comp.nombre]) {
          acumulador[comp.nombre] = { tipo: comp.tipo, total: 0, cuenta: 0 }
        }
        acumulador[comp.nombre].total += comp.puntaje
        acumulador[comp.nombre].cuenta += 1
      })
    })

    return Object.entries(acumulador).map(([nombre, val]) => ({
      competencia: nombre,
      tipo: val.tipo,
      promedio: Number((val.total / (val.cuenta || 1)).toFixed(2)),
    }))
  },

  // Convierte el dataSet a CSV tabular estructurado y dispara la descarga en el navegador
  exportarACSV(dataSet, nombreArchivo = 'reporte_acreditacion_observatorio_umss.csv') {
    if (!dataSet || dataSet.length === 0) {
      throw new Error('No existen registros para exportar.')
    }

    const rows = dataSet.map((d) => d.toTabularRow())
    const headers = Object.keys(rows[0])

    const csvContent = [
      headers.join(';'),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const val = row[h] === null || row[h] === undefined ? '' : String(row[h])
            // Escapar comillas y punto y coma
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
  },
}