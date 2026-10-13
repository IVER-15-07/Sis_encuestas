import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

const Titulado = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* 1. Header institucional */}
      <Navbar />

      {/* 2. Hero banner institucional */}
      <section className="relative bg-[#0F2942] text-white py-20 px-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <span className="inline-block text-xs font-bold tracking-widest uppercase bg-blue-900/60 px-3 py-1 rounded-full text-blue-200">
            • UNIVERSIDAD MAYOR DE SAN SIMÓN
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Observatorio de Titulados
          </h1>
          <p className="text-xl text-slate-300 font-medium">
            Ingeniería en Sistemas • UMSS
          </p>
          <p className="text-slate-300 max-w-2xl text-sm leading-relaxed">
            Conectamos la formación universitaria con el mundo profesional. Tu experiencia
            nos ayuda a comprender el mercado laboral y construir el futuro de nuestra carrera.
          </p>
        </div>
      </section>

      {/* 3. Selección de Encuesta */}
      <main id="participar" className="flex-1 max-w-5xl mx-auto w-full py-12 px-6">
        {/* Encabezado de la sección */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Tu experiencia hace la diferencia
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Selecciona la encuesta que corresponde a tu perfil y sé parte de este estudio.
            </p>
          </div>
          <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
            Dos perspectivas, un mismo propósito
          </span>
        </div>

        {/* Tarjetas de Selección */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Tarjeta 1: Titulados */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-7 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              {/* Header de la tarjeta */}
              <div className="flex items-center justify-between mb-5">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5l9 4.8-9 4.8-9-4.8 9-4.8z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 11.7v4.5c0 2.2 2.7 4 6 4s6-1.8 6-4v-4.5" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 9.3v5.2" />
                  </svg>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                    <path strokeLinecap="round" strokeWidth="2" d="M12 6v6l4 2" />
                  </svg>
                  <span>10-15 min aprox.</span>
                </div>
              </div>

              {/* Título y descripción */}
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Encuesta para titulados
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Si eres titulado de Ingeniería en Sistemas de la UMSS, comparte tu trayectoria profesional y tu experiencia con la formación recibida.
              </p>

              {/* Tags con checkmarks */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 font-medium mb-8">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Trayectoria laboral
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Formación continua
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Competencias
                </span>
              </div>
            </div>

            {/* Botón Acción */}
            <button
              onClick={() => navigate('/encuesta-titulados')}
              className="w-full py-3 px-4 bg-[#0a58ca] hover:bg-[#094bb0] text-white text-xs font-semibold rounded-xl flex items-center justify-between transition-colors shadow-sm cursor-pointer"
            >
              <span>Comenzar encuesta</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>

          {/* Tarjeta 2: Empleadores */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-7 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              {/* Header de la tarjeta */}
              <div className="flex items-center justify-between mb-5">
                <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                    <path strokeLinecap="round" strokeWidth="2" d="M12 6v6l4 2" />
                  </svg>
                  <span>8-12 min aprox.</span>
                </div>
              </div>

              {/* Título y descripción */}
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Encuesta para empleadores
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Si representas a una empresa o institución, ayúdanos a conocer las necesidades del sector y el desempeño de nuestros profesionales.
              </p>

              {/* Tags con checkmarks */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 font-medium mb-8">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Demanda laboral
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Perfil profesional
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Tendencias
                </span>
              </div>
            </div>

            {/* Botón Acción secundario */}
            <button
              onClick={() => navigate('/encuesta-empleadores')}
              className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>Comenzar encuesta</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>

        {/* 4. Banner informativo inferior de protección de datos */}
        <div className="bg-[#eef4fa] border border-[#d6e4f3] rounded-2xl p-4 flex items-start gap-3.5">
          <div className="text-blue-600 flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">
              Tu información está protegida
            </h4>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              Las respuestas se utilizarán exclusivamente con fines académicos y se analizarán de forma agregada. No necesitas crear una cuenta para participar.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Titulado