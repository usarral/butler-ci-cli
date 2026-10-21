import { msg } from "../i18n";
import { icons } from "./icons";

/** Translated job/build status labels, prefixed with their icon. */
export const jobStatus = {
  success: () => `${icons.success} ${msg.jobStatus.success()}`,
  failed: () => `${icons.error} ${msg.jobStatus.failed()}`,
  unstable: () => `${icons.warning} ${msg.jobStatus.unstable()}`,
  disabled: () => `${icons.disabled} ${msg.jobStatus.disabled()}`,
  aborted: () => `${icons.aborted} ${msg.jobStatus.aborted()}`,
  running: () => `${icons.running} ${msg.jobStatus.running()}`,
  runningSuccess: () => `${icons.running} ${msg.jobStatus.runningSuccess()}`,
  runningFailed: () => `${icons.running} ${msg.jobStatus.runningFailed()}`,
  runningUnstable: () => `${icons.running} ${msg.jobStatus.runningUnstable()}`,
};
