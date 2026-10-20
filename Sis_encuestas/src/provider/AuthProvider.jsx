import { useState } from 'react'
import { AuthContext } from '../auth/AuthContext'

const CREDENCIALES_ADMIN = {
  usuario: 'admin',
  password: 'admin123',
}

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(() => {
    try {
      const sesionGuardada = localStorage.getItem('sesion_admin')
      return sesionGuardada ? JSON.parse(sesionGuardada) : null
    } catch {
      localStorage.removeItem('sesion_admin')
      return null
    }
  })

  const login = async (identificador, password) => {
    if (!identificador || !password) {
      throw new Error('Debe proporcionar usuario y contraseña.')
    }

    if (
      identificador.trim() !== CREDENCIALES_ADMIN.usuario ||
      password !== CREDENCIALES_ADMIN.password
    ) {
      throw new Error('Credenciales incorrectas.')
    }

    const usuarioAutenticado = {
      usuario: CREDENCIALES_ADMIN.usuario,
      nombreCompleto: 'Administrador',
      rol: 'Administrador',
    }

    setUsuario(usuarioAutenticado)
    localStorage.setItem('sesion_admin', JSON.stringify(usuarioAutenticado))
    return usuarioAutenticado
  }

  const logout = () => {
    setUsuario(null)
    localStorage.removeItem('sesion_admin')
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        estaAutenticado: Boolean(usuario),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider