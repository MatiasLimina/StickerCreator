# WhatsApp no relee solo un paquete agregado: la app le pide actualizarlo

La spec esperaba que, al subir la versión de datos de un paquete ya agregado, WhatsApp mostrara el sticker nuevo sin ningún paso del usuario. En el teléfono real (Samsung S22, Android 16, noviembre de 2026) no pasa: el proveedor sirve la versión nueva, pero WhatsApp no la toma hasta que se le pide actualizar el paquete. Por eso, cuando se crea un sticker en un paquete que WhatsApp ya tiene, la app vuelve a lanzar el intent oficial de agregado. WhatsApp muestra su diálogo de actualización y el usuario lo confirma con un toque.

## Considered Options

- **Pedir a WhatsApp que no cachee (`whatsapp_will_not_cache_stickers`) y avisar el cambio**: podría lograr que se actualice solo, pero no está documentado que haga releer la lista de stickers. Se descartó y quedó como experimento posible.
- **Un botón "Actualizar en WhatsApp" que el usuario toca cuando quiere**: tiene menos interrupciones, pero el sticker nuevo no aparece hasta que el usuario se acuerda de tocarlo.

## Consequences

- Cada sticker nuevo en un paquete agregado cuesta un toque de confirmación en WhatsApp. Si el usuario cancela, el sticker queda en la app y la tarjeta dice que hay cambios sin pasar a WhatsApp, con un botón "Actualizar en WhatsApp" para pedirlo a mano (#44). Para eso, `paquetes.json` guarda la versión que WhatsApp confirmó (`confirmada`), un dato que solo usa TS.
- El botón no reemplaza al pedido automático: es el respaldo para cuando se canceló o falló. Los paquetes agregados antes de #44 no tienen `confirmada` y aparecen pendientes hasta la primera actualización.
- Al compartir varios archivos juntos, conviene pedir la actualización una sola vez al final de la tanda, no una por sticker.
