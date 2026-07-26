const MODULE_ID = "standee-portrait";

const DEFAULT_CONFIG = {
  enabled: false,
  displayMode: "inside", // "inside" | "outside"
  panelWidth: 220,
  controlX: null,
  controlY: null,
  portraitImg: null,
  flagImg: null,
  flagScale: 1,
  flagX: 0,
  flagY: 0,
  flagOpacity: 1,
  portraitScale: 1,
  portraitX: 0,
  portraitY: 0
};

/* -------------------------------------------- */
/* Config helpers                                */
/* -------------------------------------------- */

function getConfig(actor) {
  return foundry.utils.mergeObject(DEFAULT_CONFIG, actor.getFlag(MODULE_ID, "config") ?? {}, { inplace: false });
}

async function setConfig(actor, partial) {
  const merged = foundry.utils.mergeObject(getConfig(actor), partial, { inplace: false });
  return actor.setFlag(MODULE_ID, "config", merged);
}

const debouncers = new Map();
function debouncedSetConfig(actor, key, value) {
  const mapKey = `${actor.uuid}.${key}`;
  clearTimeout(debouncers.get(mapKey));
  debouncers.set(mapKey, setTimeout(() => setConfig(actor, { [key]: value }), 250));
}

/* -------------------------------------------- */
/* Image picker                                  */
/* -------------------------------------------- */

function pickImage(current, callback) {
  const FPClass = foundry.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
  new FPClass({
    type: "image",
    current: current ?? "",
    callback
  }).render(true);
}

/* -------------------------------------------- */
/* DOM building                                  */
/* -------------------------------------------- */

function cssVars(cfg) {
  return {
    panel: { "--sp-panel-width": `${cfg.panelWidth}px` },
    portrait: {
      "--sp-scale": cfg.portraitScale,
      "--sp-x": `${cfg.portraitX}%`,
      "--sp-y": `${cfg.portraitY}%`
    },
    flag: {
      "--sp-scale": cfg.flagScale,
      "--sp-x": `${cfg.flagX}%`,
      "--sp-y": `${cfg.flagY}%`,
      "--sp-f-opacity": cfg.flagOpacity
    }
  };
}

function applyVars(el, vars) {
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
}

function buildSettingsHTML(cfg) {
  const L = (k) => game.i18n.localize(k);
  return `
  <div class="sp-settings-box">
    <div class="sp-field">
      <label>${L("SP.DisplayMode")}</label>
      <div class="sp-row">
        <button type="button" class="sp-mini sp-mode-inside${cfg.displayMode !== "outside" ? " active" : ""}">${L("SP.DisplayInside")}</button>
        <button type="button" class="sp-mini sp-mode-outside${cfg.displayMode === "outside" ? " active" : ""}">${L("SP.DisplayOutside")}</button>
      </div>
    </div>
    <div class="sp-field">
      <label>${L("SP.PortraitImage")}</label>
      <div class="sp-row">
        <button type="button" class="sp-mini sp-pick-portrait">${L("SP.Choose")}</button>
        <button type="button" class="sp-mini sp-clear-portrait">${L("SP.UseCharacterPortrait")}</button>
      </div>
    </div>
    <div class="sp-field">
      <label>${L("SP.Flag")}</label>
      <div class="sp-row">
        <button type="button" class="sp-mini sp-pick-flag">${L("SP.Choose")}</button>
        <button type="button" class="sp-mini sp-clear-flag">${L("SP.Clear")}</button>
      </div>
    </div>
    <label>${L("SP.PanelWidth")}
      <input type="range" min="160" max="400" step="10" value="${cfg.panelWidth}" data-cfg="panelWidth">
    </label>
    <hr>
    <label>${L("SP.PortraitScale")}
      <input type="range" min="80" max="250" step="5" value="${Math.round(cfg.portraitScale * 100)}" data-cfg="portraitScale" data-pct="1">
    </label>
    <label>${L("SP.PortraitX")}
      <input type="range" min="-50" max="50" step="1" value="${cfg.portraitX}" data-cfg="portraitX">
    </label>
    <label>${L("SP.PortraitY")}
      <input type="range" min="-50" max="50" step="1" value="${cfg.portraitY}" data-cfg="portraitY">
    </label>
    <hr>
    <label>${L("SP.FlagScale")}
      <input type="range" min="80" max="250" step="5" value="${Math.round(cfg.flagScale * 100)}" data-cfg="flagScale" data-pct="1">
    </label>
    <label>${L("SP.FlagX")}
      <input type="range" min="-50" max="50" step="1" value="${cfg.flagX}" data-cfg="flagX">
    </label>
    <label>${L("SP.FlagY")}
      <input type="range" min="-50" max="50" step="1" value="${cfg.flagY}" data-cfg="flagY">
    </label>
    <label>${L("SP.FlagOpacity")}
      <input type="range" min="0" max="100" step="5" value="${Math.round(cfg.flagOpacity * 100)}" data-cfg="flagOpacity" data-pct="1">
    </label>
  </div>`;
}

