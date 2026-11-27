import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ajustarFin,
  ajustarInicio,
  mover,
  sePuedeMover,
  tramoInicial,
  ventanaDeRegla,
  type Tramo,
  type Ventana,
} from '../stickers/tramo';
import { colores } from '../tema/tema';

const LADO_VISTA_PREVIA = 312;
/** Lo que ocupa la línea «Sin audio · Loop» debajo del cuadro, con su margen y el de la zona. */
const DEBAJO_DEL_CUADRO = 36;
/** Área táctil de cada manija, por fuera del tramo. */
const MANIJA = 48;
/** Lo que una manija se mete dentro del tramo, si el bloque es ancho. */
const MANIJA_ADENTRO = 12;
/** Margen de la bandeja de la regla: deja lugar a las manijas aun con el tramo en 0:00. */
const MARGEN_REGLA = 24;
const PASO_FINO = 500;

/** 12_500 → "0:12,5"; 12_000 → "0:12" (o "0:12,0" con `conDecima`). */
function tiempo(ms: number, conDecima = false): string {
  const decimas = Math.round(ms / 100);
  const segundos = Math.floor(decimas / 10);
  const resto = decimas % 10;
  const base = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
  return conDecima || resto !== 0 ? `${base},${resto}` : base;
}

const duracion = (tramo: Tramo) => `${((tramo.fin - tramo.inicio) / 1000).toFixed(1).replace('.', ',')} s`;

interface Props {
  /** El video del que se elige el tramo. */
  uri: string;
  duracionVideo: number;
  /** Qué selector de la fila es («2 de 3»); con uno solo no se muestra. */
  numero: number;
  total: number;
  /** Si la tanda trae otros archivos: volver la cancela entera, y la pantalla lo avisa. */
  enTanda: boolean;
  /** «Crear» o «Siguiente»; con `restoAutomatico`, «Usar automático para el resto». */
  onElegir: (tramo: Tramo, restoAutomatico: boolean) => void;
  /** Volver (flecha o atrás de Android): no se crea nada (en una tanda, nada de la tanda). */
  onVolver: () => void;
}

/**
 * El selector de tramo de un video, superpuesto a la pantalla de
 * paquetes. Las reglas (topes, bordes, ventana de la regla) viven en
 * `stickers/tramo`: acá solo se dibuja y se traducen los gestos.
 */
export function SelectorDeTramo({ uri, duracionVideo, numero, total, enTanda, onElegir, onVolver }: Props) {
  const [tramo, setTramo] = useState(() => tramoInicial(duracionVideo));
  const puede = sePuedeMover(tramo, duracionVideo);
  const quedanMas = numero < total;

  return (
    <Modal visible animationType="slide" onRequestClose={onVolver} statusBarTranslucent navigationBarTranslucent>
      <SafeAreaView style={styles.pantalla}>
        <View style={styles.barraSuperior}>
          <Pressable
            style={styles.botonVolver}
            onPress={onVolver}
            accessibilityRole="button"
            accessibilityLabel={enTanda ? 'Volver y cancelar la tanda' : 'Volver sin crear el sticker'}
          >
            <Text style={styles.flecha}>←</Text>
          </Pressable>
          <View style={styles.pilaTitulo}>
            <Text style={styles.titulo}>Selector de tramo</Text>
            {enTanda && <Text style={styles.avisoTanda}>Volver cancela la tanda</Text>}
          </View>
          {total > 1 ? (
            <Text style={styles.posicion}>
              {numero} de {total}
            </Text>
          ) : (
            <Text style={styles.meta}>Video {tiempo(duracionVideo)}</Text>
          )}
        </View>

        <VistaPrevia uri={uri} tramo={tramo} />

        <View style={styles.tarjeta}>
          <View style={styles.lectura}>
            <Text style={styles.lecturaPrincipal}>
              {tiempo(tramo.inicio)} – {tiempo(tramo.fin)} · <Text style={styles.lecturaDuracion}>{duracion(tramo)}</Text>
            </Text>
            <Text style={styles.meta}>1 a 5 s</Text>
          </View>
          <Regla tramo={tramo} duracionVideo={duracionVideo} onCambiar={setTramo} />
          <View style={styles.filaFina}>
            <BotonFino
              texto="−0,5 s"
              etiqueta="Mover el tramo medio segundo atrás"
              habilitado={puede.atras}
              onPress={() => setTramo((t) => mover(t, -PASO_FINO, duracionVideo))}
            />
            <BotonFino
              texto="+0,5 s"
              etiqueta="Mover el tramo medio segundo adelante"
              habilitado={puede.adelante}
              onPress={() => setTramo((t) => mover(t, PASO_FINO, duracionVideo))}
            />
          </View>
        </View>

        <View style={styles.zonaPulgar}>
          {quedanMas && (
            <Pressable style={styles.secundario} onPress={() => onElegir(tramo, true)} accessibilityRole="button">
              <Text style={styles.textoSecundario}>Usar automático para el resto</Text>
            </Pressable>
          )}
          <Pressable style={styles.crear} onPress={() => onElegir(tramo, false)} accessibilityRole="button">
            <Text style={styles.textoCrear}>{quedanMas ? 'Siguiente' : 'Crear'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function BotonFino({
  texto,
  etiqueta,
  habilitado,
  onPress,
}: {
  texto: string;
  etiqueta: string;
  habilitado: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.botonFino, !habilitado && styles.botonFinoInactivo]}
      disabled={!habilitado}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: !habilitado }}
    >
      <Text style={styles.textoFino}>{texto}</Text>
    </Pressable>
  );
}

/** El video encajado en un cuadrado, sin audio, en loop entre el inicio y el fin del tramo. */
function VistaPrevia({ uri, tramo }: { uri: string; tramo: Tramo }) {
  const [posicion, setPosicion] = useState(tramo.inicio);
  const [lado, setLado] = useState(LADO_VISTA_PREVIA);
  // El listener lee siempre el tramo actual sin volver a suscribirse.
  const tramoActual = useRef(tramo);
  tramoActual.current = tramo;

  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.loop = true; // si el tramo toca el final, el video vuelve a 0:00 y el listener lo lleva al inicio
    p.timeUpdateEventInterval = 0.1;
    p.play();
  });

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    const ms = currentTime * 1000;
    const { inicio, fin } = tramoActual.current;
    if (ms >= fin || ms < inicio - 250) player.currentTime = inicio / 1000;
    else setPosicion(ms);
  });

  // Al cambiar el tramo, la vista previa arranca de nuevo desde su inicio.
  useEffect(() => {
    player.currentTime = tramo.inicio / 1000;
    setPosicion(tramo.inicio);
  }, [player, tramo.inicio, tramo.fin]);

  return (
    // En una tanda, con «Usar automático para el resto», puede no haber alto
    // para 312 dp: el cuadro se achica al espacio que queda, sin tapar nada.
    <View
      style={styles.zonaVistaPrevia}
      onLayout={(e: LayoutChangeEvent) =>
        setLado(Math.min(LADO_VISTA_PREVIA, Math.max(0, e.nativeEvent.layout.height - DEBAJO_DEL_CUADRO)))
      }
    >
      <View style={[styles.cuadro, { width: lado, height: lado }]}>
        <Damero />
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          nativeControls={false}
          // SurfaceView se dibuja detrás de la ventana de un Modal en Android.
          surfaceType="textureView"
        />
      </View>
      <View style={[styles.debajoDelCuadro, { width: lado }]}>
        <Text style={styles.meta}>🔇 Sin audio · Loop</Text>
        <Text style={styles.meta}>{tiempo(posicion, true)}</Text>
      </View>
    </View>
  );
}

/** Fondo a cuadros: lo que no cubre el video queda transparente en el sticker. */
const Damero = memo(function Damero() {
  const CASILLA = 16;
  const lado = Math.ceil(LADO_VISTA_PREVIA / CASILLA);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: lado }, (_, fila) => (
        <View key={fila} style={styles.filaDamero}>
          {Array.from({ length: lado }, (_, col) => (
            <View
              key={col}
              style={{ width: CASILLA, height: CASILLA, backgroundColor: (fila + col) % 2 ? colores.cabecera : colores.tarjeta }}
            />
          ))}
        </View>
      ))}
    </View>
  );
});

