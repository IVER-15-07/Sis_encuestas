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

  get antiguedad() {
    const anioActual = new Date().getFullYear()
    return Math.max(0, anioActual - this.anioEgreso)
  }

  get segmentoPerfil() {
    return this.antiguedad <= 3 ? 'Junior / Reciente Egreso' : 'Mando Consolidado'
  }

  toTabularRow() {
    const area1 = this.areasPriorizadas.find((a) => a.prioridad === 1)?.nombre || 'N/A'
    const area2 = this.areasPriorizadas.find((a) => a.prioridad === 2)?.nombre || 'N/A'
    const area3 = this.areasPriorizadas.find((a) => a.prioridad === 3)?.nombre || 'N/A'

    const tecnicas = this.competencias.filter((c) => c.tipo === 'tecnica')
    const transversales = this.competencias.filter((c) => c.tipo === 'transversal')

    const promTec = tecnicas.length
      ? (tecnicas.reduce((acc, c) => acc + c.puntaje, 0) / tecnicas.length).toFixed(2)
      : 'N/A'

    const promTrans = transversales.length
      ? (transversales.reduce((acc, c) => acc + c.puntaje, 0) / transversales.length).toFixed(2)
      : 'N/A'

    return {
      ID_Egresado: this.id,
      Correo_Contacto: this.correo || 'Anonimo',
      Anio_Egreso: this.anioEgreso,
      Antiguedad_Anios: this.antiguedad,
      Segmento_Perfil: this.segmentoPerfil,
      Estado_Laboral: this.estadoLaboral,
      Insercion_Laboral: this.esOcupado ? 'Ocupado' : 'No Ocupado',
      Sector_Desempeno: this.sector,
      Nivel_Posgrado_Interes: this.nivelPosgrado,
      Area_Interes_Prioridad_1: area1,
      Area_Interes_Prioridad_2: area2,
      Area_Interes_Prioridad_3: area3,
      Fuente_Financiamiento_Principal: this.fuenteFinanciamiento,
      Promedio_Competencias_Tecnicas: promTec,
      Promedio_Competencias_Transversales: promTrans,
      Fecha_Registro: this.fechaRegistro ? new Date(this.fechaRegistro).toLocaleDateString() : 'N/A',
    }
  }

  static fromDatabaseRow(row) {
    const prefForm = Array.isArray(row.preferencias_formacion)
      ? row.preferencias_formacion[0]
      : row.preferencias_formacion

    const areasRaw = prefForm?.preferencias_areas || []

    // Si existen múltiples fuentes, se prioriza la de mayor porcentaje para no duplicar N
    let fuentePrincipal = 'No especificado'
    if (Array.isArray(row.financiamiento_estudios) && row.financiamiento_estudios.length > 0) {
      const ordenada = [...row.financiamiento_estudios].sort((a, b) => (b.porcentaje || 0) - (a.porcentaje || 0))
      fuentePrincipal = ordenada[0]?.cat_fuente_financiamiento?.nombre || 'No especificado'
    } else if (row.financiamiento_estudios?.cat_fuente_financiamiento?.nombre) {
      fuentePrincipal = row.financiamiento_estudios.cat_fuente_financiamiento.nombre
    }

    return new ReporteModel({
      id: row.id,
      correo: row.correo,
      anioEgreso: row.anio_egreso,
      estadoLaboral: row.cat_estado_laboral?.nombre,
      esOcupado: row.cat_estado_laboral?.es_ocupado,
      sector: row.cat_sector?.nombre,
      nivelPosgrado: prefForm?.cat_nivel_posgrado?.nombre,
      areasPriorizadas: areasRaw.map((pa) => ({
        prioridad: pa.prioridad,
        nombre: pa.cat_area_tematica?.nombre,
      })),
      fuenteFinanciamiento: fuentePrincipal,
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