// Pure art, no buttons on top of it at all — the whole point of "outside" mode is a clean
// image next to the sheet; controls live in the hub instead (see buildHubHTML), always inside
// the window.
function buildPanelHTML(actor, cfg) {
  const portraitSrc = cfg.portraitImg || actor.img;
  return `
  <div class="sp-flag-frame">
    ${cfg.flagImg ? `<img src="${cfg.flagImg}">` : ""}
  </div>
  <div class="sp-portrait-frame">
    <img src="${portraitSrc}">
  </div>`;
}

// Small, always-inside-the-window control cluster: toggle + help are always there (help works
// for players too, who can't edit anything), gear appears once enabled. Right-click-drag
// anywhere on it to relocate it (see attachDrag).
function buildHubHTML(cfg, editable) {
  const L = (k) => game.i18n.localize(k);
  return `
  <button type="button" class="sp-btn sp-toggle" title="${cfg.enabled ? L("SP.ToggleOff") : L("SP.ToggleOn")}">
    <i class="fa-solid fa-flag"></i>
  </button>
  ${
    cfg.enabled && editable
      ? `<button type="button" class="sp-btn sp-gear" title="${L("SP.Settings")}"><i class="fa-solid fa-sliders"></i></button>`
      : ""
  }
  <button type="button" class="sp-btn sp-help" title="${L("SP.Help")}"><i class="fa-solid fa-circle-question"></i></button>
  ${cfg.enabled && editable ? buildSettingsHTML(cfg) : ""}`;
}

/* -------------------------------------------- */
/* Live preview + persistence wiring             */
/* -------------------------------------------- */

const LIVE_MAP = {
  portraitScale: { sel: ".sp-portrait-frame img", prop: "--sp-scale", fmt: (v) => v },
  portraitX: { sel: ".sp-portrait-frame img", prop: "--sp-x", fmt: (v) => `${v}%` },
  portraitY: { sel: ".sp-portrait-frame img", prop: "--sp-y", fmt: (v) => `${v}%` },
  flagScale: { sel: ".sp-flag-frame img", prop: "--sp-scale", fmt: (v) => v },
  flagX: { sel: ".sp-flag-frame img", prop: "--sp-x", fmt: (v) => `${v}%` },
  flagY: { sel: ".sp-flag-frame img", prop: "--sp-y", fmt: (v) => `${v}%` },
  flagOpacity: { sel: ".sp-flag-frame img", prop: "--sp-f-opacity", fmt: (v) => v }
};

// Keeps a floating "outside" panel glued to its window: recomputed on every render and also
// whenever the window moves, resizes, or gets focus (see the setPosition/bringToTop patches
// below), since dragging a window doesn't re-render its sheet at all.
function repositionOutsidePanel(app) {
  const panel = app._spOutsidePanel;
  if (!panel || !panel.isConnected) return;
  const appEl = app.element instanceof HTMLElement ? app.element : app.element?.[0];
  if (!appEl) return;
  const rect = appEl.getBoundingClientRect();
  const width = parseFloat(panel.style.getPropertyValue("--sp-panel-width")) || 220;
  panel.style.left = `${rect.left - width}px`;
  panel.style.top = `${rect.top}px`;
  panel.style.height = `${rect.height}px`;
  const z = getComputedStyle(appEl).zIndex;
  panel.style.zIndex = z && z !== "auto" ? z : "100";
}

// Cheap, drag-friendly preview: only touches CSS (panel width + whatever reserves/repositions
// its space), never the real Application frame. Used on every "input" tick while dragging.
function previewPanelWidth(app, windowContent, panel, width, outsideMode) {
  if (panel) panel.style.setProperty("--sp-panel-width", `${width}px`);
  if (outsideMode) {
    repositionOutsidePanel(app);
  } else {
    windowContent.style.paddingLeft = `${width}px`;
  }
}

