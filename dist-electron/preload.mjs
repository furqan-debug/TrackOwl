"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("trackerAPI", {
  startTracking: (projectId, userId) => electron.ipcRenderer.invoke("start-tracking", { projectId, userId }),
  stopTracking: () => electron.ipcRenderer.invoke("stop-tracking"),
  onTrackingSample: (callback) => {
    electron.ipcRenderer.on("tracking-sample", (_event, data) => callback(data));
  }
});
