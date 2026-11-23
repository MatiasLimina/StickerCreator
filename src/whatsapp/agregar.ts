import WhatsApp from '../../modules/whatsapp';
import type { VistaPaquete } from '../paquetes/biblioteca';

export const AVISO_SIN_WHATSAPP =
  'WhatsApp no está instalado: instalalo para agregar tus paquetes de stickers.';

/** Abre la confirmación de WhatsApp y devuelve el aviso de una línea para el usuario. */
export async function agregarAWhatsApp(
  paquete: VistaPaquete,
): Promise<{ agregado: boolean; aviso: string | null }> {
  const resultado = await WhatsApp.agregar(paquete.id, paquete.nombre);
  switch (resultado.tipo) {
    case 'agregado':
      return { agregado: true, aviso: `${paquete.nombre} se agregó a WhatsApp` };
    case 'cancelado':
      return { agregado: false, aviso: null };
    case 'no-instalado':
      return { agregado: false, aviso: AVISO_SIN_WHATSAPP };
    case 'error':
      return { agregado: false, aviso: `WhatsApp no aceptó el paquete: ${resultado.motivo}` };
  }
}

/** Le pregunta a WhatsApp cuáles de los paquetes ya tiene agregados. */
export async function consultarAgregados(paquetes: VistaPaquete[]): Promise<Record<string, boolean>> {
  const consultas = paquetes
    .filter((p) => p.sePuedeAgregar)
    .map(async (p) => [p.id, await WhatsApp.estaAgregado(p.id)] as const);
  return Object.fromEntries(await Promise.all(consultas));
}
