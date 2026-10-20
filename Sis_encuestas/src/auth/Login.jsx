import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from './useAuth'

const Login = () => {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)

    try {
      // Autentica mediante authService -> authRepository -> Supabase y actualiza AuthProvider
      await login(usuario.trim(), password)

      // Redirige al panel administrativo protegido
      navigate('/admin')
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-4 py-8">
      {/* Botón superior para regresar a la vista pública */}
      <div className="w-full max-w-md mb-4 flex justify-start">
        <Link
          to="/"
          className="text-sm font-medium text-slate-600 hover:text-[#0F2942] flex items-center gap-1.5 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver a la encuesta de titulados
        </Link>
      </div>

      {/* Tarjeta del Formulario */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8">
        {/* Cabecera del formulario */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-xl bg-[#0F2942] text-white flex items-center justify-center text-2xl shadow-md mb-3">
            🎓
          </div>
          <h2 className="text-2xl font-bold text-[#0F2942] tracking-tight">
            Acceso Administrativo
          </h2>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
            Ingeniería en Sistemas • UMSS
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Ingresa tus credenciales para acceder al observatorio y reportes de acreditación.
          </p>
        </div>

        {/* Mensaje de alerta en caso de error */}
        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 flex-shrink-0 text-red-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Campo: Usuario */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Usuario o Correo
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </span>
              <input
                type="text"
                required
                placeholder="ej. admin"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0F2942]/30 focus:border-[#0F2942] transition"
              />
            </div>
          </div>

          {/* Campo: Contraseña */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </span>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0F2942]/30 focus:border-[#0F2942] transition"
              />
            </div>
          </div>

          {/* Botón de Enviar */}
          <button
            type="submit"
            disabled={cargando}
            className="w-full py-3 bg-[#0F2942] hover:bg-[#1a3d5f] text-white font-semibold text-sm rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {cargando ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
                <span>Verificando...</span>
              </>
            ) : (
              <span>Ingresar al Sistema</span>
            )}
          </button>
        </form>

        {/* Pie con nota institucional */}
        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Área restringida para la Dirección de Carrera y Comité de Acreditación.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login