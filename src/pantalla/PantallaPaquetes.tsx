import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { VistaPaquete } from '../paquetes/biblioteca';

function estado(paquete: VistaPaquete, agregado: boolean): string {
  // WhatsApp conserva la última versión válida hasta que vuelva a haber 3.
  if (agregado && !paquete.sePuedeAgregar) return `En WhatsApp sin cambios: faltan ${paquete.faltan} para actualizarlo`;
  if (agregado) return 'Agregado a WhatsApp';
  if (paquete.sePuedeAgregar) return 'Listo para agregar a WhatsApp';
  return `Faltan ${paquete.faltan} para poder agregarlo`;
}

interface Props {
  paquetes: VistaPaquete[];
  /** Qué paquetes ya tiene WhatsApp, por id (según le preguntamos). */
  agregados: Record<string, boolean>;
  /** Dónde está el archivo de un sticker, para mostrarlo. */
  uriDeSticker: (archivo: string) => string;
  onAgregar: (paquete: VistaPaquete) => void;
  /** Una pulsación larga sobre un sticker lo borra. */
  onBorrar: (archivo: string) => void;
}

export function PantallaPaquetes({ paquetes, agregados, uriDeSticker, onAgregar, onBorrar }: Props) {
  return (
    <FlatList
      data={paquetes}
      keyExtractor={(p) => p.id}
      contentContainerStyle={styles.lista}
      renderItem={({ item }) => {
        const agregado = agregados[item.id] ?? false;
        return (
          <View style={styles.paquete}>
            <View style={styles.encabezado}>
              <Text style={styles.nombre}>{item.nombre}</Text>
              <Text style={styles.contador}>
                {item.cantidad}/{item.capacidad}
              </Text>
            </View>
            <Text style={[styles.estado, agregado && styles.estadoAgregado]}>{estado(item, agregado)}</Text>
            {item.stickers.length > 0 && (
              <View style={styles.grilla}>
                {item.stickers.map((archivo) => (
                  <Pressable key={archivo} onLongPress={() => onBorrar(archivo)} accessibilityLabel="Sticker" accessibilityHint="Mantené apretado para borrarlo">
                    <Image source={{ uri: uriDeSticker(archivo) }} style={styles.sticker} />
                  </Pressable>
                ))}
              </View>
            )}
            {/* Ya agregado, los stickers nuevos llegan solos: no hace falta el botón. */}
            {!agregado && (
              <Pressable
                style={[styles.boton, !item.sePuedeAgregar && styles.botonInactivo]}
                disabled={!item.sePuedeAgregar}
                onPress={() => onAgregar(item)}
              >
                <Text style={styles.textoBoton}>Agregar a WhatsApp</Text>
              </Pressable>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  lista: { padding: 16, gap: 12 },
  paquete: { padding: 16, borderRadius: 12, backgroundColor: '#F2F4F7' },
  encabezado: { flexDirection: 'row', justifyContent: 'space-between' },
  nombre: { fontSize: 18, fontWeight: '600' },
  contador: { fontSize: 16, color: '#475467' },
  estado: { marginTop: 4, color: '#475467' },
  estadoAgregado: { color: '#067647', fontWeight: '600' },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  sticker: { width: 72, height: 72 },
  boton: { marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: '#25D366', alignItems: 'center' },
  botonInactivo: { opacity: 0.4 },
  textoBoton: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
