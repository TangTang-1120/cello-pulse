const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('celloDesktop', {
  platform: process.platform,
})
