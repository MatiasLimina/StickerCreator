import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, Pressable, StyleSheet, Text, ToastAndroid, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { abrirBiblioteca, type Biblioteca, type VistaPaquete } from './src/paquetes/biblioteca';
import { crearAlmacenEnArchivo } from './src/paquetes/almacen-en-archivo';
import { Cielo } from './src/identidad/Cielo';
import { PantallaPaquetes } from './src/pantalla/PantallaPaquetes';
import { SelectorDeTramo } from './src/pantalla/SelectorDeTramo';
import { archivoDeSticker, eliminarArchivoDeSticker } from './src/stickers/carpeta';
import Compartir from './modules/compartir';
import { crearStickerDesdeGaleria } from './src/stickers/crear-desde-galeria';
import {
  convertirTanda,
  type EleccionDeTramo,
  type ElegirTramo,
  type PedidoDeTramo,
  type ResultadoTanda,
} from './src/stickers/tanda';
import { colores, estilosPie, radios, ALTO_BOTON_SELECCION } from './src/tema/tema';
import { agregarAWhatsApp, consultarAgregados, estaAgregado, type ResultadoPedido, type TipoAviso } from './src/whatsapp/agregar';

const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : String(e));
const uriDeSticker = (nombre: string) => archivoDeSticker(nombre).uri;
/** Un aviso de una línea: lleva su tipo desde donde se crea. */
interface Aviso {
  texto: string;
  tipo: TipoAviso;
}
const avisoError = (texto: string): Aviso => ({ texto, tipo: 'error' });
/** Una tanda que no agregó nada es un error (descartó todo); con tramos acortados, información. */
const tipoDeResumen = (resultado: ResultadoTanda): TipoAviso =>
  resultado.paquetes.length === 0 ? 'error' : resultado.acortados > 0 ? 'informativo' : 'normal';
const SIN_SELECCION: ReadonlySet<string> = new Set();

/** Un selector de tramo abierto: la tanda espera a que `responder` le diga la elección (o null si el usuario volvió). */
interface SelectorAbierto extends PedidoDeTramo {
  responder: (eleccion: EleccionDeTramo | null) => void;
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
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [convirtiendo, setConvirtiendo] = useState(false);
  const [agregados, setAgregados] = useState<Record<string, boolean>>({});
  // Stickers marcados para borrar, como en una galería: con alguno marcado, la pantalla está en modo selección.
  const [seleccion, setSeleccion] = useState<ReadonlySet<string>>(SIN_SELECCION);
  const seleccionando = seleccion.size > 0;
  const [selectorAbierto, setSelectorAbierto] = useState<SelectorAbierto | null>(null);