type Agarre = 'tramo' | 'inicio' | 'fin';

/**
 * La regla graduada ampliada alrededor del tramo, con la barra fina del video
 * entero arriba. Un solo responder para toda la bandeja: decide por dónde
 * empezó el toque si se arrastra el tramo entero o una manija, así las
 * manijas tienen sus 48 dp aunque el tramo esté pegado a un borde.
 */
function Regla({
  tramo,
  duracionVideo,
  onCambiar,
}: {
  tramo: Tramo;
  duracionVideo: number;
  onCambiar: (tramo: Tramo) => void;
}) {
  const [anchoBandeja, setAnchoBandeja] = useState(0);
  const ventanaAnterior = useRef<Ventana | undefined>(undefined);
  const ventana = useMemo(() => {
    const nueva = ventanaDeRegla(tramo, duracionVideo, ventanaAnterior.current);
    ventanaAnterior.current = nueva;
    return nueva;
  }, [tramo, duracionVideo]);

  const anchoCarril = Math.max(anchoBandeja - 2 * MARGEN_REGLA, 1);
  const msPorPunto = (ventana.fin - ventana.inicio) / anchoCarril;
  /** Posición en la bandeja de un momento del video. */
  const x = (ms: number) => MARGEN_REGLA + (ms - ventana.inicio) / msPorPunto;

  // El responder se crea una vez; lee la geometría y el tramo de esta ref.
  const actual = useRef({ tramo, x, msPorPunto, duracionVideo, onCambiar });
  actual.current = { tramo, x, msPorPunto, duracionVideo, onCambiar };
  /** El gesto en curso: qué agarró, desde qué tramo y con qué escala (fija durante el gesto). */
  const gesto = useRef<{ agarre: Agarre; desde: Tramo; msPorPunto: number } | null>(null);
  const [agarrando, setAgarrando] = useState<Agarre | null>(null);
  const soltar = () => {
    gesto.current = null;
    setAgarrando(null);
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (evento) => {
          const agarre = agarreEn(evento.nativeEvent.locationX, actual.current);
          gesto.current = agarre ? { agarre, desde: actual.current.tramo, msPorPunto: actual.current.msPorPunto } : null;
          return agarre !== null;
        },
        onPanResponderGrant: () => setAgarrando(gesto.current?.agarre ?? null),
        onPanResponderMove: (_evento, { dx }) => {
          if (!gesto.current) return;
          const { duracionVideo, onCambiar } = actual.current;
          const { agarre, desde, msPorPunto } = gesto.current;
          const delta = dx * msPorPunto;
          onCambiar(
            agarre === 'tramo'
              ? mover(desde, delta, duracionVideo)
              : agarre === 'inicio'
                ? ajustarInicio(desde, desde.inicio + delta)
                : ajustarFin(desde, desde.fin + delta, duracionVideo),
          );
        },
        onPanResponderRelease: soltar,
        onPanResponderTerminate: soltar,
      }),
    [],
  );

  const marcas = marcasDe(ventana);
  const inicioX = x(tramo.inicio);
  const finX = x(tramo.fin);
  const anchoTramo = finX - inicioX;

  return (
    <View>
      <View style={styles.filaPanorama}>
        <Text style={styles.tiempoPanorama}>0:00</Text>
        <View style={styles.pistaPanorama}>
          <View style={[styles.ventanaPanorama, porcion(ventana, duracionVideo)]} />
          <View style={[styles.tramoPanorama, porcion(tramo, duracionVideo)]} />
        </View>
        <Text style={[styles.tiempoPanorama, styles.tiempoPanoramaFin]}>{tiempo(duracionVideo)}</Text>
      </View>

      {/* La zona del gesto se extiende sobre el margen de la tarjeta, para que la manija tenga sus 48 dp en 0:00. */}
      <View
        style={styles.bandeja}
        onLayout={(e: LayoutChangeEvent) => setAnchoBandeja(e.nativeEvent.layout.width)}
        {...responder.panHandlers}
      >
        <View pointerEvents="none" style={styles.escala}>
          {anchoBandeja > 0 &&
            marcas.map((ms) => {
              const tipo = ms % 2000 === 0 ? 'mayor' : ms % 1000 === 0 ? 'segundo' : 'medio';
              return (
                <View key={ms}>
                  {tipo === 'mayor' && (
                    <Text style={[styles.etiquetaMarca, { left: x(ms) - 20 }]}>{tiempo(ms)}</Text>
                  )}
                  <View style={[styles.marca, styles[tipo], { left: x(ms) - 0.5 }]} />
                </View>
              );
            })}
        </View>
        <View pointerEvents="none" style={[styles.carril, { marginHorizontal: MARGEN_REGLA }]}>
          {anchoBandeja > 0 &&
            marcas
              .filter((ms) => ms % 1000 === 0)
              .map((ms) => <View key={ms} style={[styles.lineaCarril, { left: x(ms) - MARGEN_REGLA - 0.5 }]} />)}
        </View>
        {anchoBandeja > 0 && (
          <View pointerEvents="none" style={[styles.capaTramo, { left: inicioX - 16, width: anchoTramo + 32 }]}>
            <View style={[styles.tapa, styles.tapaInicio, agarrando === 'inicio' && styles.tapaActiva]}>
              <Text style={styles.textoTapa}>‹</Text>
            </View>
            <View style={[styles.bloque, agarrando === 'tramo' && styles.bloqueArrastrado]}>
              <Agarradera ancho={anchoTramo} activa={agarrando === 'tramo'} />
            </View>
            <View style={[styles.tapa, styles.tapaFin, agarrando === 'fin' && styles.tapaActiva]}>
              <Text style={styles.textoTapa}>›</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

/** El agarre central `‹ ||| ›`, que se achica cuando el tramo es angosto. */
function Agarradera({ ancho, activa }: { ancho: number; activa: boolean }) {
  const color = activa ? colores.carmesiTexto : colores.carmesiVivo;
  const barras = (
    <View style={styles.barras}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.barra, { backgroundColor: color }]} />
      ))}
    </View>
  );
  if (ancho < 28) return barras;
  return (
    <View style={[styles.agarradera, activa && styles.agarraderaActiva]}>
      {ancho >= 64 && <Text style={[styles.flechaAgarre, { color }]}>‹</Text>}
      {barras}
      {ancho >= 64 && <Text style={[styles.flechaAgarre, { color }]}>›</Text>}
    </View>
  );
}

