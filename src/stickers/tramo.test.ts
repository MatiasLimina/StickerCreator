import {
  ajustarFin,
  ajustarInicio,
  mover,
  sePuedeMover,
  tramoInicial,
  ventanaDeRegla,
  type Tramo,
  type Ventana,
} from './tramo';

const s = (segundos: number) => segundos * 1000;
const tramo = (inicio: number, fin: number): Tramo => ({ inicio: s(inicio), fin: s(fin) });
const duracion = (t: Tramo) => t.fin - t.inicio;

describe('tramo inicial', () => {
  it('en un video de 18 s marca los primeros 5 s', () => {
    expect(tramoInicial(s(18))).toEqual(tramo(0, 5));
  });

  it('en un video de 7 s también marca los primeros 5 s', () => {
    expect(tramoInicial(s(7))).toEqual(tramo(0, 5));
  });

  it('en un video de menos de 5 s llega hasta el final', () => {
    expect(tramoInicial(s(3.2))).toEqual(tramo(0, 3.2));
  });
});

describe('mover el tramo entero', () => {
  it('arrastrar conserva la duración', () => {
    const movido = mover(tramo(0, 3), s(12.34), s(40));
    expect(movido).toEqual(tramo(12.3, 15.3));
  });

  it('frena en 0:00 sin acortarse', () => {
    expect(mover(tramo(2, 6), s(-10), s(40))).toEqual(tramo(0, 4));
  });

  it('frena en el final del video sin acortarse', () => {
    expect(mover(tramo(30, 35), s(20), s(37.25))).toEqual({ inicio: s(32.25), fin: s(37.25) });
  });

  it('±0,5 s mueven inicio y fin juntos', () => {
    expect(mover(tramo(12, 15), s(0.5), s(40))).toEqual(tramo(12.5, 15.5));
    expect(mover(tramo(12, 15), s(-0.5), s(40))).toEqual(tramo(11.5, 14.5));
  });

  it('±0,5 s mueven medio segundo justo aunque el tramo haya frenado en un final que no cae en décimas', () => {
    const enElFinal = mover(tramo(30, 35), s(20), s(37.25));
    expect(mover(enElFinal, s(-0.5), s(37.25))).toEqual({ inicio: s(31.75), fin: s(36.75) });
  });
});

describe('las manijas ajustan el inicio y el fin', () => {
  it('acercar el inicio al fin no deja el tramo en menos de 1 s', () => {
    const ajustado = ajustarInicio(tramo(10, 15), s(14.7));
    expect(ajustado).toEqual(tramo(14, 15));
  });

  it('alejar el inicio no deja el tramo en más de 5 s', () => {
    expect(ajustarInicio(tramo(10, 13), s(4))).toEqual(tramo(8, 13));
  });

  it('el inicio frena en 0:00', () => {
    expect(ajustarInicio(tramo(1, 4), s(-2))).toEqual(tramo(0, 4));
  });

  it('acercar el fin al inicio no deja el tramo en menos de 1 s', () => {
    expect(ajustarFin(tramo(10, 15), s(10.2), s(40))).toEqual(tramo(10, 11));
  });

  it('alejar el fin no deja el tramo en más de 5 s', () => {
    expect(ajustarFin(tramo(10, 12), s(19), s(40))).toEqual(tramo(10, 15));
  });

  it('el fin frena en el final del video', () => {
    expect(ajustarFin(tramo(36, 38), s(41), s(39.5))).toEqual(tramo(36, 39.5));
  });

  it('una manija acorta el tramo y la otra queda donde estaba', () => {
    const ajustado = ajustarFin(tramo(12, 17), s(14.04), s(40));
    expect(ajustado.inicio).toBe(s(12));
    expect(duracion(ajustado)).toBe(s(2));
  });
});

describe('se puede mover hacia cada lado', () => {
  it('en 0:00 no se puede ir para atrás', () => {
    expect(sePuedeMover(tramo(0, 5), s(18))).toEqual({ atras: false, adelante: true });
  });

  it('tocando el final no se puede ir para adelante', () => {
    expect(sePuedeMover(tramo(13, 18), s(18))).toEqual({ atras: true, adelante: false });
  });

  it('en el medio se puede ir para los dos lados', () => {
    expect(sePuedeMover(tramo(6, 9), s(18))).toEqual({ atras: true, adelante: true });
  });
});

describe('ventana de la regla ampliada', () => {
  const contiene = (ventana: Ventana, t: Tramo) => ventana.inicio <= t.inicio && t.fin <= ventana.fin;

  it('en un video largo muestra 12 s desde el principio al abrir', () => {
    expect(ventanaDeRegla(tramoInicial(s(180)), s(180))).toEqual(tramo(0, 12));
  });

  it('en un video de menos de 12 s muestra el video entero', () => {
    expect(ventanaDeRegla(tramoInicial(s(7)), s(7))).toEqual(tramo(0, 7));
  });

  it('se queda quieta mientras el tramo entra con margen', () => {
    expect(ventanaDeRegla(tramo(3, 6), s(180), tramo(0, 12))).toEqual(tramo(0, 12));
  });

  it('sigue al tramo cuando se acerca al borde, dejando 1 s de margen', () => {
    expect(ventanaDeRegla(tramo(9, 14), s(180), tramo(0, 12))).toEqual(tramo(3, 15));
    expect(ventanaDeRegla(tramo(20, 25), s(180), tramo(30, 42))).toEqual(tramo(19, 31));
  });

  it('nunca se pasa de los bordes del video', () => {
    expect(ventanaDeRegla(tramo(175, 180), s(180), tramo(100, 112))).toEqual(tramo(168, 180));
    expect(ventanaDeRegla(tramo(0, 5), s(180), tramo(100, 112))).toEqual(tramo(0, 12));
  });

  it('contiene siempre el tramo, aunque lo arrastren lejos de golpe', () => {
    let ventana = ventanaDeRegla(tramoInicial(s(300)), s(300));
    let actual = tramoInicial(s(300));
    for (const delta of [s(50), s(-3), s(120), s(-170), s(400), s(-0.5)]) {
      actual = mover(actual, delta, s(300));
      ventana = ventanaDeRegla(actual, s(300), ventana);
      expect(contiene(ventana, actual)).toBe(true);
    }
  });
});
