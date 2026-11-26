# StickerCreator

App personal de Android que convierte imágenes, GIFs y videos cortos en stickers de WhatsApp y los agrega a WhatsApp dentro de un paquete que se va ampliando.

## Language

**Archivo de origen**:
La imagen, GIF o video que el usuario elige del teléfono para convertir en sticker.
_Avoid_: Media, input, fuente

**Sticker**:
Una imagen (estática o animada) en el formato que WhatsApp acepta, generada a partir de un archivo de origen.
_Avoid_: Figurita, emoji, imagen

**Paquete**:
El grupo de stickers que WhatsApp muestra como una unidad en su bandeja de stickers; el usuario lo va ampliando agregando stickers nuevos.
_Avoid_: Carpeta, pack, colección, álbum

**Paquete estático**:
Paquete que solo contiene stickers estáticos, generados a partir de imágenes.

**Paquete animado**:
Paquete que solo contiene stickers animados, generados a partir de GIFs o videos. WhatsApp no permite mezclarlo con estáticos.

**Tramo**:
La porción de un GIF o video, de hasta 5 s, que se convierte en sticker animado. Va de un inicio a un fin que el usuario puede elegir en un video; si no los elige, o si es un GIF, son los primeros 5 s.
_Avoid_: Clip, recorte, fragmento

**Selector de tramo**:
El paso, antes de convertir un video de más de 5 s, en el que el usuario ve el tramo en loop y elige su inicio y su fin.
_Avoid_: Editor, recortador, trimmer

**Tanda**:
Los archivos de origen que llegan juntos, compartidos o elegidos de la galería en un solo gesto. Cada uno se convierte por separado; la tanda termina con un aviso de una línea y una sola actualización a WhatsApp por paquete.
_Avoid_: Lote, batch

**Agregar a WhatsApp**:
Publicar o actualizar un paquete para que aparezca en la bandeja de stickers de WhatsApp.
_Avoid_: Instalar, exportar, enviar
