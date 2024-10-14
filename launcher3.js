const { install, MinecraftLocation, MinecraftVersion } = require("@xmcl/installer");
const { MinecraftFolder } = require("@xmcl/core");
const path = require("path");

// Le chemin où Minecraft sera installé
const minecraftFolderPath = path.resolve(__dirname, "minecraft");  // Assurez-vous que __dirname est utilisé pour le chemin absolu
const minecraftFolder = new MinecraftFolder(minecraftFolderPath);

// La version de Minecraft que vous souhaitez installer
const mcVersion = "1.20.1";  // Changez pour la version souhaitée

// Installer Minecraft
async function installMinecraft() {
  try {
    console.log(`Installation de Minecraft version ${mcVersion}...`);
    await install(mcVersion, minecraftFolder);
    console.log("Minecraft installé avec succès !");
  } catch (error) {
    console.error("Erreur lors de l'installation de Minecraft:", error);
  }
}

// Installer Fabric pour la version de Minecraft
async function installFabric() {
  try {
    console.log("Installation de Fabric...");
    await install(mcVersion, minecraftFolder, { loader: 'fabric' });
    console.log("Fabric installé avec succès !");
  } catch (error) {
    console.error("Erreur lors de l'installation de Fabric:", error);
  }
}

// Lancer les installations
installMinecraft().then(installFabric);