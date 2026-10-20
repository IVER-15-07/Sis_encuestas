import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

const ProtectedRoute = () => {
  const { estaAutenticado } = useAuth()

  if (!estaAutenticado) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute