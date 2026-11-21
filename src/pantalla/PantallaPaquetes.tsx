import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { VistaPaquete } from '../paquetes/biblioteca';

function estado(paquete: VistaPaquete): string {
  if (paquete.sePuedeAgregar) return 'Listo para agregar a WhatsApp';
  return `Faltan ${paquete.faltan} para poder agregarlo`;
}

export function PantallaPaquetes({ paquetes }: { paquetes: VistaPaquete[] }) {
  return (
    <FlatList
      data={paquetes}
      keyExtractor={(p) => p.id}
      contentContainerStyle={styles.lista}
      renderItem={({ item }) => (
        <View style={styles.paquete}>
          <View style={styles.encabezado}>
            <Text style={styles.nombre}>{item.nombre}</Text>
            <Text style={styles.contador}>
              {item.cantidad}/{item.capacidad}
            </Text>
          </View>
          <Text style={styles.estado}>{estado(item)}</Text>
        </View>
      )}
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
});
