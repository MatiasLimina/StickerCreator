import { memo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Path, Polyline, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colores } from '../tema/tema';

/** [x, y, radio, opacidad] de cada estrella, en el lienzo de 390 × 844 del diseño. */
type Estrella = readonly [number, number, number, number];
interface Constelacion {
  linea?: string;
  estrellas: readonly Estrella[];
}

// Tomadas de opcion.html (cielo en reposo y cielo scrolleado), sin animación.
const CONSTELACIONES: readonly Constelacion[] = [
  { linea: '26,54 54,42 82,60 66,88', estrellas: [[26, 54, 1.5, 0.55], [54, 42, 1.8, 0.65], [82, 60, 1.4, 0.5], [66, 88, 1.2, 0.45]] },
  { linea: '362,50 332,40 308,64 328,90', estrellas: [[362, 50, 1.5, 0.55], [332, 40, 1.8, 0.65], [308, 64, 1.4, 0.5], [328, 90, 1.2, 0.45]] },
  { linea: '48,638 106,660 158,646 206,668', estrellas: [[48, 638, 1.4, 0.5], [106, 660, 1.7, 0.62], [158, 646, 1.3, 0.5], [206, 668, 1.5, 0.55]] },
  { linea: '274,648 318,632 356,654', estrellas: [[274, 648, 1.3, 0.48], [318, 632, 1.7, 0.6], [356, 654, 1.4, 0.52]] },
  { estrellas: [[14, 360, 1.2, 0.34], [376, 432, 1.3, 0.36], [18, 692, 1.1, 0.3], [374, 706, 1.2, 0.32]] },
];

const PLATA = colores.plata;
const ESTRELLA = colores.estrella;

/**
 * El cielo de fondo: viñeta radial carbón-carmesí y constelaciones tenues.
 * Es una capa fija (no se mueve con el scroll) y estática, y `memo` evita
 * que se redibuje cuando cambia el estado de la pantalla.
 */
function CieloSinMemo() {
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      viewBox="0 0 390 844"
      preserveAspectRatio="xMidYMin slice"
      accessible={false}
    >
      <Defs>
        <RadialGradient id="cielo-vineta" gradientUnits="userSpaceOnUse" cx="195" cy="84" rx="359" ry="388">
          <Stop offset="0" stopColor={colores.vinietaCentro} />
          <Stop offset="0.52" stopColor={colores.vinietaMedia} />
          <Stop offset="1" stopColor={colores.lienzo} />
        </RadialGradient>
      </Defs>
      {/* Más grande que el lienzo: `slice` recorta y la viñeta tiene que cubrir lo que sobra. */}
      <Rect x={-400} y={-100} width={1190} height={2000} fill="url(#cielo-vineta)" />
      <Ellipse cx="195" cy="88" rx="164" ry="84" fill="none" stroke={PLATA} strokeOpacity="0.14" strokeWidth="0.8" strokeDasharray="3 5" />
      <Ellipse cx="195" cy="88" rx="124" ry="62" fill="none" stroke={colores.carmesiCielo} strokeOpacity="0.2" strokeWidth="0.8" />
      <Path d="M 18,492 Q 195,470 372,492" fill="none" stroke={PLATA} strokeOpacity="0.14" strokeWidth="0.75" strokeDasharray="2 4" />
      <Path d="M 24,620 Q 195,596 366,620" fill="none" stroke={PLATA} strokeOpacity="0.16" strokeWidth="0.8" strokeDasharray="2 4.5" />
      {CONSTELACIONES.map((c, i) => (
        <GrupoDeEstrellas key={i} constelacion={c} />
      ))}
    </Svg>
  );
}

function GrupoDeEstrellas({ constelacion }: { constelacion: Constelacion }) {
  return (
    <>
      {constelacion.linea && <Polyline points={constelacion.linea} fill="none" stroke={PLATA} strokeOpacity="0.24" strokeWidth="0.75" />}
      {constelacion.estrellas.map(([x, y, r, opacidad]) => (
        <Circle key={`${x},${y}`} cx={x} cy={y} r={r} fill={ESTRELLA} fillOpacity={opacidad} />
      ))}
    </>
  );
}

export const Cielo = memo(CieloSinMemo);
