import React, { useState, useEffect } from 'react';
import { CsvUploader } from './components/CsvUploader';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { analisisService } from '../../../services/analisis';
import { History, BarChart3, Filter, Download, FileSpreadsheet } from 'lucide-react';

export const Dashboard = () => {
  // Estados para archivos previos y selección
  const [archivosGuardados, setArchivosGuardados] = useState([]);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState('');

  // Estados de variables y resultados analíticos
  const [variableFila, setVariableFila] = useState('remuneracion');
  const [variableColumna, setVariableColumna] = useState('rubro');
  const [dataChi, setDataChi] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [errorAnalisis, setErrorAnalisis] = useState('');

  const variablesDisponibles = [
    { id: 'remuneracion', label: 'Rango Salarial' },
    { id: 'rubro', label: 'Rubro de la Empresa' },
    { id: 'edad_rango', label: 'Rango de Edad' },
    { id: 'genero', label: 'Género' },
    { id: 'situacion', label: 'Situación Laboral' },
    { id: 'sector', label: 'Sector (Público/Privado)' },
    { id: 'cargo', label: 'Cargo que Ocupa' },
  ];

  // 1. Cargar lista de archivos guardados al inicio
  useEffect(() => {
    let cancelado = false;

    analisisService.listarHistorialArchivos('titulados')
      .then((historial) => {
        if (!cancelado) {
          setArchivosGuardados(historial);
        }
      })
      .catch((err) => {
        console.error("Error al cargar historial:", err);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  // 2. Cargar análisis al cambiar de archivo o variables
  useEffect(() => {
    if (variableFila === variableColumna) {
      return;
    }

    let cancelado = false;

    analisisService.calcularChiCuadrado(
      variableFila,
      variableColumna,
      archivoSeleccionado || null
    )
      .then((resultado) => {
        if (!cancelado) {
          setDataChi(resultado);
          setErrorAnalisis('');
          setCargando(false);
        }
      })
      .catch((err) => {
        if (!cancelado) {
          setErrorAnalisis(err.message || 'Error al obtener datos');
          setCargando(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [archivoSeleccionado, variableFila, variableColumna]);

  // Manejar recarga cuando se sube un nuevo archivo desde CsvUploader
  const handleImportSuccess = () => {
    analisisService.listarHistorialArchivos('titulados')
      .then((historial) => {
        setArchivosGuardados(historial);
        setArchivoSeleccionado('');
      })
      .catch((err) => console.error("Error al recargar historial:", err));
  };

  const handleConsultarClick = () => {
    if (variableFila === variableColumna) {
      setErrorAnalisis('Debes seleccionar dos variables distintas para el cruce.');
      return;
    }

    setCargando(true);
    setErrorAnalisis('');

    analisisService.calcularChiCuadrado(
      variableFila,
      variableColumna,
      archivoSeleccionado || null
    )
      .then((resultado) => {
        setDataChi(resultado);
      })
      .catch((err) => {
        setErrorAnalisis(err.message || 'Error al obtener datos');
      })
      .finally(() => {
        setCargando(false);
      });
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Encabezado */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
          Panel Analítico de Encuestas
        </h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>
          Carga nuevos archivos Excel o consulta las estadísticas de importaciones previas guardadas en la base de datos.
        </p>
      </div>

      {/* 1. Módulo para subir nuevos archivos Excel */}
      <CsvUploader onImportSuccess={handleImportSuccess} />

      {/* 2. Barra de control: Selección de archivo guardado y cruce de variables */}
      <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        
        {/* Selector de archivo histórico y Botones de Exportación */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <History size={18} color="#2563eb" />
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
              Archivo a visualizar:
            </label>
            <select
              value={archivoSeleccionado}
              onChange={(e) => setArchivoSeleccionado(e.target.value)}
              style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '320px', fontSize: '0.85rem' }}
            >
              <option value="">-- Todos los archivos (Histórico acumulado) --</option>
              {archivosGuardados.map((arch) => (
                <option key={arch.id} value={arch.id}>
                  {arch.nombre_archivo} ({arch.filas_cargadas} registros - {new Date(arch.creado_en).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {/* Botones de Descarga */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Exportación 1: Datos planos */}
            <button
              onClick={() => analisisService.descargarCsv(archivoSeleccionado || null)}
              style={{ padding: '0.45rem 0.85rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <Download size={15} /> Exportar Datos Planos
            </button>

            {/* Exportación 2: Matriz Cruzada ARCUSUR */}
            <button
              onClick={() => analisisService.descargarMatrizCruzadaCsv(variableFila, variableColumna, archivoSeleccionado || null)}
              style={{ padding: '0.45rem 0.85rem', background: '#0f766e', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <FileSpreadsheet size={15} /> Exportar Matriz Cruzada (CSV)
            </button>
          </div>
        </div>

        {/* Cruce de variables Chi-cuadrado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>
            <Filter size={16} /> Variables a Cruzar:
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Fila:</label>
            <select
              value={variableFila}
              onChange={(e) => setVariableFila(e.target.value)}
              style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              {variablesDisponibles.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Columna:</label>
            <select
              value={variableColumna}
              onChange={(e) => setVariableColumna(e.target.value)}
              style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              {variablesDisponibles.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleConsultarClick}
            disabled={cargando}
            style={{
              padding: '0.5rem 1.1rem',
              background: '#0f172a',
              color: '#fff',
              borderRadius: '6px',
              border: 'none',
              fontWeight: 600,
              cursor: cargando ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              marginLeft: 'auto'
            }}
          >
            <BarChart3 size={16} />
            {cargando ? 'Actualizando...' : 'Actualizar Gráficos'}
          </button>
        </div>
      </div>

      {errorAnalisis && (
        <div style={{ padding: '0.85rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontSize: '0.9rem' }}>
          {errorAnalisis}
        </div>
      )}

      {/* 3. Render de gráficas y estadísticas */}
      <AnalyticsCharts
        dataChi={dataChi}
        variableFila={variablesDisponibles.find((v) => v.id === variableFila)?.label}
        variableColumna={variablesDisponibles.find((v) => v.id === variableColumna)?.label}
      />
    </div>
  );
};

export default Dashboard;