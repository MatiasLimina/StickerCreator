import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text } from 'react-native';
import { abrirBiblioteca, type VistaPaquete } from './src/paquetes/biblioteca';
import { crearAlmacenEnArchivo } from './src/paquetes/almacen-en-archivo';
import { PantallaPaquetes } from './src/pantalla/PantallaPaquetes';

export default function App() {
  const [paquetes, setPaquetes] = useState<VistaPaquete[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    abrirBiblioteca(crearAlmacenEnArchivo())
      .then((biblioteca) => setPaquetes(biblioteca.paquetes()))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {error && <Text style={styles.error}>No se pudieron leer los paquetes: {error}</Text>}
      {paquetes && <PantallaPaquetes paquetes={paquetes} />}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  error: { padding: 16, color: '#B42318' },
});
