import { supabase } from '../../supabase/supabaseClient'

export const authRepository = {
  async getByUsuarioOrCorreo(identificador) {
    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        id,
        usuario,
        correo,
        nombre_completo,
        password_hash,
        es_activo,
        cat_rol:rol_id (
          nombre
        )
      `)
      .or(`usuario.eq.${identificador},correo.eq.${identificador}`)
      .maybeSingle() // <- Evita el error 406 si no hay coincidencia

    if (error) {
      console.error('Error de Supabase:', error)
      throw new Error(`Error en base de datos: ${error.message}`)
    }

    return data
  },
}