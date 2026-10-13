import { supabase } from '../../supabase/supabaseClient'

export const reporteRepository = {
  async obtenerDatosCompletos() {
    const { data, error } = await supabase
      .from('egresados')
      .select(`
        id,
        anio_egreso,
        fecha_creacion,
        cat_estado_laboral ( id, nombre, es_ocupado ),
        cat_sector ( id, nombre ),
        preferencias_formacion (
          cat_nivel_posgrado ( id, nombre ),
          preferencias_areas (
            prioridad,
            cat_area_tematica ( id, nombre )
          )
        ),
        financiamiento_estudios (
          porcentaje,
          cat_fuente_financiamiento ( id, nombre )
        ),
        evaluaciones_competencia (
          puntaje,
          comentario,
          cat_competencia ( id, nombre, tipo )
        )
      `)
      .order('fecha_creacion', { ascending: false })

    if (error) {
      throw new Error(`Error al consultar datos de reporte: ${error.message}`)
    }

    return data || []
  },
}