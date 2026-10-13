import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './auth/Login'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/AdminLayout'
import Titulado from './page/titulado'
import Dashboard from './feature/admin/Dashboard'





function App() {


  return (
    <>
      <Routes>
      {/* 1. Ruta Pública: Encuesta para los egresados */}
      <Route path="/" element={<Titulado />} />

      {/* 2. Ruta Pública: Acceso de inicio de sesión */}
      <Route path="/login" element={<Login />} />

      {/* 3. Rutas Protegidas del Admin con Sidebar */}
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          {/* Al entrar a /admin se muestra el Dashboard */}
          <Route index element={<Dashboard />} />
          
          {/* Más adelante aquí irán las subpantallas: */}
          {/* <Route path="reportes" element={<Reportes />} /> */}
        </Route>
      </Route>

      {/* Redirección ante cualquier ruta no existente */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>

    </>
  )
}

export default App
