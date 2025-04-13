const { Client, Authenticator } = require('minecraft-launcher-core');
const axios = require('axios');
const path = require('path');
const  fs = require('fs');
const crypto = require('crypto');

const launcher = new Client();


const appDataPath = path.join(process.env.APPDATA, ".warfull");

if (!fs.existsSync(appDataPath)) {
    fs.mkdirSync(appDataPath, { recursive: true });
    console.log(`Dossier créé : ${appDataPath}`);
}

//const shortForgeVersion = '47.3.11';
//const minecraftVersion = '1.20.1'; // Version de Minecraft

const shortForgeVersion = '47.4.0';
const minecraftVersion = '1.20.1'; // Version de Minecraft

const modsDir = path.join(appDataPath, 'mods');  // Le dossier où se trouvent les mods

if (!fs.existsSync(modsDir)) {
    fs.mkdirSync(modsDir, { recursive: true });
    console.log(`Dossier créé : ${modsDir}`);
}

const forgeVersion = `${minecraftVersion}-${shortForgeVersion}`; // Version de Forge à utiliser
//forgeVersion = '21.1.64';

const forgeInstallerUrl = `https://files.minecraftforge.net/maven/net/minecraftforge/forge/${forgeVersion}/forge-${forgeVersion}-installer.jar`;
//const forgeInstallerUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${forgeVersion}/neoforge-${forgeVersion}-installer.jar`;

const forgeInstallerPath = path.join(appDataPath, `forge-${minecraftVersion}-installer.jar`);
//const forgeInstallerPath = path.join(appDataPath, `neoforge-${forgeVersion}-installer.jar`);

const forgeInstalledPath = path.join(appDataPath, 'versions', `${minecraftVersion}`, `${minecraftVersion}.jar`);

let mainWindow;

async function downloadForge() {
    if (fs.existsSync(forgeInstallerPath)) {
        console.log("Forge est déjà installé.");
		//await installForge();
        return;
    }

    console.log("Téléchargement de Forge...");

    try {
        const response = await axios({
            url: forgeInstallerUrl,
            method: 'GET',
            responseType: 'stream',
        });

        const writer = fs.createWriteStream(forgeInstallerPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        console.log("Forge téléchargé avec succès.");
        //await installForge();
    } catch (error) {
        console.error("Erreur lors du téléchargement de Forge:", error);
    }
}

async function installForge() {
	const forgeVersionPath = path.join(appDataPath, 'versions', `${minecraftVersion}-forge-${shortForgeVersion}`);
    if (fs.existsSync(forgeVersionPath)) {
        console.log('Forge déjà installé pour le client.');
        return;
    }
   // await downloadForgeInstaller();
    // Exécutez l'installateur Forge
    const { exec } = require('child_process');
    exec(`java -jar ${forgeInstallerPath} --installClient`, { cwd: appDataPath }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erreur lors de l'installation de Forge: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Erreur: ${stderr}`);
            return;
        }
        console.log(`Forge installé avec succès: ${stdout}`);
    });
}

async function downloadForgeLibraries() {
    console.log("Téléchargement des bibliothèques Forge...");

    const versionManifestUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${minecraftVersion}-${forgeVersion}/version.json`;
    
    try {
        const response = await axios.get(versionManifestUrl);
        const versionData = response.data;

        // Récupérer la liste des bibliothèques
        const libraries = versionData.libraries;
        const librariesPath = path.join(appDataPath, 'libraries');

        for (const lib of libraries) {
            const libPath = path.join(librariesPath, lib.name.replace(/\./g, '/'));
            const libUrl = `https://maven.minecraftforge.net/${libPath}`;

            if (!fs.existsSync(libPath)) {
                await downloadFile(libUrl, libPath);
            }
        }
        console.log("Bibliothèques Forge téléchargées.");
    } catch (error) {
        console.error("Erreur lors du téléchargement des bibliothèques Forge:", error);
    }
}

async function downloadFile(url, filePath) {
    const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream'
    });

    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function downloadMinecraftAssets() {
    const assetsUrl = `https://resources.download.minecraft.net`;
    const assetsIndexUrl = `https://launchermeta.mojang.com/mc/game/version_manifest.json`;
    const assetsIndexPath = path.join(appDataPath, 'assets', 'indexes');
    const assetsObjectsPath = path.join(appDataPath, 'assets', 'objects');

    if (!fs.existsSync(assetsIndexPath)) {
        fs.mkdirSync(assetsIndexPath, { recursive: true });
    }
    if (!fs.existsSync(assetsObjectsPath)) {
        fs.mkdirSync(assetsObjectsPath, { recursive: true });
    }

    try {
        const response = await axios.get(assetsIndexUrl);
        const versionManifest = response.data;
        const versionData = versionManifest.versions.find(v => v.id === minecraftVersion);

        const versionAssetsResponse = await axios.get(versionData.url);
        const versionAssets = versionAssetsResponse.data;
        const assetsIndex = versionAssets.assetIndex;

        const assetsIndexResponse = await axios.get(assetsIndex.url);
        const assetsIndexData = assetsIndexResponse.data;

        const assetsIndexFilePath = path.join(assetsIndexPath, `${assetsIndex.id}.json`);
        fs.writeFileSync(assetsIndexFilePath, JSON.stringify(assetsIndexData));

        const assets = Object.keys(assetsIndexData.objects);
        const maxConcurrentDownloads = 10;

        for (let i = 0; i < assets.length; i += maxConcurrentDownloads) {
            const chunk = assets.slice(i, i + maxConcurrentDownloads);

            const assetsPromises = chunk.map(async (asset) => {
                const hash = assetsIndexData.objects[asset].hash;
                const subHash = hash.substring(0, 2);
                const assetUrl = `${assetsUrl}/${subHash}/${hash}`;
                const assetFilePath = path.join(assetsObjectsPath, subHash, hash);

                if (!fs.existsSync(path.dirname(assetFilePath))) {
                    fs.mkdirSync(path.dirname(assetFilePath), { recursive: true });
                }

                try {
                    const assetResponse = await axios.get(assetUrl, { responseType: 'stream' });
                    const writer = fs.createWriteStream(assetFilePath);
                    assetResponse.data.pipe(writer);
                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });
                } catch (error) {
                    console.error(`Erreur lors du téléchargement de l'asset ${asset}:`, error);
                }
            });

            await Promise.all(assetsPromises);
        }
    } catch (error) {
        console.error('Erreur lors du téléchargement des assets:', error);
    }
}

