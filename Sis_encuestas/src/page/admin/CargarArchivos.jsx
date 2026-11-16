import { CsvUploader } from '../../feature/admin/dashboar/components/CsvUploader'

const CargarArchivos = () => (
  <section className="space-y-5">
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Cargar archivos</h1>
      <p className="mt-1 text-sm text-slate-500">
        Importa los archivos Excel de encuestas de titulados o empleadores.
      </p>
    </div>
    <CsvUploader />
  </section>
)

export default CargarArchivos
