import { launchImageLibraryAsync, type ImagePickerAsset } from 'expo-image-picker';
import Conversor from '../../modules/conversor';
import type { Biblioteca, TipoSticker, VistaPaquete } from '../paquetes/biblioteca';
import { archivoDeSticker, nombreNuevo } from './carpeta';

/** Un GIF o un video es un sticker animado; cualquier otra imagen, uno estático. */
function tipoDeSticker(elegido: ImagePickerAsset): TipoSticker {
  return elegido.type === 'video' || elegido.mimeType === 'image/gif' ? 'animado' : 'estatico';
}

/**
 * Abre la galería, convierte la imagen, GIF o video elegido y lo guarda en la
 * biblioteca. Devuelve el aviso de una línea para el usuario y el paquete
 * donde quedó el sticker (si se creó), o null si canceló.
 */
export async function crearStickerDesdeGaleria(
  biblioteca: Biblioteca,
): Promise<{ aviso: string; paquete?: VistaPaquete } | null> {
  const elegida = await launchImageLibraryAsync({ mediaTypes: ['images', 'videos'] });
  if (elegida.canceled) return null;

  const [origen] = elegida.assets;
  const tipo = tipoDeSticker(origen);
  const nombre = nombreNuevo();
  const destino = archivoDeSticker(nombre).uri;
  const resultado =
    tipo === 'animado'
      ? await Conversor.convertirAnimado(origen.uri, destino)
      : await Conversor.convertirImagen(origen.uri, destino);
  if (resultado.tipo === 'descarte') return { aviso: `No se pudo crear el sticker: ${resultado.motivo}` };

  const paquete = await biblioteca.agregarSticker({ tipo, archivo: nombre });
  return { aviso: `Agregado a ${paquete.nombre}`, paquete };
}
