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

## Cómo funciona

En cada ficha de actor aparece una pequeña pestaña con un icono de bandera pegada al borde izquierdo de la ventana.

1. **Pulsa la pestaña** para activar el modo standee. La ficha se ensancha y aparece un panel lateral con:
   - la **bandera de fondo** (una imagen a pantalla completa del panel, en la capa de atrás),
   - el **retrato del personaje** recortado a cuerpo entero encima, con fondo transparente si la imagen lo permite.
2. Un botón de **engranaje** (⚙) abre el panel de ajustes, con controles deslizantes para regular:
   - **Ancho del panel**: cuánto sobresale de la ficha.
   - **Zoom y posición (horizontal/vertical) del retrato**: para encuadrar bien la figura.
   - **Zoom, posición y opacidad de la bandera**: para ajustar la imagen de fondo.
3. **Clic directo sobre el retrato** abre el selector de archivos para cambiar la imagen del actor.
4. Los botones **"Elegir imagen" / "Quitar"** del panel de ajustes gestionan la imagen de la bandera de fondo.
5. El botón **✕** de la esquina superior del panel vuelve al retrato normal (modo *framed*).

Todos los ajustes se guardan como flags del propio actor (`flags.standee-portrait.config`), así que son independientes por personaje y persisten entre sesiones. Los jugadores sin permisos de edición ven el resultado, pero solo el propietario (o el GM) puede modificarlo.

## Compatibilidad

- Foundry VTT v12 y v13.
- Cualquier sistema de juego, ya sean hojas clásicas (`ActorSheet`) o de la nueva API (`ActorSheetV2`).

## Desarrollo / releases

El versionado sigue [SemVer](https://semver.org/lang/es/). Cada `git tag vX.Y.Z` publicado dispara una GitHub Action que empaqueta el módulo y crea el release con `module.json` y `module.zip` adjuntos, de forma que el manifest de instalación (`releases/latest/download/module.json`) siempre apunta a la última versión publicada.

## Licencia

Pendiente de definir.
