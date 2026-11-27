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
        {marcado && (
          <View style={styles.tilde}>
            <Text style={styles.textoTilde}>✓</Text>
          </View>
        )}
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
        // WhatsApp no relee solo un paquete que ya tiene (ADR 0002): si quedaron
        // cambios sin pasar, el mismo botón le pide que lo actualice.
        const conBoton = !agregado || estado.tono === 'pendiente';
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
                <Text style={[styles.estado, estado.tono === 'faltan' && styles.estadoFaltan]}>{estado.texto}</Text>
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
              {conBoton && (
                <Pressable
                  style={[styles.boton, !item.sePuedeAgregar && styles.botonInactivo]}
                  disabled={!item.sePuedeAgregar}
                  onPress={() => onAgregar(item)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.textoBoton, !item.sePuedeAgregar && styles.textoBotonInactivo]}>
                    {agregado ? 'Actualizar en WhatsApp' : 'Agregar a WhatsApp'}
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
    boxShadow: '0 10px 24px rgba(0, 0, 0, 0.56)',
  },
  encabezado: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 4,
    backgroundColor: colores.cabecera,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
  },
  filaNombre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  nombre: { flexShrink: 1, fontSize: 16, fontWeight: '600', letterSpacing: 0.3, color: colores.textoPrincipal },
  pastilla: {
    paddingVertical: 2.5,
    paddingHorizontal: 9,
    justifyContent: 'center',
    borderRadius: radios.capsula,
    backgroundColor: colores.control,
    borderWidth: 1,
    borderColor: colores.bordePastilla,
  },
  contador: { fontSize: 12, fontWeight: '600', color: colores.textoSecundario, fontVariant: ['tabular-nums'] },
  filaEstado: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  puntito: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colores.verdeEstado },
  estado: { fontSize: 12.5, color: colores.textoSecundario },
  estadoFaltan: { color: colores.textoAtenuado },
  cuerpo: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, gap: 10 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap' },
  // Cuatro columnas: cada hueco ocupa un cuarto y la baldosa respeta una separación pareja.
  hueco: { width: '25%', padding: 4.5 },
  celda: {
    aspectRatio: 1,
    minHeight: AREA_TOCABLE,
    borderRadius: radios.baldosa,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colores.baldosa,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.42)',
  },
  celdaMarcada: {
    borderColor: colores.carmesiVivo,
    backgroundColor: colores.baldosaMarcada,
    boxShadow: '0 0 0 2px rgba(240, 58, 87, 0.25), 0 4px 10px rgba(0, 0, 0, 0.42)',
  },
  sticker: { width: '84%', height: '84%' },
  stickerMarcado: { opacity: 0.56 },
  etiqueta: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    backgroundColor: colores.etiquetaFondo,
  },
  // El diseño usa 8 px; 9 para que se lea en el teléfono.
  textoEtiqueta: { fontSize: 9, letterSpacing: 0.2, fontWeight: '600', color: colores.textoPrincipal },
  tilde: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colores.tarjeta,
    backgroundColor: colores.carmesi,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.5)',
  },
  textoTilde: { color: colores.carmesiTexto, fontSize: 13, fontWeight: '700', includeFontPadding: false },
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
