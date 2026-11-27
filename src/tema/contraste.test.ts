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
    // Selector de tramo
    ['título y botones del selector sobre el lienzo', c.textoPrincipal, c.lienzo],
    ['lectura de tiempos sobre la tarjeta de la regla', c.textoPrincipal, c.tarjeta],
    ['duración del tramo sobre la tarjeta', c.carmesiVivo, c.tarjeta],
    ['metadatos y cifras de la tarjeta', c.textoAtenuado, c.tarjeta],
    ['metadatos bajo la vista previa y marcas de la regla', c.textoAtenuado, c.lienzo],
    ['«Volver cancela la tanda» sobre el lienzo', c.errorAcento, c.lienzo],
    ['pastilla «2 de 3»', c.textoPrincipal, c.carmesiTinte],
    ['texto de «Crear» y «Siguiente»', c.carmesiTexto, c.carmesi],
    ['flechas de las manijas', c.carmesiTexto, c.carmesi],
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
    ['borde del tramo sobre su bloque', c.carmesiVivo, c.carmesiTinte],
    ['manija sobre la bandeja de la regla', c.carmesi, c.lienzo],
    ['tramo en la barra panorámica sobre su pista', c.carmesiVivo, c.borde],
    ['borde de los botones ±0,5 s sobre el lienzo', c.bordeControl, c.lienzo],
  ])('%s', (_n, a, b) => {
    expect(contraste(a, b)).toBeGreaterThanOrEqual(3);
  });
});
