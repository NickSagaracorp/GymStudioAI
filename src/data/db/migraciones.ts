import type { Adaptador } from './adaptador';

/**
 * Cada entrada es una versión del esquema y contiene sentencias sueltas, no un
 * bloque de SQL: el adaptador ejecuta una sentencia por llamada.
 */
export const MIGRACIONES: string[][] = [
  [
    `CREATE TABLE perfil (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      nombre TEXT NOT NULL,
      sexo TEXT NOT NULL,
      fecha_nac TEXT NOT NULL,
      altura_cm REAL NOT NULL,
      nivel TEXT NOT NULL,
      objetivo TEXT NOT NULL,
      dias_por_semana INTEGER NOT NULL,
      mancuerna_min_kg REAL NOT NULL,
      mancuerna_max_kg REAL NOT NULL,
      incremento_kg REAL NOT NULL,
      tiene_banco INTEGER NOT NULL,
      tiene_barra_dominadas INTEGER NOT NULL,
      dia_medicion INTEGER NOT NULL,
      creado_en TEXT NOT NULL
    )`,
    `CREATE TABLE programa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      objetivo TEXT NOT NULL,
      semanas INTEGER NOT NULL,
      dias_por_semana INTEGER NOT NULL,
      split TEXT NOT NULL,
      creado_en TEXT NOT NULL,
      activo INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE dia_programa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      programa_id INTEGER NOT NULL REFERENCES programa(id) ON DELETE CASCADE,
      semana INTEGER NOT NULL,
      dia INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      musculos TEXT NOT NULL
    )`,
    `CREATE TABLE ejercicio_dia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dia_programa_id INTEGER NOT NULL REFERENCES dia_programa(id) ON DELETE CASCADE,
      orden INTEGER NOT NULL,
      ejercicio_id TEXT NOT NULL,
      musculo_objetivo TEXT NOT NULL,
      equipamiento TEXT NOT NULL,
      es_ancla INTEGER NOT NULL,
      series INTEGER NOT NULL,
      rep_min INTEGER NOT NULL,
      rep_max INTEGER NOT NULL,
      descanso_seg INTEGER NOT NULL
    )`,
    `CREATE TABLE sesion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dia_programa_id INTEGER NOT NULL REFERENCES dia_programa(id) ON DELETE CASCADE,
      iniciada_en TEXT NOT NULL,
      terminada_en TEXT,
      estado TEXT NOT NULL
    )`,
    `CREATE TABLE serie (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sesion_id INTEGER NOT NULL REFERENCES sesion(id) ON DELETE CASCADE,
      ejercicio_id TEXT NOT NULL,
      numero INTEGER NOT NULL,
      peso_meta REAL,
      reps_meta INTEGER NOT NULL,
      peso_logrado REAL,
      reps_logradas INTEGER,
      completada_en TEXT
    )`,
    `CREATE TABLE reto (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      tipo TEXT NOT NULL,
      ejercicio_id TEXT,
      meta_valor REAL NOT NULL,
      fecha_inicio TEXT NOT NULL,
      fecha_fin TEXT NOT NULL,
      estado TEXT NOT NULL
    )`,
    `CREATE TABLE progreso_reto (
      reto_id INTEGER PRIMARY KEY REFERENCES reto(id) ON DELETE CASCADE,
      valor_actual REAL NOT NULL,
      actualizado_en TEXT NOT NULL
    )`,
    `CREATE TABLE medicion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      peso_kg REAL NOT NULL,
      notas TEXT
    )`,
    `CREATE TABLE medida (
      medicion_id INTEGER NOT NULL REFERENCES medicion(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      valor_cm REAL NOT NULL,
      PRIMARY KEY (medicion_id, tipo)
    )`,
    'CREATE INDEX idx_serie_ejercicio ON serie (ejercicio_id, completada_en)',
    'CREATE INDEX idx_sesion_dia ON sesion (dia_programa_id)',
    'CREATE INDEX idx_dia_programa ON dia_programa (programa_id, semana, dia)',
  ],
];

export async function versionActual(adaptador: Adaptador): Promise<number> {
  const filas = await adaptador.consultar<{ user_version: number }>('PRAGMA user_version');
  return filas[0]?.user_version ?? 0;
}

export async function migrar(adaptador: Adaptador): Promise<void> {
  const desde = await versionActual(adaptador);
  for (let version = desde; version < MIGRACIONES.length; version += 1) {
    for (const sentencia of MIGRACIONES[version] ?? []) {
      await adaptador.ejecutar(sentencia);
    }
    await adaptador.ejecutar(`PRAGMA user_version = ${version + 1}`);
  }
}
