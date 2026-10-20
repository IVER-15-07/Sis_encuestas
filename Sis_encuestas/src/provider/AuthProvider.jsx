import { useState } from 'react'
import { authService } from '../data/services/authService'
import { AuthContext } from '../auth/AuthContext'

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
    const usuarioAutenticado = await authService.login(identificador, password)
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