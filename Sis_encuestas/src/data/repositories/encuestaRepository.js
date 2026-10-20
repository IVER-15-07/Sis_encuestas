import { supabase } from '../../supabase/supabaseClient'

export const encuestaRepository = {
  // 1. Obtener catálogos activos
  async obtenerCatalogos() {
    const [
      estadosRes,
      sectoresRes,
      posgradosRes,
      areasRes,
      fuentesRes,
      competenciasRes,
    ] = await Promise.all([
      supabase.from('cat_estado_laboral').select('id, nombre, es_ocupado').eq('es_activo', true).order('id'),
      supabase.from('cat_sector').select('id, nombre').eq('es_activo', true).order('nombre'),
      supabase.from('cat_nivel_posgrado').select('id, nombre').eq('es_activo', true).order('id'),
      supabase.from('cat_area_tematica').select('id, nombre').eq('es_activo', true).order('nombre'),
      supabase.from('cat_fuente_financiamiento').select('id, nombre').eq('es_activo', true).order('id'),
      supabase.from('cat_competencia').select('id, nombre, tipo').eq('es_activo', true).order('id'),
    ])

    return {
      estadosLaborales: estadosRes.data || [],
      sectores: sectoresRes.data || [],
      nivelesPosgrado: posgradosRes.data || [],
      areasTematicas: areasRes.data || [],
      fuentesFinanciamiento: fuentesRes.data || [],
      competencias: competenciasRes.data || [],
    }
  },

  // 2. Guardar el registro completo en las 5 tablas
  async guardarEncuestaCompleta({
    datosEgresado,
    nivelPosgradoId,
    areasPriorizadas, // Array de { area_tematica_id, prioridad }
    fuenteFinanciamientoId,
    evaluaciones, // Array de { competencia_id, puntaje, comentario }
  }) {
    // A. Insertar en egresados (HU 1)
    const { data: egresado, error: errEgresado } = await supabase
      .from('egresados')
      .insert([datosEgresado])
      .select('id')
      .single()

    if (errEgresado) throw new Error(`Error en egresados: ${errEgresado.message}`)
    const egresadoId = egresado.id

    // B. Insertar en preferencias_formacion (HU 2)
    const { error: errPref } = await supabase
      .from('preferencias_formacion')
      .insert([{ egresado_id: egresadoId, nivel_posgrado_id: nivelPosgradoId }])

    if (errPref) throw new Error(`Error en preferencias de formación: ${errPref.message}`)

    // C. Insertar en preferencias_areas (HU 2 - áreas priorizadas)
    if (areasPriorizadas && areasPriorizadas.length > 0) {
      const recordsAreas = areasPriorizadas.map((area) => ({
        egresado_id: egresadoId,
        area_tematica_id: area.area_tematica_id,
        prioridad: area.prioridad,
      }))

      const { error: errAreas } = await supabase
        .from('preferencias_areas')
        .insert(recordsAreas)

      if (errAreas) throw new Error(`Error en áreas temáticas: ${errAreas.message}`)
    }

    // D. Insertar en financiamiento_estudios (HU 3)
    const { error: errFin } = await supabase
      .from('financiamiento_estudios')
      .insert([{ egresado_id: egresadoId, fuente_id: fuenteFinanciamientoId, porcentaje: 100 }])

    if (errFin) throw new Error(`Error en financiamiento: ${errFin.message}`)

    // E. Insertar en evaluaciones_competencia (HU 4)
    if (evaluaciones && evaluaciones.length > 0) {
      const recordsEval = evaluaciones.map((ev) => ({
        egresado_id: egresadoId,
        competencia_id: ev.competencia_id,
        puntaje: ev.puntaje,
        comentario: ev.comentario || null,
      }))

      const { error: errEval } = await supabase
        .from('evaluaciones_competencia')
        .insert(recordsEval)

      if (errEval) throw new Error(`Error en evaluación de competencias: ${errEval.message}`)
    }

    return egresadoId
  },
}