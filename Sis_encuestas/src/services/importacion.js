import axiosInstance from '../helpers/axios-config';

export const importacionService = {
  async subirTitulados(archivo) {
    const formData = new FormData();
    formData.append('archivo', archivo);

    try {
      const { data } = await axiosInstance.post('/api/importacion/titulados', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    } catch (error) {
      const mensaje = error.response?.data?.error || error.response?.data?.message || 'Error al importar titulados';
      throw new Error(mensaje, { cause: error });
    }
  },

  async subirEmpleadores(archivo) {
    const formData = new FormData();
    formData.append('archivo', archivo);

    try {
      const { data } = await axiosInstance.post('/api/importacion/empleadores', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    } catch (error) {
      const mensaje = error.response?.data?.error || error.response?.data?.message || 'Error al importar empleadores';
      throw new Error(mensaje, { cause: error });
    }
  },
};