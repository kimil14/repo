const { Client, Authenticator } = require('minecraft-launcher-core');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const appDataPath = path.join(process.env.APPDATA || process.env.HOME, '.warfull');
const launcher = new Client();

// Téléchargement des assets Minecraft
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
        const latestVersion = versionManifest.latest.release;
        const versionData = versionManifest.versions.find(v => v.id === '1.20.6');
        const versionAssetsUrl = versionData.url;

        const versionAssetsResponse = await axios.get(versionAssetsUrl);
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

                if (!fs.existsSync(assetFilePath)) {
                    await downloadFile(assetUrl, assetFilePath);
                }
            });

            await Promise.all(assetsPromises);
        }
    } catch (error) {
        console.error('Erreur lors du téléchargement des assets:', error);
    }
}

// Téléchargement d'un fichier
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

// Téléchargement de Forge si nécessaire
async function downloadForge(version = '1.20.6') {
    const forgeInstallerUrl = `https://files.minecraftforge.net/maven/net/minecraftforge/forge/${version}-50.0.22/forge-${version}-50.0.22-installer.jar`;
    const forgeInstallerPath = path.join(appDataPath, `forge-${version}-installer.jar`);

    if (!fs.existsSync(forgeInstallerPath)) {
        console.log('Téléchargement de Forge...');
        await downloadFile(forgeInstallerUrl, forgeInstallerPath);
        console.log('Forge téléchargé.');
    }

    return forgeInstallerPath;
}

// Générer manuellement des informations d'authentification en mode offline
function getOfflineAuth(username) {
    return {
        access_token: 0,
        client_token: 0,
        uuid: 'offline', // Minecraft attend un UUID ici, mais en mode offline, le pseudo peut être utilisé
        name: username,
        user_properties: {},
		meta: {
			type: 'forge',
			demo: false, // Demo can also be specified by adding 'is_demo_user' to the options.feature array 
			// properties only exists for specific Minecraft versions.
			xuid: 'offline',
			clientId: 0
		}
    };
}

// Fonction pour lancer Minecraft avec Forge en mode offline
async function launchMinecraft(username) {
    await downloadMinecraftAssets();

    const forgePath = await downloadForge();

    //const auth = Authenticator.getAuth(username, 'offline');
	const auth = getOfflineAuth(username);
    const opts = {
        authorization: auth,
        root: appDataPath,
        version: {
            number: '1.20.6',
            type: 'release'
        },
        memory: {
            max: '4G',
            min: '2G'
        },
        forge: forgePath
		//forge: path.join(appDataPath, 'versions', '1.16.5', '1.16.5-forge-36.2.0.json'),
    };

    console.log('Lancement de Minecraft...');
    launcher.launch(opts);

    launcher.on('debug', (e) => console.log('[DEBUG]', e));
    launcher.on('data', (e) => console.log('[DATA]', e));
    launcher.on('error', (e) => console.error('[ERREUR]', e));
}

module.exports = { downloadForge, launchMinecraft };