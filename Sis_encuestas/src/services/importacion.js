import axiosInstance from '../helpers/axios-config';

const obtenerMensajeError = (error, tipo) => {
  const data = error.response?.data;
  const detalle = typeof data === 'string' ? data : data?.error || data?.message;

  if (detalle) return detalle;
  if (error.response?.status) {
    return `Error al importar ${tipo} (HTTP ${error.response.status}): ${error.message}`;
  }
  return `No se pudo conectar con el servidor para importar ${tipo}: ${error.message || 'Error desconocido'}`;
};

export const importacionService = {
  async subirTitulados(archivo) {
    const formData = new FormData();
    formData.append('archivo', archivo);

    try {
      const { data } = await axiosInstance.post('/api/importacion/titulados', formData);
      return data;
    } catch (error) {
      const mensaje = obtenerMensajeError(error, 'titulados');
      throw new Error(mensaje, { cause: error });
    }
  },

  async subirEmpleadores(archivo) {
    const formData = new FormData();
    formData.append('archivo', archivo);

    try {
      const { data } = await axiosInstance.post('/api/importacion/empleadores', formData);
      return data;
    } catch (error) {
      const mensaje = obtenerMensajeError(error, 'empleadores');
      throw new Error(mensaje, { cause: error });
    }
  },
};