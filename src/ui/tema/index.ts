export const colores = {
  fondo: '#0E1116',
  superficie: '#171B22',
  superficieAlta: '#1F242D',
  borde: '#2A313C',
  texto: '#F2F5F9',
  textoTenue: '#98A2B3',
  acento: '#E8FF59',
  acentoTexto: '#0E1116',
  musculoPrincipal: '#E8FF59',
  musculoSecundario: '#6B7A2E',
  musculoInactivo: '#2A313C',
  exito: '#43D787',
  aviso: '#FFB020',
  error: '#FF5C5C',
} as const;

export const espaciado = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const tipografia = {
  titulo: { fontSize: 28, fontWeight: '700' as const, color: colores.texto },
  seccion: { fontSize: 20, fontWeight: '600' as const, color: colores.texto },
  cuerpo: { fontSize: 16, fontWeight: '400' as const, color: colores.texto },
  tenue: { fontSize: 14, fontWeight: '400' as const, color: colores.textoTenue },
  numero: { fontSize: 32, fontWeight: '700' as const, color: colores.texto },
} as const;

export const radio = { sm: 8, md: 14, lg: 22 } as const;
