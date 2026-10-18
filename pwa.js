// ============================================================
//  PWA HANDLER
//  ✅ Install button / install option HATA DIYA gaya hai.
//  Sirf Service Worker register hota hai (pehle jaisa).
// ============================================================

(function() {
    'use strict';

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

    // ---------- INSTALL POPUP BAND ----------
    // Browser apna install popup / banner na dikhaye
    window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
    });

})();