function getOfflineAuth(username) {
    return {
        access_token: 0,
        client_token: 0,
        uuid: 'offline', // Minecraft attend un UUID ici, mais en mode offline, le pseudo peut être utilisé
        name: username,
        user_properties: {},
		meta: {
			//type: 'forge',
			//demo: false, // Demo can also be specified by adding 'is_demo_user' to the options.feature array 
			// properties only exists for specific Minecraft versions.
			xuid: 'offline',
			clientId: 0
		}
    };
}

function getFileMD5(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', (err) => reject(err));
    });
}
// Fonction pour synchroniser les mods
async function syncMods() {
    // Charger la liste des mods depuis le serveur
    const modListUrl = 'https://warfull-minecraft.fr.cr/php/mods.json'; // URL de la liste des mods
    const modList = await fetch(modListUrl).then(res => res.json());

    // Vérifier chaque mod sur le serveur
    for (const mod of modList) {
        const localModPath = path.join(modsDir, mod.name);

        if (!fs.existsSync(localModPath)) {
            // Le mod n'existe pas localement, télécharger
            console.log(`Téléchargement du mod manquant: ${mod.name}`);
            await downloadFile(`https://warfull-minecraft.fr.cr/php/mods/${mod.name}`, localModPath);
        } else {
            // Le mod existe, vérifier le MD5
            const localMD5 = await getFileMD5(localModPath);
            if (localMD5 !== mod.md5) {
                // Le MD5 ne correspond pas, retélécharger
                console.log(`Le mod ${mod.name} n'est pas à jour, téléchargement de la nouvelle version...`);
                await downloadFile(`https://warfull-minecraft.fr.cr/php/mods/${mod.name}`, localModPath);
            }
        }
    }

    // Supprimer les mods locaux qui ne sont plus sur le serveur
    const localMods = fs.readdirSync(modsDir);
    for (const localMod of localMods) {
        if (!modList.find(mod => mod.name === localMod)) {
            console.log(`Suppression du mod obsolète: ${localMod}`);
            fs.unlinkSync(path.join(modsDir, localMod));
        }
    }
}

async function launchMinecraft(username, mainWindow1, otp) {
	
	mainWindow = mainWindow1;

    console.log('Tentative d\'envoi de la requête à verify-otp.php...');
    console.log(`Données envoyées : username=${username}, otp=${otp}`);

    const response = await fetch('https://warfull-minecraft.fr.cr/php/verify-otp.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, otp })
    });

    if (!response.ok) {
        throw new Error(`Erreur réseau : ${response.status} - ${response.statusText}`);
    }

    const result = await response.json();

    //await downloadMinecraftAssets();
    await downloadForge();
	//await installForge();
	
	const auth = getOfflineAuth(username);
    const opts = {
        //clientPackage: null, // Utilisé uniquement si vous avez un package personnalisé de Minecraft
		authorization: Authenticator.getAuth(username),
        root: appDataPath,
        version: {
            number: minecraftVersion,
            //number: '1.20.6-OptiFine_HD_U_I9_pre1',
            type: 'release',
        },
        forge: forgeInstallerPath,
        memory: {
            max: '4G',
            min: '2G',
        },
    };
	

    if (result.success) {

        syncMods().then(() => {
            console.log('Les mods sont à jour.');
            launcher.launch(opts)
            .then(() => {
                console.log('Minecraft lancé avec succès avec OTP valide !');
            })
            .catch(error => {
                console.error('Erreur lors du lancement de Minecraft:', error);
            });
        }).catch(console.error);


    }

    launcher.on('download', (data) => {

        mainWindow.webContents.send('download-file', { file: data });

    });

    // Suivi de l'événement progress global
    launcher.on('progress', (progress) => {
        //console.log("Global progress event: ", progress);
        const { task, total, type } = progress;

        // Vérifie si 'total' est bien défini et supérieur à zéro avant de calculer le pourcentage
        if (typeof task !== 'undefined' && typeof total !== 'undefined' && total > 0) {
            const percent = Math.floor((task / total) * 100);
            mainWindow.webContents.send('progress', { task: `Téléchargement des ${type}`, percent });
            if (percent === 100) {
                mainWindow.webContents.send('download-complete', {});
                console.log("Téléchargement terminé.");
            }
        } else {
            console.log("Invalid progress data: ", data);
        }
    });


}

launcher.on('debug', (e) => {
    mainWindow.webContents.send('log-e', { log: e });
    //console.log('[DEBUG]', e);
});
launcher.on('data', (e) => {
    mainWindow.webContents.send('log-e', { log: e });
});
launcher.on('close', (code) => {
    
    if (code !== 0) {
        console.log("Le jeu s'est fermé, probablement à cause du téléchargement des dépendances. code erreur: "+code+". Relance du jeu...");
        // Relancer Minecraft après avoir téléchargé les dépendances
        //launchMinecraft(username, mainWindow, otp);
    }
    console.log('Le jeu a été fermé.');
    mainWindow.webContents.send('download-complete', {});

});
	
	
module.exports = { launchMinecraft};
