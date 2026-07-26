# Standee Portrait

> ⚠️ **WIP — Trabajo en curso.** Este módulo está en desarrollo activo. La funcionalidad básica ya funciona, pero puede haber cambios de comportamiento entre versiones y aún no está probado a fondo en todos los sistemas de juego. Úsalo en mundos de prueba antes de un mundo de partida activa, y abre un [issue](https://github.com/ManuRomera/standee-portrait/issues) si algo falla.

Módulo para [Foundry VTT](https://foundryvtt.com/) que muestra el retrato de cualquier ficha de personaje como una **figura recortada a cuerpo entero** que sobresale del marco de la hoja, con una **imagen de fondo tipo bandera** detrás. Todo es ajustable (tamaño, zoom, posición y opacidad) y se guarda por personaje.

Funciona con **cualquier sistema de juego**: no depende de la plantilla ni del CSS propio de cada hoja, solo engancha en el render de la ficha de actor y añade su propio panel, redimensionando la ventana para hacerle sitio.

## Instalación

En Foundry VTT: **Configuración > Módulos complementarios > Instalar módulo** y pega este manifest:

```
https://github.com/ManuRomera/standee-portrait/releases/latest/download/module.json
```

Luego actívalo en el mundo desde **Gestionar módulos**.

## Importante: qué imagen usar

El retrato se muestra con `object-fit: contain` sobre fondo **transparente** (no hay caja ni marco detrás). Esto significa que el resultado solo se ve "recortado y orgánico" si la imagen del personaje ya tiene el fondo transparente (PNG con alpha), como suele pasar con el arte de token. Si usas un retrato rectangular normal (una ilustración con fondo sólido), verás ese rectángulo completo flotando sobre la ficha — el módulo no recorta el sujeto automáticamente, solo respeta la transparencia que ya tenga el archivo.

## Cómo funciona

En cada ficha de actor aparece una pequeña pestaña con un icono de bandera pegada al borde izquierdo de la ventana.

1. **Pulsa la pestaña** para activar el modo standee. La ficha se ensancha y aparece un panel lateral con:
   - la **bandera de fondo** (una imagen a pantalla completa del panel, en la capa de atrás), si la has puesto,
   - la **imagen del standee** recortada a cuerpo entero encima, con fondo transparente si la imagen lo permite.
2. Un botón de **engranaje** (⚙) abre el panel de ajustes, con:
   - **Imagen del standee**: "Elegir imagen" para usar una imagen distinta a la del retrato del personaje, "Usar el retrato del personaje" para volver a mostrar `actor.img`. Este ajuste **no modifica** el retrato real del actor — ambas imágenes se conservan por separado; por defecto el standee usa el retrato del personaje, y si eliges otra, se muestra esa.
   - **Bandera de fondo**: "Elegir imagen" / "Quitar" para gestionar la imagen de fondo.
   - Controles deslizantes para **ancho del panel**, **zoom y posición del standee**, y **zoom, posición y opacidad de la bandera**.
3. El botón **✕** de la esquina superior del panel vuelve al retrato normal (modo *framed*).

Todos los ajustes se guardan como flags del propio actor (`flags.standee-portrait.config`), así que son independientes por personaje y persisten entre sesiones. Los jugadores sin permisos de edición ven el resultado, pero solo el propietario (o el GM) puede modificarlo.

## Compatibilidad

- Foundry VTT v12 y v13.
- Cualquier sistema de juego, ya sean hojas clásicas (`ActorSheet`) o de la nueva API (`ActorSheetV2`).

## Desarrollo / releases

El versionado sigue [SemVer](https://semver.org/lang/es/). Cada `git tag vX.Y.Z` publicado dispara una GitHub Action que empaqueta el módulo y crea el release con `module.json` y `module.zip` adjuntos, de forma que el manifest de instalación (`releases/latest/download/module.json`) siempre apunta a la última versión publicada.

## Licencia

Pendiente de definir.
