import React, { useState } from 'react';
import { CsvUploader } from './components/CsvUploader';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { analisisService } from '../../../services/analisis';
import { BarChart3, Filter } from 'lucide-react';

export const Dashboard = () => {
  const [variableFila, setVariableFila] = useState('edad');
  const [variableColumna, setVariableColumna] = useState('situacion');
  const [dataChi, setDataChi] = useState(null);
  const [calculando, setCalculando] = useState(false);
  const [errorAnalisis, setErrorAnalisis] = useState('');

  const variablesDisponibles = [
    { id: 'edad', label: 'Rango de Edad' },
    { id: 'genero', label: 'Género' },
    { id: 'situacion', label: 'Situación Laboral' },
    { id: 'rubro', label: 'Rubro de la Empresa' },
    { id: 'sector', label: 'Sector (Público/Privado)' },
    { id: 'cargo', label: 'Cargo que Ocupa' },
    { id: 'remuneracion', label: 'Rango Salarial' },
  ];

  const handleCalcular = async () => {
    if (variableFila === variableColumna) {
      setErrorAnalisis('Debes seleccionar dos variables distintas para el cruce.');
      return;
    }

    setCalculando(true);
    setErrorAnalisis('');
    try {
      const resp = await analisisService.calcularChiCuadrado(variableFila, variableColumna);
      setDataChi(resp);
    } catch (err) {
      setErrorAnalisis(err.message);
    } finally {
      setCalculando(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
          Panel de Encuestas y Análisis Estadístico
        </h1>
        <p style={{ color: '#64748b', margin: 0 }}>
          Sube tus archivos de Microsoft Forms / Google Forms y analiza los resultados en tiempo real.
        </p>
      </div>

      {/* 1. Subidor de archivos */}
      <CsvUploader onImportSuccess={() => handleCalcular()} />

      {/* 2. Selector de variables para Chi-Cuadrado */}
      <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#334155' }}>
          <Filter size={18} /> Cruce de Variables:
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Variable 1 (Filas):</label>
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

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Variable 2 (Columnas):</label>
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
          onClick={handleCalcular}
          disabled={calculando}
          style={{
            padding: '0.5rem 1rem',
            background: '#0f172a',
            color: '#fff',
            borderRadius: '6px',
            border: 'none',
            fontWeight: 600,
            cursor: calculando ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            marginLeft: 'auto'
          }}
        >
          <BarChart3 size={16} />
          {calculando ? 'Calculando...' : 'Calcular Chi-cuadrado'}
        </button>
      </div>

      {errorAnalisis && (
        <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.9rem' }}>
          {errorAnalisis}
        </div>
      )}

      {/* 3. Métricas y Gráficos */}
      <AnalyticsCharts
        dataChi={dataChi}
        variableFila={variablesDisponibles.find((v) => v.id === variableFila)?.label}
        variableColumna={variablesDisponibles.find((v) => v.id === variableColumna)?.label}
      />
    </div>
  );
};

export default Dashboard;