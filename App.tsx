import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, Pressable, StyleSheet, Text, ToastAndroid, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { abrirBiblioteca, type Biblioteca, type VistaPaquete } from './src/paquetes/biblioteca';
import { crearAlmacenEnArchivo } from './src/paquetes/almacen-en-archivo';
import { PantallaPaquetes } from './src/pantalla/PantallaPaquetes';
import { SelectorDeTramo } from './src/pantalla/SelectorDeTramo';
import { archivoDeSticker, eliminarArchivoDeSticker } from './src/stickers/carpeta';
import Compartir from './modules/compartir';
import { crearStickerDesdeGaleria } from './src/stickers/crear-desde-galeria';
import { convertirTanda, type ArchivoDeOrigen, type ElegirTramo, type ResultadoTanda } from './src/stickers/tanda';
import type { Tramo } from './src/stickers/tramo';
import { agregarAWhatsApp, consultarAgregados, estaAgregado } from './src/whatsapp/agregar';

const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : String(e));
const uriDeSticker = (nombre: string) => archivoDeSticker(nombre).uri;
const SIN_SELECCION: ReadonlySet<string> = new Set();

/** Un selector de tramo abierto: la tanda espera a que `responder` le diga el tramo (o null si el usuario volvió). */
interface PedidoDeTramo {
  archivo: ArchivoDeOrigen;
  duracionVideo: number;
  responder: (tramo: Tramo | null) => void;
}

/** La selección con `archivo` marcado si no lo estaba, o desmarcado si lo estaba. */
function alternado(seleccion: ReadonlySet<string>, archivo: string): ReadonlySet<string> {
  const nueva = new Set(seleccion);
  if (!nueva.delete(archivo)) nueva.add(archivo);
  return nueva;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Pantalla />
    </SafeAreaProvider>
  );
}

