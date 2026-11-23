import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { abrirBiblioteca, type Biblioteca, type VistaPaquete } from './src/paquetes/biblioteca';
import { crearAlmacenEnArchivo } from './src/paquetes/almacen-en-archivo';
import { PantallaPaquetes } from './src/pantalla/PantallaPaquetes';
import { archivoDeSticker } from './src/stickers/carpeta';
import { crearStickerDesdeGaleria } from './src/stickers/crear-desde-galeria';
import { agregarAWhatsApp, consultarAgregados } from './src/whatsapp/agregar';

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
  const refrescarAgregados = useCallback(() => {
    if (!paquetes) return;
    consultarAgregados(paquetes)
      .then(setAgregados)
      .catch(() => {}); // si WhatsApp no responde, queda el último estado conocido
  }, [paquetes]);

  useEffect(() => {
    refrescarAgregados();
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') refrescarAgregados();
    });
    return () => suscripcion.remove();
  }, [refrescarAgregados]);

  async function agregar(paquete: VistaPaquete) {
    setAviso(null);
    try {
      const { agregado, aviso: resultado } = await agregarAWhatsApp(paquete);
      if (agregado) setAgregados((antes) => ({ ...antes, [paquete.id]: true }));
      setAviso(resultado);
    } catch (e) {
      setAviso(`No se pudo abrir WhatsApp: ${mensajeDe(e)}`);
    }
  }

  async function elegirDeGaleria() {
    if (!biblioteca) return;
    setConvirtiendo(true);
    setAviso(null);
    try {
      const resultado = await crearStickerDesdeGaleria(biblioteca);
      if (resultado) setAviso(resultado);
      setPaquetes(biblioteca.paquetes());
    } catch (e) {
      setAviso(`No se pudo crear el sticker: ${mensajeDe(e)}`);
    } finally {
      setConvirtiendo(false);
    }
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
