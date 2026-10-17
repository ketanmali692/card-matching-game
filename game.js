// ============================================================
//  CARD MATCHING GAME - WITH TIMER & 3D UI
// ============================================================

var SYMBOLS = ['★', '◆', '●', '▲', '■', '✦', '✚', '✖', '⬟', '⬢', '♣', '♦', '♠', '♥', '☀', '☾', '☘', '⚡', '☯', '✿'];
var MAX_HINTS = 3;
var MATCH_POINTS = 100;
var WRONG_PENALTY = 25;
var USER_KEY = 'card_matching_user_v1';

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
        if (!raw) return;
        var d = JSON.parse(raw);
        state.unlockedLevel = d.unlockedLevel || 1;
        state.totalScore = d.totalScore || 0;
        state.bestLevel = d.bestLevel || 1;
        state.totalMatches = d.totalMatches || 0;
        state.completedLevels = new Set(d.completedLevels || []);
        state.levelBestScores = d.levelBestScores || {};
        state.soundOn = d.soundOn !== false;
    } catch (e) {}
}

function $(id) { return document.getElementById(id); }
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
    if (id) $(id).classList.add('active');
}

// TIMER FUNCTIONS
function startTimer(seconds) {
    clearInterval(timerInterval);
    timeLeft = seconds;
    updateTimerDisplay();
    timerInterval = setInterval(function() {
        if (state.paused || state.gameOver) return;
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) { clearInterval(timerInterval); levelFailed(true); }
    }, 1000);
}

function updateTimerDisplay() {
    var el = $('timerDisplay');
    if (!el) return;
    var m = Math.floor(timeLeft / 60);
    var s = timeLeft % 60;
    el.textContent = '⏱️ ' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    if (timeLeft <= 10) el.classList.add('warning'); else el.classList.remove('warning');
}

function stopTimer() { clearInterval(timerInterval); }

function startGame(level) {
    initAudio();
    state.currentLevel = level;
    configureLevel(level);
    state.firstCard = null; state.secondCard = null; state.flipsUsed = 0;
    state.matchedPairs = 0; state.score = 0; state.hintsLeft = MAX_HINTS;
    state.waiting = false; state.paused = false; state.gameOver = false; state.hintActive = false;

    updateHUD();
    renderCards();
    showScreen('game-screen');
    
    var levelTime = 40 + (level - 1) * 10;
    startTimer(levelTime);
    $('levelBadge').textContent = level;
}

function configureLevel(level) {
    state.pairs = Math.min(10, 4 + (level - 1) * 2);
    state.flipsAllowed = Math.min(60, 12 + (level - 1) * 4);
}

function renderCards() {
    var grid = $('cardGrid'); grid.innerHTML = '';
    var values = [];
    for (var i = 0; i < state.pairs; i++) {
        var symIdx = i % SYMBOLS.length;
        values.push({ symbol: SYMBOLS[symIdx], color: getColor(symIdx) });
        values.push({ symbol: SYMBOLS[symIdx], color: getColor(symIdx) });
    }
    shuffle(values);
    state.cardValues = values; state.cards = [];
    var total = values.length; var cols = 4;
    if (total > 16) cols = 5; if (total > 20) cols = 6;
    grid.style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0, 1fr))';
    grid.style.maxWidth = (cols * 130) + 'px';
    grid.style.margin = '0 auto';

    values.forEach(function(val, idx) {
        var card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = '<div class="card-inner"><div class="card-front">?</div><div class="card-back" style="color: ' + val.color + '">' + val.symbol + '</div></div>';
        card.addEventListener('click', function() { handleCardClick(idx); });
        grid.appendChild(card);
        state.cards.push({ el: card, matched: false, revealed: false });
    });
}

function getColor(idx) {
    var colors = ['#c084fc', '#f87171', '#4ade80', '#facc15', '#38bdf8', '#fb923c', '#f472b6', '#a855f7'];
    return colors[idx % colors.length];
}

function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
}

function handleCardClick(index) {
    if (state.gameOver || state.paused || state.waiting || state.hintActive) return;
    var card = state.cards[index];
    if (!card || card.matched || card.revealed) return;
    if (state.firstCard === index) return;
    card.revealed = true; card.el.classList.add('flipped');
    if (state.firstCard === null) { state.firstCard = index; setStatus('CHOOSE SECOND CARD'); return; }
    state.secondCard = index; state.flipsUsed++; updateHUD(); checkMatch();
}

