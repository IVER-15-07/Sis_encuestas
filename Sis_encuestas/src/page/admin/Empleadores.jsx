import FiltrosEncuesta from '../../feature/admin/dashboar/components/FiltrosEncuesta'
import { CsvUploader } from '../../feature/admin/dashboar/components/CsvUploader'

const Empleadores = () => (
  <section className="space-y-5">
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Análisis de empleadores</h1>
      <p className="mt-1 text-sm text-slate-500">
        Esta pantalla está lista para agregar los gráficos y componentes de empleadores.
      </p>
    </div>
    <CsvUploader tipoFijo="empleadores" />
    <FiltrosEncuesta />
  </section>
)

export default Empleadores
