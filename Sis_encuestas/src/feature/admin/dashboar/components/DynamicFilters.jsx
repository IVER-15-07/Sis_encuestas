// feature/admin/dashboar/components/DynamicFilters.jsx
import React from 'react';
import { Filter, Users, Building2, Shuffle, RotateCcw } from 'lucide-react';

export default function DynamicFilters({
  modo,
  setModo,
  filtrosDisponibles,
  filtrosActivos,
  onCambiarFiltro,
  onResetear,
  totalResultados
}) {
  return (
    <div style={{
      backgroundColor: '#fff',
      padding: '16px 20px',
      borderRadius: '12px',
      border: '1px solid #E2E8F0',
      marginBottom: '20px'
    }}>
      {/* Selector de Modo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setModo('titulados')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: modo === 'titulados' ? '#3B82F6' : '#F1F5F9',
              color: modo === 'titulados' ? '#fff' : '#475569',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Users size={15} /> Filtro Titulados
          </button>

          <button
            onClick={() => setModo('empleadores')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: modo === 'empleadores' ? '#3B82F6' : '#F1F5F9',
              color: modo === 'empleadores' ? '#fff' : '#475569',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Building2 size={15} /> Filtro Empleadores
          </button>

          <button
            onClick={() => setModo('cruzado')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: modo === 'cruzado' ? '#8B5CF6' : '#F1F5F9',
              color: modo === 'cruzado' ? '#fff' : '#475569',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Shuffle size={15} /> Filtro Cruzado (Ambas)
          </button>
        </div>

        <button
          onClick={onResetear}
          style={{
            background: 'none',
            border: 'none',
            color: '#EF4444',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <RotateCcw size={13} /> Limpiar Filtros
        </button>
      </div>

      {/* Selectores dinámicos generados */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        {filtrosDisponibles.map(({ clave, label, opciones }) => (
          <div key={clave}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748B', marginBottom: '4px' }}>
              {label}
            </label>
            <select
              value={filtrosActivos[clave] || 'TODOS'}
              onChange={(e) => onCambiarFiltro(clave, e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                backgroundColor: '#FFF'
              }}
            >
              <option value="TODOS">Todos</option>
              {opciones.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748B', textAlign: 'right' }}>
        Registros resultantes: <b>{totalResultados}</b>
      </div>
    </div>
  );
}