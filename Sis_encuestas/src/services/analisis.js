import axiosInstance from '../helpers/axios-config';

export const analisisService = {
    // Obtener lista de archivos subidos previamente
    async listarHistorialArchivos(tipo = 'titulados') {
        try {
            const { data } = await axiosInstance.get('/api/importaciones/historial', { params: { tipo } });
            return data;
        } catch (error) {
            const mensaje = error.response?.data?.error || error.response?.data?.message || 'Error al obtener historial';
            throw new Error(mensaje, { cause: error });
        }
    },

    // Cálculo de Chi-cuadrado con opción de filtrar por lote/archivo
    async calcularChiCuadrado(variableFila, variableColumna, importacionId = null) {
        const formData = new FormData();
        formData.append('variableFila', variableFila);
        formData.append('variableColumna', variableColumna);
        if (importacionId) {
            formData.append('importacionId', importacionId);
        }

        try {
            const { data } = await axiosInstance.post('/api/analisis/chi-cuadrado', formData);
            return data;
        } catch (error) {
            const mensaje = error.response?.data?.error || error.response?.data?.message || 'Error al calcular Chi-cuadrado';
            throw new Error(mensaje, { cause: error });
        }
    },

    // Descarga del CSV desde la BD
    async descargarCsv(importacionId = null) {
        try {
            const params = importacionId ? { importacionId } : {};
            const response = await axiosInstance.get('/api/exportar/titulados-csv', {
                params,
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'datos_titulados_guardados.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            throw new Error('Error al descargar el archivo CSV', { cause: error });
        }
    },


    async descargarMatrizCruzadaCsv(variableFila, variableColumna, importacionId = null) {
        try {
            const params = { variableFila, variableColumna };
            if (importacionId) params.importacionId = importacionId;

            const response = await axiosInstance.get('/api/exportar/matriz-cruzada-csv', {
                params,
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `matriz_${variableFila}_vs_${variableColumna}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            throw new Error('Error al descargar la matriz cruzada', { cause: error });
        }
    }
};