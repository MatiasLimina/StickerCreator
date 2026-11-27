/** El resumen de la biblioteca para el banner: «3 paquetes · 16 stickers». */
export function resumenDeBiblioteca(paquetes: readonly { cantidad: number }[]): string {
  if (paquetes.length === 0) return 'Todavía sin stickers';
  const stickers = paquetes.reduce((suma, p) => suma + p.cantidad, 0);
  const paquetesTexto = paquetes.length === 1 ? '1 paquete' : `${paquetes.length} paquetes`;
  const stickersTexto = stickers === 1 ? '1 sticker' : `${stickers} stickers`;
  return `${paquetesTexto} · ${stickersTexto}`;
}