/** Qué agarra un toque que empieza en `x`: las manijas por fuera (y un poco por dentro si el bloque es ancho), el tramo por dentro. */
function agarreEn(
  posicion: number,
  { tramo, x }: { tramo: Tramo; x: (ms: number) => number },
): Agarre | null {
  const inicio = x(tramo.inicio);
  const fin = x(tramo.fin);
  const adentro = fin - inicio >= 2 * MANIJA ? MANIJA_ADENTRO : 0;
  if (posicion >= inicio - MANIJA && posicion < inicio + adentro) return 'inicio';
  if (posicion > fin - adentro && posicion <= fin + MANIJA) return 'fin';
  if (posicion >= inicio && posicion <= fin) return 'tramo';
  return null;
}

/** Una marca cada medio segundo dentro de la ventana. */
function marcasDe(ventana: Ventana): number[] {
  const marcas: number[] = [];
  for (let ms = Math.ceil(ventana.inicio / 500) * 500; ms <= ventana.fin; ms += 500) marcas.push(ms);
  return marcas;
}

/** Dónde cae una porción del video en la barra panorámica, en porcentajes. */
function porcion({ inicio, fin }: { inicio: number; fin: number }, duracionVideo: number) {
  return { left: `${(inicio / duracionVideo) * 100}%`, width: `${((fin - inicio) / duracionVideo) * 100}%` } as const;
}

