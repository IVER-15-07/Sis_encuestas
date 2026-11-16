import { useState } from 'react'

const filtros = [
  {
    id: 'situacion',
    label: 'Estado laboral',
    opciones: [
      'Trabajo en una organización',
      'Emprendimiento propio',
      'Actualmente no trabajo',
      'Sin respuesta',
    ],
  },
  {
    id: 'sector',
    label: 'Sector',
    opciones: ['Público', 'Privado', 'ONG', 'Sin clasificar', 'Sin respuesta'],
  },
  {
    id: 'genero',
    label: 'Género',
    opciones: ['Hombre', 'Mujer'],
  },
  {
    id: 'edad',
    label: 'Rango de edad',
    opciones: ['15–18', '19–24', '25–30', '31–36', '37–42', '43–48', '49 años o más'],
  },
]

const FiltrosEncuesta = () => {
  const [selecciones, setSelecciones] = useState({})

  const handleChange = (id, value) => {
    setSelecciones((actuales) => ({ ...actuales, [id]: value }))
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-800">Filtros de encuesta</h2>
        <p className="mt-1 text-sm text-slate-500">
          Criterios disponibles para organizar el análisis.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {filtros.map(({ id, label, opciones }) => (
          <label key={id} className="block text-sm font-medium text-slate-700">
            {label}
            <select
              value={selecciones[id] || ''}
              onChange={(event) => handleChange(id, event.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="">Todos</option>
              {opciones.map((opcion) => (
                <option key={opcion} value={opcion}>{opcion}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  )
}

export default FiltrosEncuesta
