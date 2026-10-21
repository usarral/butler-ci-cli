import type { MessageKey } from "./en";

export const es = {
  "update.available": "Nueva versión disponible: {current} → {latest}",
  "update.command": "Actualiza con: {command}",
  "update.disable": "(desactivar este aviso: BUTLER_NO_UPDATE_CHECK=1)",
} as const satisfies Record<MessageKey, string>;
