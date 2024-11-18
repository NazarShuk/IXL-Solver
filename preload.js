const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld("ixlSolver",{
    sendUrl: (value) => ipcRenderer.send("url", value),
    onUrlRequest: (callback) => ipcRenderer.on("url-request", (_event, value) => callback(value)),
    sendLogin: (username, password) => ipcRenderer.send("login", username, password),
    sendAIKey: (value) => ipcRenderer.send("ai-key", value),
    onInfo: (callback) => ipcRenderer.on("solve-info", (_event, value) => callback(value)),
    onResult: (callback) => ipcRenderer.on("question-result", (_event, value) => callback(value)),
    onStatus: (callback) => ipcRenderer.on("status", (_event, value) => callback(value)),
    onQuestionStatus: (callback) => ipcRenderer.on("question-status", (_event, value) => callback(value)),
    onLoginRequest: (callback) => ipcRenderer.on("login", (_event, value) => callback(value)),
    onLoginResult: (callback) => ipcRenderer.on("login-result", (_event, value) => callback(value)),
    onAIRequest: (callback) => ipcRenderer.on("ai-request", (_event, value) => callback(value)),
    onAIResult: (callback) => ipcRenderer.on("ai-result", (_event, value) => callback(value)),


})