function checkMatch() {
    var a = state.firstCard; var b = state.secondCard;
    var valA = state.cardValues[a].symbol; var valB = state.cardValues[b].symbol;
    if (valA === valB) {
        state.matchedPairs++; state.score += MATCH_POINTS; state.totalMatches++;
        state.cards[a].matched = true; state.cards[b].matched = true;
        state.cards[a].el.classList.add('matched'); state.cards[b].el.classList.add('matched');
        playMatchSound(); updateHUD(); setStatus('MATCH! +' + MATCH_POINTS);
        state.firstCard = null; state.secondCard = null;
        if (state.matchedPairs === state.pairs) setTimeout(finishLevel, 600);
    } else {
        state.score = Math.max(0, state.score - WRONG_PENALTY);
        state.cards[a].el.classList.add('wrong'); state.cards[b].el.classList.add('wrong');
        updateHUD(); setStatus('WRONG PAIR'); state.waiting = true;
        setTimeout(function() {
            state.cards[a].el.classList.remove('wrong', 'flipped'); state.cards[b].el.classList.remove('wrong', 'flipped');
            state.cards[a].revealed = false; state.cards[b].revealed = false;
            state.firstCard = null; state.secondCard = null; state.waiting = false;
            if (state.flipsUsed >= state.flipsAllowed && state.matchedPairs < state.pairs) levelFailed(false);
            else setStatus('TRY AGAIN');
        }, 800);
    }
}

function updateHUD() {
    $('hud-level').textContent = 'LVL: ' + state.currentLevel;
    $('hud-flips').textContent = 'FLIPS: ' + state.flipsUsed + '/' + state.flipsAllowed;
    $('hud-score').textContent = 'SCORE: ' + state.score;
    $('hud-hints').textContent = 'HINTS: ' + state.hintsLeft + '/' + MAX_HINTS;
}

function setStatus(text) { $('hud-status').textContent = text; }

function useHint() {
    if (state.gameOver || state.paused || state.waiting || state.hintActive) return;
    if (state.hintsLeft <= 0) { setStatus('NO HINTS LEFT!'); return; }
    var map = {};
    for (var i = 0; i < state.cards.length; i++) {
        if (state.cards[i].matched) continue;
        var sym = state.cardValues[i].symbol; if (!map[sym]) map[sym] = []; map[sym].push(i);
    }
    for (var sym2 in map) {
        if (map[sym2].length >= 2) {
            var a = map[sym2][0]; var b = map[sym2][1];
            state.hintsLeft--; state.hintActive = true; updateHUD(); setStatus('HINT USED');
            state.cards[a].el.classList.add('hinted', 'flipped'); state.cards[b].el.classList.add('hinted', 'flipped');
            setTimeout(function() {
                if (!state.cards[a].matched) { state.cards[a].el.classList.remove('hinted', 'flipped'); state.cards[a].revealed = false; }
                if (!state.cards[b].matched) { state.cards[b].el.classList.remove('hinted', 'flipped'); state.cards[b].revealed = false; }
                state.hintActive = false; setStatus('HINT FINISHED');
            }, 1300); return;
        }
    }
    setStatus('NO HINT AVAILABLE');
}

function finishLevel() {
    state.gameOver = true; stopTimer();
    var prev = state.levelBestScores[state.currentLevel] || 0;
    if (state.score > prev) state.levelBestScores[state.currentLevel] = state.score;
    if (!state.completedLevels.has(state.currentLevel)) { state.totalScore += state.score; state.completedLevels.add(state.currentLevel); }
    if (state.currentLevel + 1 > state.unlockedLevel) state.unlockedLevel = state.currentLevel + 1;
    if (state.currentLevel > state.bestLevel) state.bestLevel = state.currentLevel;
    saveProgress();
    if (window.ScoreAPI && window.getToken && window.getToken()) { window.ScoreAPI.update(state.currentLevel, state.score, true, state.pairs).catch(function(err) { console.log(err); }); }
    showDialog({
        type: 'success', title: 'CONGRATULATIONS!', sub: 'Level ' + state.currentLevel + ' Complete!',
        score: 'Score: ' + state.score + ' | Time Left: ' + timeLeft + 's', next: '▶ NEXT LEVEL: ' + (state.currentLevel + 1),
        buttons: [
            { label: '🏠 HOME', cls: 'btn-home', action: function() { closeDialog(); goHome(); } },
            { label: '▶ NEXT', cls: 'btn-next', action: function() { closeDialog(); startGame(state.currentLevel + 1); } }
        ]
    });
}

function levelFailed(isTimeOut) {
    state.gameOver = true; stopTimer();
    showDialog({
        type: 'fail', title: isTimeOut ? 'TIME UP!' : 'LEVEL FAILED!',
        sub: isTimeOut ? 'Time limit khatam ho gaya!' : 'Flips khatam ho gaye!',
        score: 'Level ' + state.currentLevel + ' wapas khelna padega.', next: '',
        buttons: [
            { label: '🏠 HOME', cls: 'btn-home', action: function() { closeDialog(); goHome(); } },
            { label: '🔄 RETRY', cls: 'btn-retry', action: function() { closeDialog(); startGame(state.currentLevel); } }
        ]
    });
}

