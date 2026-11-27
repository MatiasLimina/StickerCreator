import type { VistaPaquete } from './biblioteca';

/** `en-whatsapp` lleva el puntito verde; `listo` y `faltan` son los otros dos tonos de la tarjeta. */
export type TonoEstado = 'en-whatsapp' | 'listo' | 'faltan';

export interface EstadoPaquete {
  texto: string;
  tono: TonoEstado;
}

/**
 * Qué le decimos al usuario de un paquete, según si WhatsApp ya lo tiene.
 * Pura y sin React Native: la pantalla solo la dibuja.
 */
export function estadoDePaquete(paquete: Pick<VistaPaquete, 'faltan' | 'sePuedeAgregar'>, agregado: boolean): EstadoPaquete {
  // WhatsApp conserva la última versión válida hasta que vuelva a haber 3.
  if (agregado && !paquete.sePuedeAgregar) {
    return { texto: `En WhatsApp sin cambios: faltan ${paquete.faltan} para actualizarlo`, tono: 'faltan' };
  }
  if (agregado) return { texto: 'En WhatsApp', tono: 'en-whatsapp' };
  if (paquete.sePuedeAgregar) return { texto: 'Listo para agregar a WhatsApp', tono: 'listo' };
  return { texto: `Faltan ${paquete.faltan} para poder agregarlo`, tono: 'faltan' };
}
