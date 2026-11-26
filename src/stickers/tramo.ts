/**
 * Reglas del selector de tramo: qué tramo resulta de cada gesto. La pantalla
 * solo dibuja lo que esto decide. Todos los tiempos van en milisegundos, dentro
 * de un video de duración conocida.
 */

/** La porción de un video que se convierte en sticker animado, de `inicio` a `fin`. */
export interface Tramo {
  inicio: number;
  fin: number;
}

/** Duración mínima de un tramo: un sticker de menos no sirve. */
export const DURACION_MINIMA = 1000;
/** Duración máxima de un tramo: más no entra en un sticker de WhatsApp. */
export const DURACION_MAXIMA = 5000;
/** Lo que se ve de la regla ampliada a la vez. */
const ANCHO_DE_REGLA = 12_000;
/** Lo que la regla deja ver a cada lado del tramo antes de correrse. */
const MARGEN_DE_REGLA = 1000;
/** Los gestos se redondean a décimas, para que los números que se leen sean limpios. */
const PRECISION = 100;

const acotar = (valor: number, minimo: number, maximo: number) => Math.min(Math.max(valor, minimo), maximo);
const redondear = (ms: number) => Math.round(ms / PRECISION) * PRECISION;

/** El tramo con el que llega el selector: los primeros 5 s, o el video entero si es más corto. */
export function tramoInicial(duracionVideo: number): Tramo {
  return { inicio: 0, fin: Math.min(DURACION_MAXIMA, duracionVideo) };
}

/** Mueve el tramo entero `delta` ms (arrastre o ±0,5 s), con la misma duración, sin salirse del video. */
export function mover(tramo: Tramo, delta: number, duracionVideo: number): Tramo {
  const duracion = tramo.fin - tramo.inicio;
  const inicio = acotar(redondear(tramo.inicio + delta), 0, duracionVideo - duracion);
  return { inicio, fin: inicio + duracion };
}

/** Lleva el inicio a `inicio` (manija izquierda), sin pasar de 1 a 5 s ni de 0:00. */
export function ajustarInicio(tramo: Tramo, inicio: number): Tramo {
  const minimo = Math.max(0, tramo.fin - DURACION_MAXIMA);
  return { inicio: acotar(redondear(inicio), minimo, tramo.fin - DURACION_MINIMA), fin: tramo.fin };
}

/** Lleva el fin a `fin` (manija derecha), sin pasar de 1 a 5 s ni del final del video. */
export function ajustarFin(tramo: Tramo, fin: number, duracionVideo: number): Tramo {
  const maximo = Math.min(duracionVideo, tramo.inicio + DURACION_MAXIMA);
  return { inicio: tramo.inicio, fin: acotar(redondear(fin), tramo.inicio + DURACION_MINIMA, maximo) };
}

/** Si el tramo tiene lugar para moverse hacia cada lado: deshabilita −0,5 s y +0,5 s en los bordes. */
export function sePuedeMover(tramo: Tramo, duracionVideo: number): { atras: boolean; adelante: boolean } {
  return { atras: tramo.inicio > 0, adelante: tramo.fin < duracionVideo };
}

/**
 * La porción del video que muestra la regla ampliada: 12 s (o el video entero
 * si es más corto) que siempre contienen el tramo. Se queda quieta mientras el
 * tramo entra con 1 s de margen, y se corre lo justo cuando no, para que la
 * regla no salte con cada gesto. Sin `anterior`, arranca en 0:00.
 */
export function ventanaDeRegla(tramo: Tramo, duracionVideo: number, anterior?: Tramo): Tramo {
  const ancho = Math.min(ANCHO_DE_REGLA, duracionVideo);
  const ultimoInicio = duracionVideo - ancho;
  let inicio = acotar(anterior?.inicio ?? 0, 0, ultimoInicio);
  if (tramo.inicio < inicio + MARGEN_DE_REGLA) inicio = acotar(tramo.inicio - MARGEN_DE_REGLA, 0, ultimoInicio);
  if (tramo.fin > inicio + ancho - MARGEN_DE_REGLA) inicio = acotar(tramo.fin + MARGEN_DE_REGLA - ancho, 0, ultimoInicio);
  return { inicio, fin: inicio + ancho };
}
