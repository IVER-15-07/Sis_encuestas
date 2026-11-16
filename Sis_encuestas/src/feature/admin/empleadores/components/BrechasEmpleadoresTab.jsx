import { useState } from 'react';
import { Cpu, Users } from 'lucide-react';

const BrechasEmpleadoresTab = ({ dataBrechas }) => {
  const [tipoSkill, setTipoSkill] = useState('hard');

  if (!dataBrechas) return null;

  const skillData = tipoSkill === 'hard' ? dataBrechas.hardSkills : dataBrechas.softSkills;
  if (!skillData) return null;

  return (
    <div className="space-y-5">
      {/* Selector Hard skills vs Soft skills */}
      <div className="flex gap-2">
        <button
          onClick={() => setTipoSkill('hard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
            tipoSkill === 'hard'
              ? 'bg-teal-700 text-white border-teal-700'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Hard skills</span>
          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-black/15">
            {dataBrechas.hardSkills.competenciasEvaluadas}
          </span>
        </button>

        <button
          onClick={() => setTipoSkill('soft')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
            tipoSkill === 'soft'
              ? 'bg-teal-700 text-white border-teal-700'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Soft skills</span>
          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-black/15">
            {dataBrechas.softSkills.competenciasEvaluadas}
          </span>
        </button>
      </div>

      {/* 4 KPIs Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-1">
          <p className="text-xs font-semibold text-slate-500">Competencias evaluadas</p>
          <p className="text-3xl font-bold text-slate-900">{skillData.competenciasEvaluadas}</p>
          <p className="text-[11px] text-slate-500">{skillData.tipo.toLowerCase()} evaluadas</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-1">
          <p className="text-xs font-semibold text-slate-500">Promedio de {skillData.tipo.toLowerCase()}</p>
          <p className="text-3xl font-bold text-slate-900">{skillData.mediaGlobal} / 5,0</p>
          <p className="text-[11px] text-slate-500">Promedio de las {skillData.competenciasEvaluadas} competencias</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-1">
          <p className="text-xs font-semibold text-slate-500">Competencia más demandada</p>
          <p className="text-sm font-bold text-slate-900 pt-1">
            {skillData.competenciaMasAlta?.competencia ?? 'Sin datos'}
          </p>
          <p className="text-[11px] text-slate-500">
            {skillData.competenciaMasAlta?.menciones ?? 0} menciones ({skillData.competenciaMasAlta?.demandaPct ?? 0} %)
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-1">
          <p className="text-xs font-semibold text-slate-500">Competencia menos mencionada</p>
          <p className="text-sm font-bold text-slate-900 pt-1">
            {skillData.competenciaMasBaja?.competencia ?? 'Sin datos'}
          </p>
          <p className="text-[11px] text-slate-500">
            {skillData.competenciaMasBaja?.menciones ?? 0} menciones ({skillData.competenciaMasBaja?.demandaPct ?? 0} %)
          </p>
        </div>
      </div>

      {/* Mapa de calor: Nivel de preparación percibida */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 overflow-x-auto">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Mapa de calor: Nivel de preparación percibida</h3>
          <p className="text-xs text-slate-500">
            Distribución de frecuencias por nivel · n = {dataBrechas.mapaPreparacionLikert.n}
          </p>
        </div>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left p-2.5">Competencia</th>
              <th className="text-center p-2.5 bg-rose-50 text-rose-800">1 Muy insuf.</th>
              <th className="text-center p-2.5">3 Aceptable</th>
              <th className="text-center p-2.5 bg-teal-50 text-teal-800">5 Muy suf.</th>
              <th className="text-center p-2.5 text-slate-500">No observado</th>
              <th className="text-right p-2.5">Total</th>
              <th className="text-right p-2.5">Media</th>
              <th className="text-right p-2.5">DE</th>
            </tr>
          </thead>
          <tbody>
            {dataBrechas.mapaPreparacionLikert.filas.map((f) => (
              <tr key={f.codigo} className="border-b border-slate-100">
                <td className="p-2.5 font-semibold text-slate-800">{f.competencia}</td>
                <td className="p-2 text-center bg-rose-50/40 font-semibold">{f.nivel1Desacuerdo}</td>
                <td className="p-2 text-center font-semibold">{f.nivel3Parcial}</td>
                <td className="p-2 text-center bg-teal-50/40 font-semibold">{f.nivel5TotalAcuerdo}</td>
                <td className="p-2 text-center text-slate-400">{f.noObservado}</td>
                <td className="p-2.5 text-right font-bold">{f.total}</td>
                <td className="p-2.5 text-right font-bold text-blue-700">{f.media}</td>
                <td className="p-2.5 text-right text-slate-500">{f.de}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tabla de estadísticos + Radar SVG */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 overflow-x-auto">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Estadísticos por competencia ({skillData.tipo})
            </h3>
            <p className="text-xs text-slate-500">
              Ordenados por demanda en mercado · Media global: {skillData.mediaGlobal}
            </p>
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left p-2">Competencia / Disciplina</th>
                <th className="text-right p-2">Demanda</th>
                <th className="text-right p-2">Media (1–5)</th>
                <th className="text-right p-2">DE</th>
                <th className="text-right p-2">Índice Brecha</th>
              </tr>
            </thead>
            <tbody>
              {skillData.items.map((it) => (
                <tr key={it.competencia} className="border-b border-slate-100">
                  <td className="p-2 font-semibold text-slate-800">{it.competencia}</td>
                  <td className="p-2 text-right">
                    {it.menciones} ({it.demandaPct} %)
                  </td>
                  <td className="p-2 text-right font-bold text-blue-700">{it.media}</td>
                  <td className="p-2 text-right text-slate-500">{it.desviacionEstandar}</td>
                  <td className="p-2 text-right font-bold text-rose-700">{it.indiceBrecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <RadarCompetenciasCard
          titulo={`Media por competencia — ${skillData.tipo}`}
          subtitulo="Escala continua de 1,0 a 5,0"
          items={skillData.items.slice(0, 8)}
        />
      </div>
    </div>
  );
};

const RadarCompetenciasCard = ({ titulo, subtitulo, items = [] }) => {
  const n = items.length;
  if (n < 3) {
    return (
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-center justify-center text-xs text-slate-400">
        Se requieren al menos 3 competencias con datos para dibujar el radar.
      </div>
    );
  }

  const cx = 160;
  const cy = 145;
  const maxR = 95;

  const puntoPolar = (idx, valor5) => {
    const ang = (2 * Math.PI * idx) / n - Math.PI / 2;
    const ratio = Math.max(0, Math.min(1, (Number(valor5 || 1) - 1) / 4));
    const r = ratio * maxR;
    return { x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) };
  };

  const puntosPoligono = items
    .map((it, idx) => {
      const p = puntoPolar(idx, it.media);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
      <div>
        <h3 className="text-sm font-bold text-slate-800">{titulo}</h3>
        <p className="text-xs text-slate-500">{subtitulo}</p>
      </div>
      <svg viewBox="0 0 320 290" className="w-full h-72">
        {[1, 2, 3, 4, 5].map((nivel) => {
          const r = ((nivel - 1) / 4) * maxR;
          return <circle key={nivel} cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="1" />;
        })}
        {items.map((it, idx) => {
          const ext = puntoPolar(idx, 5);
          const lbl = puntoPolar(idx, 5.65);
          return (
            <g key={it.competencia}>
              <line x1={cx} y1={cy} x2={ext.x} y2={ext.y} stroke="#cbd5e1" strokeWidth="1" />
              <text
                x={lbl.x}
                y={lbl.y}
                textAnchor="middle"
                fontSize="8.5"
                fill="#475569"
                fontWeight="600"
              >
                {it.competencia.slice(0, 18)}
              </text>
            </g>
          );
        })}
        <polygon points={puntosPoligono} fill="rgba(13, 148, 136, 0.25)" stroke="#0d9488" strokeWidth="2" />
        {items.map((it, idx) => {
          const p = puntoPolar(idx, it.media);
          return (
            <circle key={idx} cx={p.x} cy={p.y} r="3.5" fill="#0d9488">
              <title>{`${it.competencia}: ${it.media} / 5.0`}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
};

export default BrechasEmpleadoresTab;