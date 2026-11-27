# Identidad Evernight

Diseño aprobado para la ronda visual previa a la primera APK: paleta y estilo general, ícono adaptativo, splash y `PantallaPaquetes` (banner, tarjetas de paquete, botón principal, estado de tanda, modo selección y avisos). Prototipo descartable: [opcion.html](./opcion.html). Captura: [captura-1600.png](./captura-1600.png). Emblema vectorial: [completo](./emblema-completo.svg) (splash y banner), [reducido](./emblema-reducido.svg) (foreground del ícono adaptativo, 108 × 108 con zona segura de 66) y [monocromo](./emblema-monocromo.svg) (`monochromeImage` de Android 13+).

Medio: móvil (Android). Producido con `design-studio`: tres direcciones (Nocturno Editorial de Opus, Reliquia Carmesí de Argon, Astrolabio Táctil de Neon). Ganó la de Neon, con el emblema y el fondo de Argon y dos rondas de retoques.

## Brief resumido

- Temática: Evernight (*Lord of the Mysteries*). Layout tomado de una referencia de tarjetas muy redondeadas, banner protagonista y stickers sobre baldosas claras.
- App siempre oscura, sin modo claro.
- Paleta negro y carmesí, **sin violetas ni lavandas**. El carmesí va en la luna, la acción principal y la barra de avance. La plata rosada va en el emblema, los estados, las pastillas y las estrellas. El verde aparece solo como puntito de «En WhatsApp».
- Emblema **muy fiel** al símbolo de Evernight, en SVG. Es de uso personal: si la app se publica, el emblema tiene que cambiar (el símbolo es propiedad de *Lord of the Mysteries*).
- Decoración sutil y fija: campo de estrellas y constelaciones, y un resplandor carmesí en el emblema y el botón principal. Sin glitch ni animaciones de fondo.
- Serif decorativa (Cinzel) solo en el nombre de la app y los nombres de paquete. Roboto en todo lo demás.
- El Selector de tramo solo cambia de paleta (ver la tabla de tokens abajo): su layout aprobado no se toca.
- Fuera de alcance: los `Alert` nativos, el nombre de la app (sigue «StickerCreator») y la lógica de #18 y #22, de los que solo se dibuja dónde van.
- Restricciones: áreas táctiles ≥ 48 dp, uso con una mano, contraste WCAG AA y vocabulario de `GLOSSARY.md`.

## Pantallas

