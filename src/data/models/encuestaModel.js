export class EncuestaModel {
  constructor({
    id = null,
    correo = null,
    anioEgreso,
    estadoLaboralId,
    sectorId,
    nivelPosgradoId,
    areasPriorizadas = [],
    fuenteFinanciamientoId,
    evaluaciones = [],
    fechaCreacion = null,
  }) {
    this.id = id
    this.correo = correo
    this.anioEgreso = Number(anioEgreso)
    this.estadoLaboralId = Number(estadoLaboralId)
    this.sectorId = Number(sectorId)
    this.nivelPosgradoId = Number(nivelPosgradoId)
    this.areasPriorizadas = areasPriorizadas
    this.fuenteFinanciamientoId = Number(fuenteFinanciamientoId)
    this.evaluaciones = evaluaciones
    this.fechaCreacion = fechaCreacion
  }

  // Lógica de negocio (HU 1): Antigüedad y madurez profesional
  get antiguedad() {
    const anioActual = new Date().getFullYear()
    return Math.max(0, anioActual - this.anioEgreso)
  }

  get segmentoPerfil() {
    return this.antiguedad <= 3 ? 'Junior / Reciente Egreso' : 'Mando Consolidado'
  }

  // Transforma los datos del formulario a las cargas exactas para las tablas de Supabase
  toDatabasePayload() {
    return {
      datosEgresado: {
        correo: this.correo?.trim() || null,
        anio_egreso: this.anioEgreso,
        estado_laboral_id: this.estadoLaboralId,
        sector_id: this.sectorId,
      },
      nivelPosgradoId: this.nivelPosgradoId,
      areasPriorizadas: this.areasPriorizadas.map((area) => ({
        area_tematica_id: Number(area.area_tematica_id),
        prioridad: Number(area.prioridad),
      })),
      fuenteFinanciamientoId: this.fuenteFinanciamientoId,
      evaluaciones: this.evaluaciones.map((ev) => ({
        competencia_id: Number(ev.competencia_id),
        puntaje: Number(ev.puntaje),
        comentario: ev.comentario?.trim() || null,
      })),
    }
  }

  // Factoría estática a partir de los datos crudos del formulario
  static fromForm(form) {
    // Procesar áreas temáticas priorizadas (HU 2)
    const areasPriorizadas = []
    if (form.areaPrioritaria1) {
      areasPriorizadas.push({ area_tematica_id: form.areaPrioritaria1, prioridad: 1 })
    }
    if (form.areaPrioritaria2 && form.areaPrioritaria2 !== form.areaPrioritaria1) {
      areasPriorizadas.push({ area_tematica_id: form.areaPrioritaria2, prioridad: 2 })
    }
    if (
      form.areaPrioritaria3 &&
      form.areaPrioritaria3 !== form.areaPrioritaria1 &&
      form.areaPrioritaria3 !== form.areaPrioritaria2
    ) {
      areasPriorizadas.push({ area_tematica_id: form.areaPrioritaria3, prioridad: 3 })
    }

    // Procesar evaluaciones Likert (HU 4)
    const evaluaciones = Object.entries(form.competenciasPuntajes || {}).map(([compId, puntaje]) => ({
      competencia_id: compId,
      puntaje,
      comentario: form.comentariosCompetencia?.[compId] || null,
    }))

    return new EncuestaModel({
      correo: form.correo,
      anioEgreso: form.anioEgreso,
      estadoLaboralId: form.estadoLaboralId,
      sectorId: form.sectorId,
      nivelPosgradoId: form.nivelPosgradoId,
      areasPriorizadas,
      fuenteFinanciamientoId: form.fuenteFinanciamientoId,
      evaluaciones,
    })
  }
}