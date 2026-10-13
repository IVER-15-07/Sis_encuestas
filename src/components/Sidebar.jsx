import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

const Sidebar = () => {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  const handleCerrarSesion = () => {
    logout()
    navigate('/login')
  }

  const linkStyle = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30 font-semibold'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`

  return (
    <aside className="w-64 bg-[#0F2942] text-white flex flex-col justify-between h-screen sticky top-0 border-r border-slate-800 p-4 select-none">
      <div>
        {/* Cabecera / Identidad UMSS */}
        <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-slate-700/60">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-xl font-bold shadow">
            🎓
          </div>
          <div>
            <h2 className="text-base font-bold leading-tight">Observatorio</h2>
            <p className="text-xs text-slate-400">Sistemas • UMSS</p>
          </div>
        </div>

        {/* Menú de Navegación */}
        <nav className="flex flex-col gap-1.5">
          <NavLink to="/admin" end className={linkStyle}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Dashboard General
          </NavLink>

          <NavLink to="/admin/cohortes" className={linkStyle}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Cohortes & Empleo
          </NavLink>

          <NavLink to="/admin/posgrados" className={linkStyle}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Demanda Posgrados
          </NavLink>
        </nav>
      </div>

      {/* Pie del Sidebar: Usuario activo y Logout */}
      <div className="pt-4 border-t border-slate-700/60 flex flex-col gap-3">
        <div className="px-2">
          <p className="text-sm font-semibold text-slate-200 truncate">
            {usuario?.nombreCompleto || usuario?.usuario || 'Administrador'}
          </p>
          <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full inline-block mt-0.5 uppercase tracking-wider">
            Rol: {usuario?.rol || 'admin'}
          </span>
        </div>

        <button
          onClick={handleCerrarSesion}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-300 hover:text-white hover:bg-red-900/40 rounded-xl transition cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}

export default Sidebar