const NUMEROS = { fontVariant: ['tabular-nums'] } as const;

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.lienzo },
  barraSuperior: {
    minHeight: 54,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
  },
  botonVolver: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  flecha: { fontSize: 22, color: colores.textoPrincipal },
  pilaTitulo: { flex: 1, marginLeft: 4, gap: 2 },
  titulo: { fontSize: 18, fontWeight: '600', color: colores.textoPrincipal },
  avisoTanda: { fontSize: 12, fontWeight: '600', color: colores.errorAcento },
  posicion: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colores.carmesiTinte,
    fontSize: 13,
    fontWeight: '600',
    color: colores.textoPrincipal,
    ...NUMEROS,
  },
  meta: { fontSize: 12, fontWeight: '500', color: colores.textoAtenuado, ...NUMEROS },

  zonaVistaPrevia: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  cuadro: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colores.borde,
    overflow: 'hidden',
  },
  filaDamero: { flexDirection: 'row' },
  debajoDelCuadro: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },

  tarjeta: { marginHorizontal: 16, padding: 12, borderRadius: 12, backgroundColor: colores.tarjeta, gap: 9 },
  lectura: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  lecturaPrincipal: { fontSize: 18, fontWeight: '600', color: colores.textoPrincipal, ...NUMEROS },
  lecturaDuracion: { color: colores.carmesiVivo, fontWeight: '700' },

  filaPanorama: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  pistaPanorama: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colores.borde, overflow: 'hidden' },
  ventanaPanorama: { position: 'absolute', top: 0, bottom: 0, backgroundColor: colores.avanceBorde, borderRadius: 2 },
  tramoPanorama: { position: 'absolute', top: 0, bottom: 0, backgroundColor: colores.carmesiVivo, borderRadius: 2 },
  tiempoPanorama: { fontSize: 11, color: colores.textoAtenuado, minWidth: 28, ...NUMEROS },
  tiempoPanoramaFin: { textAlign: 'right' },

  bandeja: {
    // Se mete en el margen de la tarjeta: más área para la manija pegada a un borde.
    marginHorizontal: -12,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: colores.lienzo,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  escala: { height: 19, marginBottom: 3 },
  marca: { position: 'absolute', bottom: 0, width: 1 },
  medio: { height: 4, backgroundColor: colores.marcaMedio },
  segundo: { height: 8, backgroundColor: colores.marcaSegundo },
  mayor: { height: 11, backgroundColor: colores.textoAtenuado },
  etiquetaMarca: { position: 'absolute', top: 0, width: 40, textAlign: 'center', fontSize: 11, color: colores.textoAtenuado, ...NUMEROS },
  carril: { height: 50, backgroundColor: colores.cabecera, borderRadius: 6, borderWidth: 1, borderColor: colores.borde },
  lineaCarril: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: colores.textoPrincipal },

  capaTramo: { position: 'absolute', bottom: 7, height: 52, flexDirection: 'row' },
  bloque: {
    flex: 1,
    backgroundColor: colores.carmesiTinte,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: colores.carmesiVivo,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bloqueArrastrado: { borderColor: colores.textoSecundario },
  tapa: { width: 16, backgroundColor: colores.carmesi, alignItems: 'center', justifyContent: 'center' },
  tapaInicio: { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  tapaFin: { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  tapaActiva: { backgroundColor: colores.carmesiClaro },
  textoTapa: { color: colores.carmesiTexto, fontSize: 16, fontWeight: '700' },
  agarradera: {
    height: 26,
    paddingHorizontal: 7,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colores.carmesiBorde,
    backgroundColor: colores.lienzo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  agarraderaActiva: { backgroundColor: colores.carmesi, borderColor: colores.carmesiBorde },
  barras: { flexDirection: 'row', gap: 2.5 },
  barra: { width: 2, height: 11, borderRadius: 1 },
  flechaAgarre: { fontSize: 14, fontWeight: '700' },

  filaFina: { flexDirection: 'row', gap: 8 },
  botonFino: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colores.bordeControl,
    backgroundColor: colores.lienzo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonFinoInactivo: { opacity: 0.38 },
  textoFino: { fontSize: 14, fontWeight: '600', color: colores.textoPrincipal, ...NUMEROS },

  zonaPulgar: { padding: 16, gap: 8 },
  secundario: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colores.bordeControl,
    backgroundColor: colores.lienzo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoSecundario: { fontSize: 14, fontWeight: '600', color: colores.textoPrincipal },
  crear: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colores.carmesi,
    alignItems: 'center',
  },
  textoCrear: { color: colores.carmesiTexto, fontSize: 16, fontWeight: '600' },
});
