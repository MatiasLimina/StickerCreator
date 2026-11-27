/**
 * Tema Evernight: fuente de verdad en docs/design/identidad-evernight/README.md.
 * Los colores nuevos salen de acá, no de valores sueltos.
 */
export const colores = {
  // Lienzo y viñeta (el cielo con constelaciones llega en #37)
  lienzo: '#070505',
  vinietaMedia: '#130707',
  vinietaCentro: '#210B0A',
  // Superficies
  tarjeta: '#151010',
  cabecera: '#1D1515',
  control: '#271C1C',
  borde: '#3A2B2B',
  bordeControl: '#8C7270',
  bordeCancelar: '#5E4848',
  bordeAviso: '#4E3939',
  // Textos
  textoPrincipal: '#F6ECEA',
  textoSecundario: '#D8BCBA',
  textoAtenuado: '#B69997',
  // Carmesí
  carmesi: '#BD1736',
  carmesiClaro: '#CC1B3D',
  carmesiTexto: '#FFF8F8',
  carmesiVivo: '#F03A57',
  carmesiTinte: '#2E1216',
  carmesiBorde: 'rgba(255, 184, 190, 0.24)',
  resplandor: 'rgba(189, 23, 54, 0.46)',
  // Baldosas de la grilla (#35)
  baldosa: '#F8F0EE',
  baldosaMarcada: '#EED9DA',
  // Botón «Agregar a WhatsApp» inactivo (#35)
  inactivoFondo: '#1B1313',
  inactivoBorde: '#3D2E2E',
  inactivoTexto: '#8E7876',
  // Destructivo
  destructivoFondo: '#2D1213',
  destructivoBorde: '#E84A43',
  destructivoTexto: '#FFE0DE',
  // Error
  errorFondo: '#261111',
  errorAcento: '#F25C54',
  errorTexto: '#FFA8A3',
  errorBorde: '#662726',
  // Aviso informativo
  avisoInfoFondo: '#1E1516',
  avisoInfoAcento: '#E8C6C4',
  // Estado
  verdeEstado: '#2ED66B',
  // Botón principal en curso (#22): fondo, borde, texto, pista y luz de la barra
  avanceFondo: '#271215',
  avanceBorde: '#6E222E',
  avanceTexto: '#F4DCD9',
  avancePista: 'rgba(246, 236, 234, 0.12)',
  avanceLuz: '#FFA0AB',
  // Inactivo del botón principal (sin tanda)
  principalInactivoFondo: '#3A1B22',
  principalInactivoTexto: '#C9A3A8',
} as const;

export const radios = {
  baldosa: 14,
  boton: 14,
  aviso: 13,
  tarjeta: 20,
  capsula: 999,
} as const;

/** Cinzel se embebe en #37; hasta entonces el serif cae a la del sistema. */
export const tipografias = {
  serif: 'serif',
  sans: undefined,
} as const;

/** Alto mínimo tocable (dp). */
export const AREA_TOCABLE = 48;

/** Estilos reutilizables de los controles de pie. */
export const estilosPie = {
  principal: {
    minHeight: 54,
    borderRadius: radios.capsula,
    backgroundColor: colores.carmesi,
    borderWidth: 1,
    borderColor: colores.carmesiBorde,
    shadowColor: colores.carmesi,
    elevation: 12,
  },
  principalEnCurso: {
    backgroundColor: colores.avanceFondo,
    borderColor: colores.avanceBorde,
  },
  /** Barra de avance del #22 (todavía no se muestra). */
  avancePista: { height: 3.5, borderRadius: radios.capsula, backgroundColor: colores.avancePista },
  avanceRelleno: { height: 3.5, borderRadius: radios.capsula, backgroundColor: colores.carmesiVivo },
  /** Fila de pendiente del #18 (todavía no se muestra). */
  filaPendiente: {
    backgroundColor: colores.cabecera,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
    minHeight: AREA_TOCABLE,
  },
} as const;
