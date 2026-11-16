const ValoracionCarreraTab = ({ dataValoracion }) => {
  if (!dataValoracion) return null;

  return (
    <div className="space-y-6">
      {/* 4 KPIs Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-1">
          <p className="text-xs font-semibold text-slate-500">Puntaje global de valoración</p>
          <p className="text-3xl font-bold text-slate-900">
            {dataValoracion.kpis.puntajeGlobal} <span className="text-sm font-normal text-slate-400">/ 100</span>
          </p>
          <p className="text-[11px] text-slate-500">
            Acuerdo total {dataValoracion.kpis.acuerdoTotalPct} % · Desacuerdo {dataValoracion.kpis.desacuerdoPct} %
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-1">
          <p className="text-xs font-semibold text-slate-500">Dimensión mejor valorada</p>
          <p className="text-base font-bold text-slate-900 pt-1">
            {dataValoracion.kpis.mejorDimension?.dimension ?? '—'}
          </p>
          <p className="text-[11px] text-slate-500">
            Puntaje {dataValoracion.kpis.mejorDimension?.puntaje ?? 0} · n ={' '}
            {dataValoracion.kpis.mejorDimension?.n ?? 0}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-1">
          <p className="text-xs font-semibold text-slate-500">Dimensión peor valorada</p>
          <p className="text-base font-bold text-slate-900 pt-1">
            {dataValoracion.kpis.peorDimension?.dimension ?? '—'}
          </p>
          <p className="text-[11px] text-slate-500">
            Puntaje {dataValoracion.kpis.peorDimension?.puntaje ?? 0} · n ={' '}
            {dataValoracion.kpis.peorDimension?.n ?? 0}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-1">
          <p className="text-xs font-semibold text-slate-500">Respuestas «No sabe»</p>
          <p className="text-3xl font-bold text-slate-900">{dataValoracion.kpis.noSabePct} %</p>
          <p className="text-[11px] text-slate-500">
            {dataValoracion.kpis.flatlinersCount} de {dataValoracion.kpis.n} organizaciones marcaron la misma opción
            en las 18 afirmaciones
          </p>
        </div>
      </div>

      {/* Puntaje por Dimensión */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Puntaje por dimensión</h3>
          <p className="text-xs text-slate-500">
            n = {dataValoracion.kpis.n} · Totalmente de acuerdo = 100 · Parcialmente = 50 · Desacuerdo = 0
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dataValoracion.dimensiones.map((dim) => (
            <div key={dim.dimension} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 space-y-2.5">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-900">{dim.dimension}</p>
                  <p className="text-[11px] text-slate-500">
                    {dim.afirmacionesCount} afirmaciones · n = {dim.n}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-lg text-sm font-bold ${
                    dim.puntaje >= 60
                      ? 'bg-blue-100 text-blue-800'
                      : dim.puntaje >= 45
                      ? 'bg-slate-200 text-slate-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {dim.puntaje}
                </span>
              </div>

              <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-200">
                <div style={{ width: `${dim.desacuerdoPct}%` }} className="bg-orange-600 h-full" />
                <div style={{ width: `${dim.parcialAcuerdoPct}%` }} className="bg-sky-300 h-full" />
                <div style={{ width: `${dim.acuerdoTotalPct}%` }} className="bg-blue-700 h-full" />
              </div>

              <div className="flex justify-between text-[10px] text-slate-600">
                <span>Acuerdo total {dim.acuerdoTotalPct} %</span>
                <span>Desacuerdo {dim.desacuerdoPct} %</span>
                <span>No sabe {dim.noSabePct} %</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 18 Afirmaciones ordenadas por puntaje */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Afirmaciones ordenadas por puntaje</h3>
          <p className="text-xs text-slate-500">n = {dataValoracion.kpis.n}</p>
        </div>

        <div className="space-y-3">
          {dataValoracion.afirmaciones.map((af) => (
            <div key={af.codigo} className="grid grid-cols-1 md:grid-cols-12 items-center gap-3 text-xs border-b border-slate-100 pb-2.5">
              <div className="md:col-span-5">
                <p className="font-semibold text-slate-800">{af.etiqueta}</p>
                <p className="text-[10px] text-slate-400">{af.dimension}</p>
              </div>
              <div className="md:col-span-5">
                <div className="w-full h-3 rounded overflow-hidden flex bg-slate-100">
                  <div
                    style={{ width: `${af.desacuerdoPct}%` }}
                    className="bg-orange-600 h-full"
                    title={`Desacuerdo: ${af.desacuerdoPct}%`}
                  />
                  <div
                    style={{ width: `${af.parcialPct}%` }}
                    className="bg-sky-300 h-full"
                    title={`Parcial: ${af.parcialPct}%`}
                  />
                  <div
                    style={{ width: `${af.acuerdoTotalPct}%` }}
                    className="bg-blue-700 h-full"
                    title={`Totalmente de acuerdo: ${af.acuerdoTotalPct}%`}
                  />
                </div>
              </div>
              <div className="md:col-span-2 flex justify-end gap-4 text-right">
                <span className="font-bold text-slate-900">{af.puntaje}</span>
                <span className="text-slate-400 w-10">{af.noSabePct} %</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Segmentaciones con Mann-Whitney & Spearman */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-5 overflow-x-auto">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            Puntaje por tipo de organización y situación de contratación
          </h3>
          <p className="text-xs text-slate-500">n = {dataValoracion.kpis.n}</p>
        </div>

        {dataValoracion.segmentaciones.map((seg) => (
          <div key={seg.titulo} className="space-y-2 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap justify-between items-center gap-2 text-xs">
              <span className="font-bold text-slate-800">{seg.titulo}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-600">
                  {seg.prueba.nombre} · p = {seg.prueba.pValor} ·{' '}
                  {seg.prueba.rho !== undefined
                    ? `ρ = ${seg.prueba.rho}`
                    : `r = ${seg.prueba.correlacionBiserial}`}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    seg.prueba.significativo
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {seg.prueba.significativo ? 'Diferencia significativa' : 'Sin diferencia significativa'}
                </span>
              </div>
            </div>

            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="text-left p-2">Grupo</th>
                  <th className="text-right p-2">n</th>
                  <th className="text-center p-2">Global</th>
                  {dataValoracion.dimensiones.map((d) => (
                    <th key={d.dimension} className="text-center p-2">{d.dimension}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seg.filas.map((f) => (
                  <tr key={f.grupo} className="border-b border-slate-50">
                    <td className="p-2 font-medium text-slate-800">{f.grupo}</td>
                    <td className="p-2 text-right text-slate-500">{f.n}</td>
                    <td className="p-1.5 text-center">
                      <span className="inline-block w-12 py-1 rounded font-bold bg-slate-100">{f.global}</span>
                    </td>
                    {dataValoracion.dimensiones.map((d) => {
                      const val = f.dimensiones[d.dimension] ?? 0;
                      return (
                        <td key={d.dimension} className="p-1.5 text-center">
                          <span
                            className="inline-block w-12 py-1 rounded font-bold"
                            style={{
                              backgroundColor:
                                val >= 60 ? '#bfdbfe' : val >= 45 ? '#f1f5f9' : '#fed7aa',
                              color: '#0f172a',
                            }}
                          >
                            {val}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Cruce Perfil vs Coherencia + Matriz Triangular de Correlación */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 overflow-x-auto">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Conocimiento del perfil de egreso frente a coherencia con desempeño
            </h3>
            <p className="text-xs text-slate-500">
              n = {dataValoracion.crucePerfilCoherencia.n} · ρ de Spearman ={' '}
              {dataValoracion.crucePerfilCoherencia.prueba.rho} · p ={' '}
              {dataValoracion.crucePerfilCoherencia.prueba.pValor}
            </p>
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left p-2">Conoce perfil ↓ / Coherencia →</th>
                {dataValoracion.crucePerfilCoherencia.columnas.map((c) => (
                  <th key={c} className="text-center p-2">{c}</th>
                ))}
                <th className="text-right p-2">n</th>
              </tr>
            </thead>
            <tbody>
              {dataValoracion.crucePerfilCoherencia.filas.map((f) => (
                <tr key={f.etiqueta} className="border-b border-slate-100">
                  <td className="p-2 font-semibold">{f.etiqueta}</td>
                  {f.celdas.map((cel) => (
                    <td key={cel.columna} className="p-1.5 text-center">
                      <div
                        className="rounded py-1.5 font-semibold"
                        style={{
                          backgroundColor:
                            cel.frecuencia > 0
                              ? `rgba(13, 148, 136, ${Math.min(0.85, cel.porcentajeFila / 100 + 0.15)})`
                              : '#f8fafc',
                          color: cel.porcentajeFila > 45 ? '#fff' : '#0f172a',
                        }}
                      >
                        <div>{cel.frecuencia}</div>
                        <div className="text-[10px] opacity-80">{cel.porcentajeFila} %</div>
                      </div>
                    </td>
                  ))}
                  <td className="p-2 text-right font-bold">{f.nFila}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 overflow-x-auto">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Relación entre dimensiones</h3>
            <p className="text-xs text-slate-500">ρ de Spearman (* p &lt; 0,05)</p>
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="text-left p-2">Dimensión</th>
                {dataValoracion.correlacionDimensiones.columnas.map((col) => (
                  <th key={col} className="p-2 text-center text-[10px]">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataValoracion.correlacionDimensiones.filas.map((f) => (
                <tr key={f.dimensionFila} className="border-b border-slate-100">
                  <td className="p-2 font-semibold text-slate-800">{f.dimensionFila}</td>
                  {dataValoracion.correlacionDimensiones.columnas.map((col) => {
                    const celda = f.celdas.find((c) => c.dimensionColumna === col);
                    if (!celda) {
                      return <td key={col} className="p-1.5" />;
                    }
                    return (
                      <td key={col} className="p-1.5 text-center">
                        <div
                          className="rounded py-1.5 px-2 font-bold"
                          style={{
                            backgroundColor: `rgba(37, 99, 235, ${Math.min(0.85, Math.abs(celda.rho) + 0.12)})`,
                            color: Math.abs(celda.rho) > 0.45 ? '#fff' : '#0f172a',
                          }}
                        >
                          {celda.rho.toFixed(2)}
                          {celda.significativo ? '*' : ''}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ValoracionCarreraTab;