import Navbar from '../components/Navbar'

const Titulado = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. Header institucional arriba */}
      <Navbar />

      {/* 2. Hero banner con imagen de fondo institucional y título */}
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

      {/* 3. Contenedor de la encuesta / Pasos */}
      <main id="participar" className="flex-1 max-w-5xl mx-auto w-full py-12 px-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Tu experiencia hace la diferencia
        </h2>
        <p className="text-sm text-slate-500 mb-8">
          Selecciona la encuesta que corresponde a tu perfil y sé parte de este estudio.
        </p>

        {/* Aquí va tu lógica de pasos / formulario */}
      </main>
    </div>
  )
}

export default Titulado