import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { encuestaService } from '../../data/services/encuestaService'

const PASOS = [
  { id: 1, titulo: 'Antigüedad & Empleo', hu: 'HU 1' },
  { id: 2, titulo: 'Demanda Posgrado', hu: 'HU 2' },
  { id: 3, titulo: 'Financiamiento', hu: 'HU 3' },
  { id: 4, titulo: 'Brecha Competencias', hu: 'HU 4' },
]

const EncuestaWizard = () => {
  const navigate = useNavigate()
  const [pasoActual, setPasoActual] = useState(1)
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [completado, setCompletado] = useState(false)

  // Catálogos desde PostgreSQL (Supabase)
  const [catalogos, setCatalogos] = useState({
    estadosLaborales: [],
    sectores: [],
    nivelesPosgrado: [],
    areasTematicas: [],
    fuentesFinanciamiento: [],
    competencias: [],
  })

  // Estado del formulario adaptado a la base de datos
  const [formData, setFormData] = useState({
    correo: '',
    anioEgreso: '',
    estadoLaboralId: '',
    sectorId: '',
    nivelPosgradoId: '',
    areaPrioritaria1: '',
    areaPrioritaria2: '',
    areaPrioritaria3: '',
    fuenteFinanciamientoId: '',
    competenciasPuntajes: {},
    comentariosCompetencia: {},
  })

  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const datos = await encuestaService.obtenerCatalogos()
        setCatalogos(datos)

        // Inicializar Likert en 3 (intermedio)
        const inicialLikert = {}
        datos.competencias.forEach((comp) => {
          inicialLikert[comp.id] = 3
        })
        setFormData((prev) => ({ ...prev, competenciasPuntajes: inicialLikert }))
      } catch (err) {
        setError('No se pudieron cargar los catálogos institucionales.')
      } finally {
        setCargandoCatalogos(false)
      }
    }
    fetchCatalogos()
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleLikertChange = (competenciaId, valor) => {
    setFormData({
      ...formData,
      competenciasPuntajes: {
        ...formData.competenciasPuntajes,
        [competenciaId]: valor,
      },
    })
  }

  const handleComentarioChange = (competenciaId, texto) => {
    setFormData({
      ...formData,
      comentariosCompetencia: {
        ...formData.comentariosCompetencia,
        [competenciaId]: texto,
      },
    })
  }

  // Validación por etapas
  const validarPasoActual = () => {
    setError('')
    if (pasoActual === 1) {
      const anio = parseInt(formData.anioEgreso, 10)
      const anioActual = new Date().getFullYear()
      if (!anio || anio < 1950 || anio > anioActual) {
        setError(`Ingrese un año de egreso válido (1950 - ${anioActual}).`)
        return false
      }
      if (!formData.estadoLaboralId) {
        setError('Seleccione su estado de ocupación actual.')
        return false
      }
      if (!formData.sectorId) {
        setError('Seleccione su sector de desempeño.')
        return false
      }
    }
    if (pasoActual === 2) {
      if (!formData.nivelPosgradoId) {
        setError('Seleccione el nivel de posgrado de su interés.')
        return false
      }
      if (!formData.areaPrioritaria1) {
        setError('Seleccione al menos su área tecnológica de mayor prioridad (Prioridad 1).')
        return false
      }
    }
    if (pasoActual === 3) {
      if (!formData.fuenteFinanciamientoId) {
        setError('Seleccione la fuente de financiamiento estimada.')
        return false
      }
    }
    return true
  }

  const handleSiguiente = () => {
    if (validarPasoActual()) {
      setPasoActual((prev) => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleAnterior = () => {
    setError('')
    setPasoActual((prev) => prev - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validarPasoActual()) return

    setEnviando(true)
    setError('')

    try {
      await encuestaService.registrarEncuesta(formData)
      setCompletado(true)
    } catch (err) {
      setError(err.message || 'Error al enviar la encuesta.')
    } finally {
      setEnviando(false)
    }
  }

  if (cargandoCatalogos) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          Cargando instrumento de encuesta institucional...
        </div>
      </div>
    )
  }

  if (completado) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 font-sans">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200/80 shadow-md p-8 text-center space-y-5">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl shadow-sm">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            ¡Aporte Registrado con Éxito!
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Gracias por participar. Tu información apoyará directamente a la Dirección de Carrera en el diagnóstico curricular y los procesos de acreditación de Ingeniería de Sistemas (UMSS).
          </p>
          <div className="pt-4">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 bg-[#0F2942] hover:bg-[#1a3d5f] text-white text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <Link
          to="/"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
        >
          ← Cancelar y salir
        </Link>
        <div className="text-right">
          <p className="text-xs font-bold text-[#0F2942]">Observatorio de Titulados</p>
          <p className="text-[11px] text-slate-400">Ingeniería de Sistemas • UMSS</p>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        {/* Barra de progreso */}
        <div className="mb-8">
          <div className="grid grid-cols-4 gap-2 mb-3">
            {PASOS.map((paso) => (
              <div key={paso.id} className="text-center">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    paso.id <= pasoActual ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                />
                <span className="text-[10px] font-bold text-slate-400 mt-1 block uppercase">
                  {paso.hu}
                </span>
                <span
                  className={`text-xs hidden sm:block font-medium truncate ${
                    paso.id === pasoActual ? 'text-blue-900 font-bold' : 'text-slate-500'
                  }`}
                >
                  {paso.titulo}
                </span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
          {/* PASO 1: HU 1 */}
          {pasoActual === 1 && (
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">
                  Paso 1 de 4 • Historia de Usuario 1
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-2">
                  Trayectoria Laboral y Antigüedad
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Permite conocer la inserción profesional de tu cohorte y el tiempo transcurrido desde tu titulación.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Correo Institucional o Personal (Opcional)
                  </label>
                  <input
                    type="email"
                    name="correo"
                    placeholder="ejemplo@correo.com"
                    value={formData.correo}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600 transition"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Déjalo en blanco si prefieres participar de manera 100% anónima.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Año de Egreso (Obligatorio)
                  </label>
                  <input
                    type="number"
                    name="anioEgreso"
                    min="1950"
                    max={new Date().getFullYear()}
                    placeholder="Ej. 2022"
                    required
                    value={formData.anioEgreso}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Estado de Ocupación Actual
                  </label>
                  <select
                    name="estadoLaboralId"
                    value={formData.estadoLaboralId}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600 transition"
                  >
                    <option value="">Seleccione su situación laboral actual...</option>
                    {catalogos.estadosLaborales.map((est) => (
                      <option key={est.id} value={est.id}>
                        {est.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Sector Económico de Desempeño
                  </label>
                  <select
                    name="sectorId"
                    value={formData.sectorId}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600 transition"
                  >
                    <option value="">Seleccione el sector...</option>
                    {catalogos.sectores.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: HU 2 */}
          {pasoActual === 2 && (
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">
                  Paso 2 de 4 • Historia de Usuario 2
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-2">
                  Demanda de Formación Continua y Posgrados
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Ayuda a orientar las especializaciones y maestrías según la demanda real del mercado.
                </p>
              </div>

              <div className="space-y-5 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                    Nivel Académico de tu Mayor Interés
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {catalogos.nivelesPosgrado.map((pos) => {
                      const seleccionado = String(formData.nivelPosgradoId) === String(pos.id)
                      return (
                        <div
                          key={pos.id}
                          onClick={() => setFormData({ ...formData, nivelPosgradoId: pos.id })}
                          className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between text-xs font-semibold ${
                            seleccionado
                              ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span>{pos.nombre}</span>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              seleccionado ? 'border-blue-600 bg-blue-600 text-white text-[10px]' : 'border-slate-300'
                            }`}
                          >
                            {seleccionado && '✓'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Áreas Temáticas Priorizadas (Hasta 3 en orden de relevancia)
                  </label>

                  <div>
                    <label className="block text-[11px] text-slate-500 font-medium mb-1">
                      1ª Prioridad (Principal):
                    </label>
                    <select
                      name="areaPrioritaria1"
                      value={formData.areaPrioritaria1}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600 transition"
                    >
                      <option value="">Seleccione área prioritaria...</option>
                      {catalogos.areasTematicas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 font-medium mb-1">
                      2ª Prioridad (Opcional):
                    </label>
                    <select
                      name="areaPrioritaria2"
                      value={formData.areaPrioritaria2}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600 transition"
                    >
                      <option value="">Ninguna / Segunda opción...</option>
                      {catalogos.areasTematicas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 font-medium mb-1">
                      3ª Prioridad (Opcional):
                    </label>
                    <select
                      name="areaPrioritaria3"
                      value={formData.areaPrioritaria3}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-600 transition"
                    >
                      <option value="">Ninguna / Tercera opción...</option>
                      {catalogos.areasTematicas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: HU 3 */}
          {pasoActual === 3 && (
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">
                  Paso 3 de 4 • Historia de Usuario 3
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-2">
                  Disponibilidad y Fuentes de Financiamiento
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Permite analizar restricciones económicas para gestionar convenios y becas.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  ¿Cómo estimas costear tus próximos estudios de posgrado?
                </label>
                {catalogos.fuentesFinanciamiento.map((fuente) => {
                  const seleccionado = String(formData.fuenteFinanciamientoId) === String(fuente.id)
                  return (
                    <label
                      key={fuente.id}
                      className={`flex items-center gap-3.5 p-3.5 rounded-xl border cursor-pointer transition ${
                        seleccionado
                          ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="fuenteFinanciamientoId"
                        value={fuente.id}
                        checked={seleccionado}
                        onChange={handleChange}
                        className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span className="text-xs font-semibold text-slate-800">
                        {fuente.nombre}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* PASO 4: HU 4 */}
          {pasoActual === 4 && (
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">
                  Paso 4 de 4 • Historia de Usuario 4
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-2">
                  Evaluación de Competencias y Malla Curricular
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Evalúa de 1 a 5 la suficiencia de la formación recibida frente a la exigencia de tu puesto de trabajo.
                </p>
                <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-2">
                  <span>1: Muy Insuficiente</span>
                  <span>•</span>
                  <span>3: Adecuada</span>
                  <span>•</span>
                  <span>5: Altamente Competente</span>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {catalogos.competencias.map((comp) => {
                    const puntajeActual = formData.competenciasPuntajes[comp.id] || 3
                    return (
                      <div
                        key={comp.id}
                        className="p-4 flex flex-col gap-2 bg-white"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-800">{comp.nombre}</p>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                              {comp.tipo === 'tecnica' ? 'Técnica (Hard Skill)' : 'Transversal (Soft Skill)'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            {[1, 2, 3, 4, 5].map((val) => (
                              <button
                                type="button"
                                key={val}
                                onClick={() => handleLikertChange(comp.id, val)}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                                  puntajeActual === val
                                    ? 'bg-[#0F2942] text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Comentario opcional por competencia de la tabla evaluaciones_competencia */}
                        <input
                          type="text"
                          placeholder="Comentario u observación puntual para esta competencia (opcional)..."
                          value={formData.comentariosCompetencia[comp.id] || ''}
                          onChange={(e) => handleComentarioChange(comp.id, e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-blue-400"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Botones de navegación inferior */}
          <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
            {pasoActual > 1 ? (
              <button
                type="button"
                onClick={handleAnterior}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl transition cursor-pointer"
              >
                ← Anterior
              </button>
            ) : (
              <div />
            )}

            {pasoActual < 4 ? (
              <button
                type="button"
                onClick={handleSiguiente}
                className="px-6 py-2.5 bg-[#0F2942] hover:bg-[#1a3d5f] text-white text-xs font-semibold rounded-xl shadow transition cursor-pointer"
              >
                Siguiente →
              </button>
            ) : (
              <button
                type="button"
                disabled={enviando}
                onClick={handleSubmit}
                className="px-7 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {enviando ? 'Enviando...' : 'Finalizar y Enviar Encuesta'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default EncuestaWizard