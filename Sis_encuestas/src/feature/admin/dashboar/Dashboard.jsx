// feature/admin/dashboar/Dashboard.jsx
import  { useState, useMemo } from 'react';
import CsvUploader from './components/CsvUploader';
import DynamicFilters from './components/DynamicFilters';
import AnalyticsCharts from './components/AnalyticsCharts';
import {
  calcularMedia,
  calcularMediana,
  calcularDesviacionEstandar
} from './components/StatisticalEngine';
import { Download, FileText, CheckCircle2 } from 'lucide-react';

export default function Dashboard() {
  const [datosTitulados, setDatosTitulados] = useState([]);
  const [datosEmpleadores, setDatosEmpleadores] = useState([]);
  const [modo, setModo] = useState('empleadores'); // 'titulados' | 'empleadores' | 'cruzado'
  const [filtrosActivos, setFiltrosActivos] = useState({});

  // Carga según archivo
  const manejarDatosCargados = (datos, tipo) => {
    if (tipo === 'empleadores') {
      setDatosEmpleadores(datos);
      setModo('empleadores');
    } else {
      setDatosTitulados(datos);
      setModo('titulados');
    }
    setFiltrosActivos({});
  };

  // Conjunto de datos base activo
  const datosBase = useMemo(() => {
    if (modo === 'empleadores') return datosEmpleadores;
    if (modo === 'titulados') return datosTitulados;
    // Modo Cruzado: une registros emparejados por rubro / área
    return [...datosEmpleadores, ...datosTitulados];
  }, [modo, datosEmpleadores, datosTitulados]);

  // Generador de filtros dinámicos según el modo seleccionado
  const filtrosDisponibles = useMemo(() => {
    if (!datosBase.length) return [];
    const llaves = Object.keys(datosBase[0]);

    return llaves
      .map(clave => {
        const opciones = Array.from(new Set(datosBase.map(d => String(d[clave] || '')).filter(Boolean)));
        return {
          clave,
          label: clave.length > 25 ? clave.substring(0, 25) + '...' : clave,
          opciones
        };
      })
      .filter(f => f.opciones.length > 1 && f.opciones.length <= 30);
  }, [datosBase]);

  const cambiarFiltro = (clave, valor) => {
    setFiltrosActivos(prev => ({
      ...prev,
      [clave]: valor
    }));
  };

  // Filtrado reactivo en memoria
  const datosFiltrados = useMemo(() => {
    return datosBase.filter(row => {
      for (const [clave, val] of Object.entries(filtrosActivos)) {
        if (val !== 'TODOS' && String(row[clave]) !== String(val)) {
          return false;
        }
      }
      return true;
    });
  }, [datosBase, filtrosActivos]);

  // Estadísticas numéricas calculadas en vivo
  const metricasDescriptivas = useMemo(() => {
    if (!datosFiltrados.length) return null;
    // Buscar columnas numéricas (ej. antiguedad, salarios, años)
    const primeraFila = datosFiltrados[0];
    const colNum = Object.keys(primeraFila).find(k => typeof primeraFila[k] === 'number');

    if (!colNum) return null;
    const valores = datosFiltrados.map(d => Number(d[colNum])).filter(n => !isNaN(n));
    const media = calcularMedia(valores);
    const mediana = calcularMediana(valores);
    const desviacion = calcularDesviacionEstandar(valores, media);

    return { colNum, media, mediana, desviacion };
  }, [datosFiltrados]);

  // Exportar Mini-Informe en HTML / Impresión del docente
  const exportarMiniInforme = () => {
    const ventana = window.open('', '_blank');
    ventana.document.write(`
      <html>
        <head>
          <title>Mini Informe ARCUSUR - Segmentación de Mercado</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
            h2 { color: #2563eb; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: left; }
            th { background-color: #f1f5f9; }
          </style>
        </head>
        <body>
          <h2>Informe Estadístico de Encuestas - UMSS</h2>
          <p><b>Modo de Análisis:</b> ${modo.toUpperCase()}</p>
          <p><b>Filtros Aplicados:</b> ${JSON.stringify(filtrosActivos)}</p>
          <p><b>Muestra Filtrada:</b> ${datosFiltrados.length} registros</p>
          ${metricasDescriptivas ? `
            <p><b>Variable Numérica Analizada:</b> ${metricasDescriptivas.colNum}</p>
            <p><b>Media:</b> ${metricasDescriptivas.media} | <b>Mediana:</b> ${metricasDescriptivas.mediana} \vert{} <b>Desv. Estándar:</b> ${metricasDescriptivas.desviacion}</p>
          ` : ''}
          <button onclick="window.print()">Imprimir / Guardar en PDF</button>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0F172A', fontSize: '22px' }}>Panel Multivariable de Encuestas (ARCUSUR)</h2>
          <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '13px' }}>
            Filtros cruzados, medidas univariadas y correlaciones de independencia.
          </p>
        </div>

        {datosFiltrados.length > 0 && (
          <button
            onClick={exportarMiniInforme}
            style={{
              backgroundColor: '#0F172A',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileText size={15} /> Exportar Mini-Informe
          </button>
        )}
      </div>

      {/* 1. Subidor de Archivos */}
      <CsvUploader onCargaCompleta={manejarDatosCargados} />

      {datosBase.length > 0 && (
        <>
          {/* 2. Barra de Filtros por Encuesta / Cruzado */}
          <DynamicFilters
            modo={modo}
            setModo={setModo}
            filtrosDisponibles={filtrosDisponibles}
            filtrosActivos={filtrosActivos}
            onCambiarFiltro={cambiarFiltro}
            onResetear={() => setFiltrosActivos({})}
            totalResultados={datosFiltrados.length}
          />

          {/* Tarjetas de Medidas Estadísticas Numéricas */}
          {metricasDescriptivas && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Variable: {metricasDescriptivas.colNum}</span>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0F172A' }}>Media: {metricasDescriptivas.media}</div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Mediana</span>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0F172A' }}>{metricasDescriptivas.mediana}</div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Desviación Estándar</span>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0F172A' }}>± {metricasDescriptivas.desviacion}</div>
              </div>
            </div>
          )}

          {/* 3. Panel de Múltiples Gráficas */}
          <AnalyticsCharts
            datos={datosFiltrados}
            modo={modo}
            variableX={filtrosDisponibles[0]?.clave || ''}
            variableY={filtrosDisponibles[1]?.clave || ''}
          />
        </>
      )}
    </div>
  );
}