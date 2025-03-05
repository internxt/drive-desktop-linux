## Que sabemos
Se han subido archivos corruptos al bucket de internxt. Causando que realmente no se
hayan subido.

## Solucion
En el momento del sync, cuando se esta cargando el remote tree,
hay que buscar aquellos archivos que pudieron ser subidos corruptos en esa ventana
de tiempo y volver a subirlos. La ventana de tiempo es entre el 2025-02-19T12:00:00Z y 2025-03-06T20:00:00Z

Para subirlos:
- primero hay que mover el archivo remoto a la papelera (Thrash) ✅
- luego, tenemos que buscar si esta en el hard drive
  - si esta en el hard drive, lo subimos de nuevo
  - si no esta en el hard drive, lo borramos de la papelera(Thrash) definitivamente
