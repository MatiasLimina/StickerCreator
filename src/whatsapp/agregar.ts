import WhatsApp from '../../modules/whatsapp';
import type { VistaPaquete } from '../paquetes/biblioteca';

export const AVISO_SIN_WHATSAPP =
  'WhatsApp no está instalado: instalalo para agregar tus paquetes de stickers.';

/**
 * Abre la confirmación de WhatsApp y devuelve el aviso de una línea para el
 * usuario. Con un paquete que WhatsApp ya tiene (`yaAgregado`), el mismo
 * pedido le hace releer el paquete: WhatsApp no toma solo los stickers nuevos.
 */
export async function agregarAWhatsApp(
  paquete: VistaPaquete,
  yaAgregado = false,
): Promise<{ agregado: boolean; aviso: string | null }> {
  const resultado = await WhatsApp.agregar(paquete.id, paquete.nombre);
  switch (resultado.tipo) {
    case 'agregado':
      return {
        agregado: true,
        aviso: `${paquete.nombre} se ${yaAgregado ? 'actualizó en' : 'agregó a'} WhatsApp`,
      };
    case 'cancelado':
      return {
        agregado: false,
        aviso: yaAgregado ? `WhatsApp no se actualizó: los cambios aparecen cuando actualices ${paquete.nombre}` : null,
      };
    case 'no-instalado':
      return { agregado: false, aviso: AVISO_SIN_WHATSAPP };
    case 'error':
      return { agregado: false, aviso: `WhatsApp no aceptó el paquete: ${resultado.motivo}` };
  }
}

/** Le pregunta a WhatsApp si ya tiene el paquete; si no responde, asume que no. */
export async function estaAgregado(paquete: VistaPaquete): Promise<boolean> {
  return WhatsApp.estaAgregado(paquete.id).catch(() => false);
}

/**
 * Le pregunta a WhatsApp cuáles de los paquetes ya tiene agregados. Incluye
 * los que quedaron con menos de 3: WhatsApp conserva su última versión válida.
 */
export async function consultarAgregados(paquetes: VistaPaquete[]): Promise<Record<string, boolean>> {
  const consultas = paquetes
    .filter((p) => p.version > 0)
    .map(async (p) => [p.id, await WhatsApp.estaAgregado(p.id)] as const);
  return Object.fromEntries(await Promise.all(consultas));
}
