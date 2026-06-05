// @ts-ignore
import { type, version, platform } from '@tauri-apps/plugin-os';
// @ts-ignore
import { getVersion } from '@tauri-apps/api/app';

export interface DeviceInfo {
  osType: string;
  osVersion: string;
  platform: string;
  appVersion: string;
  isTauri: boolean;
  userAgent: string;
}

export async function collectDeviceInfo(): Promise<DeviceInfo> {
  // Check if we are running inside Tauri
  const isTauri = Boolean(window.__TAURI__);

  let osTypeVal = 'Unknown';
  let osVersionVal = 'Unknown';
  let platformVal = 'Unknown';
  let appVersionVal = 'Unknown';

  if (isTauri) {
    try {
      osTypeVal = await type();
      osVersionVal = await version();
      platformVal = await platform();
      appVersionVal = await getVersion();
    } catch (e) {
      console.warn('Failed to collect Tauri device info', e);
    }
  }

  return {
    isTauri,
    osType: osTypeVal,
    osVersion: osVersionVal,
    platform: platformVal,
    appVersion: appVersionVal,
    userAgent: navigator.userAgent
  };
}
