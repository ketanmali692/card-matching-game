// ============================================================
//  AUTH GUARD
//  data-mode="require-login"         -> login nahi hai to login.html
//  data-mode="redirect-if-logged-in" -> login hai to seedha splash -> home
//  (user tab tak logged in rehta hai jab tak wo khud logout na kare)
// ============================================================
window.CM_VERSION = '2026-10-21-a';

// Chhota sa "kaun kahan bheja gaya" log (sirf debug.html me dikhta hai, koi secret nahi)
window.cmTrace = function(msg) {
    try {
        var a = JSON.parse(localStorage.getItem('cm_trace') || '[]');
        a.push(new Date().toISOString().slice(11, 19) + '  ' + msg);
        localStorage.setItem('cm_trace', JSON.stringify(a.slice(-40)));
    } catch (e) {}
};

(function() {
    var TOKEN_KEY = 'card_matching_token';
    var USER_KEY = 'card_matching_user_v1';

    var mode = 'require-login';
    var me = document.currentScript;
    if (me && me.getAttribute('data-mode')) mode = me.getAttribute('data-mode');

    var page = (location.pathname.split('/').pop() || 'index.html');

    // Token ki expiry (agar token JWT hai to) - sirf convenience check,
    // asli jaanch hamesha backend karta hai
    function isExpired(t) {
        try {
            var parts = t.split('.');
            if (parts.length !== 3) return false;
            var payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            return !!(payload.exp && payload.exp * 1000 < Date.now());
        } catch (e) {
            return false;
        }
    }

    var token = null;
    try { token = localStorage.getItem(TOKEN_KEY); } catch (e) {}

    var expired = false;
    if (token && isExpired(token)) {
        expired = true;
        try {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        } catch (e) {}
        token = null;
    }

    var decision = 'stay';
    if (mode === 'require-login' && !token) decision = 'GO login.html';
    else if (mode === 'redirect-if-logged-in' && token) decision = 'GO splash.html';

    window.cmTrace(page + ' [' + mode + '] token=' + (token ? 'yes' : 'no') + (expired ? ' (expired, removed)' : '') + ' -> ' + decision);

    if (decision === 'GO login.html') window.location.replace('login.html');
    else if (decision === 'GO splash.html') window.location.replace('splash.html');
})();