const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {

    const loginButton = document.getElementById('login-button');
    const loginStatus = document.getElementById('login-status');
    const showRegisterLink = document.getElementById('show-register');
    const registerPopup = document.getElementById('register-popup');
    const closePopup = document.querySelector('.close');
    const registerButton = document.getElementById('register-button');
    const registerStatus = document.getElementById('register-status');

    // Ouvrir le popup d'inscription
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerPopup.style.display = 'block';
    });

    // Fermer le popup d'inscription
    closePopup.addEventListener('click', () => {
        registerPopup.style.display = 'none';
    });

    //Connexion de l'utilisateur
    loginButton.addEventListener('click', async () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (username && password) {
            const response = await fetch('https://warfull-minecraft.fr.cr/php/login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password}),
            });

            const result = await response.json();

            if (result.success) {
                loginStatus.textContent = "Connexion réussie !";
                ipcRenderer.send('launch-minecraft', username, result.otp);
            } else {
                loginStatus.textContent = result.message;
            }
        } else {
            loginStatus.textContent = "Veuillez remplir tous les champs.";
        }
    });

    // Inscription de l'utilisateur
    registerButton.addEventListener('click', async () => {
        const mail = document.getElementById('register-mail').value;
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            registerStatus.textContent = "Les mots de passe ne correspondent pas.";
            return;
        }

        if (username && password && mail) {
            const response = await fetch('https://warfull-minecraft.fr.cr/php/register.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password, mail }),
            });

            const result = await response.json();

            if (result.success) {
                registerStatus.textContent = "Inscription réussie !";
                registerPopup.style.display = 'none'; // Fermer le popup après l'inscription
            } else {
                registerStatus.textContent = result.message;
            }
        } else {
            registerStatus.textContent = "Veuillez remplir tous les champs.";
        }
    });

    ipcRenderer.on('download-file', (event, { file }) => {
        document.getElementById('progress-filename-text').innerText = `Téléchargement de ${file}`;
    });

    // Écoute de la progression du téléchargement
    ipcRenderer.on('progress', (event, { task, percent }) => {
        document.getElementById('progress-bar').style.width = `${percent}%`;
        document.getElementById('progress-text').innerText = `${task} - ${percent}%`;
    });

    // Écoute de la fin du téléchargement
    ipcRenderer.on('download-complete', () => {
        document.getElementById('progress-bar').style.width = '100%'; // Assure que la barre est remplie
        document.getElementById('progress-text').innerText = 'Téléchargement terminé!';
        document.getElementById('progress-filename-text').innerText = '';

    });

});