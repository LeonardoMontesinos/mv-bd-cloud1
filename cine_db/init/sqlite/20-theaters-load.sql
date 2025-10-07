.mode csv
.headers off

-- CINEMAS
.shell test -f /theaters_data/cinemas.csv && echo '-- importando cinemas.csv' || echo '-- cinemas.csv ausente, se omite'
.import --csv --skip 1 /theaters_data/cinemas.csv cinemas

-- SALAS
.shell test -f /theaters_data/salas.csv && echo '-- importando salas.csv' || echo '-- salas.csv ausente, se omite'
.import --csv --skip 1 /theaters_data/salas.csv salas

.headers on
.mode column
SELECT 'cinemas' AS tabla, COUNT(*) AS total FROM cinemas;
SELECT 'salas'   AS tabla, COUNT(*) AS total FROM salas;