// Commits the real Application resize ("inside" mode only — "outside" never touches the
// window's own size). Only called on full render and when a drag ends ("change"), never on
// every "input" tick — resizing the actual window on every tick is what caused the jitter,
// since the settings box itself lives inside that same window.
function applyWidth(app, windowContent, panel, cfg) {
  const outsideMode = cfg.displayMode === "outside";
  const desired = cfg.enabled && !outsideMode ? cfg.panelWidth : 0;
  app._sp ??= { originalWidth: app.position.width, appliedWidth: 0 };
  if (app._sp.appliedWidth !== desired) {
    const base = app.position.width - app._sp.appliedWidth;
    app._sp.appliedWidth = desired;
    app.setPosition({ width: base + desired });
  }
  windowContent.style.paddingLeft = desired ? `${desired}px` : "";
  if (panel) panel.style.setProperty("--sp-panel-width", `${cfg.panelWidth}px`);
  if (outsideMode) repositionOutsidePanel(app);
}

// Right-click-and-hold anywhere on the hub to relocate it inside the window. Left-click still
// reaches the buttons normally since this only engages for button 2 (right button).
function attachDrag(hub, actor, windowContent) {
  hub.addEventListener("contextmenu", (ev) => ev.preventDefault());
  hub.addEventListener("pointerdown", (ev) => {
    if (ev.button !== 2) return;
    ev.preventDefault();
    const startX = ev.clientX;
    const startY = ev.clientY;
    const startLeft = hub.offsetLeft;
    const startTop = hub.offsetTop;
    hub.classList.add("dragging");

    const onMove = (moveEv) => {
      hub.style.left = `${startLeft + (moveEv.clientX - startX)}px`;
      hub.style.top = `${startTop + (moveEv.clientY - startY)}px`;
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      hub.classList.remove("dragging");
      setConfig(actor, { controlX: hub.offsetLeft, controlY: hub.offsetTop });
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  });
}

function attachListeners(app, actor, windowContent, hub, panel, cfg) {
  const toggleBtn = hub.querySelector(".sp-toggle");
  if (toggleBtn) toggleBtn.onclick = () => setConfig(actor, { enabled: !cfg.enabled });

  const helpBtn = hub.querySelector(".sp-help");
  if (helpBtn) helpBtn.onclick = () => openHelpJournal();

  attachDrag(hub, actor, windowContent);

  if (!cfg.enabled || !app.isEditable) return;

  const gearBtn = hub.querySelector(".sp-gear");
  const box = hub.querySelector(".sp-settings-box");
  if (gearBtn && box) gearBtn.onclick = () => box.classList.toggle("open");

  const modeInsideBtn = hub.querySelector(".sp-mode-inside");
  if (modeInsideBtn) modeInsideBtn.onclick = () => setConfig(actor, { displayMode: "inside" });

  const modeOutsideBtn = hub.querySelector(".sp-mode-outside");
  if (modeOutsideBtn) modeOutsideBtn.onclick = () => setConfig(actor, { displayMode: "outside" });

  const pickPortraitBtn = hub.querySelector(".sp-pick-portrait");
  if (pickPortraitBtn) {
    pickPortraitBtn.onclick = () =>
      pickImage(cfg.portraitImg || actor.img, (path) => setConfig(actor, { portraitImg: path }));
  }

  const clearPortraitBtn = hub.querySelector(".sp-clear-portrait");
  if (clearPortraitBtn) clearPortraitBtn.onclick = () => setConfig(actor, { portraitImg: null });

  const pickFlagBtn = hub.querySelector(".sp-pick-flag");
  if (pickFlagBtn) pickFlagBtn.onclick = () => pickImage(cfg.flagImg, (path) => setConfig(actor, { flagImg: path }));

  const clearFlagBtn = hub.querySelector(".sp-clear-flag");
  if (clearFlagBtn) clearFlagBtn.onclick = () => setConfig(actor, { flagImg: null });

  // These read their target images from `panel` (the floating art), which is a *different*
  // element from `hub` (the settings box's own container) — in "outside" mode panel isn't even
  // inside the same window, so the hub's own position can never be perturbed by this.
  hub.querySelectorAll(".sp-settings-box input[type=range]").forEach((input) => {
    input.addEventListener("input", () => {
      const key = input.dataset.cfg;
      let value = Number(input.value);
      if (input.dataset.pct) value = value / 100;

      if (key === "panelWidth") {
        previewPanelWidth(app, windowContent, panel, value, cfg.displayMode === "outside");
      } else {
        const target = panel.querySelector(LIVE_MAP[key].sel);
        if (target) target.style.setProperty(LIVE_MAP[key].prop, LIVE_MAP[key].fmt(value));
      }
      debouncedSetConfig(actor, key, value);
    });

    if (input.dataset.cfg === "panelWidth") {
      input.addEventListener("change", () => {
        applyWidth(app, windowContent, panel, { ...cfg, panelWidth: Number(input.value), enabled: true });
      });
    }
  });
}

/* -------------------------------------------- */
/* Render hook                                   */
/* -------------------------------------------- */

function extractWindowContent(el) {
  if (!el) return null;
  if (el.classList?.contains("window-content")) return el;
  return el.querySelector?.(".window-content") ?? null;
}

function onRenderActorSheet(app, actor, windowContent) {
  const cfg = getConfig(actor);
  const editable = !!app.isEditable;
  const outsideMode = cfg.displayMode === "outside";

  windowContent.style.position = "relative";

  windowContent.querySelector(":scope > .sp-standee-panel")?.remove();
  windowContent.querySelector(":scope > .sp-hub")?.remove();
  app._spOutsidePanel?.remove();
  app._spOutsidePanel = null;

  // The hub (buttons + settings) always lives inside the window, regardless of enabled state
  // or display mode — it never sits on top of the floating art.
  const hub = document.createElement("div");
  hub.className = "sp-hub";
  hub.innerHTML = buildHubHTML(cfg, editable);
  if (cfg.controlX != null) hub.style.left = `${cfg.controlX}px`;
  if (cfg.controlY != null) hub.style.top = `${cfg.controlY}px`;
  windowContent.prepend(hub);

  let panel = null;
  if (cfg.enabled) {
    panel = document.createElement("div");
    panel.className = outsideMode ? "sp-standee-panel sp-standee-outside" : "sp-standee-panel";
    panel.innerHTML = buildPanelHTML(actor, cfg);
    applyVars(panel, cssVars(cfg).panel);
    applyVars(panel.querySelector(".sp-portrait-frame img"), cssVars(cfg).portrait);
    const flagImg = panel.querySelector(".sp-flag-frame img");
    if (flagImg) applyVars(flagImg, cssVars(cfg).flag);

    if (outsideMode) {
      // Outside the window entirely, so it's not clipped by / drawn on the sheet's own
      // background — appended to <body> and kept glued to the window via repositionOutsidePanel.
      document.body.appendChild(panel);
      app._spOutsidePanel = panel;
    } else {
      windowContent.prepend(panel);
    }
  }

  applyWidth(app, windowContent, panel, cfg);
  attachListeners(app, actor, windowContent, hub, panel, cfg);
}

// Foundry lets any Application subclass declare its own `baseApplication` /
// `BASE_APPLICATION`, which truncates the hook-name chain at that point — a common pattern
// for systems that want their sheet selectable in the "Configure Sheet" picker. That means a
// generic `Hooks.on("renderApplication" / "renderApplicationV2", ...)` is NOT guaranteed to
// fire for every system (it didn't for Mothership, Kult, Mausritter...). Hooks are dispatched
// by name, on top of the actual render methods — instrumenting those methods directly bypasses
// that name-based dispatch entirely, so it fires regardless of what any system declares.
function patchSheetRendering() {
  if (typeof DocumentSheet !== "undefined") {
    const originalRenderV1 = DocumentSheet.prototype._render;
    DocumentSheet.prototype._render = async function (...args) {
      const result = await originalRenderV1.apply(this, args);
      try {
        if (this.object instanceof Actor) {
          const windowContent = extractWindowContent(this.element?.[0]);
          if (windowContent) onRenderActorSheet(this, this.object, windowContent);
        }
      } catch (err) {
        console.error(`${MODULE_ID} | Error rendering the standee panel (V1)`, err);
      }
      return result;
    };
  }

  const DocumentSheetV2 = foundry.applications?.api?.DocumentSheetV2;
  if (DocumentSheetV2) {
    const originalOnRenderV2 = DocumentSheetV2.prototype._onRender;
    DocumentSheetV2.prototype._onRender = async function (...args) {
      const result = await originalOnRenderV2?.apply(this, args);
      try {
        const actor = this.document ?? this.object;
        if (actor instanceof Actor) {
          const windowContent = extractWindowContent(this.element);
          if (windowContent) onRenderActorSheet(this, actor, windowContent);
        }
      } catch (err) {
        console.error(`${MODULE_ID} | Error rendering the standee panel (V2)`, err);
      }
      return result;
    };
  }
}

// Runs `after(app)` right after `method` on `cls.prototype`, for apps that have an active
// "outside" floating panel (cheap no-op for everything else — this fires on every window
// move/focus/close in the whole game, so it must stay fast for the common case).
function wrapMethod(cls, method, after) {
  const original = cls?.prototype?.[method];
  if (typeof original !== "function") return;
  cls.prototype[method] = function (...args) {
    const result = original.apply(this, args);
    if (this._spOutsidePanel) {
      try {
        after(this);
      } catch (err) {
        console.error(`${MODULE_ID} | Error in ${cls.name}.${method}`, err);
      }
    }
    return result;
  };
}

function removeOutsidePanel(app) {
  app._spOutsidePanel?.remove();
  app._spOutsidePanel = null;
}

function patchWindowTracking() {
  const AppV2 = foundry.applications?.api?.ApplicationV2;
  // Dragging or resizing a window doesn't re-render its sheet (no document change involved),
  // so the floating panel needs to be re-synced on these too, not just on our render hooks.
  wrapMethod(Application, "setPosition", repositionOutsidePanel);
  wrapMethod(Application, "bringToTop", repositionOutsidePanel);
  wrapMethod(Application, "close", removeOutsidePanel);
  wrapMethod(AppV2, "setPosition", repositionOutsidePanel);
  wrapMethod(AppV2, "bringToFront", repositionOutsidePanel);
  wrapMethod(AppV2, "close", removeOutsidePanel);
}

/* -------------------------------------------- */
/* In-world help (journal entry + one-time chat ping) */
/* -------------------------------------------- */

const HELP_JOURNAL_FLAG = "helpJournal";

function helpContentEs() {
  return `
  <p><em>Standee Portrait</em> muestra el retrato de cualquier ficha de personaje como una figura recortada a cuerpo entero, con una imagen de fondo tipo bandera detrás. Funciona con cualquier sistema de juego.</p>
  <h2>El hub de control</h2>
  <p>En cada ficha de actor aparece un pequeño grupo de botones (el "hub") dentro de la ventana. Vive siempre dentro de la ficha, nunca encima de la imagen.</p>
  <ul>
    <li><strong>Arrástralo</strong> manteniendo pulsado el <strong>botón derecho del ratón</strong> sobre él y moviendo el cursor, para colocarlo donde no moleste. La posición se guarda por personaje.</li>
    <li><strong>🏳 Bandera:</strong> activa o desactiva el modo standee.</li>
    <li><strong>⚙ Engranaje</strong> (solo visible cuando está activo y tienes permiso de edición): abre el panel de ajustes.</li>
    <li><strong>❓ Ayuda:</strong> vuelve a abrir esta página, siempre disponible.</li>
  </ul>
  <h2>Panel de ajustes</h2>
  <ul>
    <li><strong>Posición:</strong> "Dentro de la ficha" integra la imagen en la propia ventana, ensanchándola. "Fuera, al lado" saca la imagen de la ventana por completo: flota junto a ella, la sigue si la mueves, y no se ve afectada por el fondo/skin propio de esa hoja.</li>
    <li><strong>Imagen del standee:</strong> "Elegir imagen" usa una imagen distinta a la del retrato del personaje; "Usar el retrato del personaje" vuelve a \`actor.img\`. No modifica el retrato real del actor — ambas se conservan por separado.</li>
    <li><strong>Bandera de fondo:</strong> "Elegir imagen" / "Quitar" gestionan la imagen que aparece detrás del standee.</li>
    <li><strong>Ancho del panel:</strong> cuánto sitio ocupa la imagen.</li>
    <li><strong>Zoom y posición del retrato / de la bandera:</strong> para encuadrar cada imagen dentro de su hueco.</li>
    <li><strong>Opacidad de la bandera.</strong></li>
  </ul>
  <h2>Importante: qué imagen usar</h2>
  <p>Tanto el retrato como la bandera se muestran sin caja ni marco, sobre fondo transparente. El resultado solo se ve "recortado" si la imagen ya tiene fondo transparente (PNG con alpha), como el arte de token. Con una imagen rectangular normal (fondo sólido) verás ese rectángulo completo — el módulo no recorta el sujeto automáticamente.</p>
  <p><em>Módulo en desarrollo activo (WIP). Si algo falla, repórtalo en <a href="https://github.com/ManuRomera/standee-portrait/issues">GitHub</a>.</em></p>`;
}

function helpContentEn() {
  return `
  <p><em>Standee Portrait</em> shows any character sheet's portrait as a full-body cutout standee, with a background flag image behind it. Works with any game system.</p>
  <h2>The control hub</h2>
  <p>Every actor sheet gets a small button cluster (the "hub") inside the window. It always lives inside the sheet, never on top of the artwork.</p>
  <ul>
    <li><strong>Drag it</strong> by holding down the <strong>right mouse button</strong> on it and moving the cursor, to put it somewhere out of the way. Its position is saved per character.</li>
    <li><strong>🏳 Flag:</strong> turns standee mode on or off.</li>
    <li><strong>⚙ Gear</strong> (only visible once enabled, if you can edit the actor): opens the settings panel.</li>
    <li><strong>❓ Help:</strong> reopens this page, always available.</li>
  </ul>
  <h2>Settings panel</h2>
  <ul>
    <li><strong>Position:</strong> "Inside the sheet" integrates the image into the window itself, widening it. "Outside, next to it" takes the image out of the window entirely: it floats beside it, follows it when moved, and isn't affected by that sheet's own background/skin.</li>
    <li><strong>Standee image:</strong> "Choose image" uses a different image than the character's portrait; "Use character portrait" goes back to \`actor.img\`. This never modifies the actor's real portrait — both are kept separately.</li>
    <li><strong>Background flag:</strong> "Choose image" / "Clear" manage the image behind the standee.</li>
    <li><strong>Panel width:</strong> how much room the image takes up.</li>
    <li><strong>Portrait / flag zoom and position:</strong> to frame each image within its space.</li>
    <li><strong>Flag opacity.</strong></li>
  </ul>
  <h2>Important: what image to use</h2>
  <p>Both the portrait and the flag are shown with no box or frame, on a transparent background. The result only looks "cut out" if the image already has a transparent background (PNG with alpha), like token art. A regular rectangular image (solid background) will show as that full rectangle — the module doesn't crop the subject automatically.</p>
  <p><em>This module is a work in progress (WIP). If something breaks, report it on <a href="https://github.com/ManuRomera/standee-portrait/issues">GitHub</a>.</em></p>`;
}

async function ensureHelpJournal() {
  const existing = game.journal.find((j) => j.getFlag(MODULE_ID, HELP_JOURNAL_FLAG));
  if (existing) return existing;

  const spanish = game.i18n.lang?.startsWith("es");
  const name = spanish ? "Standee Portrait — Ayuda" : "Standee Portrait — Help";
  const content = spanish ? helpContentEs() : helpContentEn();

  return JournalEntry.create({
    name,
    pages: [{ name, type: "text", text: { content, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML } }],
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
    flags: { [MODULE_ID]: { [HELP_JOURNAL_FLAG]: true } }
  });
}

function openHelpJournal() {
  const journal = game.journal?.find((j) => j.getFlag(MODULE_ID, HELP_JOURNAL_FLAG));
  if (journal) journal.sheet.render(true);
  else ui.notifications.warn(game.i18n.localize("SP.HelpMissing"));
}

async function announceHelpOnce() {
  if (!game.user.isGM) return;
  try {
    const journal = await ensureHelpJournal();
    if (game.settings.get(MODULE_ID, "helpAnnounced")) return;
    await game.settings.set(MODULE_ID, "helpAnnounced", true);
    const link = `@UUID[${journal.uuid}]{${journal.name}}`;
    await ChatMessage.create({ content: `<p>${game.i18n.format("SP.HelpAnnounce", { link })}</p>`, whisper: [] });
  } catch (err) {
    console.error(`${MODULE_ID} | Could not create/announce the help journal`, err);
  }
}

Hooks.once("init", () => {
  patchSheetRendering();
  patchWindowTracking();
  game.settings.register(MODULE_ID, "helpAnnounced", { scope: "world", config: false, type: Boolean, default: false });
});

Hooks.once("ready", () => announceHelpOnce());
