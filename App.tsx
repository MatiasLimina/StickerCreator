import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StatusBar as BarraNativa, Pressable, StyleSheet, Text, View } from 'react-native';
import { abrirBiblioteca, type Biblioteca, type VistaPaquete } from './src/paquetes/biblioteca';
import { crearAlmacenEnArchivo } from './src/paquetes/almacen-en-archivo';
import { PantallaPaquetes } from './src/pantalla/PantallaPaquetes';
import { archivoDeSticker } from './src/stickers/carpeta';
import { crearStickerDesdeGaleria } from './src/stickers/crear-desde-galeria';

const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function App() {
  const [biblioteca, setBiblioteca] = useState<Biblioteca | null>(null);
  const [paquetes, setPaquetes] = useState<VistaPaquete[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [convirtiendo, setConvirtiendo] = useState(false);

  useEffect(() => {
    abrirBiblioteca(crearAlmacenEnArchivo())
      .then((abierta) => {
        setBiblioteca(abierta);
        setPaquetes(abierta.paquetes());
      })
      .catch((e: unknown) => setError(`No se pudieron leer los paquetes: ${mensajeDe(e)}`));
  }, []);

  async function elegirDeGaleria() {
    if (!biblioteca) return;
    setConvirtiendo(true);
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
    // Android dibuja de borde a borde: dejamos lugar para la barra de estado.
    <View style={[styles.container, { paddingTop: BarraNativa.currentHeight ?? 0 }]}>
      {error && <Text style={styles.error}>{error}</Text>}
      {paquetes && (
        <PantallaPaquetes
          paquetes={paquetes}
          uriDeSticker={(nombre) => archivoDeSticker(nombre).uri}
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
    </View>
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