function Pantalla() {
  const [biblioteca, setBiblioteca] = useState<Biblioteca | null>(null);
  const [paquetes, setPaquetes] = useState<VistaPaquete[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [convirtiendo, setConvirtiendo] = useState(false);
  const [agregados, setAgregados] = useState<Record<string, boolean>>({});
  // Stickers marcados para borrar, como en una galería: con alguno marcado, la pantalla está en modo selección.
  const [seleccion, setSeleccion] = useState<ReadonlySet<string>>(SIN_SELECCION);
  const seleccionando = seleccion.size > 0;
  const [pedidoDeTramo, setPedidoDeTramo] = useState<PedidoDeTramo | null>(null);

  // La tanda (que corre en la cola de cambios) se queda esperando acá mientras
  // el selector está abierto: lo que llegue por Compartir espera su turno.
  const elegirTramo = useCallback<ElegirTramo>(
    (archivo, duracionVideo) =>
      new Promise((resolver) =>
        setPedidoDeTramo({
          archivo,
          duracionVideo,
          responder: (tramo) => {
            setPedidoDeTramo(null);
            resolver(tramo);
          },
        }),
      ),
    [],
  );

  useEffect(() => {
    abrirBiblioteca(crearAlmacenEnArchivo(), eliminarArchivoDeSticker)
      .then((abierta) => {
        setBiblioteca(abierta);
        setPaquetes(abierta.paquetes());
      })
      .catch((e: unknown) => setError(`No se pudieron leer los paquetes: ${mensajeDe(e)}`));
  }, []);

  // El estado "agregado" vive en WhatsApp: se lo preguntamos al abrir y cada
  // vez que la app vuelve al frente (por ejemplo, después de confirmar ahí).
  // Las consultas pueden solaparse (al volver al frente y al cambiar los
  // paquetes): solo vale la respuesta de la última.
  const ultimaConsulta = useRef(0);
  const refrescarAgregados = useCallback(() => {
    if (!paquetes) return;
    const esta = ++ultimaConsulta.current;
    consultarAgregados(paquetes)
      .then((nuevos) => {
        if (esta === ultimaConsulta.current) setAgregados((antes) => ({ ...antes, ...nuevos }));
      })
      .catch(() => {}); // si WhatsApp no responde, queda el último estado conocido
  }, [paquetes]);

  useEffect(() => {
    refrescarAgregados();
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') refrescarAgregados();
    });
    return () => suscripcion.remove();
  }, [refrescarAgregados]);

  /** Pide a WhatsApp que agregue (o actualice) el paquete y devuelve cómo terminó. */
  async function pedirAWhatsApp(paquete: VistaPaquete, yaAgregado: boolean) {
    try {
      const resultado = await agregarAWhatsApp(paquete, yaAgregado);
      if (resultado.agregado) setAgregados((antes) => ({ ...antes, [paquete.id]: true }));
      return resultado;
    } catch (e) {
      return { agregado: false, aviso: `No se pudo abrir WhatsApp: ${mensajeDe(e)}` };
    }
  }

  async function agregar(paquete: VistaPaquete) {
    setAviso(null);
    setAviso((await pedirAWhatsApp(paquete, false)).aviso);
  }

  // Todo lo que cambia la biblioteca (tandas de la galería o de Compartir y
  // borrados) corre de a uno: si llega algo mientras se convierte, espera su
  // turno. Así dos escrituras del índice nunca se pisan.
  const cola = useRef(Promise.resolve());
  function encolarCambio(tarea: () => Promise<void>) {
    cola.current = cola.current.then(tarea).catch(() => {});
  }
  function encolar(tanda: () => Promise<ResultadoTanda | null>, desdeCompartir = false) {
    encolarCambio(() => correrTanda(tanda, desdeCompartir));
  }

  /**
   * Pide a WhatsApp que actualice un paquete que ya tiene (ADR 0002). Con
   * menos de 3 no hay contenido nuevo publicado: no se pide nada. Devuelve el
   * aviso si la actualización no se hizo.
   */
  async function actualizarEnWhatsApp(paquete: VistaPaquete): Promise<string | null> {
    if (!paquete.sePuedeAgregar || !(await estaAgregado(paquete))) return null;
    const actualizacion = await pedirAWhatsApp(paquete, true);
    return actualizacion.agregado ? null : actualizacion.aviso;
  }

  // Estables (no dependen de la selección actual) para que la grilla redibuje
  // solo la celda que cambia.
  const mantenerSticker = useCallback(
    (archivo: string) => setSeleccion((antes) => alternado(antes, archivo)),
    [],
  );
  const tocarSticker = useCallback(
    (archivo: string) => setSeleccion((antes) => (antes.size > 0 ? alternado(antes, archivo) : antes)),
    [],
  );

  // Atrás sale del modo selección en vez de cerrar la app.
  useEffect(() => {
    if (!seleccionando) return;
    const atras = BackHandler.addEventListener('hardwareBackPress', () => {
      setSeleccion(SIN_SELECCION);
      return true;
    });
    return () => atras.remove();
  }, [seleccionando]);

  function confirmarBorrado() {
    const archivos = [...seleccion];
    const cuantos = archivos.length === 1 ? 'el sticker' : `${archivos.length} stickers`;
    Alert.alert(`¿Borrar ${cuantos}?`, 'No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => borrar(archivos) },
    ]);
  }

  function borrar(archivos: string[]) {
    setSeleccion(SIN_SELECCION);
    encolarCambio(async () => {
      if (!biblioteca) return;
      setAviso(null);
      try {
        const tocados = await biblioteca.borrarStickers(archivos);
        if (tocados.length === 0) return;
        setPaquetes(biblioteca.paquetes());
        let resumen = archivos.length === 1 ? 'Sticker borrado' : `${archivos.length} stickers borrados`;
        setAviso(resumen);
        // Una actualización por paquete tocado, como al final de una tanda.
        for (const paquete of tocados) {
          const falta = await actualizarEnWhatsApp(paquete);
          if (falta) resumen = falta;
        }
        setAviso(resumen);
      } catch (e) {
        setAviso(`No se pudieron borrar los stickers: ${mensajeDe(e)}`);
      }
    });
  }

  async function correrTanda(tanda: () => Promise<ResultadoTanda | null>, desdeCompartir: boolean) {
    if (!biblioteca) return;
    setConvirtiendo(true);
    setAviso(null);
    let resumen: string | null = null;
    try {
      const resultado = await tanda();
      if (resultado) {
        resumen = resultado.aviso;
        setAviso(resumen);
        setPaquetes(biblioteca.paquetes());
        // WhatsApp no relee solo un paquete que ya tiene: le pedimos que lo
        // actualice, una vez por paquete al final de la tanda, y el usuario lo
        // confirma con un toque. Se lo preguntamos ahora y no al estado de la
        // pantalla, que puede no estar al día. Si la actualización no se hizo,
        // ese aviso reemplaza al resumen: dice qué falta hacer.
        for (const paquete of resultado.paquetes) {
          const falta = await actualizarEnWhatsApp(paquete);
          if (falta) resumen = falta;
        }
        setAviso(resumen);
      }
    } catch (e) {
      resumen = `No se pudo crear el sticker: ${mensajeDe(e)}`;
      setAviso(resumen);
    } finally {
      setConvirtiendo(false);
    }
    // Desde Compartir, el aviso tiene que verse sobre la app de origen, a la
    // que volvemos apenas termina la tanda.
    if (desdeCompartir) {
      if (resumen) ToastAndroid.show(resumen, ToastAndroid.LONG);
      await Compartir.volverAlOrigen().catch(() => {}); // si falla, la app queda abierta con el aviso
    }
  }

  // Lo que llega por Compartir: al abrir la app, cada vez que se comparte con
  // la app ya abierta y al volver al frente (por si al abrir todavía no había
  // actividad). Leer marca lo compartido como leído: no se convierte dos veces.
  useEffect(() => {
    if (!biblioteca) return;
    const recibir = () => {
      Compartir.leerCompartidos()
        .then((archivos) => {
          if (archivos.length > 0) encolar(() => convertirTanda(biblioteca, archivos, elegirTramo), true);
        })
        .catch((e: unknown) => setAviso(`No se pudo leer lo compartido: ${mensajeDe(e)}`));
    };
    recibir();
    const compartido = Compartir.addListener('compartido', recibir);
    const alFrente = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') recibir();
    });
    return () => {
      compartido.remove();
      alFrente.remove();
    };
    // Solo depende de la biblioteca: encolar usa la cola (una ref), y setters y elegirTramo son estables.
  }, [biblioteca]);

  function elegirDeGaleria() {
    if (biblioteca) encolar(() => crearStickerDesdeGaleria(biblioteca, elegirTramo));
  }

  return (
    // Android dibuja de borde a borde: dejamos lugar para la barra de estado
    // arriba y la de navegación abajo.
    <SafeAreaView style={styles.container}>
      {error && <Text style={styles.error}>{error}</Text>}
      {paquetes && (
        <PantallaPaquetes
          paquetes={paquetes}
          agregados={agregados}
          uriDeSticker={uriDeSticker}
          onAgregar={agregar}
          seleccionados={seleccion}
          onMantener={mantenerSticker}
          onTocar={tocarSticker}
        />
      )}
      {aviso && <Text style={styles.aviso}>{aviso}</Text>}
      {seleccionando ? (
        <View style={styles.barraSeleccion}>
          <Pressable style={[styles.boton, styles.botonCancelar]} onPress={() => setSeleccion(SIN_SELECCION)}>
            <Text style={styles.textoCancelar}>Cancelar</Text>
          </Pressable>
          <Pressable style={[styles.boton, styles.botonBorrar]} onPress={confirmarBorrado}>
            <Text style={styles.textoBoton}>Borrar ({seleccion.size})</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={[styles.boton, (!biblioteca || convirtiendo) && styles.botonInactivo]}
          disabled={!biblioteca || convirtiendo}
          onPress={elegirDeGaleria}
        >
          <Text style={styles.textoBoton}>{convirtiendo ? 'Convirtiendo…' : 'Elegir de la galería'}</Text>
        </Pressable>
      )}
      {pedidoDeTramo && (
        <SelectorDeTramo
          uri={pedidoDeTramo.archivo.uri}
          duracionVideo={pedidoDeTramo.duracionVideo}
          onCrear={pedidoDeTramo.responder}
          onVolver={() => pedidoDeTramo.responder(null)}
        />
      )}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  error: { padding: 16, color: '#B42318' },
  aviso: { paddingHorizontal: 16, paddingBottom: 8, color: '#344054' },
  boton: { margin: 16, padding: 16, borderRadius: 12, backgroundColor: '#1570EF', alignItems: 'center' },
  botonInactivo: { opacity: 0.5 },
  textoBoton: { color: '#fff', fontSize: 16, fontWeight: '600' },
  barraSeleccion: { flexDirection: 'row' },
  botonCancelar: { flex: 1, marginRight: 8, backgroundColor: '#F2F4F7' },
  botonBorrar: { flex: 1, marginLeft: 8, backgroundColor: '#D92D20' },
  textoCancelar: { color: '#344054', fontSize: 16, fontWeight: '600' },
});
