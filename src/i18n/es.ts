import type { en } from "./en";
import type { Shape } from "./types";

export const es = {
  update: {
    available: "Nueva versión disponible: {current} → {latest}",
    command: "Actualiza con: {command}",
    disable: "(desactivar este aviso: BUTLER_NO_UPDATE_CHECK=1)",
  },
} as const satisfies Shape<typeof en>;
