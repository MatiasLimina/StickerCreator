import Conversor from '../../modules/conversor';
import type { Biblioteca, TipoSticker, VistaPaquete } from '../paquetes/biblioteca';
import { archivoDeSticker, nombreNuevo } from './carpeta';
import { DURACION_MAXIMA, type Tramo } from './tramo';

/** Un archivo de origen elegido en la galería o recibido por Compartir. */
export interface ArchivoDeOrigen {
  uri: string;
  /** Tipo MIME, si se conoce. */
  mimeType: string | null;
}

/**
 * Un GIF o un video es un sticker animado; cualquier otra imagen, uno
 * estático. Lo demás (o un archivo sin tipo conocido) no se puede convertir.
 */
function tipoDeSticker({ mimeType }: ArchivoDeOrigen): TipoSticker | null {
  if (mimeType === 'image/gif' || mimeType?.startsWith('video/')) return 'animado';
  if (mimeType?.startsWith('image/')) return 'estatico';
  return null;
}

/**
 * Muestra el selector de tramo de un video y espera la elección: el tramo
 * elegido, o null si el usuario volvió sin crear nada.
 */
export type ElegirTramo = (archivo: ArchivoDeOrigen, duracionVideo: number) => Promise<Tramo | null>;

/** Un sticker creado; `acortadoA` es la duración final en ms si el conversor acortó el tramo elegido. */
interface Creado {
  tipo: TipoSticker;
  nombre: string;
  acortadoA?: number;
}

/**
 * La duración de un video que pide selector (no GIF, de más de 5 s), o null
 * si se convierte directo: tampoco lo pide uno de duración desconocida.
 */
async function duracionSiPideSelector(archivo: ArchivoDeOrigen): Promise<number | null> {
  if (!archivo.mimeType?.startsWith('video/')) return null;
  const duracion = await Conversor.duracionDeVideo(archivo.uri).catch(() => null);
  return duracion !== null && duracion > DURACION_MAXIMA ? duracion : null;
}

/** Convierte un archivo de origen (con su tramo, si se eligió uno); devuelve el sticker creado o el motivo del descarte. */
async function convertir(archivo: ArchivoDeOrigen, tramo: Tramo | null): Promise<Creado | { descarte: string }> {
  const tipo = tipoDeSticker(archivo);
  if (!tipo) return { descarte: 'no es una imagen, un GIF ni un video' };
  const nombre = nombreNuevo();
  const destino = archivoDeSticker(nombre).uri;
  try {
    const resultado =
      tipo === 'animado'
        ? await Conversor.convertirAnimado(archivo.uri, destino, tramo && { inicioMs: tramo.inicio, finMs: tramo.fin })
        : await Conversor.convertirImagen(archivo.uri, destino);
    if (resultado.tipo === 'descarte') return { descarte: resultado.motivo };
    // Acortado: el conversor informa una duración final menor que la del tramo pedido.
    const final = resultado.duracionMs;
    if (tramo && final !== undefined && final < tramo.fin - tramo.inicio) return { tipo, nombre, acortadoA: final };
  } catch (e) {
    return { descarte: e instanceof Error ? e.message : String(e) };
  }
  return { tipo, nombre };
}

const plural = (n: number, palabra: string) => `${n} ${palabra}${n === 1 ? '' : 's'}`;

/** Un paquete que recibió stickers en la tanda y cuántos. */
interface PaqueteTocado {
  paquete: VistaPaquete;
  agregados: number;
}

/** Cómo terminó una tanda: el aviso de una línea y los paquetes que recibieron stickers, una vez cada uno. */
export interface ResultadoTanda {
  aviso: string;
  paquetes: VistaPaquete[];
}

/**
 * Convierte cada archivo de origen, de a uno (para no tener varios videos en
 * memoria a la vez), y lo guarda en su paquete. Un archivo que falla no frena
 * a los demás.
 *
 * Con `elegirTramo`, un video suelto de más de 5 s pasa antes por el selector
 * de tramo; si el usuario vuelve, la tanda termina en null sin crear nada. En
 * una tanda de varios archivos los videos usan, por ahora, el tramo automático.
 */
export async function convertirTanda(
  biblioteca: Biblioteca,
  archivos: ArchivoDeOrigen[],
  elegirTramo?: ElegirTramo,
): Promise<ResultadoTanda | null> {
  let tramo: Tramo | null = null;
  if (elegirTramo && archivos.length === 1) {
    const duracion = await duracionSiPideSelector(archivos[0]);
    if (duracion !== null) {
      tramo = await elegirTramo(archivos[0], duracion);
      if (!tramo) return null;
    }
  }
  const porPaquete = new Map<string, PaqueteTocado>();
  const descartes: string[] = [];
  const acortados: number[] = [];
  for (const archivo of archivos) {
    const convertido = await convertir(archivo, tramo);
    if ('descarte' in convertido) {
      descartes.push(convertido.descarte);
      continue;
    }
    if (convertido.acortadoA !== undefined) acortados.push(convertido.acortadoA);
    const paquete = await biblioteca.agregarSticker({ tipo: convertido.tipo, archivo: convertido.nombre });
    const antes = porPaquete.get(paquete.id);
    porPaquete.set(paquete.id, { paquete, agregados: (antes?.agregados ?? 0) + 1 });
  }
  const tocados = [...porPaquete.values()];
  const aviso = [resumir(tocados, descartes), resumirAcortados(acortados)].filter(Boolean).join(' · ');
  return { aviso, paquetes: tocados.map((t) => t.paquete) };
}

/** "1 tramo se acortó a 3 s"; con varios a distintas duraciones alcanza con contarlos. Vacío si no se acortó ninguno. */
function resumirAcortados(acortados: number[]): string {
  if (acortados.length === 0) return '';
  const cuantos = acortados.length === 1 ? '1 tramo se acortó' : `${acortados.length} tramos se acortaron`;
  const mismaDuracion = acortados.every((d) => d === acortados[0]);
  return mismaDuracion ? `${cuantos} a ${segundos(acortados[0])} s` : cuantos;
}

/** 3000 → "3", 2500 → "2,5". */
const segundos = (ms: number) => (Math.round(ms / 100) / 10).toString().replace('.', ',');

/** El resumen de una línea: "3 agregados a Mis stickers, 1 a Mis stickers animados, 1 descartado". */
function resumir(tocados: PaqueteTocado[], descartes: string[]): string {
  // Un archivo solo: el aviso de siempre, con el motivo si se descartó.
  const agregados = tocados.reduce((total, t) => total + t.agregados, 0);
  if (agregados + descartes.length === 1) {
    return tocados.length === 1 ? `Agregado a ${tocados[0].paquete.nombre}` : `No se pudo crear el sticker: ${descartes[0]}`;
  }
  const partes = tocados.map(({ paquete, agregados }, i) =>
    i === 0 ? `${plural(agregados, 'agregado')} a ${paquete.nombre}` : `${agregados} a ${paquete.nombre}`,
  );
  if (descartes.length > 0) partes.push(plural(descartes.length, 'descartado'));
  return partes.join(', ');
}
