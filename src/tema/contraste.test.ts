import { contraste } from './contraste';
import { colores } from './tema';

describe('contraste (WCAG 2.1)', () => {
  it('da 21:1 entre negro y blanco y 1:1 entre iguales', () => {
    expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contraste('#777777', '#777777')).toBeCloseTo(1, 5);
  });
});

// Los controles inactivos están exentos de WCAG 1.4.3, por eso no figuran acá.
describe('paleta Evernight: los textos cumplen WCAG AA (4,5:1) sobre su fondo', () => {
  const c = colores;
  const pares: [string, string, string][] = [
    ['texto principal sobre lienzo', c.textoPrincipal, c.lienzo],
    ['texto secundario sobre tarjeta', c.textoSecundario, c.tarjeta],
    ['texto atenuado sobre cabecera', c.textoAtenuado, c.cabecera],
    ['texto del botón principal sobre carmesí', c.carmesiTexto, c.carmesi],
    ['aviso normal', c.textoPrincipal, c.control],
    ['aviso informativo', c.textoPrincipal, c.avisoInfoFondo],
    ['aviso de error', c.errorTexto, c.errorFondo],
    ['texto de Borrar', c.destructivoTexto, c.destructivoFondo],
    ['ⓘ del aviso informativo', c.avisoInfoAcento, c.avisoInfoFondo],
    ['⚠ del aviso de error', c.errorAcento, c.errorFondo],
    ['texto del botón en curso', c.avanceTexto, c.avanceFondo],
  ];
  it.each(pares)('%s', (_nombre, texto, fondo) => {
    expect(contraste(texto, fondo)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('elementos no textuales cumplen 3:1 (WCAG 1.4.11)', () => {
  const c = colores;
  it.each([
    ['borde coral de Borrar', c.destructivoBorde, c.destructivoFondo],
    ['borde coral de Borrar sobre el lienzo', c.destructivoBorde, c.lienzo],
    ['acento del aviso de error sobre el lienzo', c.errorAcento, c.lienzo],
    ['luz de la barra de avance', c.carmesiVivo, c.avanceFondo],
  ])('%s', (_n, a, b) => {
    expect(contraste(a, b)).toBeGreaterThanOrEqual(3);
  });
});
