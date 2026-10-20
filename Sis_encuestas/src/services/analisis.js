import axiosInstance from '../helpers/axios-config';

export const analisisService = {
  async calcularChiCuadrado(variableFila, variableColumna) {
    const formData = new FormData();
    formData.append('variableFila', variableFila);
    formData.append('variableColumna', variableColumna);

    try {
      const { data } = await axiosInstance.post('/api/analisis/chi-cuadrado', formData);
      return data;
    } catch (error) {
      const mensaje = error.response?.data?.error || error.response?.data?.message || 'Error al calcular Chi-cuadrado';
      throw new Error(mensaje, { cause: error });
    }
  },
};