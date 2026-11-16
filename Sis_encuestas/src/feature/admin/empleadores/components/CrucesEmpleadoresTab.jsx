import { useState } from 'react';
import { analisisService } from '../../../../services/analisis';
import { ArrowLeftRight } from 'lucide-react';

const PALETA_BARRAS = ['#2563eb', '#f97316', '#0d9488', '#7c3aed', '#e11d48', '#0891b2'];

const CrucesEmpleadoresTab = ({
  variablesEmp = [],
  varFila,
  setVarFila,
  varCol,
  setVarCol,
  dataCruce,
  importacionId,
}) => {
  const [subVistaCruce, setSubVistaCruce] = useState('barras');
  const [metricaCelda, setMetricaCelda] = useState('cantidad');
  const [incluirMarginales, setIncluirMarginales] = useState(true);
  const [colorearMapaCalor, setColorearMapaCalor] = useState(false);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
        <h3 className="text-xs font-bold uppercase text-slate-500">Configurar cruce</h3>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Filas</label>
          <select
            value={varFila}
            onChange={(e) => setVarFila(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-lg p-2"
          >
            {variablesEmp.map((v) => (
              <option key={v.codigo} value={v.codigo}>
                {v.etiqueta_corta} [{v.nivelMedicion}]
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => {
            const tmp = varFila;
            setVarFila(varCol);
            setVarCol(tmp);
          }}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg cursor-pointer"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" /> Invertir ejes
        </button>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Columnas</label>
          <select
            value={varCol}
            onChange={(e) => setVarCol(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-lg p-2"
          >
            {variablesEmp.map((v) => (
              <option key={v.codigo} value={v.codigo}>
                {v.etiqueta_corta} [{v.nivelMedicion}]
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Métrica de celda</p>
          {[
            { id: 'cantidad', label: 'Cantidad' },
            { id: 'pctFila', label: '% por fila' },
            { id: 'pctCol', label: '% por columna' },
            { id: 'residuo', label: 'Residuo ajustado (Haberman)' },
          ].map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="radio"
                checked={metricaCelda === m.id}
                onChange={() => setMetricaCelda(m.id)}
              />
              {m.label}
            </label>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Opciones de cálculo</p>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={incluirMarginales}
              onChange={(e) => setIncluirMarginales(e.target.checked)}
            />
            Incluir marginales (totales)
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={colorearMapaCalor}
              onChange={(e) => setColorearMapaCalor(e.target.checked)}
            />
            Colorear mapa de calor
          </label>
        </div>

        <button
          onClick={() =>
            analisisService.descargarMatrizCruzadaCsv('empleadores', varFila, varCol, importacionId)
          }
          className="w-full py-2 px-3 bg-teal-700 text-white rounded-lg text-xs font-semibold hover:bg-teal-800 cursor-pointer"
        >
          Exportar Matriz CSV
        </button>
      </div>

      <div className="lg:col-span-3 space-y-4">
        {dataCruce && (
          <>
            <div className="flex gap-4 border-b border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setSubVistaCruce('table')}
                className={`pb-2 border-b-2 cursor-pointer ${
                  subVistaCruce === 'table' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'
                }`}
              >
                Tabla
              </button>
              <button
                onClick={() => setSubVistaCruce('barras')}
                className={`pb-2 border-b-2 cursor-pointer ${
                  subVistaCruce === 'barras' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'
                }`}
              >
                Barras comparativas
              </button>
            </div>

            {subVistaCruce === 'barras' && (
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-800">Distribución agregada por categoría</h3>
                  <span className="text-xs text-slate-500">n = {dataCruce.totalN}</span>
                </div>

                <div className="space-y-4">
                  {dataCruce.filas.map((f) => (
                    <div key={f.etiqueta} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-slate-800">
                          {f.etiqueta} (n = {f.nFila})
                        </span>
                        <span className="text-slate-500">{f.porcentajeSobreTotal} % del total</span>
                      </div>
                      <div className="w-full h-6 rounded-lg overflow-hidden flex bg-slate-100">
                        {f.celdas.map((cel, cIdx) => {
                          if (cel.frecuencia <= 0) return null;
                          return (
                            <div
                              key={cel.columna}
                              style={{
                                width: `${cel.porcentajeFila}%`,
                                backgroundColor: PALETA_BARRAS[cIdx % PALETA_BARRAS.length],
                              }}
                              className="h-full flex items-center justify-center text-[11px] font-bold text-white"
                              title={`${cel.columna}: ${cel.frecuencia} (${cel.porcentajeFila}%)`}
                            >
                              {metricaCelda === 'cantidad' ? cel.frecuencia : `${cel.porcentajeFila}%`}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100 text-xs">
                  {dataCruce.categoriasColumna.map((col, idx) => (
                    <div key={col} className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: PALETA_BARRAS[idx % PALETA_BARRAS.length] }}
                      />
                      <span className="text-slate-600">{col}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {subVistaCruce === 'table' && (
              <div className="bg-white p-5 rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left p-2.5">Categoría</th>
                      {dataCruce.categoriasColumna.map((col) => (
                        <th key={col} className="text-center p-2.5">{col}</th>
                      ))}
                      {incluirMarginales && <th className="text-right p-2.5">Total fila</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {dataCruce.filas.map((f) => (
                      <tr key={f.etiqueta} className="border-b border-slate-100">
                        <td className="p-2.5 font-semibold">{f.etiqueta}</td>
                        {f.celdas.map((cel) => {
                          let textoCelda = cel.frecuencia;
                          if (metricaCelda === 'pctFila') textoCelda = `${cel.porcentajeFila} %`;
                          else if (metricaCelda === 'pctCol') textoCelda = `${cel.porcentajeColumna} %`;
                          else if (metricaCelda === 'residuo') textoCelda = cel.residuoAjustado;

                          return (
                            <td key={cel.columna} className="p-2 text-center">
                              <div
                                className="rounded py-1.5 font-semibold"
                                style={{
                                  backgroundColor:
                                    colorearMapaCalor && cel.frecuencia > 0
                                      ? `rgba(37, 99, 235, ${Math.min(0.8, cel.porcentajeFila / 100 + 0.12)})`
                                      : 'transparent',
                                  color: colorearMapaCalor && cel.porcentajeFila > 45 ? '#fff' : '#0f172a',
                                }}
                              >
                                {textoCelda}
                              </div>
                            </td>
                          );
                        })}
                        {incluirMarginales && (
                          <td className="p-2.5 text-right font-bold">
                            {metricaCelda === 'pctFila' ? '100,0 %' : f.nFila}
                          </td>
                        )}
                      </tr>
                    ))}
                    {incluirMarginales && (
                      <tr className="bg-slate-50 font-bold border-t border-slate-200">
                        <td className="p-2.5">Total columna</td>
                        {dataCruce.totalesColumna.map((tc, j) => (
                          <td key={j} className="p-2.5 text-center">
                            {metricaCelda === 'pctFila'
                              ? `${dataCruce.porcentajesColumna[j]} %`
                              : metricaCelda === 'pctCol'
                              ? '100,0 %'
                              : tc}
                          </td>
                        ))}
                        <td className="p-2.5 text-right">
                          {metricaCelda === 'pctFila' || metricaCelda === 'pctCol' ? '100,0 %' : dataCruce.totalN}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tarjeta de Prueba Estadística Automática */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-slate-900">{dataCruce.prueba.nombre}</h4>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    dataCruce.prueba.significativo
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {dataCruce.prueba.significativo
                    ? 'Asociación significativa (α = 0,05)'
                    : 'Sin asociación significativa (α = 0,05)'}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-slate-500">Escalas cruzadas</p>
                  <p className="font-bold text-slate-900">
                    {dataCruce.nivelFila} × {dataCruce.nivelColumna}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Respuestas en el cruce</p>
                  <p className="font-bold text-slate-900">n = {dataCruce.totalN}</p>
                </div>
                <div>
                  <p className="text-slate-500">p-valor</p>
                  <p className="font-bold text-slate-900">{dataCruce.prueba.pValor}</p>
                </div>
                <div>
                  <p className="text-slate-500">
                    {dataCruce.prueba.estadisticoNombre} / {dataCruce.prueba.efectoNombre}
                  </p>
                  <p className="font-bold text-slate-900">
                    {dataCruce.prueba.estadisticoValor} · {dataCruce.prueba.efectoValor} (
                    {dataCruce.prueba.magnitudEfecto})
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CrucesEmpleadoresTab;