# Selector de tramo

Diseño aprobado para el **Selector de tramo** del issue #15: elegir inicio y fin del tramo de un video antes de convertirlo en sticker animado. Prototipo descartable: [opcion.html](./opcion.html). Captura de las 3 pantallas: [captura-1400.png](./captura-1400.png).

Medio: móvil (Android). Producido con `design-studio`: tres direcciones (barra de tramo de Opus, tira de miniaturas de Argon, regla graduada de Neon); ganó la de Neon, con una ronda de retoques.

## Brief resumido

- Aparece antes de convertir, solo con videos de más de 5 s y duración conocida. GIFs y videos cortos van directo.
- Llega con 0:00–0:05 marcado; un toque en «Crear» convierte como hoy.
- Tramo de 1 s a 5 s, reproducido en loop sin audio, encajado en cuadrado sin cortar.
- Tanda: un selector por video largo, en fila, con «2 de 3», «Usar automático para el resto» y «Siguiente». Volver cancela la tanda entera sin crear nada.
- Si un tramo no entra en 500 KB se acorta desde el final y el aviso final de la tanda lo dice.
- Restricciones: colores de `src/pantalla/PantallaPaquetes.tsx`, Roboto, áreas táctiles ≥ 48 dp, uso con una mano.

## Pantallas

1. Selector con un video suelto, estado inicial.
2. Selector dentro de una tanda, con el tramo movido a 0:12–0:15.
3. `PantallaPaquetes` con el aviso final «3 stickers creados · 1 tramo se acortó a 3 s».

## Decisiones

- **Regla temporal graduada, sin miniaturas:** abre al instante sin leer cuadros del video (que es lento, ver #14). La regla se amplía alrededor del tramo, así que es precisa también en videos largos; una barra fina arriba muestra dónde está el tramo en el video entero.
- **Arrastrar el tramo entero es el gesto principal:** el bloque `#D1E0FF` lleva un agarre central `‹ ||| ›` y mueve inicio y fin juntos con la misma duración. Las manijas de los extremos cambian la duración.
- **Botones −0,5 s / +0,5 s: mueven el tramo entero** (decisión del usuario al aprobar). El selector segmentado «Inicio | Tramo | Fin» del prototipo sobra: inicio y fin se ajustan solo con las manijas.
- **Vista previa de 312 dp**, con «Sin audio · Loop» y el reloj en una línea debajo del cuadro, para no pisar el borde de videos verticales.
- **Áreas táctiles:** manijas de 48 × 52 dp aun con el tramo en 0:00; botones de 48 dp de alto.
- **Tanda:** «Volver cancela la tanda» en rojo `#D92D20` debajo del título, junto a la flecha de volver; «Usar automático para el resto» sobre «Siguiente», en la zona del pulgar (aprobado así).
- **Aviso de tramo acortado** con ícono de información azul, no tilde verde: acortar es un ajuste, no un éxito.
- **Paleta:** solo los colores vigentes (`#FFFFFF`, `#F2F4F7`, `#344054`, `#475467`, `#1570EF`, `#D1E0FF`, `#25D366`, `#067647`, `#D92D20`). Tiempos en Roboto `tabular-nums` (18 sp el principal) para que no salten al arrastrar.

## Por qué ganó

El usuario prefirió la regla graduada por sobre la barra de Opus, que era la favorita de la crítica: mover el tramo entero es el caso típico («quiero 5 s, pero del segundo 40») y la regla ampliada sigue siendo precisa en videos largos.
