#  Configuración de NFS Server para Docker (EC2 Ubuntu)

Este procedimiento permite exponer la carpeta `/srv/theaters` del servidor (host) vía NFS, de modo que el contenedor `` pueda acceder a ella como volumen compartido.

---

## 1. Instalar el servidor NFS

```bash
sudo apt-get update
sudo apt-get install -y nfs-kernel-server
```

> Instala el demonio `nfsd` y crea los archivos base `/etc/exports` y `/etc/default/nfs-kernel-server`.

---

## 2. Crear la carpeta compartida

```bash
sudo mkdir -p /srv/theaters
sudo chown -R nobody:nogroup /srv/theaters
sudo chmod 777 /srv/theaters
```

> Esta carpeta será la raíz exportada hacia los contenedores. Permisos abiertos garantizan escritura desde Docker (luego se ajustan a UID 1000).

---

## 3. Configurar la exportación NFS

Abrir el archivo `/etc/exports`:

```bash
sudo nano /etc/exports
```

Agregar al final (reemplazar `IP_PRIVADA` por tu IP privada real, ejemplo `172.31.28.90`):

```
/srv/theaters IP_PRIVADA/16(rw,sync,no_subtree_check)
```

Guardar con **Ctrl + O**, Enter, y salir con **Ctrl + X**.

> Usa `/16` para cubrir toda la subred interna de tu VPC (ej. `172.31.0.0/16`).

---

## 4. Aplicar y verificar la exportación

```bash
sudo exportfs -ra
sudo exportfs -v
```

Deberías ver algo como:

```
/srv/theaters  IP_PRIVADA/16(sync,wdelay,hide,no_subtree_check,sec=sys,rw,secure,root_squash,no_all_squash)
```

---

## 5. Confirmar que el servicio NFS esté activo

```bash
sudo systemctl status nfs-kernel-server
```

Salida esperada:

```
● nfs-server.service - NFS server and services
     Loaded: loaded (/lib/systemd/system/nfs-server.service; enabled)
     Active: active (exited)
```

---

## 6. Verificar el puerto y la exportación

```bash
sudo ss -lntp | grep 2049
```

Salida esperada:

```
LISTEN 0 64 0.0.0.0:2049 0.0.0.0:*
LISTEN 0 64 [::]:2049   [::]:*
```

Verificar exportación activa:

```bash
showmount -e localhost
```

Resultado esperado:

```
Export list for localhost:
/srv/theaters IP_PRIVADA/16
```

---

## 7. Alinear permisos con Docker (UID 1000)

Tu contenedor `sqlite_theaters` usa el usuario `1000:1000`, por lo que ajusta los permisos:

```bash
sudo chown -R 1000:1000 /srv/theaters
sudo chmod -R 777 /srv/theaters
```

Prueba creando un archivo:

```bash
sudo touch /srv/theaters/testfile.txt
ls -l /srv/theaters
```

Salida esperada:

```
-rw-r--r-- 1 1000 1000 0 Oct 7 02:25 testfile.txt
```

---

##  8. Levantar el stack Docker con el volumen NFS

```bash
cd ~/mv-bd-cloud1/cine_db
docker compose up -d
```

---

##  9. Validar funcionamiento dentro del contenedor

Comprobar que el volumen `/srv/theaters` se ve dentro de SQLite:

```bash
docker compose exec sqlite_theaters ls -l /db
```

Verificar que los datos fueron importados:

```bash
docker compose exec sqlite_theaters sqlite3 /db/theaters.db "SELECT COUNT(*) FROM cinemas; SELECT COUNT(*) FROM salas;"
```

---

## Resultado esperado

- `/srv/theaters` exportado y montado dentro del contenedor.
- SQLite con acceso completo de lectura/escritura.
- Datos importados correctamente (ej. 2233 cinemas, 19999 salas).

