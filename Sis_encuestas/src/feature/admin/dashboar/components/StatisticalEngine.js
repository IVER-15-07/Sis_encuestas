// feature/admin/dashboar/components/StatisticalEngine.js

// Media aritmética
export const calcularMedia = (valores) => {
    if (!valores.length) return 0;
    const suma = valores.reduce((acc, curr) => acc + curr, 0);
    return Number((suma / valores.length).toFixed(2));
};

// Mediana
export const calcularMediana = (valores) => {
    if (!valores.length) return 0;
    const ordenados = [...valores].sort((a, b) => a - b);
    const mitad = Math.floor(ordenados.length / 2);
    if (ordenados.length % 2 === 0) {
        return Number(((ordenados[mitad - 1] + ordenados[mitad]) / 2).toFixed(2));
    }
    return Number(ordenados[mitad].toFixed(2));
};

// Desviación Estándar muestral
export const calcularDesviacionEstandar = (valores, media) => {
    if (valores.length <= 1) return 0;
    const m = media !== undefined ? media : calcularMedia(valores);
    const varianza = valores.reduce((acc, curr) => acc + Math.pow(curr - m, 2), 0) / (valores.length - 1);
    return Number(Math.sqrt(varianza).toFixed(2));
};

// Aproximación de la función gamma incompleta para el p-valor de Chi-cuadrado
function gammaIncompleta(s, z) {
    let sum = 1.0 / s;
    let term = 1.0 / s;
    for (let n = 1; n < 100; n++) {
        term *= z / (s + n);
        sum += term;
        if (term < sum * 1e-14) break;
    }
    return Math.exp(-z + s * Math.log(z) - logGamma(s)) * sum;
}

function logGamma(x) {
    // Coeficientes truncados a 15-16 dígitos significativos para evitar la advertencia de ESLint
    const c = [
        57.15623566586292, -59.59796035429468,
        14.13609797474175, -0.491905816045452,
        3.39946499848119e-5, 4.65236289270486e-5,
        -9.83744753048796e-5, 1.58088703224378e-4,
        -2.10264441724105e-4, 2.17439618115213e-4,
        -1.64318106536764e-4, 8.44182239838527e-5,
        -2.61908384015814e-5, 3.68991826595316e-6
    ];
    let y = x;
    let tmp = x + 5.2421875;
    tmp = (x + 0.5) * Math.log(tmp) - tmp;
    let ser = 0.9999999999999971;
    for (let j = 0; j < 14; j++) {
        y += 1;
        ser += c[j] / y;
    }
    return tmp + Math.log(Math.sqrt(2 * Math.PI) * ser / x);
}

// Prueba de Chi-Cuadrado de Independencia
export const calcularChiCuadrado = (tablaContingencia) => {
    const filas = Object.keys(tablaContingencia);
    if (filas.length < 2) return null;

    const columnas = Object.keys(tablaContingencia[filas[0]]);
    if (columnas.length < 2) return null;

    const totalFilas = {};
    const totalColumnas = {};
    let granTotal = 0;

    filas.forEach(f => {
        totalFilas[f] = 0;
        columnas.forEach(c => {
            const val = tablaContingencia[f][c] || 0;
            totalFilas[f] += val;
            totalColumnas[c] = (totalColumnas[c] || 0) + val;
            granTotal += val;
        });
    });

    if (granTotal === 0) return null;

    let chi2 = 0;
    filas.forEach(f => {
        columnas.forEach(c => {
            const observado = tablaContingencia[f][c] || 0;
            const esperado = (totalFilas[f] * totalColumnas[c]) / granTotal;
            if (esperado > 0) {
                chi2 += Math.pow(observado - esperado, 2) / esperado;
            }
        });
    });

    const gradosLibertad = (filas.length - 1) * (columnas.length - 1);
    const pValor = gradosLibertad > 0 ? 1 - gammaIncompleta(gradosLibertad / 2, chi2 / 2) : 1;

    return {
        chi2: Number(chi2.toFixed(3)),
        gradosLibertad,
        pValor: Number(Math.max(0, Math.min(1, pValor)).toFixed(5)),
        esSignificativo: pValor < 0.05
    };
};