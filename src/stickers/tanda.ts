import Conversor from '../../modules/conversor';
import type { Biblioteca, TipoSticker, VistaPaquete } from '../paquetes/biblioteca';
import { archivoDeSticker, nombreNuevo } from './carpeta';

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

/** Convierte un archivo de origen; devuelve el sticker creado o el motivo del descarte. */
async function convertir(
  archivo: ArchivoDeOrigen,
): Promise<{ tipo: TipoSticker; nombre: string } | { descarte: string }> {
  const tipo = tipoDeSticker(archivo);
  if (!tipo) return { descarte: 'no es una imagen, un GIF ni un video' };
  const nombre = nombreNuevo();
  const destino = archivoDeSticker(nombre).uri;
  try {
    const resultado =
      tipo === 'animado'
        ? await Conversor.convertirAnimado(archivo.uri, destino, null)
        : await Conversor.convertirImagen(archivo.uri, destino);
    if (resultado.tipo === 'descarte') return { descarte: resultado.motivo };
  } catch (e) {
    return { descarte: e instanceof Error ? e.message : String(e) };
  }
  return { tipo, nombre };
}

const plural = (n: number, palabra: string) => `${n} ${palabra}${n === 1 ? '' : 's'}`;

/** Cómo terminó una tanda: el aviso de una línea y los paquetes que recibieron stickers, una vez cada uno. */
/** Un paquete que recibió stickers en la tanda y cuántos. */
interface PaqueteTocado {
  paquete: VistaPaquete;
  agregados: number;
}

export interface ResultadoTanda {
  aviso: string;
  paquetes: VistaPaquete[];
}

/**
 * Convierte cada archivo de origen, de a uno (para no tener varios videos en
 * memoria a la vez), y lo guarda en su paquete. Un archivo que falla no frena
 * a los demás.
 */
export async function convertirTanda(
  biblioteca: Biblioteca,
  archivos: ArchivoDeOrigen[],
): Promise<ResultadoTanda> {
  const porPaquete = new Map<string, PaqueteTocado>();
  const descartes: string[] = [];
  for (const archivo of archivos) {
    const convertido = await convertir(archivo);
    if ('descarte' in convertido) {
      descartes.push(convertido.descarte);
      continue;
    }
    const paquete = await biblioteca.agregarSticker({ tipo: convertido.tipo, archivo: convertido.nombre });
    const antes = porPaquete.get(paquete.id);
    porPaquete.set(paquete.id, { paquete, agregados: (antes?.agregados ?? 0) + 1 });
  }
  const tocados = [...porPaquete.values()];
  return { aviso: resumir(tocados, descartes), paquetes: tocados.map((t) => t.paquete) };
}

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
