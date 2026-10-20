import bcrypt from 'bcryptjs'
import { authRepository } from '../repositories/authRepository'
import { UsuarioModel } from '../models/usuarioModel'

export const authService = {
  async login(identificador, passwordPlano) {
    if (!identificador || !passwordPlano) {
      throw new Error('Debe proporcionar usuario y contraseña.')
    }

    // 1. Buscar en la base de datos
    const userRecord = await authRepository.getByUsuarioOrCorreo(identificador.trim())

    if (!userRecord) {
      throw new Error('Credenciales incorrectas.')
    }

    if (!userRecord.es_activo) {
      throw new Error('La cuenta se encuentra inhabilitada.')
    }

    // 2. Comparar la contraseña ingresada con el hash bcrypt guardado
    const coincide = await bcrypt.compare(passwordPlano, userRecord.password_hash)

    if (!coincide) {
      throw new Error('Credenciales incorrectas.')
    }

    // 3. Crear modelo limpio (sin password_hash)
    const usuarioLimpio = UsuarioModel.fromDatabase(userRecord)

    return usuarioLimpio
  },
}