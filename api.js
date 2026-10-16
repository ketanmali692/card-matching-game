// ============================================================
//  API HELPER - Backend Connection
// ============================================================

window.API_URL = 'https://card-matching-backend.onrender.com/api';
window.TOKEN_KEY = 'card_matching_token';
window.USER_KEY = 'card_matching_user_v1';

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

window.apiCall = async function(endpoint, method, data, authRequired) {
    method = method || 'GET';
    authRequired = authRequired || false;

    var headers = { 'Content-Type': 'application/json' };

    if (authRequired) {
        var token = window.getToken();
        if (token) headers['Authorization'] = 'Bearer ' + token;
    }

    var options = { method: method, headers: headers };
    if (data) options.body = JSON.stringify(data);

    var response = await fetch(window.API_URL + endpoint, options);
    var result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || 'Request failed');
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
        window.location.href = 'login.html';
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
