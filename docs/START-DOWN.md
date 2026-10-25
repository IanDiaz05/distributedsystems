# Apagar y encender el sistema

## Apagado normal

Desde la raíz del repositorio, detén primero el laboratorio y después el proyecto:

```sh
cd resilience-lab
docker compose stop

cd ..
docker compose stop
```

Espera a que ambos comandos terminen antes de apagar Docker o el equipo. Esto permite que las bases de datos se detengan ordenadamente.

## Encendido

Desde la raíz del repositorio, inicia primero el proyecto principal:

```sh
docker compose up -d
docker compose ps
```

Espera a que Galera y los tres nodos MongoDB estén `healthy`, y a que `mongodb-init` y `catalog-init` terminen con código 0. Comprueba después `http://localhost/api/health`.

Cuando el proyecto esté listo, inicia el laboratorio:

```sh
cd resilience-lab
docker compose up -d
```

Abre `http://localhost:8090/`.

## Precauciones

- Conserva el mismo archivo `.env` y las credenciales usadas al inicializar las bases de datos. Cambiar una contraseña en `.env` no cambia automáticamente la contraseña guardada en un volumen ya inicializado.
- No uses `docker compose down -v`, `docker volume prune` ni borres volúmenes si quieres conservar los datos.
- `docker compose down` sin `-v` elimina contenedores y redes, pero conserva los volúmenes nombrados.
- No fuerces el bootstrap de Galera ni cambies `safe_to_bootstrap` manualmente para resolver un error. Si el equipo se apagó abruptamente y Galera no inicia, revisa los logs y los estados de los nodos antes de recuperar el clúster.
- Si aparecen errores de autenticación, comprueba primero que `.env` coincide con las credenciales con que se crearon los volúmenes. No borres los datos salvo que sean descartables y aceptes reinicializarlos.

Para consultar errores de inicio:

```sh
docker compose ps -a
docker compose logs --tail=100 galera1 mongodb mongodb-init catalog-init
```

El punto clave para evitar que reaparezcan los errores anteriores es **detener los servicios con normalidad y conservar juntos los volúmenes y las credenciales que corresponden a esos datos**.