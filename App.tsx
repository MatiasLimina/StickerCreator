import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, ToastAndroid } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { abrirBiblioteca, type Biblioteca, type VistaPaquete } from './src/paquetes/biblioteca';
import { crearAlmacenEnArchivo } from './src/paquetes/almacen-en-archivo';
import { PantallaPaquetes } from './src/pantalla/PantallaPaquetes';
import { archivoDeSticker } from './src/stickers/carpeta';
import Compartir from './modules/compartir';
import { crearStickerDesdeGaleria } from './src/stickers/crear-desde-galeria';
import { convertirTanda, type ResultadoTanda } from './src/stickers/tanda';
import { agregarAWhatsApp, consultarAgregados, estaAgregado } from './src/whatsapp/agregar';

const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : String(e));

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

  useEffect(() => {
    abrirBiblioteca(crearAlmacenEnArchivo())
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

  async function agregar(paquete: VistaPaquete, yaAgregado = false) {
    setAviso(null);
    try {
      const { agregado, aviso: resultado } = await agregarAWhatsApp(paquete, yaAgregado);
      if (agregado) setAgregados((antes) => ({ ...antes, [paquete.id]: true }));
      setAviso(resultado);
    } catch (e) {
      setAviso(`No se pudo abrir WhatsApp: ${mensajeDe(e)}`);
    }
  }

  // Las tandas (de la galería o de Compartir) corren de a una: si llega otra
  // mientras se convierte, espera su turno.
  const cola = useRef(Promise.resolve());
  function encolar(tanda: () => Promise<ResultadoTanda | null>, desdeCompartir = false) {
    cola.current = cola.current.then(() => correrTanda(tanda, desdeCompartir));
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
        // pantalla, que puede no estar al día.
        for (const paquete of resultado.paquetes) {
          if (paquete.sePuedeAgregar && (await estaAgregado(paquete))) await agregar(paquete, true);
        }
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

  // Lo que llega por Compartir: al abrir la app y cada vez que se comparte
  // con la app ya abierta.
  useEffect(() => {
    if (!biblioteca) return;
    const recibir = () => {
      Compartir.leerCompartidos()
        .then((archivos) => {
          if (archivos.length > 0) encolar(() => convertirTanda(biblioteca, archivos), true);
        })
        .catch((e: unknown) => setAviso(`No se pudo leer lo compartido: ${mensajeDe(e)}`));
    };
    recibir();
    const suscripcion = Compartir.addListener('compartido', recibir);
    return () => suscripcion.remove();
    // Solo depende de la biblioteca: encolar usa la cola (una ref) y setters estables.
  }, [biblioteca]);

  function elegirDeGaleria() {
    if (biblioteca) encolar(() => crearStickerDesdeGaleria(biblioteca));
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
          uriDeSticker={(nombre) => archivoDeSticker(nombre).uri}
          onAgregar={agregar}
        />
      )}
      {aviso && <Text style={styles.aviso}>{aviso}</Text>}
      <Pressable
        style={[styles.boton, (!biblioteca || convirtiendo) && styles.botonInactivo]}
        disabled={!biblioteca || convirtiendo}
        onPress={elegirDeGaleria}
      >
        <Text style={styles.textoBoton}>{convirtiendo ? 'Convirtiendo…' : 'Elegir de la galería'}</Text>
      </Pressable>
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
});
