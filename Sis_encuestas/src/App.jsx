import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './auth/Login'
import ProtectedRoute from './components/ProtectedRoute'
import Admin from './page/admin'
import Titulado from './page/titulado'
import Dashboard from './feature/admin/dashboar/Dashboard'
import Encuesta from './feature/titulados/EncuestaWizard'
import ReportesAcreditacion from './feature/admin/ReportesAcreditacion'
//import Historico from './feature/admin/historico/HistoricoDatos'




function App() {


  return (
    <>
      <Routes>
      {/* 1. Ruta Pública: Encuesta para los egresados */}
      <Route path="/" element={<Titulado />} />

      {/* 2. Ruta Pública: Acceso de inicio de sesión */}
      <Route path="/login" element={<Login />} />
      <Route path="/encuesta-titulados" element={<Encuesta />} />

      {/* 3. Rutas Protegidas del Admin con Sidebar */}
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<Admin />}>
          {/* Al entrar a /admin se muestra el Dashboard */}
          <Route index element={<Dashboard />} />

          
          {/* Pantalla de Reportes y Matrices (HU 5) */}
          <Route path="reportes" element={<ReportesAcreditacion />} />
        </Route>
      </Route>

      {/* Redirección ante cualquier ruta no existente */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>

    </>
  )
}

export default App
