import { useAuth } from '../../auth/useAuth'

const Dashboard = () => {
  const { usuario } = useAuth()

  return (
    <div className="space-y-6">
      {/* Encabezado del Dashboard */}
      <header className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Panel de Decisiones Estratégicas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Bienvenido, {usuario?.nombreCompleto || usuario?.usuario}. Monitoreo en tiempo real de titulados de Sistemas UMSS.
          </p>
        </div>
        <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-100">
          Acreditación CEUB / Mercosur
        </span>
      </header>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tasa de Inserción TI</p>
          <h3 className="text-3xl font-extrabold text-[#0F2942] mt-2">87.5%</h3>
          <p className="text-xs text-emerald-600 font-medium mt-1">↑ Alta empleabilidad en el sector</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Área más Demandada</p>
          <h3 className="text-2xl font-extrabold text-[#0F2942] mt-2">Ciencia de Datos / IA</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">46% de preferencias registradas</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Financiamiento Predominante</p>
          <h3 className="text-2xl font-extrabold text-[#0F2942] mt-2">Recursos Propios</h3>
          <p className="text-xs text-amber-600 font-medium mt-1">62% autofinanciado</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard