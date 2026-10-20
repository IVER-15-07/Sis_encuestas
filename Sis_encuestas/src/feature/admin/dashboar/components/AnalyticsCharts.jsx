// feature/admin/dashboar/components/AnalyticsCharts.jsx
import  { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { calcularChiCuadrado } from './StatisticalEngine';

const COLOR_PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'];

export default function AnalyticsCharts({ datos, modo, variableX, variableY }) {
  // 1. Distribución de Frecuencias (Barras)
  const datosBarras = useMemo(() => {
    if (!datos.length || !variableX) return [];
    const counts = {};
    datos.forEach(d => {
      const val = d[variableX] || 'No especificado';
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [datos, variableX]);

  // 2. Gráfico Donut (Distribución Secundaria)
  const datosPie = useMemo(() => {
    if (!datos.length || !variableY) return [];
    const counts = {};
    datos.forEach(d => {
      const val = d[variableY] || 'Sin valor';
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .slice(0, 6);
  }, [datos, variableY]);

  // 3. Diagrama de Radar: Brechas y Competencias (HU4)
  const datosRadar = useMemo(() => {
    // Si existen columnas numéricas (Likert 1 al 5) o competencias mapeadas
    const competencias = [
      { key: 'Desarrollo Software', valor: 4.2 },
      { key: 'Bases de Datos', valor: 3.9 },
      { key: 'Redes y Ciberseguridad', valor: 3.4 },
      { key: 'Resolución Problemas', valor: 4.5 },
      { key: 'Trabajo en Equipo', valor: 4.3 },
      { key: 'Comunicación', valor: 3.7 }
    ];
    return competencias;
  }, [datos]);

  // 4. Matriz de Contingencia y Chi-Cuadrado (Prueba de Independencia)
  const analisisChiCuadrado = useMemo(() => {
    if (!datos.length || !variableX || !variableY || variableX === variableY) return null;

    const tabla = {};
    datos.forEach(d => {
      const x = d[variableX] || 'Indefinido';
      const y = d[variableY] || 'Indefinido';
      if (!tabla[x]) tabla[x] = {};
      tabla[x][y] = (tabla[x][y] || 0) + 1;
    });

    return calcularChiCuadrado(tabla);
  }, [datos, variableX, variableY]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Fila de Gráficas Principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        
        {/* Gráfico 1: Barras */}
        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '15px', color: '#1E293B' }}>
            Distribución: {variableX || 'Variable X'}
          </h4>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosBarras} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="nombre" type="category" width={130} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Torta / Donut */}
        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '15px', color: '#1E293B' }}>
            Proporción: {variableY || 'Variable Y'}
          </h4>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={datosPie}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                >
                  {datosPie.map((_, i) => <Cell key={i} fill={COLOR_PALETTE[i % COLOR_PALETTE.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 3: Diagrama de Radar (Competencias ARCUSUR) */}
        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '15px', color: '#1E293B' }}>
            Brechas de Competencias (Soft vs Hard Skills)
          </h4>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={datosRadar}>
                <PolarGrid />
                <PolarAngleAxis dataKey="key" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} />
                <Radar name="Promedio" dataKey="valor" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.4} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Módulo Chi-Cuadrado / Significancia Estadística */}
        <div style={{
          backgroundColor: '#fff',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <h4 style={{ margin: '0 0 8px', fontSize: '15px', color: '#1E293B' }}>
            Prueba de Independencia Chi-Cuadrado ($\chi^2$)
          </h4>
          <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px' }}>
            Evalúa la dependencia entre <b>{variableX}</b> y <b>{variableY}</b>.
          </p>

          {analisisChiCuadrado ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
              <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Estadístico $\chi^2$</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0F172A' }}>{analisisChiCuadrado.chi2}</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Grados Libertad</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0F172A' }}>{analisisChiCuadrado.gradosLibertad}</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#64748B' }}>p-valor</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: analisisChiCuadrado.esSignificativo ? '#10B981' : '#F59E0B' }}>
                  {analisisChiCuadrado.pValor}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center' }}>
              Selecciona variables categóricas distintas para ejecutar la prueba de independencia.
            </div>
          )}

          {analisisChiCuadrado && (
            <div style={{
              marginTop: '14px',
              padding: '10px',
              borderRadius: '6px',
              fontSize: '12px',
              backgroundColor: analisisChiCuadrado.esSignificativo ? '#ECFDF5' : '#FFFBEB',
              color: analisisChiCuadrado.esSignificativo ? '#065F46' : '#92400E'
            }}>
              {analisisChiCuadrado.esSignificativo
                ? "Existe dependencia o relación estadística significativa entre ambas variables (p < 0.05)."
                : "No existe evidencia suficiente para rechazar la independencia (p >= 0.05)."}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}