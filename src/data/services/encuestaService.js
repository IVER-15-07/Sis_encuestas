import { encuestaRepository } from '../repositories/encuestaRepository'

export const encuestaService = {
  async obtenerCatalogos() {
    return await encuestaRepository.obtenerCatalogos()
  },

  async registrarEncuesta(form) {
    const anio = parseInt(form.anioEgreso, 10)
    const anioActual = new Date().getFullYear()

    if (isNaN(anio) || anio < 1950 || anio > anioActual) {
      throw new Error(`El año de egreso debe ser válido (entre 1950 y ${anioActual}).`)
    }
    if (!form.estadoLaboralId) throw new Error('Debe indicar su estado laboral.')
    if (!form.sectorId) throw new Error('Debe seleccionar su sector laboral.')
    if (!form.nivelPosgradoId) throw new Error('Debe seleccionar el nivel de posgrado.')
    if (!form.areaPrioritaria1) throw new Error('Debe seleccionar al menos su área de mayor prioridad.')
    if (!form.fuenteFinanciamientoId) throw new Error('Debe indicar su fuente de financiamiento.')

    // Preparar áreas de interés priorizadas (Prioridad 1, 2 y 3 opcionales)
    const areasPriorizadas = [
      { area_tematica_id: parseInt(form.areaPrioritaria1, 10), prioridad: 1 },
    ]
    if (form.areaPrioritaria2 && form.areaPrioritaria2 !== form.areaPrioritaria1) {
      areasPriorizadas.push({ area_tematica_id: parseInt(form.areaPrioritaria2, 10), prioridad: 2 })
    }
    if (
      form.areaPrioritaria3 &&
      form.areaPrioritaria3 !== form.areaPrioritaria1 &&
      form.areaPrioritaria3 !== form.areaPrioritaria2
    ) {
      areasPriorizadas.push({ area_tematica_id: parseInt(form.areaPrioritaria3, 10), prioridad: 3 })
    }

    // Preparar evaluaciones Likert
    const evaluaciones = Object.entries(form.competenciasPuntajes || {}).map(([compId, puntaje]) => ({
      competencia_id: parseInt(compId, 10),
      puntaje: parseInt(puntaje, 10),
      comentario: form.comentariosCompetencia?.[compId] || null,
    }))

    const datosEgresado = {
      anio_egreso: anio,
      estado_laboral_id: parseInt(form.estadoLaboralId, 10),
      sector_id: parseInt(form.sectorId, 10),
      correo: form.correo?.trim() || null,
    }

    return await encuestaRepository.guardarEncuestaCompleta({
      datosEgresado,
      nivelPosgradoId: parseInt(form.nivelPosgradoId, 10),
      areasPriorizadas,
      fuenteFinanciamientoId: parseInt(form.fuenteFinanciamientoId, 10),
      evaluaciones,
    })
  },
}