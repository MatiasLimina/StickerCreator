import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Emblema } from '../identidad/Emblema';
import { colores, radios, tipografias } from '../tema/tema';

const TAMANO_EMBLEMA = 68;

/**
 * Encabezado compacto de la lista: emblema a la izquierda, nombre de la app en
 * Cinzel y el resumen de la biblioteca en una pastilla. Va como encabezado de
 * la FlatList, así que se va con el scroll.
 */
export const Banner = memo(function Banner({ resumen }: { resumen: string }) {
  return (
    <View style={styles.banner} accessibilityRole="header">
      {/* Resplandor carmesí detrás del emblema. */}
      <Svg style={styles.resplandor} width={140} height="100%" pointerEvents="none">
        <Defs>
          <RadialGradient id="banner-resplandor" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colores.carmesiCielo} stopOpacity="0.28" />
            <Stop offset="0.62" stopColor={colores.carmesi} stopOpacity="0.08" />
            <Stop offset="1" stopColor={colores.carmesi} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#banner-resplandor)" />
      </Svg>
      {/* Marcas de astrolabio en el borde derecho. */}
      <Svg style={styles.marcas} width={110} height="100%" viewBox="0 0 110 96" preserveAspectRatio="xMaxYMid slice" pointerEvents="none">
        <Circle cx="110" cy="48" r="68" fill="none" stroke={colores.plata} strokeWidth="0.75" strokeDasharray="2 5" />
        <Circle cx="110" cy="48" r="52" fill="none" stroke={colores.plata} strokeWidth="0.6" strokeOpacity="0.55" />
        <Line x1="60" y1="48" x2="70" y2="48" stroke={colores.plata} strokeWidth="0.8" />
        <Line x1="72" y1="20" x2="79" y2="25" stroke={colores.plata} strokeWidth="0.8" />
        <Line x1="72" y1="76" x2="79" y2="71" stroke={colores.plata} strokeWidth="0.8" />
      </Svg>
      <Emblema size={TAMANO_EMBLEMA} />
      <View style={styles.info}>
        <Text style={styles.titulo} numberOfLines={1}>
          StickerCreator
        </Text>
        <View style={styles.pastilla}>
          <Text style={styles.resumen}>{resumen}</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 9,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: radios.tarjeta,
    backgroundColor: colores.cabecera,
    borderWidth: 1,
    borderColor: colores.bordeBanner,
    overflow: 'hidden',
    boxShadow: '0 8px 22px rgba(0, 0, 0, 0.48)',
  },
  resplandor: { position: 'absolute', left: -24, top: 0, bottom: 0 },
  marcas: { position: 'absolute', right: 0, top: 0, bottom: 0, opacity: 0.32 },
  info: { flexShrink: 1, alignItems: 'flex-start', gap: 6 },
  titulo: {
    fontFamily: tipografias.serif,
    fontSize: 20.5,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: colores.textoPrincipal,
  },
  pastilla: {
    paddingVertical: 3.5,
    paddingHorizontal: 10,
    borderRadius: radios.capsula,
    backgroundColor: colores.control,
    borderWidth: 1,
    borderColor: colores.bordeAviso,
  },
  resumen: { fontSize: 12, fontWeight: '500', color: colores.textoSecundario, fontVariant: ['tabular-nums'] },
});
