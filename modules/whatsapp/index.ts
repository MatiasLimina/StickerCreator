import { requireNativeModule } from 'expo';

/** Cómo terminó un pedido de agregar a WhatsApp. */
export type ResultadoAgregar =
  | { tipo: 'agregado' }
  | { tipo: 'cancelado' }
  | { tipo: 'no-instalado' }
  /** WhatsApp rechazó el paquete; `motivo` es su mensaje de validación. */
  | { tipo: 'error'; motivo: string };

interface WhatsAppNativo {
  /** Si WhatsApp normal está instalado (WhatsApp Business no cuenta). */
  estaInstalado(): boolean;
  /** Le pregunta a WhatsApp si el paquete ya está en su bandeja. */
  estaAgregado(id: string): Promise<boolean>;
  /** Abre la confirmación de WhatsApp para agregar el paquete. */
  agregar(id: string, nombre: string): Promise<ResultadoAgregar>;
}

export default requireNativeModule<WhatsAppNativo>('WhatsApp');
