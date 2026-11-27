import { estadoDePaquete } from './estado';

// `faltan` y `sePuedeAgregar` son los que calcula la biblioteca: mínimo 3 stickers.
const con = (cantidad: number) => ({ faltan: Math.max(0, 3 - cantidad), sePuedeAgregar: cantidad >= 3 });

describe('estadoDePaquete', () => {
  it('un paquete que WhatsApp ya tiene y sigue válido dice «En WhatsApp» con tono en-whatsapp', () => {
    expect(estadoDePaquete(con(9), true)).toEqual({ texto: 'En WhatsApp', tono: 'en-whatsapp' });
  });

  it('un paquete con 3 stickers justos está listo para agregar', () => {
    expect(estadoDePaquete(con(3), false)).toEqual({ texto: 'Listo para agregar a WhatsApp', tono: 'listo' });
  });

  it('con 2 stickers faltan 1 para poder agregarlo', () => {
    expect(estadoDePaquete(con(2), false)).toEqual({ texto: 'Faltan 1 para poder agregarlo', tono: 'faltan' });
  });

  it('vacío faltan 3 para poder agregarlo', () => {
    expect(estadoDePaquete(con(0), false)).toEqual({ texto: 'Faltan 3 para poder agregarlo', tono: 'faltan' });
  });

  it('un paquete agregado que bajó de 3 avisa que WhatsApp lo conserva sin cambios, sin puntito verde', () => {
    expect(estadoDePaquete(con(1), true)).toEqual({
      texto: 'En WhatsApp sin cambios: faltan 2 para actualizarlo',
      tono: 'faltan',
    });
  });

  it('un agregado con exactamente 3 stickers vuelve a «En WhatsApp»', () => {
    expect(estadoDePaquete(con(3), true)).toEqual({ texto: 'En WhatsApp', tono: 'en-whatsapp' });
  });
});
