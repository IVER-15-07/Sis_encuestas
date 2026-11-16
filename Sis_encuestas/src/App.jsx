import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './auth/Login'
import ProtectedRoute from './components/ProtectedRoute'
import Admin from './page/admin'
import CargarArchivos from './page/admin/CargarArchivos'
import Empleadores from './page/admin/Empleadores'
import Titulados from './page/admin/Titulados'
import Titulado from './page/titulado'

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
        <Route path="/admin" element={<Admin />}>
          <Route index element={<Navigate to="cargar" replace />} />
          <Route path="cargar" element={<CargarArchivos />} />
          <Route path="titulados" element={<Titulados />} />
          <Route path="empleadores" element={<Empleadores />} />
        </Route>
      </Route>

      {/* Redirección ante cualquier ruta no existente */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>

    </>
  )
}

export default App
