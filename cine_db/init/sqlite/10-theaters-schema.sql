PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cinemas(
  id         INTEGER PRIMARY KEY,
  nombre     TEXT NOT NULL,
  ciudad     TEXT,
  distrito   TEXT,
  nro_salas  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS salas(
  id          INTEGER PRIMARY KEY,
  cine_id     INTEGER NOT NULL,
  numero      INTEGER NOT NULL,
  capacidad   INTEGER,
  tipo_sala   TEXT,
  CONSTRAINT uq_sala_cine_numero UNIQUE(cine_id, numero),
  FOREIGN KEY (cine_id) REFERENCES cinemas(id) ON DELETE CASCADE
);
