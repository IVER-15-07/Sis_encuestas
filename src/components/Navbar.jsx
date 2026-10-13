import { Link } from 'react-router-dom'

export const Navbar = () => {
  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Identidad UMSS (Izquierda) */}
        <Link to="/" className="flex items-center gap-3 decoration-transparent">
          <div className="w-10 h-10 rounded-lg bg-[#0F2942] flex items-center justify-center text-white text-xl shadow-sm">
            🎓
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[#0F2942] text-lg leading-tight tracking-tight">
              Observatorio de Titulados
            </span>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Ingeniería en Sistemas • UMSS
            </span>
          </div>
        </Link>

        {/* Navegación y Botón de Acceso (Derecha) */}
        <div className="flex items-center gap-8">
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#sobre-el-estudio" className="hover:text-[#0F2942] transition-colors">
              Sobre el estudio
            </a>
            <a href="#participar" className="hover:text-[#0F2942] transition-colors">
              Participar
            </a>
          </nav>

          {/* Botón que lleva a la ruta /login */}
          <Link
            to="/login"
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition shadow-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Acceso administrativo
          </Link>
        </div>

      </div>
    </header>
  )
}

export default Navbar