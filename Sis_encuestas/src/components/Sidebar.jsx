import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { Building2, GraduationCap, Upload } from 'lucide-react'

const Sidebar = () => {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleCerrarSesion = () => {
    logout()
    navigate('/')
  }

  const renderNavClasses = ({ isActive }) =>
    `relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
      isActive
        ? 'bg-[#152e59] text-white shadow-inner'
        : 'text-slate-400 hover:bg-[#121f38] hover:text-slate-200'
    }`

  const menuItems = [
    { to: '/admin/cargar', label: 'Cargar archivos', Icon: Upload },
    { to: '/admin/titulados', label: 'Titulados', Icon: GraduationCap },
    { to: '/admin/empleadores', label: 'Empleadores', Icon: Building2 },
  ]

  return (
    <aside className="w-64 bg-[#0a1120] text-slate-300 flex flex-col justify-between h-screen sticky top-0 border-r border-[#15233e] select-none p-4">
      <div className="space-y-6">
        {/* Encabezado: Birrete Académico institucional */}
        <div className="flex items-center gap-3 px-1 pt-1">
          <div className="w-10 h-10 rounded-xl bg-[#1d4ed8] border border-blue-400/20 flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5l9 4.8-9 4.8-9-4.8 9-4.8z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 11.7v4.5c0 2.2 2.7 4 6 4s6-1.8 6-4v-4.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 9.3v5.2" />
            </svg>
          </div>

          <div className="leading-tight">
            <p className="text-[11px] font-bold text-blue-400 tracking-wider">UMSS FCYT</p>
            <h1 className="text-sm font-bold text-white tracking-tight">
              Ingeniería de Sistemas
            </h1>
            <p className="text-[11px] text-slate-400">Observatorio Académico</p>
          </div>
        </div>

        {/* Sección de Menú */}
        <div>
          <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-3">
            Plataforma Analítica
          </p>

          <nav className="space-y-1">
            {menuItems.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} className={renderNavClasses}>
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-500 rounded-r-md" />
                    )}
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                      <span>{label}</span>
                    </div>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Pie del Sidebar: Cerrar Sesión */}
      <div className="pt-3 border-t border-[#15233e]">
        <button
          onClick={handleCerrarSesion}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar