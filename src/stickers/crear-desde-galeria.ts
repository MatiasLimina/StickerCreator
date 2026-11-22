import { launchImageLibraryAsync } from 'expo-image-picker';
import Conversor from '../../modules/conversor';
import type { Biblioteca } from '../paquetes/biblioteca';
import { archivoDeSticker, nombreNuevo } from './carpeta';

/**
 * Abre la galería, convierte la imagen elegida y la guarda en la biblioteca.
 * Devuelve el aviso de una línea para el usuario, o null si canceló.
 */
export async function crearStickerDesdeGaleria(biblioteca: Biblioteca): Promise<string | null> {
  const elegida = await launchImageLibraryAsync({ mediaTypes: ['images'] });
  if (elegida.canceled) return null;

  const nombre = nombreNuevo();
  const resultado = await Conversor.convertirImagen(
    elegida.assets[0].uri,
    archivoDeSticker(nombre).uri,
  );
  if (resultado.tipo === 'descarte') return `No se pudo crear el sticker: ${resultado.motivo}`;

  const paquete = await biblioteca.agregarSticker({ tipo: 'estatico', archivo: nombre });
  return `Agregado a ${paquete.nombre}`;
}
