// ============================================================
//  API HELPER - Backend Connection (secure version)
// ============================================================

window.API_URL = 'https://card-matching-backend.onrender.com/api';
window.TOKEN_KEY = 'card_matching_token';
window.USER_KEY = 'card_matching_user_v1';

var API_TIMEOUT_MS = 45000;   // Render free server ko jagne me time lag sakta hai

window.saveToken = function(t) {
    localStorage.setItem('card_matching_token', t);
};

window.getToken = function() {
    return localStorage.getItem('card_matching_token');
};

window.clearToken = function() {
    localStorage.removeItem('card_matching_token');
    localStorage.removeItem('card_matching_user_v1');
};

window.saveUser = function(u) {
    localStorage.setItem('card_matching_user_v1', JSON.stringify(u));
};

window.getUser = function() {
    try {
        return JSON.parse(localStorage.getItem('card_matching_user_v1'));
    } catch (e) {
        return null;
    }
};

// Session khatam / token galat ho to user ko login par bhej do
window.forceLogout = function() {
    if (window.cmTrace) window.cmTrace('forceLogout() called -> login.html');
    window.clearToken();
    window.location.replace('login.html');
};

window.apiCall = async function(endpoint, method, data, authRequired) {
    method = method || 'GET';
    authRequired = authRequired || false;

    var headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    if (authRequired) {
        var token = window.getToken();
        if (!token) {
            window.forceLogout();
            throw new Error('Please login again');
        }
        headers['Authorization'] = 'Bearer ' + token;
    }

    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, API_TIMEOUT_MS);

    var options = {
        method: method,
        headers: headers,
        signal: controller.signal,
        credentials: 'omit',
        cache: 'no-store'
    };
    if (data) options.body = JSON.stringify(data);

    var response;
    try {
        response = await fetch(window.API_URL + endpoint, options);
    } catch (err) {
        clearTimeout(timer);
        if (err && err.name === 'AbortError') {
            throw new Error('Server slow hai. Thodi der baad dobara try karo.');
        }
        throw new Error('Internet ya server se connection nahi ho paya.');
    }
    clearTimeout(timer);

    var result = {};
    try { result = await response.json(); } catch (e) { result = {}; }

    // Token expire ya galat hai
    if (response.status === 401 && authRequired) {
        window.forceLogout();
        throw new Error(result.error || 'Session khatam ho gaya. Dobara login karo.');
    }

    if (response.status === 429) {
        throw new Error(result.error || 'Bahut zyada requests. Thodi der baad try karo.');
    }

    if (!response.ok) {
        throw new Error(result.error || result.message || 'Request failed');
    }

    return result;
};

window.AuthAPI = {
    sendOTP: async function(name, identifier, password) {
        return await window.apiCall('/auth/send-otp', 'POST', {
            name: name, identifier: identifier, password: password
        });
    },

    verifyOTP: async function(otp, identifier) {
        var result = await window.apiCall('/auth/verify-otp', 'POST', {
            otp: otp, identifier: identifier
        });
        if (window.cmTrace) window.cmTrace('server reply fields: ' + Object.keys(result).join(',') + ' | token in reply: ' + (result.token ? 'yes' : 'NO'));
        if (result.token) {
            window.saveToken(result.token);
            window.saveUser(result.user);
        }
        return result;
    },

    login: async function(identifier, password) {
        var result = await window.apiCall('/auth/login', 'POST', {
            identifier: identifier, password: password
        });
        if (window.cmTrace) window.cmTrace('server reply fields: ' + Object.keys(result).join(',') + ' | token in reply: ' + (result.token ? 'yes' : 'NO'));
        if (result.token) {
            window.saveToken(result.token);
            window.saveUser(result.user);
        }
        return result;
    },

    getMe: async function() {
        return await window.apiCall('/auth/me', 'GET', null, true);
    },

    // ---------- FORGOT PASSWORD ----------
    forgotPassword: async function(identifier) {
        return await window.apiCall('/auth/forgot-password', 'POST', {
            identifier: identifier
        });
    },

    resetPassword: async function(identifier, otp, newPassword) {
        return await window.apiCall('/auth/reset-password', 'POST', {
            identifier: identifier,
            otp: otp,
            newPassword: newPassword
        });
    },

    logout: function() {
        window.clearToken();
        window.location.replace('login.html');
    }
};

window.ScoreAPI = {
    update: async function(level, score, completed, matches) {
        return await window.apiCall('/score/update', 'POST', {
            level: level, score: score, completed: completed, matches: matches
        }, true);
    },

    leaderboard: async function() {
        return await window.apiCall('/score/leaderboard', 'GET');
    }
};