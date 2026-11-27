import { resumenDeBiblioteca } from './resumen';

const paquete = (cantidad: number) => ({ cantidad });

describe('resumenDeBiblioteca', () => {
  it('una biblioteca vacía dice que todavía no hay stickers', () => {
    expect(resumenDeBiblioteca([])).toBe('Todavía sin stickers');
  });

  it('un paquete con un sticker va en singular', () => {
    expect(resumenDeBiblioteca([paquete(1)])).toBe('1 paquete · 1 sticker');
  });

  it('un paquete con varios stickers: paquete en singular, stickers en plural', () => {
    expect(resumenDeBiblioteca([paquete(9)])).toBe('1 paquete · 9 stickers');
  });

  it('varios paquetes van en plural y suman los stickers de todos', () => {
    expect(resumenDeBiblioteca([paquete(9), paquete(1), paquete(6)])).toBe('3 paquetes · 16 stickers');
  });

  it('un paquete vacío cuenta como paquete pero no suma stickers', () => {
    expect(resumenDeBiblioteca([paquete(0), paquete(1)])).toBe('2 paquetes · 1 sticker');
  });
});
