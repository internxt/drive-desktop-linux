## Que sabemos
Se han subido archivos corruptos al bucket de internxt. Causando que realmente no se
hayan subido.

## Solucion
- Buscar en la db local, aquellos archivos que podemos encontrar y que han sido marcados como "make Available offline"
- volverlos a subir al bucket de internxt.
  - Si la subida se ha completado, borramos el archivo anterior, del drive remoto y persistimos el nuevo archivo.
  - Si la subida no se ha completado, logeamos un error.

## Cosas a tener en cuenta:
- Es posible que el archivo que existe en local, siga estando corrupto, ya que, al hacer el archivo "make available offline"
  Se descarga de nuevo del bucket de internxt.
- Cuando un usuario sube un archivo al drive desktop, por defecto no se guarda en local, se queda la represantion logica del archivo.
- Cuando se resube, previamente estaba marcado como "make available offline", con la nueva resubida, se queda como "online"
- como podemos evitar que este proceso este haciendose de nuevo continuamente
