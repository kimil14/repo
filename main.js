const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { launchMinecraft } = require('./launcher2');

let mainWindow;
function createWindow () {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false
        }
    });
	
	//Menu.setApplicationMenu(null);

    mainWindow.loadFile('index.html');


}

// Écoute l'événement du bouton pour démarrer Minecraft
ipcMain.on('launch-minecraft', async (event, username, otp) => {
    console.log(`Lancement de Minecraft pour l'utilisateur : ${username}`);
    await launchMinecraft(username, mainWindow, otp); // Appel de la fonction avec username
});


app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});




