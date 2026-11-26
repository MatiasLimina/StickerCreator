import { launchImageLibraryAsync, type ImagePickerAsset } from 'expo-image-picker';
import type { Biblioteca } from '../paquetes/biblioteca';
import { convertirTanda, type ArchivoDeOrigen, type ElegirTramo, type ResultadoTanda } from './tanda';

/** La galería no siempre informa el tipo MIME: si falta, alcanza con saber si es imagen o video. */
function archivoDeOrigen(elegido: ImagePickerAsset): ArchivoDeOrigen {
  const porTipo = elegido.type === 'video' ? 'video/*' : elegido.type === 'image' ? 'image/*' : null;
  return { uri: elegido.uri, mimeType: elegido.mimeType ?? porTipo };
}

/**
 * Abre la galería, convierte cada imagen, GIF o video elegido y los guarda en
 * la biblioteca. Devuelve el aviso de una línea para el usuario y los paquetes
 * donde quedaron stickers nuevos, o null si canceló (en la galería o en el
 * selector de tramo).
 */
export async function crearStickerDesdeGaleria(
  biblioteca: Biblioteca,
  elegirTramo?: ElegirTramo,
): Promise<ResultadoTanda | null> {
  const elegida = await launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true });
  if (elegida.canceled) return null;
  return convertirTanda(biblioteca, elegida.assets.map(archivoDeOrigen), elegirTramo);
}