  // La tanda (que corre en la cola de cambios) se queda esperando acá mientras
  // el selector está abierto: lo que llegue por Compartir espera su turno.
  // Solo vale la primera respuesta: un doble toque en «Siguiente» no tiene que
  // cerrar el selector del video que sigue, que ya se abrió.
  const elegirTramo = useCallback<ElegirTramo>(
    (pedido) =>
      new Promise((resolver) => {
        let respondido = false;
        setSelectorAbierto({
          ...pedido,
          responder: (eleccion) => {
            if (respondido) return;
            respondido = true;
            setSelectorAbierto(null);
            resolver(eleccion);
          },
        });
      }),
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
      if (resultado.agregado) {
        setAgregados((antes) => ({ ...antes, [paquete.id]: true }));
        // Por la cola: escribe el índice, como las tandas y los borrados.
        encolarCambio(async () => {
          if (!biblioteca) return;
          await biblioteca.confirmarEnWhatsApp(paquete.id, paquete.version);
          setPaquetes(biblioteca.paquetes());
        });
      }
      return resultado;
    } catch (e) {
      return { agregado: false, aviso: `No se pudo abrir WhatsApp: ${mensajeDe(e)}`, tipoAviso: 'error' } satisfies ResultadoPedido;
    }
  }

  async function agregar(paquete: VistaPaquete) {
    setAviso(null);
    const { aviso: texto, tipoAviso } = await pedirAWhatsApp(paquete, agregados[paquete.id] ?? false);
    setAviso(texto ? { texto, tipo: tipoAviso } : null);
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
  async function actualizarEnWhatsApp(paquete: VistaPaquete): Promise<Aviso | null> {
    if (!paquete.sePuedeAgregar || !(await estaAgregado(paquete))) return null;
    const actualizacion = await pedirAWhatsApp(paquete, true);
    return actualizacion.agregado || !actualizacion.aviso ? null : { texto: actualizacion.aviso, tipo: actualizacion.tipoAviso };
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
        let resumen: Aviso = {
          texto: archivos.length === 1 ? 'Sticker borrado' : `${archivos.length} stickers borrados`,
          tipo: 'normal',
        };
        setAviso(resumen);
        // Una actualización por paquete tocado, como al final de una tanda.
        for (const paquete of tocados) {
          const falta = await actualizarEnWhatsApp(paquete);
          if (falta) resumen = falta;
        }
        setAviso(resumen);
      } catch (e) {
        setAviso(avisoError(`No se pudieron borrar los stickers: ${mensajeDe(e)}`));
      }
    });
  }

  async function correrTanda(tanda: () => Promise<ResultadoTanda | null>, desdeCompartir: boolean) {
    if (!biblioteca) return;
    setConvirtiendo(true);
    setAviso(null);
    let resumen: Aviso | null = null;
    try {
      const resultado = await tanda();
      if (resultado) {
        resumen = { texto: resultado.aviso, tipo: tipoDeResumen(resultado) };
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
      resumen = avisoError(`No se pudo crear el sticker: ${mensajeDe(e)}`);
      setAviso(resumen);
    } finally {
      setConvirtiendo(false);
    }
    // Desde Compartir, el aviso tiene que verse sobre la app de origen, a la
    // que volvemos apenas termina la tanda.
    if (desdeCompartir) {
      if (resumen) ToastAndroid.show(resumen.texto, ToastAndroid.LONG);
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
        .catch((e: unknown) => setAviso(avisoError(`No se pudo leer lo compartido: ${mensajeDe(e)}`)));
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

  const inactivo = !biblioteca || convirtiendo;

  return (
    // Android dibuja de borde a borde: dejamos lugar para la barra de estado
    // arriba y la de navegación abajo.
    // El cielo va fuera del área segura: cubre también las barras del sistema.
    <View style={styles.raiz}>
      {/* Capa fija detrás de todo: no se mueve con el scroll de la lista. */}
      <Cielo />
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
      {aviso && (
        <View style={[styles.aviso, aviso.tipo === 'informativo' && styles.avisoInformativo, aviso.tipo === 'error' && styles.avisoError]}>
          {aviso.tipo === 'informativo' && <Text style={styles.iconoInformacion}>ⓘ</Text>}
          {aviso.tipo === 'error' && <Text style={styles.iconoError}>⚠</Text>}
          <Text style={[styles.textoAviso, aviso.tipo === 'error' && styles.textoAvisoError]}>{aviso.texto}</Text>
        </View>
      )}
      {seleccionando ? (
        <View style={styles.barraSeleccion}>
          <Pressable style={[styles.botonSeleccion, styles.botonCancelar]} onPress={() => setSeleccion(SIN_SELECCION)}>
            <Text style={styles.textoCancelar}>Cancelar</Text>
          </Pressable>
          <Pressable style={[styles.botonSeleccion, styles.botonBorrar]} onPress={confirmarBorrado}>
            <Text style={styles.textoBorrar}>🗑 Borrar ({seleccion.size})</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={[styles.principal, inactivo && styles.principalInactivo]}
          disabled={inactivo}
          onPress={elegirDeGaleria}
        >
          <Text style={[styles.textoPrincipal, inactivo && styles.textoPrincipalInactivo]}>
            {convirtiendo ? 'Convirtiendo…' : 'Elegir de la galería'}
          </Text>
        </Pressable>
      )}
      {selectorAbierto && (
        <SelectorDeTramo
          // Una instancia por video de la fila: cada selector arranca con su propio tramo inicial.
          key={selectorAbierto.numero}
          uri={selectorAbierto.archivo.uri}
          duracionVideo={selectorAbierto.duracionVideo}
          numero={selectorAbierto.numero}
          total={selectorAbierto.total}
          enTanda={selectorAbierto.enTanda}
          onElegir={(tramo, restoAutomatico) => selectorAbierto.responder({ tramo, restoAutomatico })}
          onVolver={() => selectorAbierto.responder(null)}
        />
      )}
      <StatusBar style="light" />
      </SafeAreaView>
    </View>
  );
}

const margenPie = { marginHorizontal: 16, marginBottom: 16 } as const;

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.lienzo },
  container: { flex: 1 },
  error: { padding: 16, color: colores.errorTexto },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radios.aviso,
    backgroundColor: colores.control,
    borderWidth: 1,
    borderColor: colores.bordeAviso,
    borderLeftWidth: 3.5,
    borderLeftColor: colores.bordeControl,
  },
  avisoInformativo: { backgroundColor: colores.avisoInfoFondo, borderLeftColor: colores.avisoInfoAcento },
  avisoError: { backgroundColor: colores.errorFondo, borderColor: colores.errorBorde, borderLeftColor: colores.errorAcento },
  textoAviso: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500', color: colores.textoPrincipal },
  textoAvisoError: { color: colores.errorTexto },
  iconoInformacion: { fontSize: 15, fontWeight: '700', color: colores.avisoInfoAcento },
  iconoError: { fontSize: 15, fontWeight: '700', color: colores.errorAcento },
  principal: {
    ...estilosPie.principal,
    ...margenPie,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: [{ offsetX: 0, offsetY: 10, blurRadius: 26, color: colores.resplandor }],
  },
  principalInactivo: {
    backgroundColor: colores.inactivoFondo,
    borderColor: colores.inactivoBorde,
    boxShadow: [],
  },
  textoPrincipal: { color: colores.carmesiTexto, fontSize: 15.5, fontWeight: '600', letterSpacing: 0.15 },
  textoPrincipalInactivo: { color: colores.inactivoTexto },
  barraSeleccion: { flexDirection: 'row', gap: 10, ...margenPie },
  botonSeleccion: { minHeight: ALTO_BOTON_SELECCION, borderRadius: radios.boton, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  botonCancelar: { flex: 1, backgroundColor: colores.control, borderColor: colores.bordeCancelar },
  botonBorrar: { flex: 1.2, backgroundColor: colores.destructivoFondo, borderColor: colores.destructivoBorde },
  textoCancelar: { color: colores.textoPrincipal, fontSize: 15, fontWeight: '600' },
  textoBorrar: { color: colores.destructivoTexto, fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
