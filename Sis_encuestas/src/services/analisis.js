import axiosInstance from '../helpers/axios-config';

const extraerError = (error) => {
  const mensaje =
    error.response?.data?.error ||
    error.response?.data?.message ||
    error.message ||
    'Error al comunicarse con el servidor';
  return new Error(mensaje, { cause: error });
};

const construirParamsFiltro = (filtros = {}, extra = {}) => {
  const params = new URLSearchParams();

  if (filtros.importacionId) params.append('importacionId', filtros.importacionId);
  if (filtros.anioTitulacion) params.append('anioTitulacion', filtros.anioTitulacion);
  if (filtros.situacion && filtros.situacion !== 'Todos') params.append('situacion', filtros.situacion);
  if (filtros.sector && filtros.sector !== 'Todos') params.append('sector', filtros.sector);
  if (filtros.genero && filtros.genero !== 'Todos') params.append('genero', filtros.genero);
  if (filtros.edadRango && filtros.edadRango !== 'Todos') params.append('edadRango', filtros.edadRango);
  if (filtros.interesadoPosgrado !== '' && filtros.interesadoPosgrado !== null && filtros.interesadoPosgrado !== undefined) {
    params.append('interesadoPosgrado', filtros.interesadoPosgrado);
  }
  if (filtros.umbralAnios) params.append('umbralAnios', filtros.umbralAnios);

  Object.entries(extra).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') {
      params.append(k, v);
    }
  });

  return params;
};

export const analisisService = {
  // 1. Historial de archivos subidos ('titulados' o 'empleadores')
  async listarHistorialArchivos(tipo = 'titulados') {
    try {
      const { data } = await axiosInstance.get('/api/importaciones/historial', {
        params: { tipo },
      });
      return data;
    } catch (error) {
      throw extraerError(error);
    }
  },

  // 2. Catálogo maestro de preguntas desde tabla `pregunta`
  async listarPreguntas(encuesta = 'titulados') {
    try {
      const { data } = await axiosInstance.get('/api/analisis/preguntas', {
        params: { encuesta },
      });
      return data;
    } catch (error) {
      throw extraerError(error);
    }
  },

  // 3. Pestaña 1: Perfil de empleabilidad (5 subpestañas + umbral Junior/Consolidado)
  async obtenerPerfilEmpleabilidad(filtros = {}) {
    try {
      const params = construirParamsFiltro(filtros);
      const { data } = await axiosInstance.get('/api/analisis/titulados/perfil-empleabilidad', { params });
      return data;
    } catch (error) {
      throw extraerError(error);
    }
  },

  // 4. Pestaña 2: Formación continua (Posgrado cursado, Interés, Opinión FCyT)
  async obtenerFormacionContinua(filtros = {}) {
    try {
      const params = construirParamsFiltro(filtros);
      const { data } = await axiosInstance.get('/api/analisis/titulados/formacion-continua', { params });
      return data;
    } catch (error) {
      throw extraerError(error);
    }
  },

  // 5. Pestaña 3: Financiamiento + Kruskal-Wallis Monte Carlo
  async obtenerFinanciamiento(columna = 'nivel', filtros = {}) {
    try {
      const params = construirParamsFiltro(filtros, { columna });
      const { data } = await axiosInstance.get('/api/analisis/titulados/financiamiento', { params });
      return data;
    } catch (error) {
      throw extraerError(error);
    }
  },

  // 6. Pestaña 4: Brechas de competencias + Spearman + Malla/Asignaturas
  async obtenerBrechasCompetencias(filtros = {}) {
    try {
      const params = construirParamsFiltro(filtros);
      const { data } = await axiosInstance.get('/api/analisis/titulados/brechas-competencias', { params });
      return data;
    } catch (error) {
      throw extraerError(error);
    }
  },

  // 7. Pestaña 5: Cruce avanzado (Chi-cuadrado, V de Cramér y Fisher-Freeman-Halton Monte Carlo)
  async calcularCruceAvanzado(encuesta = 'titulados', variableFila, variableColumna, filtros = {}) {
    try {
      const params = construirParamsFiltro(filtros, {
        encuesta,
        variableFila,
        variableColumna,
      });
      const { data } = await axiosInstance.post('/api/analisis/cruce-avanzado', null, { params });
      return data;
    } catch (error) {
      throw extraerError(error);
    }
  },

  // 8. Pestaña 6: Simulación de escenarios Monte Carlo (Transformada Inversa)
  async simularMonteCarlo({
    preguntaCodigo,
    personasN = 100,
    replicasR = 1000,
    semilla = 42,
    probabilidadesPersonalizadasPct = null,
    filtros = {},
  }) {
    try {
      const params = construirParamsFiltro(filtros, {
        preguntaCodigo,
        personasN,
        replicasR,
        semilla,
      });
      const { data } = await axiosInstance.post(
        '/api/analisis/simulacion/monte-carlo',
        probabilidadesPersonalizadasPct,
        { params }
      );
      return data;
    } catch (error) {
      throw extraerError(error);
    }
  },

  // 9. Exportar matriz cruzada + metadatos estadísticos en CSV
  async descargarMatrizCruzadaCsv(encuesta = 'titulados', variableFila, variableColumna, importacionId = null) {
    try {
      const params = { encuesta, variableFila, variableColumna };
      if (importacionId) params.importacionId = importacionId;

      const response = await axiosInstance.get('/api/exportar/matriz-cruzada-csv', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cruce_${encuesta}_${variableFila}_${variableColumna}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw extraerError(error);
    }
  },
};