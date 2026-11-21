# Solo Android nativo (Expo + módulo nativo) en vez de PWA

La razón de ser de la app es **agregar a WhatsApp** un paquete que se va ampliando, y eso solo lo permite una app nativa. En Android se hace con el intent oficial de WhatsApp más un proveedor de contenido que expone los paquetes. Una web/PWA solo puede compartir un sticker suelto a un chat. Por eso la v1 es una app Android hecha con Expo, con un módulo nativo chico para esa integración, y se distribuye como APK personal.

## Considered Options

- **PWA / web**: no hace falta instalarla, pero no puede agregar paquetes a WhatsApp. Se descartó porque rompe el caso de uso central.
- **Android + iOS con Expo**: en iOS el agregado usa otro mecanismo, más frágil, y duplica el trabajo de integración. Se descartó para la v1; se puede reabrir más adelante.
- **Kotlin nativo puro**: también es viable. Se eligió Expo para la UI y el tooling, y el código nativo queda limitado a la integración con WhatsApp.

## Consequences

- Sin la app instalada, los paquetes desaparecen de WhatsApp, porque WhatsApp los lee desde la app.
- No se soporta WhatsApp Business ni iOS.
