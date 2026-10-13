import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
const admin = () => {
   return (
    <div className="flex min-h-screen bg-slate-100">
      {/* 1. Sidebar Fijo a la Izquierda */}
      <Sidebar />

      {/* 2. Área Dinámica de Contenido a la Derecha */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default admin
