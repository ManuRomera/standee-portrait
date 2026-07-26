const MODULE_ID = "standee-portrait";

const DEFAULT_CONFIG = {
  enabled: false,
  panelWidth: 220,
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
  return `
  <div class="sp-flag-frame">
    ${cfg.flagImg ? `<img src="${cfg.flagImg}">` : ""}
  </div>
  <div class="sp-portrait-frame">
    <img src="${actor.img}">
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

function applyWidth(app, windowContent, panel, cfg) {
  app._sp ??= { originalWidth: app.position.width, appliedWidth: 0 };
  const desired = cfg.enabled ? cfg.panelWidth : 0;
  if (app._sp.appliedWidth !== desired) {
    const base = app.position.width - app._sp.appliedWidth;
    app._sp.appliedWidth = desired;
    app.setPosition({ width: base + desired });
  }
  // Reserve the panel's width so the sheet's own content moves out of the way instead
  // of being covered by the (transparent, click-through) standee panel sitting on top.
  windowContent.style.paddingLeft = desired ? `${desired}px` : "";
  if (panel) panel.style.setProperty("--sp-panel-width", `${cfg.panelWidth}px`);
}

function attachListeners(app, actor, windowContent, tab, panel, cfg) {
  if (tab) tab.onclick = () => setConfig(actor, { enabled: !cfg.enabled });

  if (!panel) return;

  const toggleBtn = panel.querySelector(".sp-toggle");
  if (toggleBtn) toggleBtn.onclick = () => setConfig(actor, { enabled: false });

  const gearBtn = panel.querySelector(".sp-gear");
  const box = panel.querySelector(".sp-settings-box");
  if (gearBtn && box) gearBtn.onclick = () => box.classList.toggle("open");

  const portraitImg = panel.querySelector(".sp-portrait-frame img");
  if (portraitImg && app.isEditable) {
    portraitImg.style.cursor = "pointer";
    portraitImg.title = game.i18n.localize("SP.EditPortrait");
    portraitImg.onclick = () => pickImage(actor.img, (path) => actor.update({ img: path }));
  }

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
        applyWidth(app, windowContent, panel, { ...cfg, panelWidth: value, enabled: true });
      } else {
        const target = panel.querySelector(LIVE_MAP[key].sel);
        if (target) target.style.setProperty(LIVE_MAP[key].prop, LIVE_MAP[key].fmt(value));
      }
      debouncedSetConfig(actor, key, value);
    });
  });
}

/* -------------------------------------------- */
/* Render hook                                   */
/* -------------------------------------------- */

function getWindowContent(htmlArg) {
  const el = htmlArg instanceof HTMLElement ? htmlArg : htmlArg?.[0];
  if (!el) return null;
  if (el.classList?.contains("window-content")) return el;
  // ApplicationV2 hooks pass the outer .application element; window-content is a descendant.
  const descendant = el.querySelector?.(".window-content");
  if (descendant) return descendant;
  // Application V1 hooks pass the inner content, already attached under window-content.
  return el.closest?.(".window-content") ?? null;
}

function onRenderActorSheet(app, htmlArg) {
  const actor = app.document ?? app.actor ?? app.object;
  if (!actor || actor.documentName !== "Actor") return;

  const windowContent = getWindowContent(htmlArg);
  if (!windowContent) {
    console.warn(`${MODULE_ID} | No se encontró .window-content para la hoja de ${actor.name}; se omite el panel.`);
    return;
  }

  const cfg = getConfig(actor);
  const editable = !!app.isEditable;

  windowContent.style.position = "relative";
  windowContent.classList.toggle("sp-active", cfg.enabled);

  windowContent.querySelector(":scope > .sp-standee-panel")?.remove();
  windowContent.querySelector(":scope > .sp-standee-tab")?.remove();

  let tab = null;
  let panel = null;

  if (cfg.enabled) {
    panel = document.createElement("div");
    panel.className = "sp-standee-panel";
    panel.innerHTML = buildPanelHTML(actor, cfg, editable);
    applyVars(panel, cssVars(cfg).panel);
    applyVars(panel.querySelector(".sp-portrait-frame img"), cssVars(cfg).portrait);
    const flagImg = panel.querySelector(".sp-flag-frame img");
    if (flagImg) applyVars(flagImg, cssVars(cfg).flag);
    windowContent.prepend(panel);
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

function safeOnRender(app, htmlArg) {
  try {
    onRenderActorSheet(app, htmlArg);
  } catch (err) {
    console.error(`${MODULE_ID} | Error al renderizar el panel standee`, err);
  }
}

// Universal render hooks: fire for every Application/ApplicationV2 subclass, regardless of
// which intermediate sheet class a given system's actor sheet actually extends.
Hooks.on("renderApplication", safeOnRender);
Hooks.on("renderApplicationV2", safeOnRender);
