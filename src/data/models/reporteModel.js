export class ReporteModel {
  constructor({
    id,
    correo,
    anioEgreso,
    estadoLaboral,
    esOcupado,
    sector,
    nivelPosgrado,
    areasPriorizadas = [],
    fuenteFinanciamiento,
    competencias = [],
    fechaRegistro,
  }) {
    this.id = id
    this.correo = correo
    this.anioEgreso = Number(anioEgreso)
    this.estadoLaboral = estadoLaboral || 'No especificado'
    this.esOcupado = Boolean(esOcupado)
    this.sector = sector || 'No especificado'
    this.nivelPosgrado = nivelPosgrado || 'No especificado'
    this.areasPriorizadas = areasPriorizadas
    this.fuenteFinanciamiento = fuenteFinanciamiento || 'No especificado'
    this.competencias = competencias
    this.fechaRegistro = fechaRegistro
  }

  // Antigüedad en años transcurridos
  get antiguedad() {
    const anioActual = new Date().getFullYear()
    return Math.max(0, anioActual - this.anioEgreso)
  }

  // Segmentación del perfil profesional (HU 1)
  get segmentoPerfil() {
    return this.antiguedad <= 3 ? 'Junior / Reciente Egreso' : 'Mando Consolidado'
  }

  // Fila aplanada limpia para exportación tabular (CSV / Excel)
  toTabularRow() {
    const areaPrincipal = this.areasPriorizadas.find((a) => a.prioridad === 1)?.nombre || 'N/A'
    const areaSecundaria = this.areasPriorizadas.find((a) => a.prioridad === 2)?.nombre || 'N/A'
    const areaTerciaria = this.areasPriorizadas.find((a) => a.prioridad === 3)?.nombre || 'N/A'

    // Promedios diferenciados de competencias técnicas y transversales
    const tecnicas = this.competencias.filter((c) => c.tipo === 'tecnica')
    const transversales = this.competencias.filter((c) => c.tipo === 'transversal')

    const promTecnico = tecnicas.length
      ? (tecnicas.reduce((acc, c) => acc + c.puntaje, 0) / tecnicas.length).toFixed(2)
      : 'N/A'

    const promTransversal = transversales.length
      ? (transversales.reduce((acc, c) => acc + c.puntaje, 0) / transversales.length).toFixed(2)
      : 'N/A'

    return {
      ID_Egresado: this.id,
      Correo_Contacto: this.correo || 'Anónimo',
      Anio_Egreso: this.anioEgreso,
      Antiguedad_Anios: this.antiguedad,
      Segmento_Perfil: this.segmentoPerfil,
      Estado_Laboral: this.estadoLaboral,
      Insercion_Laboral: this.esOcupado ? 'Ocupado' : 'No Ocupado',
      Sector_Desempeno: this.sector,
      Nivel_Posgrado_Interes: this.nivelPosgrado,
      Area_Interes_Prioridad_1: areaPrincipal,
      Area_Interes_Prioridad_2: areaSecundaria,
      Area_Interes_Prioridad_3: areaTerciaria,
      Fuente_Financiamiento: this.fuenteFinanciamiento,
      Promedio_Competencias_Tecnicas: promTecnico,
      Promedio_Competencias_Transversales: promTransversal,
      Fecha_Registro: this.fechaRegistro ? new Date(this.fechaRegistro).toLocaleDateString() : 'N/A',
    }
  }

  // Mapeo seguro desde la consulta relacional con JOINs de Supabase
  static fromDatabaseRow(row) {
    // preferencias_formacion puede llegar como objeto o arreglo según la configuración de la clave foránea
    const prefFormacion = Array.isArray(row.preferencias_formacion)
      ? row.preferencias_formacion[0]
      : row.preferencias_formacion

    // preferencias_areas está anidado dentro de preferencias_formacion
    const areasRaw = prefFormacion?.preferencias_areas || []

    // financiamiento_estudios puede ser objeto o arreglo
    const financiamientoRaw = Array.isArray(row.financiamiento_estudios)
      ? row.financiamiento_estudios[0]
      : row.financiamiento_estudios

    return new ReporteModel({
      id: row.id,
      correo: row.correo,
      anioEgreso: row.anio_egreso,
      estadoLaboral: row.cat_estado_laboral?.nombre,
      esOcupado: row.cat_estado_laboral?.es_ocupado,
      sector: row.cat_sector?.nombre,
      nivelPosgrado: prefFormacion?.cat_nivel_posgrado?.nombre,
      areasPriorizadas: areasRaw.map((pa) => ({
        prioridad: pa.prioridad,
        nombre: pa.cat_area_tematica?.nombre,
      })),
      fuenteFinanciamiento: financiamientoRaw?.cat_fuente_financiamiento?.nombre,
      competencias: (row.evaluaciones_competencia || []).map((ec) => ({
        nombre: ec.cat_competencia?.nombre,
        tipo: ec.cat_competencia?.tipo,
        puntaje: ec.puntaje,
        comentario: ec.comentario,
      })),
      fechaRegistro: row.fecha_creacion,
    })
  }
}