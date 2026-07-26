const MODULE_ID = "standee-portrait";

const DEFAULT_CONFIG = {
  enabled: false,
  displayMode: "inside", // "inside" | "outside"
  panelWidth: 220,
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

function buildPanelHTML(actor, cfg, editable) {
  const L = (k) => game.i18n.localize(k);
  const portraitSrc = cfg.portraitImg || actor.img;
  return `
  <div class="sp-flag-frame">
    ${cfg.flagImg ? `<img src="${cfg.flagImg}">` : ""}
  </div>
  <div class="sp-portrait-frame">
    <img src="${portraitSrc}">
  </div>
  <div class="sp-toolbar">
    <button type="button" class="sp-btn sp-toggle" title="${L("SP.ToggleOff")}"><i class="fa-solid fa-xmark"></i></button>
    ${editable ? `<button type="button" class="sp-btn sp-gear" title="${L("SP.Settings")}"><i class="fa-solid fa-sliders"></i></button>` : ""}
  </div>
  ${editable ? buildSettingsHTML(cfg) : ""}`;
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

function attachListeners(app, actor, windowContent, tab, panel, cfg) {
  if (tab) tab.onclick = () => setConfig(actor, { enabled: !cfg.enabled });

  if (!panel) return;

  const toggleBtn = panel.querySelector(".sp-toggle");
  if (toggleBtn) toggleBtn.onclick = () => setConfig(actor, { enabled: false });

  const gearBtn = panel.querySelector(".sp-gear");
  const box = panel.querySelector(".sp-settings-box");
  if (gearBtn && box) gearBtn.onclick = () => box.classList.toggle("open");

  const modeInsideBtn = panel.querySelector(".sp-mode-inside");
  if (modeInsideBtn) modeInsideBtn.onclick = () => setConfig(actor, { displayMode: "inside" });

  const modeOutsideBtn = panel.querySelector(".sp-mode-outside");
  if (modeOutsideBtn) modeOutsideBtn.onclick = () => setConfig(actor, { displayMode: "outside" });

  const pickPortraitBtn = panel.querySelector(".sp-pick-portrait");
  if (pickPortraitBtn) {
    pickPortraitBtn.onclick = () =>
      pickImage(cfg.portraitImg || actor.img, (path) => setConfig(actor, { portraitImg: path }));
  }

  const clearPortraitBtn = panel.querySelector(".sp-clear-portrait");
  if (clearPortraitBtn) clearPortraitBtn.onclick = () => setConfig(actor, { portraitImg: null });

  const pickFlagBtn = panel.querySelector(".sp-pick-flag");
  if (pickFlagBtn) pickFlagBtn.onclick = () => pickImage(cfg.flagImg, (path) => setConfig(actor, { flagImg: path }));

  const clearFlagBtn = panel.querySelector(".sp-clear-flag");
  if (clearFlagBtn) clearFlagBtn.onclick = () => setConfig(actor, { flagImg: null });

  panel.querySelectorAll(".sp-settings-box input[type=range]").forEach((input) => {
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
  windowContent.classList.toggle("sp-active", cfg.enabled && !outsideMode);

  windowContent.querySelector(":scope > .sp-standee-panel")?.remove();
  windowContent.querySelector(":scope > .sp-standee-tab")?.remove();
  app._spOutsidePanel?.remove();
  app._spOutsidePanel = null;

  let tab = null;
  let panel = null;

  if (cfg.enabled) {
    panel = document.createElement("div");
    panel.className = outsideMode ? "sp-standee-panel sp-standee-outside" : "sp-standee-panel";
    panel.innerHTML = buildPanelHTML(actor, cfg, editable);
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
  } else {
    tab = document.createElement("div");
    tab.className = "sp-standee-tab";
    tab.innerHTML = `<i class="fa-solid fa-flag"></i>`;
    tab.title = game.i18n.localize("SP.ToggleOn");
    windowContent.prepend(tab);
  }

  applyWidth(app, windowContent, panel, cfg);
  attachListeners(app, actor, windowContent, tab, panel, cfg);
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
        console.error(`${MODULE_ID} | Error al renderizar el panel standee (V1)`, err);
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
        console.error(`${MODULE_ID} | Error al renderizar el panel standee (V2)`, err);
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
        console.error(`${MODULE_ID} | Error en ${cls.name}.${method}`, err);
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

Hooks.once("init", () => {
  patchSheetRendering();
  patchWindowTracking();
});
