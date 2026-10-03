// Bridge release: this module was renamed to "MR- Standee Portrait" (id mr-standee-portrait).
// Foundry treats a new id as a different package, so it can't update into it by itself.
// This version does nothing but tell the GM what to do.
const NEW_ID = "mr-standee-portrait";
const MANIFEST = "https://github.com/ManuRomera/mr-standee-portrait/releases/latest/download/module.json";

Hooks.once("ready", () => {
  if (!game.user.isGM) return;
  // With the new module active, it already warns about this old one — stay quiet.
  if (game.modules.get(NEW_ID)?.active) return;
  const msg = `«Standee Portrait» se ha renombrado a «MR- Standee Portrait» y este módulo ya no funciona. Instala el nuevo desde Configuración > Módulos > Instalar módulo con este manifest: ${MANIFEST} — tus ajustes por personaje se migran solos. / Renamed to «MR- Standee Portrait»: install it with the manifest above; your per-character settings migrate automatically.`;
  ui.notifications.warn(msg, { permanent: true });
});
