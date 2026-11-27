import { memo } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { VistaPaquete } from '../paquetes/biblioteca';
import { estadoDePaquete } from '../paquetes/estado';
import { AREA_TOCABLE, colores, radios } from '../tema/tema';

interface Props {
  paquetes: VistaPaquete[];
  /** Qué paquetes ya tiene WhatsApp, por id (según le preguntamos). */
  agregados: Record<string, boolean>;
  /** Dónde está el archivo de un sticker, para mostrarlo. Tiene que ser estable entre renders. */
  uriDeSticker: (archivo: string) => string;
  onAgregar: (paquete: VistaPaquete) => void;
  /** Stickers marcados para borrar; si hay alguno, la pantalla está en modo selección. */
  seleccionados: ReadonlySet<string>;
  /** Una pulsación larga entra al modo selección con ese sticker (o lo alterna si ya está en ese modo). */
  onMantener: (archivo: string) => void;
  /** En modo selección, un toque marca o desmarca el sticker. */
  onTocar: (archivo: string) => void;
}

type Acciones = Pick<Props, 'uriDeSticker' | 'onMantener' | 'onTocar'>;

/**
 * Un sticker de la grilla. Memorizado: al marcar uno, solo se redibuja esa
 * celda y no todas las imágenes de la pantalla (por eso los callbacks que
 * recibe tienen que ser estables).
 */
const Celda = memo(function Celda({
  archivo,
  marcado,
  animado,
  uriDeSticker,
  onMantener,
  onTocar,
}: Acciones & { archivo: string; marcado: boolean; animado: boolean }) {
  return (
    <View style={styles.hueco}>
      <Pressable
        onLongPress={() => onMantener(archivo)}
        onPress={() => onTocar(archivo)}
        style={[styles.celda, marcado && styles.celdaMarcada]}
        accessibilityLabel={animado ? 'Sticker animado' : 'Sticker'}
        accessibilityState={{ selected: marcado }}
        accessibilityHint="Mantené apretado para seleccionarlo"
      >
        <Image source={{ uri: uriDeSticker(archivo) }} style={[styles.sticker, marcado && styles.stickerMarcado]} />
        {animado && (
          <View style={styles.etiqueta}>
            <Text style={styles.textoEtiqueta}>Animado</Text>
          </View>
        )}
        {marcado && <Text style={styles.tilde}>✓</Text>}
      </Pressable>
    </View>
  );
});

export function PantallaPaquetes({ paquetes, agregados, uriDeSticker, onAgregar, seleccionados, onMantener, onTocar }: Props) {
  return (
    <FlatList
      data={paquetes}
      keyExtractor={(p) => p.id}
      contentContainerStyle={styles.lista}
      renderItem={({ item }) => {
        const agregado = agregados[item.id] ?? false;
        const estado = estadoDePaquete(item, agregado);
        return (
          <View style={styles.paquete}>
            <View style={styles.encabezado}>
              <View style={styles.filaNombre}>
                <Text style={styles.nombre} numberOfLines={1}>
                  {item.nombre}
                </Text>
                <View style={styles.pastilla}>
                  <Text style={styles.contador}>
                    {item.cantidad}/{item.capacidad}
                  </Text>
                </View>
              </View>
              <View style={styles.filaEstado}>
                {estado.tono === 'en-whatsapp' && <View style={styles.puntito} />}
                <Text style={[styles.estado, estado.tono === 'listo' && styles.estadoListo]}>{estado.texto}</Text>
              </View>
            </View>
            <View style={styles.cuerpo}>
              {item.stickers.length > 0 && (
                <View style={styles.grilla}>
                  {item.stickers.map((archivo) => (
                    <Celda
                      key={archivo}
                      archivo={archivo}
                      marcado={seleccionados.has(archivo)}
                      animado={item.tipo === 'animado'}
                      uriDeSticker={uriDeSticker}
                      onMantener={onMantener}
                      onTocar={onTocar}
                    />
                  ))}
                </View>
              )}
              {/* Ya agregado, los stickers nuevos llegan solos: no hace falta el botón. */}
              {!agregado && (
                <Pressable
                  style={[styles.boton, !item.sePuedeAgregar && styles.botonInactivo]}
                  disabled={!item.sePuedeAgregar}
                  onPress={() => onAgregar(item)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.textoBoton, !item.sePuedeAgregar && styles.textoBotonInactivo]}>
                    Agregar a WhatsApp
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  lista: { padding: 16, gap: 14 },
  paquete: {
    borderRadius: radios.tarjeta,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    overflow: 'hidden',
  },
  encabezado: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
    backgroundColor: colores.cabecera,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
  },
  filaNombre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  nombre: { flexShrink: 1, fontSize: 18, fontWeight: '600', color: colores.textoPrincipal },
  pastilla: {
    minHeight: 28,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: radios.capsula,
    backgroundColor: colores.control,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  contador: { fontSize: 14, fontWeight: '600', color: colores.textoSecundario, fontVariant: ['tabular-nums'] },
  filaEstado: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  puntito: { width: 8, height: 8, borderRadius: 4, backgroundColor: colores.verdeEstado },
  estado: { fontSize: 14, color: colores.textoAtenuado },
  estadoListo: { color: colores.textoSecundario },
  cuerpo: { padding: 12, gap: 12 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap' },
  // Cuatro columnas: cada hueco ocupa un cuarto y la baldosa respeta una separación pareja.
  hueco: { width: '25%', padding: 4 },
  celda: {
    aspectRatio: 1,
    minHeight: AREA_TOCABLE,
    borderRadius: radios.baldosa,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colores.baldosa,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celdaMarcada: { borderColor: colores.carmesiVivo, backgroundColor: colores.baldosaMarcada },
  sticker: { width: '84%', height: '84%' },
  stickerMarcado: { opacity: 0.6 },
  etiqueta: {
    position: 'absolute',
    bottom: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radios.capsula,
    backgroundColor: colores.cabecera,
  },
  textoEtiqueta: { fontSize: 10, fontWeight: '600', color: colores.textoPrincipal },
  tilde: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: colores.carmesi,
    color: colores.carmesiTexto,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '700',
  },
  boton: {
    minHeight: AREA_TOCABLE,
    paddingHorizontal: 16,
    borderRadius: radios.boton,
    backgroundColor: colores.control,
    borderWidth: 1,
    borderColor: colores.bordeControl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonInactivo: { backgroundColor: colores.inactivoFondo, borderColor: colores.inactivoBorde },
  textoBoton: { color: colores.textoPrincipal, fontSize: 15, fontWeight: '600' },
  textoBotonInactivo: { color: colores.inactivoTexto },
});
