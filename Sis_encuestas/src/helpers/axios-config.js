import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:8282',
  timeout: 15000,
});

// Interceptor para inyectar automáticamente el token en cada petición
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;