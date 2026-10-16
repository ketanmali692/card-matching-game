// ============================================================
//  PWA INSTALL HANDLER
//  Install button ko home-top-bar ke andar daalta hai (profile ke paas)
// ============================================================

(function() {
    'use strict';

    var deferredPrompt = null;
    var installBtn = null;

    // ---------- SERVICE WORKER REGISTER ----------
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('sw.js')
                .then(function(reg) {
                    console.log('[PWA] Service Worker registered:', reg.scope);
                })
                .catch(function(err) {
                    console.log('[PWA] SW registration failed:', err);
                });
        });
    }

    // ---------- CREATE INSTALL BUTTON IN TOP BAR ----------
    function createInstallButton() {
        if (document.getElementById('pwaInstallBtn')) return;

        installBtn = document.createElement('button');
        installBtn.id = 'pwaInstallBtn';
        installBtn.className = 'top-icon-btn pwa-install-btn';
        installBtn.innerHTML = '⬇';
        installBtn.title = 'Install App';
        installBtn.style.display = 'none';

        installBtn.addEventListener('click', function() {
            if (!deferredPrompt) {
                alert('Install option abhi available nahi hai. Page refresh karo ya Chrome menu se install karo.');
                return;
            }

            deferredPrompt.prompt();

            deferredPrompt.userChoice.then(function(choice) {
                if (choice.outcome === 'accepted') {
                    console.log('[PWA] User accepted install');
                    hideInstallButton();
                } else {
                    console.log('[PWA] User dismissed install');
                }
                deferredPrompt = null;
            });
        });

        // Top bar me add karo (profile ke paas)
        var topBar = document.querySelector('.home-top-bar');
        if (topBar) {
            var profileBtn = topBar.querySelector('#btnProfile');
            if (profileBtn) {
                topBar.insertBefore(installBtn, profileBtn);
            } else {
                topBar.appendChild(installBtn);
            }
            console.log('[PWA] Install button added to top bar');
        } else {
            document.body.appendChild(installBtn);
            console.log('[PWA] Install button added to body (fallback)');
        }
    }

    function showInstallButton() {
        if (!installBtn) createInstallButton();
        if (installBtn) installBtn.style.display = 'flex';
    }

    function hideInstallButton() {
        if (installBtn) installBtn.style.display = 'none';
    }

    // ---------- BEFORE INSTALL PROMPT ----------
    window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        deferredPrompt = e;
        console.log('[PWA] Install prompt available');
        showInstallButton();
    });

    // ---------- APP INSTALLED ----------
    window.addEventListener('appinstalled', function() {
        console.log('[PWA] App installed successfully');
        deferredPrompt = null;
        hideInstallButton();
    });

    // ---------- STANDALONE CHECK ----------
    function isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }

    // ---------- INIT ----------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createInstallButton);
    } else {
        createInstallButton();
    }

    if (isStandalone()) {
        hideInstallButton();
    }

})();