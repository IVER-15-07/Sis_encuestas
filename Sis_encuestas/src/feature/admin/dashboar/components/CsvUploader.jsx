import React, { useState } from 'react';
import { importacionService } from '../../../../services/importacion';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';

export const CsvUploader = ({ onImportSuccess }) => {
  const [tipo, setTipo] = useState('titulados');
  const [archivo, setArchivo] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setArchivo(e.target.files[0]);
      setError('');
      setMensaje(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!archivo) {
      setError('Selecciona un archivo Excel (.xlsx)');
      return;
    }

    setCargando(true);
    setError('');
    setMensaje(null);

    try {
      const resp = tipo === 'titulados'
        ? await importacionService.subirTitulados(archivo)
        : await importacionService.subirEmpleadores(archivo);

      setMensaje(resp);
      setArchivo(null);
      e.target.reset();
      if (onImportSuccess) onImportSuccess(tipo);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <FileSpreadsheet color="#2563eb" size={24} />
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: '#1e293b' }}>
          Cargar Encuestas Excel
        </h3>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '1rem', alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
            Tipo de Encuesta:
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            disabled={cargando}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="titulados">Titulados (Sistemas)</option>
            <option value="empleadores">Empleadores</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
            Archivo (.xlsx):
          </label>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            disabled={cargando}
            style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc' }}
          />
        </div>

        <button
          type="submit"
          disabled={cargando || !archivo}
          style={{
            padding: '0.6rem 1.25rem',
            background: cargando ? '#94a3b8' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: cargando ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Upload size={16} />
          {cargando ? 'Importando...' : 'Cargar'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {mensaje && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#dcfce7', color: '#166534', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <CheckCircle size={18} />
          <span>
            {mensaje.mensaje} (Cargadas: <strong>{mensaje.cargadas}</strong>, Omitidas: {mensaje.rechazadas})
          </span>
        </div>
      )}
    </div>
  );
};