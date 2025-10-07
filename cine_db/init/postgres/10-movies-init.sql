-- Crear rol de aplicación
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'moviesuser') THEN
    CREATE ROLE moviesuser LOGIN PASSWORD 'moviespass';
  END IF;
END$$;

-- Tablas
CREATE TABLE IF NOT EXISTS movies (
  id                SERIAL PRIMARY KEY,
  nombre            TEXT NOT NULL,
  genero            TEXT,
  descripcion       TEXT,
  tiempo            INT,
  restriccion_edad  TEXT,
  is_premiere       BOOLEAN
);

CREATE TABLE IF NOT EXISTS showtimes (
  id             SERIAL PRIMARY KEY,
  movie_id       INT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  start_time     TIMESTAMP NOT NULL,
  precio         NUMERIC(10,2) NOT NULL,
  cinema_id_ext  TEXT NOT NULL,
  sala_id_ext    TEXT NOT NULL,
  sala_number    INT
);

CREATE INDEX IF NOT EXISTS idx_showtimes_movie        ON showtimes(movie_id);
CREATE INDEX IF NOT EXISTS idx_showtimes_start_time   ON showtimes(start_time);
CREATE INDEX IF NOT EXISTS idx_showtimes_cinema_sala  ON showtimes(cinema_id_ext, sala_id_ext);

-- Importa MOVIES (preserva id)
COPY movies(id, nombre, genero, descripcion, tiempo, restriccion_edad, is_premiere)
FROM '/data/movies/movies.csv'
WITH (FORMAT csv, HEADER true);

SELECT setval(pg_get_serial_sequence('movies','id'), COALESCE(MAX(id),0)) FROM movies;

-- Staging para showtimes
DROP TABLE IF EXISTS showtimes_stage;
CREATE TABLE showtimes_stage (
  movie_id       INT,
  start_time     TIMESTAMP,
  precio         NUMERIC(10,2),
  cinema_id_ext  TEXT,
  sala_id_ext    TEXT,
  sala_number    INT
);

-- Recorre /data/movies/showtimes/start_date=*/*.csv
DO $$
DECLARE
  d TEXT;
  f TEXT;
  p TEXT;
BEGIN
  FOR d IN SELECT pg_ls_dir('/data/movies/showtimes') LOOP
    IF d LIKE 'start_date=%' THEN
      FOR f IN SELECT pg_ls_dir('/data/movies/showtimes/' || d) LOOP
        IF right(f, 4) = '.csv' THEN
          p := '/data/movies/showtimes/' || d || '/' || f;
          BEGIN
            PERFORM * FROM pg_stat_file(p, true);
            EXECUTE format(
              'COPY showtimes_stage(movie_id, start_time, precio, cinema_id_ext, sala_id_ext, sala_number)
               FROM %L WITH (FORMAT csv, HEADER true);',
              p
            );
          EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Omitido % (%).', p, SQLERRM;
          END;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END $$;

INSERT INTO showtimes (movie_id, start_time, precio, cinema_id_ext, sala_id_ext, sala_number)
SELECT movie_id, start_time, precio, cinema_id_ext, sala_id_ext, sala_number
FROM showtimes_stage;

DROP TABLE IF EXISTS showtimes_stage;
SELECT setval(pg_get_serial_sequence('showtimes','id'), COALESCE(MAX(id),0)) FROM showtimes;

-- Privilegios para la app
ALTER DATABASE moviesdb OWNER TO moviesuser;
ALTER SCHEMA public OWNER TO moviesuser;
GRANT ALL ON SCHEMA public TO moviesuser;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO moviesuser;
