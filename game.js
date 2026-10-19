// ============================================================
//  CARD MATCHING GAME - WITH TIMER & 3D UI (SECURE)
// ============================================================

var SYMBOLS = ['★', '◆', '●', '▲', '■', '✦', '✚', '✖', '⬟', '⬢', '♣', '♦', '♠', '♥', '☀', '☾', '☘', '⚡', '☯', '✿'];
var MAX_HINTS = 3;
var MATCH_POINTS = 100;
var WRONG_PENALTY = 25;
var USER_KEY = 'card_matching_user_v1';

// ✅ AUTO LOGIN CHECK
if (localStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'login.html';
}

var timerInterval = null;
var timeLeft = 0;

function getSaveKey() {
    try {
        var raw = localStorage.getItem(USER_KEY);
        if (raw) {
            var u = JSON.parse(raw);
            if (u && u.identifier) return 'card_matching_game_save_v1_' + u.identifier.toLowerCase();
        }
    } catch (e) {}
    return 'card_matching_game_save_v1_guest';
}

var SAVE_KEY = getSaveKey();

var state = {
    unlockedLevel: 1, totalScore: 0, bestLevel: 1, totalMatches: 0,
    completedLevels: new Set(), levelBestScores: {}, currentLevel: 1,
    pairs: 4, flipsAllowed: 12, flipsUsed: 0, score: 0, matchedPairs: 0,
    hintsLeft: MAX_HINTS, firstCard: null, secondCard: null,
    waiting: false, paused: false, gameOver: false, hintActive: false,
    cardValues: [], cards: [], soundOn: true
};

var audioContext = null;
function initAudio() { if (!audioContext) { try { audioContext = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } }

function playMatchSound() {
    if (!state.soundOn || !audioContext) return;
    var notes = [1046.50, 1318.51, 1567.98];
    var startTime = audioContext.currentTime;
    notes.forEach(function(freq, i) {
        var osc = audioContext.createOscillator();
        var gain = audioContext.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        var t = startTime + i * 0.09;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(gain); gain.connect(audioContext.destination);
        osc.start(t); osc.stop(t + 0.5);
    });
}

// ✅ BACKEND SE LEVEL SYNC KARO
async function syncLevelFromBackend() {
    if (window.getToken && window.getToken()) {
        try {
            var res = await fetch('https://card-matching-backend.onrender.com/api/score/progress', {
                headers: { 'Authorization': 'Bearer ' + window.getToken() }
            });
            var data = await res.json();
            if (data && data.unlockedLevel) {
                state.unlockedLevel = data.unlockedLevel;
                state.totalScore = data.totalScore || 0;
            }
        } catch (e) {
            console.log('Offline mode - using local data');
        }
    }
}

function saveProgress() {
    try {
        SAVE_KEY = getSaveKey();
        localStorage.setItem(SAVE_KEY, JSON.stringify({
            unlockedLevel: state.unlockedLevel, totalScore: state.totalScore,
            bestLevel: state.bestLevel, totalMatches: state.totalMatches,
            completedLevels: Array.from(state.completedLevels),
            levelBestScores: state.levelBestScores, soundOn: state.soundOn
        }));
    } catch (e) {}
}

function loadProgress() {
    state.unlockedLevel = 1; state.totalScore = 0; state.bestLevel = 1; state.totalMatches = 0;
    state.completedLevels = new Set(); state.levelBestScores = {}; state.soundOn = true;
    try {
        SAVE_KEY = getSaveKey();
        var raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
            var d = JSON.parse(raw);
            state.unlockedLevel = d.unlockedLevel || 1;
            state.totalScore = d.totalScore || 0;
            state.bestLevel = d.bestLevel || 1;
            state.totalMatches = d.totalMatches || 0;
            state.completedLevels = new Set(d.completedLevels || []);
            state.levelBestScores = d.levelBestScores || {};
            state.soundOn = d.soundOn !== false;
        }
    } catch (e) {}
    
    // Sync with backend
    syncLevelFromBackend();
}

// ... (Aapke baaki game functions - startGame, renderCards, checkMatch, etc. waise hi rahenge) ...

function setupButtons() {
    $('btnPlay').onclick = function() { startGame(state.unlockedLevel); };
    $('btnLevels').onclick = function() { alert('Level path coming soon!'); };
    $('btnSound').onclick = function() { state.soundOn = !state.soundOn; saveProgress(); renderHome(); };
    $('btnRules').onclick = function() {
        showDialog({ type: 'success', title: 'RULES', sub: 'How to Play',
            score: '• Match cards to score points\n• +100 points for a correct match\n• -25 points for a wrong match\n• Beat the timer to win!\n• 3 Hints per level',
            next: '', buttons: [{ label: 'OK', cls: 'btn-next', action: closeDialog }]
        });
    };
    
    // ✅ RESET BUTTON HATA DIYA HAI

    $('btnExit').onclick = function() {
        saveProgress();
        if (confirm('Logout and close?')) { 
            localStorage.removeItem(USER_KEY); 
            localStorage.removeItem('card_matching_token'); 
            localStorage.removeItem('isLoggedIn'); // Logout flag hatao
            window.location.href = 'login.html'; 
        }
    };
    $('btnGameHome').onclick = goHome;
    $('btnHint').onclick = useHint;
    $('btnPause').onclick = function() { if (state.gameOver) return; state.paused = !state.paused; setStatus(state.paused ? 'PAUSED' : 'RESUMED'); };
    $('btnRestart').onclick = function() { if (confirm('Restart level?')) startGame(state.currentLevel); };
    $('btnGameRules').onclick = $('btnRules').onclick;
}

// ... (Aapka baaki code) ...

window.addEventListener('DOMContentLoaded', function() {
    loadProgress();
    setupButtons();
    setupProfileAndSettings();
    renderHome();
});