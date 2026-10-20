// feature/admin/dashboar/components/CsvUploader.jsx
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Database, CheckCircle, AlertCircle } from 'lucide-react';
// import { supabase } from '../../../../core/config/supabaseClient';

export default function CsvUploader({ onCargaCompleta }) {
  const [procesando, setProcesando] = useState(false);
  const [estado, setEstado] = useState(null);

  const procesarArchivo = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProcesando(true);
    setEstado(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBuffer = evt.target.result;
        const workbook = XLSX.read(dataBuffer, { type: 'array' });
        const hoja = workbook.Sheets[workbook.SheetNames[0]];
        const filasRaw = XLSX.utils.sheet_to_json(hoja, { defval: '' });

        if (!filasRaw.length) throw new Error("El archivo no contiene filas válidas.");

        // Detección automática del tipo de encuesta por los encabezados
        const primerRegistro = filasRaw[0];
        const headers = Object.keys(primerRegistro).map(k => k.toLowerCase());

        const esEmpleadores = headers.some(h => h.includes('empresa') || h.includes('organizaci'));
        const tipoEncuesta = esEmpleadores ? 'empleadores' : 'titulados';

        // Normalización de claves limpias
        const datosLimpios = filasRaw.map(row => {
          const normalizado = {};
          Object.keys(row).forEach(k => {
            const keyLimpia = k.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            normalizado[keyLimpia] = typeof row[k] === 'string' ? row[k].trim() : row[k];
          });
          return normalizado;
        });

        /*
        // Opcional: Persistencia en Supabase
        const tablaDestino = tipoEncuesta === 'empleadores' ? 'respuestas_empleadores' : 'respuestas_titulados';
        const { error } = await supabase.from(tablaDestino).insert(datosLimpios);
        if (error) console.warn("Aviso de guardado en Supabase:", error.message);
        */

        setEstado({
          tipo: 'success',
          mensaje: `Detectada Encuesta de ${tipoEncuesta.toUpperCase()}. Procesados ${datosLimpios.length} registros.`
        });

        onCargaCompleta(datosLimpios, tipoEncuesta);
      } catch (err) {
        setEstado({ tipo: 'error', mensaje: err.message || 'Error al procesar el archivo' });
      } finally {
        setProcesando(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div style={{
      backgroundColor: '#fff',
      padding: '16px 20px',
      borderRadius: '12px',
      border: '1px solid #E2E8F0',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px'
    }}>
      <div>
        <h4 style={{ margin: 0, fontSize: '15px', color: '#0F172A' }}>Importación de Formularios Forms / CSV</h4>
        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
          Reconoce encuestas de Titulados y Empleadores para filtros unificados o cruzados.
        </p>
      </div>

      <label style={{
        backgroundColor: procesando ? '#94A3B8' : '#3B82F6',
        color: '#fff',
        padding: '9px 18px',
        borderRadius: '8px',
        cursor: procesando ? 'not-allowed' : 'pointer',
        fontSize: '13px',
        fontWeight: '600',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        {procesando ? <Database size={16} /> : <Upload size={16} />}
        {procesando ? 'Procesando...' : 'Cargar Archivo Excel / CSV'}
        <input type="file" accept=".xlsx, .xls, .csv" disabled={procesando} onChange={procesarArchivo} style={{ display: 'none' }} />
      </label>

      {estado && (
        <div style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          backgroundColor: estado.tipo === 'success' ? '#ECFDF5' : '#FEF2F2',
          color: estado.tipo === 'success' ? '#065F46' : '#991B1B'
        }}>
          {estado.tipo === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <span>{estado.mensaje}</span>
        </div>
      )}
    </div>
  );
}