1. `PantallaPaquetes` en reposo: banner compacto, tres paquetes en estados distintos (uno en WhatsApp con el pendiente del #18, uno con «Faltan 2», uno listo para agregar) y el botón «Elegir de la galería» fijo abajo.
2. `PantallaPaquetes` en modo selección para borrar, con el aviso informativo y la barra «Cancelar | Borrar (3)». Debajo van los estados alternos del pie: la tanda en curso («Convirtiendo 3 de 8…» con barra de avance, #22), un aviso de error y un aviso normal.
3. Hoja de identidad: ícono adaptativo en máscaras de círculo, squircle y cuadrado; foreground con la zona segura; monocromo; splash.

## Decisiones

- **Banner compacto con el sello a la izquierda:** el emblema va a la izquierda y a la derecha el título en serif más la pastilla «3 paquetes · 16 stickers». Es bajo para que el primer paquete aparezca arriba. Se va con el scroll.
- **Tarjetas en dos zonas:** la cabecera (`#1D1515`) lleva el nombre, la pastilla `9/30`, el estado y la fila del #18 («4 sin pasar a WhatsApp» + «Actualizar»). El cuerpo (`#151010`) lleva la grilla. La separación se nota al escanear.
- **Grilla de 4 columnas:** baldosas de 73 dp en blanco hueso `#F8F0EE` con 14 dp de radio. En modo selección, la baldosa toma un tinte rosado, borde carmesí vivo y una insignia ✓ en la esquina. El sticker animado lleva la etiqueta «Animado».
- **Botón principal en cápsula carmesí** `#BD1736` con resplandor hacia abajo, fijo en la zona del pulgar. Durante la tanda muestra «Convirtiendo 3 de 8…» y una barra fina `#F03A57` con un punto de luz en la punta.
- **`Borrar (N)` no se confunde con la acción principal:** es un rectángulo oscuro `#2D1213` con borde coral `#E84A43` e ícono de tacho. El rojo destructivo y el de error son coral, no carmesí.
- **«Agregar a WhatsApp» deja de ser verde:** es un botón oscuro con borde, y se ve atenuado si faltan stickers.
- **Fondo (de Argon):** negro `#070505` con viñeta radial carbón-carmesí (`#210B0A → #130707`) y constelaciones tenues en plata rosada. Todos los oscuros cumplen `R > G ≥ B`, así que no viran a violeta.
- **Emblema (de Argon, ajustado):** luna partida (eclipse `#630E15 → #1D0305` y medialuna luminosa `#FF7878 → #C41424`), garra de cuchillas en espiral sobre un collar, estrellas de cuatro puntas achicadas para que la luna y la garra manden, y aro punteado. La garra nunca pisa la luna. Las cuchillas se afilaron a pedido del usuario: base angosta y punta aguda.
- **Ícono reducido y monocromo:** luna, collar, 4 cuchillas y 4 estrellas cardinales dentro del círculo seguro de 66. El monocromo es una silueta blanca sólida con canales de aire para que no se empaste a 48 dp. Las estrellas del ícono a 48 dp son el punto más débil: si molestan en el teléfono, se engrosan solo ahí.
- **Splash:** el emblema completo con halo sobre el cielo cálido y «StickerCreator» en Cinzel debajo. Sin texto técnico.

### Paleta

| Uso | Hex |
|---|---|
| Lienzo / viñeta | `#070505`, `#130707`, `#210B0A` |
| Tarjeta / cabecera / control / borde | `#151010`, `#1D1515`, `#271C1C`, `#3A2B2B` |
| Texto principal / secundario / atenuado | `#F6ECEA` (16,3:1), `#D8BCBA` (10,6:1), `#B69997` (7,2:1) |
| Carmesí CTA / vivo / tinte | `#BD1736` (texto `#FFF8F8`, 6,0:1), `#F03A57`, `#2E1216` |
| Baldosa / baldosa marcada | `#F8F0EE`, `#EED9DA` |
| Destructivo | fondo `#2D1213`, borde `#E84A43`, texto `#FFE0DE` |
| Error | fondo `#261111`, acento `#F25C54`, texto `#FFA8A3` |
| Puntito «En WhatsApp» | `#2ED66B` |

### Retema del Selector de tramo

| Token actual | Rol | Evernight |
|---|---|---|
| `#FFFFFF` | Fondo; texto sobre el acento | `#070505`; `#FFF8F8` |
| `#F2F4F7` | Superficie de la tarjeta de regla, carril, damero | `#151010` / `#1D1515` |
| `#344054` | Texto principal, lectura de tiempos | `#F6ECEA` |
| `#475467` | Metadatos, marcas de escala | `#B69997` |
| `#1570EF` | Acento: manijas, borde del tramo, «Crear» | `#BD1736` (relleno) / `#F03A57` (duración, borde) |
| `#D1E0FF` | Bloque del tramo, ventana panorámica, «2 de 3» | `#2E1216` |
| `#25D366` | Verde de WhatsApp | `#2ED66B`, solo como puntito |
| `#067647` | Texto «Agregado» | `#D8BCBA` + puntito verde |
| `#D92D20` | «Volver cancela la tanda», «Borrar» | `#F25C54` (texto, borde) / `#2D1213` (fondo) |

## Por qué ganó

Al usuario le gustó la C en general: el banner compacto, las tarjetas escaneables y el botón de borrar bien diferenciado. Pidió llevarse el ícono y el fondo de la B. En la primera ronda de retoques se achicaron las estrellas y se corrigieron los datos de muestra, la hoja de íconos y el splash. El emblema resultante quedó menos literal que el símbolo original (un remolino de cuchillas en vez de la medialuna en C), y el usuario lo aprobó así: «me gusta esto». Solo pidió afilar más las garras, que fue el segundo retoque.
