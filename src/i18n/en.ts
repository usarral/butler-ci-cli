export const en = {
  "update.available": "New version available: {current} → {latest}",
  "update.command": "Update with: {command}",
  "update.disable": "(disable this notice: BUTLER_NO_UPDATE_CHECK=1)",
} as const;

export type MessageKey = keyof typeof en;