function showDialog(opts) {
    var overlay = $('dialogOverlay'); var dialog = $('dialog');
    dialog.className = 'dialog ' + (opts.type || '');
    $('dialogTitle').textContent = opts.title; $('dialogSub').textContent = opts.sub;
    $('dialogScore').textContent = opts.score; $('dialogNext').textContent = opts.next;
    var cont = $('dialogButtons'); cont.innerHTML = '';
    opts.buttons.forEach(function(b) {
        var btn = document.createElement('button');
        btn.className = 'mini-btn ' + b.cls; btn.textContent = b.label; btn.onclick = b.action; cont.appendChild(btn);
    });
    overlay.classList.add('active');
}

function closeDialog() { $('dialogOverlay').classList.remove('active'); }

function goHome() {
    state.gameOver = true; stopTimer(); renderHome(); showScreen('home');
}

function renderHome() {
    var el1 = $('statBestLevel'); var el2 = $('statBestScore'); var el3 = $('statMatches'); var el4 = $('btnSound');
    if (el1) el1.textContent = state.bestLevel;
    if (el2) el2.textContent = getBestScore();
    if (el3) el3.textContent = state.totalMatches;
    if (el4) el4.textContent = state.soundOn ? '🔊 SOUND' : '🔇 SOUND';
}

function getBestScore() {
    var best = 0;
    for (var k in state.levelBestScores) { if (state.levelBestScores[k] > best) best = state.levelBestScores[k]; }
    return best;
}

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
    $('btnReset').onclick = function() { if (confirm('Delete all progress?')) { SAVE_KEY = getSaveKey(); localStorage.removeItem(SAVE_KEY); loadProgress(); renderHome(); } };
    $('btnExit').onclick = function() {
        saveProgress();
        if (confirm('Logout and close?')) { localStorage.removeItem(USER_KEY); localStorage.removeItem('card_matching_token'); window.location.href = 'login.html'; }
    };
    $('btnGameHome').onclick = goHome;
    $('btnHint').onclick = useHint;
    $('btnPause').onclick = function() { if (state.gameOver) return; state.paused = !state.paused; setStatus(state.paused ? 'PAUSED' : 'RESUMED'); };
    $('btnRestart').onclick = function() { if (confirm('Restart level?')) startGame(state.currentLevel); };
    $('btnGameRules').onclick = $('btnRules').onclick;
}

function setupProfileAndSettings() {
    var btnProfile = document.getElementById('btnProfile');
    if (btnProfile) btnProfile.onclick = function() {
        var user = null; try { var raw = localStorage.getItem(USER_KEY); if (raw) user = JSON.parse(raw); } catch(e) {}
        if ($('profileName')) $('profileName').textContent = user ? user.name : 'Player';
        if ($('profileInfoName')) $('profileInfoName').textContent = user ? user.name : '-';
        if ($('profileInfoIdentifier')) $('profileInfoIdentifier').textContent = user ? user.identifier : '-';
        if ($('profileInfoStatus')) { $('profileInfoStatus').textContent = '✅ Active'; $('profileInfoStatus').style.color = '#4ade80'; }
        document.getElementById('profileModal').classList.add('active');
    };
    var btnSettings = document.getElementById('btnSettings');
    if (btnSettings) btnSettings.onclick = function() { document.getElementById('settingsModal').classList.add('active'); };
    var closeProfile = document.getElementById('closeProfile'); if (closeProfile) closeProfile.onclick = function() { document.getElementById('profileModal').classList.remove('active'); };
    var closeSettings = document.getElementById('closeSettings'); if (closeSettings) closeSettings.onclick = function() { document.getElementById('settingsModal').classList.remove('active'); };
    var closeHelp = document.getElementById('closeHelp'); if (closeHelp) closeHelp.onclick = function() { document.getElementById('helpModal').classList.remove('active'); };
    var closeTerms = document.getElementById('closeTerms'); if (closeTerms) closeTerms.onclick = function() { document.getElementById('termsModal').classList.remove('active'); };
    var btnHelp = document.getElementById('btnHelp'); if (btnHelp) btnHelp.onclick = function() { document.getElementById('settingsModal').classList.remove('active'); document.getElementById('helpModal').classList.add('active'); };
    var btnTerms = document.getElementById('btnTerms'); if (btnTerms) btnTerms.onclick = function() { document.getElementById('settingsModal').classList.remove('active'); document.getElementById('termsModal').classList.add('active'); };
    var btnLogout = document.getElementById('btnLogout'); if (btnLogout) btnLogout.onclick = function() { if (confirm('Logout?')) { localStorage.removeItem(USER_KEY); localStorage.removeItem('card_matching_token'); window.location.href = 'login.html'; } };
    document.querySelectorAll('.modal-overlay').forEach(function(overlay) { overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.classList.remove('active'); }); });
}

window.addEventListener('DOMContentLoaded', function() {
    loadProgress();
    setupButtons();
    setupProfileAndSettings();
    renderHome();
});