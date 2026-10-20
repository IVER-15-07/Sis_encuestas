import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

export const AnalyticsCharts = ({ dataChi, variableFila, variableColumna }) => {
  if (!dataChi) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
        Selecciona las variables y presiona "Calcular Chi-cuadrado" para generar los gráficos.
      </div>
    );
  }

  // Estructurar matriz para Recharts
  const chartData = dataChi.categoriasFila.map((fila, i) => {
    const item = { name: fila };
    dataChi.categoriasColumna.forEach((col, j) => {
      item[col] = dataChi.observados[i][j];
    });
    return item;
  });

  const colores = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const esSignificativo = dataChi.pValor < 0.05;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Tarjeta de métricas estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Chi-cuadrado (χ²)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{dataChi.chiCuadrado?.toFixed(3)}</div>
        </div>

        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Grados de Libertad (gl)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{dataChi.gradosLibertad}</div>
        </div>

        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>p-valor</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: esSignificativo ? '#16a34a' : '#dc2626' }}>
            {dataChi.pValor < 0.001 ? '< 0.001' : dataChi.pValor?.toFixed(4)}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Conclusión Estadística</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.4rem', color: esSignificativo ? '#16a34a' : '#64748b' }}>
            {esSignificativo ? 'Existe relación significativa (p < 0.05)' : 'No hay relación significativa (p ≥ 0.05)'}
          </div>
        </div>
      </div>

      {/* Gráfico de Barras */}
      <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>
          Distribución de Frecuencias: {variableFila} vs {variableColumna}
        </h4>
        <div style={{ width: '100%', height: 350 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {dataChi.categoriasColumna.map((col, idx) => (
                <Bar key={col} dataKey={col} fill={colores[idx % colores.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};