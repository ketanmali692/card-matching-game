// ============================================================
//  CARD MATCHING GAME
// ============================================================

var SYMBOLS = ['★', '◆', '●', '▲', '■', '✦', '✚', '✖', '⬟', '⬢',
               '♣', '♦', '♠', '♥', '☀', '☾', '☘', '⚡', '☯', '✿'];

var MAX_HINTS = 3;
var MATCH_POINTS = 100;
var WRONG_PENALTY = 25;
var INFINITE_LEVELS = 1000;
var USER_KEY = 'card_matching_user_v1';

// ============================================================
//  USER-SPECIFIC SAVE KEY
//  Har user ka progress alag rahega (email ke saath linked)
// ============================================================
function getSaveKey() {
    try {
        var raw = localStorage.getItem(USER_KEY);
        if (raw) {
            var u = JSON.parse(raw);
            if (u && u.identifier) {
                return 'card_matching_game_save_v1_' + u.identifier.toLowerCase();
            }
        }
    } catch (e) {}
    return 'card_matching_game_save_v1_guest';
}

var SAVE_KEY = getSaveKey();

var state = {
    unlockedLevel: 1,
    totalScore: 0,
    bestLevel: 1,
    totalMatches: 0,
    completedLevels: new Set(),
    levelBestScores: {},
    currentLevel: 1,
    pairs: 4,
    flipsAllowed: 12,
    flipsUsed: 0,
    score: 0,
    matchedPairs: 0,
    hintsLeft: MAX_HINTS,
    firstCard: null,
    secondCard: null,
    waiting: false,
    paused: false,
    gameOver: false,
    hintActive: false,
    cardValues: [],
    cards: [],
    pathScrollOffset: 0,
    soundOn: true
};

var audioContext = null;

function initAudio() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {}
    }
}

function playMatchSound() {
    if (!state.soundOn || !audioContext) return;
    var notes = [1046.50, 1318.51, 1567.98];
    var startTime = audioContext.currentTime;
    notes.forEach(function(freq, i) {
        var osc = audioContext.createOscillator();
        var gain = audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        var t = startTime + i * 0.09;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start(t);
        osc.stop(t + 0.5);
    });
}

function saveProgress() {
    try {
        // Re-compute key each time (in case user changed)
        SAVE_KEY = getSaveKey();
        localStorage.setItem(SAVE_KEY, JSON.stringify({
            unlockedLevel: state.unlockedLevel,
            totalScore: state.totalScore,
            bestLevel: state.bestLevel,
            totalMatches: state.totalMatches,
            completedLevels: Array.from(state.completedLevels),
            levelBestScores: state.levelBestScores,
            soundOn: state.soundOn
        }));
    } catch (e) {}
}

function loadProgress() {
    // Always reset state first (important for new users)
    state.unlockedLevel = 1;
    state.totalScore = 0;
    state.bestLevel = 1;
    state.totalMatches = 0;
    state.completedLevels = new Set();
    state.levelBestScores = {};
    state.soundOn = true;

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

// ============================================================
//  SPLASH SCREEN
// ============================================================
function startSplash() {
    var progress = 0;
    var fill = $('progressFill');
    var text = $('progressText');

    if (!fill || !text) return;

    var interval = setInterval(function() {
        progress += 2;
        if (progress > 100) progress = 100;
        fill.style.width = progress + '%';
        text.textContent = progress + ' %';

        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(function() {
                var splash = $('splash');
                if (splash) splash.classList.add('hide');
                setTimeout(function() {
                    if (splash) splash.style.display = 'none';
                    showScreen('home');
                    renderHome();
                    setTimeout(function() {
                        resizePathCanvas();
                        drawPath();
                    }, 100);
                }, 600);
            }, 300);
        }
    }, 100);
}

// ============================================================
//  LEVEL PATH
// ============================================================
var pathCanvas, pathCtx;
var dragStartX = 0, dragStartOffset = 0, dragging = false, dragMoved = 0;

function initLevelPath() {
    pathCanvas = $('levelPath');
    if (!pathCanvas) return;
    pathCtx = pathCanvas.getContext('2d');
    resizePathCanvas();
    drawPath();
    setupPathEvents();
    window.addEventListener('resize', function() {
        resizePathCanvas();
        drawPath();
    });
}

function resizePathCanvas() {
    if (!pathCanvas) return;
    var rect = pathCanvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    pathCanvas.width = rect.width * dpr;
    pathCanvas.height = rect.height * dpr;
    pathCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawPath() {
    if (!pathCtx || !pathCanvas) return;
    var dpr = window.devicePixelRatio || 1;
    var w = pathCanvas.width / dpr;
    var h = pathCanvas.height / dpr;
    if (w < 10 || h < 10) return;

    pathCtx.clearRect(0, 0, w, h);

    var padding = 60;
    var spacing = Math.max(100, w / 5);
    var midY = h / 2;
    var totalLevels = INFINITE_LEVELS;

    var points = [];
    for (var i = 0; i < totalLevels; i++) {
        var px = padding + i * spacing - state.pathScrollOffset;
        var py = midY + Math.sin(i * 0.85) * (h * 0.22);
        points.push({ x: px, y: py });
    }

    for (var glow = 6; glow > 0; glow--) {
        pathCtx.beginPath();
        pathCtx.strokeStyle = 'rgba(60, 140, 255, ' + (0.05 * glow) + ')';
        pathCtx.lineWidth = glow * 3;
        drawSmoothPath(pathCtx, points, w);
        pathCtx.stroke();
    }

    pathCtx.beginPath();
    pathCtx.strokeStyle = '#78beff';
    pathCtx.lineWidth = 4;
    pathCtx.lineCap = 'round';
    drawSmoothPath(pathCtx, points, w);
    pathCtx.stroke();

    for (var i2 = 0; i2 < totalLevels; i2++) {
        var p = points[i2];
        if (p.x < -100 || p.x > w + 100) continue;

        var levelNum = i2 + 1;
        var isUnlocked = levelNum <= state.unlockedLevel;
        var isCurrent = levelNum === state.unlockedLevel;
        var isCompleted = state.completedLevels.has(levelNum);
        var radius = 30;

        pathCtx.beginPath();
        pathCtx.arc(p.x + 2, p.y + 3, radius, 0, Math.PI * 2);
        pathCtx.fillStyle = 'rgba(0,0,0,0.5)';
        pathCtx.fill();

        if (isCurrent) {
            var pulse = 3 + Math.abs(Math.sin(Date.now() * 0.004)) * 4;
            pathCtx.beginPath();
            pathCtx.arc(p.x, p.y, radius + pulse, 0, Math.PI * 2);
            pathCtx.fillStyle = 'rgba(80, 220, 255, 0.25)';
            pathCtx.fill();
        }

        var grad = pathCtx.createRadialGradient(
            p.x - radius * 0.3, p.y - radius * 0.3, 0,
            p.x, p.y, radius
        );
        if (!isUnlocked) {
            grad.addColorStop(0, '#4a4f5f');
            grad.addColorStop(1, '#23262e');
        } else if (isCurrent) {
            grad.addColorStop(0, '#50dcff');
            grad.addColorStop(1, '#1e5ccf');
        } else if (isCompleted) {
            grad.addColorStop(0, '#78beff');
            grad.addColorStop(1, '#3c8cff');
        } else {
            grad.addColorStop(0, '#3c8cff');
            grad.addColorStop(1, '#0f2350');
        }
        pathCtx.beginPath();
        pathCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        pathCtx.fillStyle = grad;
        pathCtx.fill();

        pathCtx.beginPath();
        pathCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        pathCtx.strokeStyle = isUnlocked ? '#f0f5ff' : '#8c90a0';
        pathCtx.lineWidth = 2.5;
        pathCtx.stroke();

        pathCtx.fillStyle = isUnlocked ? '#000' : '#fff';
        pathCtx.font = 'bold 20px Arial';
        pathCtx.textAlign = 'center';
        pathCtx.textBaseline = 'middle';
        pathCtx.fillText(levelNum.toString(), p.x, p.y + 1);

        if (!isUnlocked) {
            pathCtx.font = '16px Arial';
            pathCtx.fillStyle = '#fff';
            pathCtx.fillText('🔒', p.x + radius - 8, p.y - radius + 8);
        }

        if (isUnlocked && isCompleted) {
            pathCtx.font = 'bold 16px Arial';
            pathCtx.fillStyle = '#ffca2d';
            pathCtx.fillText('★', p.x + radius - 8, p.y - radius + 8);
        }
    }
}

function drawSmoothPath(ctx, points, w) {
    var started = false;
    for (var i = 0; i < points.length; i++) {
        var p = points[i];
        if (p.x < -200) continue;
        if (p.x > w + 200) break;
        if (!started) {
            ctx.moveTo(p.x, p.y);
            started = true;
        } else {
            var prev = points[i - 1];
            var cx = (prev.x + p.x) / 2;
            ctx.bezierCurveTo(cx, prev.y, cx, p.y, p.x, p.y);
        }
    }
}

function setupPathEvents() {
    pathCanvas.addEventListener('mousedown', function(e) {
        dragging = true;
        dragStartX = e.clientX;
        dragStartOffset = state.pathScrollOffset;
        dragMoved = 0;
        pathCanvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', function(e) {
        if (!dragging) return;
        var dx = e.clientX - dragStartX;
        dragMoved = Math.max(dragMoved, Math.abs(dx));
        state.pathScrollOffset = Math.max(0, dragStartOffset - dx);
        drawPath();
    });

    window.addEventListener('mouseup', function(e) {
        if (!dragging) return;
        dragging = false;
        pathCanvas.style.cursor = 'grab';
        if (dragMoved < 8) handlePathClick(e.clientX, e.clientY);
    });

    pathCanvas.addEventListener('touchstart', function(e) {
        var t = e.touches[0];
        dragging = true;
        dragStartX = t.clientX;
        dragStartOffset = state.pathScrollOffset;
        dragMoved = 0;
    }, { passive: true });

    pathCanvas.addEventListener('touchmove', function(e) {
        if (!dragging) return;
        var t = e.touches[0];
        var dx = t.clientX - dragStartX;
        dragMoved = Math.max(dragMoved, Math.abs(dx));
        state.pathScrollOffset = Math.max(0, dragStartOffset - dx);
        drawPath();
    }, { passive: true });

    pathCanvas.addEventListener('touchend', function(e) {
        if (!dragging) return;
        dragging = false;
        if (dragMoved < 8 && e.changedTouches[0]) {
            handlePathClick(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        }
    });

    pathCanvas.addEventListener('wheel', function(e) {
        e.preventDefault();
        state.pathScrollOffset = Math.max(0, state.pathScrollOffset + e.deltaY * 0.8);
        drawPath();
    }, { passive: false });
}

function handlePathClick(clientX, clientY) {
    var rect = pathCanvas.getBoundingClientRect();
    var x = clientX - rect.left;
    var y = clientY - rect.top;
    var w = rect.width;
    var h = rect.height;
    var padding = 60;
    var spacing = Math.max(100, w / 5);
    var midY = h / 2;

    for (var i = 0; i < INFINITE_LEVELS; i++) {
        var px = padding + i * spacing - state.pathScrollOffset;
        var py = midY + Math.sin(i * 0.85) * (h * 0.22);
        var levelNum = i + 1;

        var dist = Math.hypot(x - px, y - py);
        if (dist < 35) {
            if (levelNum <= state.unlockedLevel) {
                startGame(levelNum);
            } else {
                alert('Level ' + levelNum + ' is locked!');
            }
            return;
        }
    }
}

function renderHome() {
    var el1 = $('statBestLevel');
    var el2 = $('statBestScore');
    var el3 = $('statMatches');
    var el4 = $('btnSound');

    if (el1) el1.textContent = state.bestLevel;
    if (el2) el2.textContent = getBestScore();
    if (el3) el3.textContent = state.totalMatches;
    if (el4) el4.textContent = state.soundOn ? '🔊 Sound' : '🔇 Sound';
}

function getBestScore() {
    var best = 0;
    for (var k in state.levelBestScores) {
        if (state.levelBestScores[k] > best) best = state.levelBestScores[k];
    }
    return best;
}

function startGame(level) {
    initAudio();
    state.currentLevel = level;
    configureLevel(level);

    state.firstCard = null;
    state.secondCard = null;
    state.flipsUsed = 0;
    state.matchedPairs = 0;
    state.score = 0;
    state.hintsLeft = MAX_HINTS;
    state.waiting = false;
    state.paused = false;
    state.gameOver = false;
    state.hintActive = false;

    updateHUD();
    renderCards();
    showScreen('game-screen');
}

function configureLevel(level) {
    state.pairs = Math.min(10, 4 + (level - 1) * 2);
    state.flipsAllowed = Math.min(60, 12 + (level - 1) * 4);
}

function renderCards() {
    var grid = $('cardGrid');
    grid.innerHTML = '';

    var values = [];
    for (var i = 0; i < state.pairs; i++) {
        var symIdx = i % SYMBOLS.length;
        values.push({ symbol: SYMBOLS[symIdx], color: getColor(symIdx) });
        values.push({ symbol: SYMBOLS[symIdx], color: getColor(symIdx) });
    }
    shuffle(values);

    state.cardValues = values;
    state.cards = [];

    var total = values.length;
    var cols = 4;
    if (total > 16) cols = 5;
    if (total > 20) cols = 6;

    grid.style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0, 1fr))';
    grid.style.maxWidth = (cols * 130) + 'px';
    grid.style.margin = '0 auto';

    values.forEach(function(val, idx) {
        var card = document.createElement('div');
        card.className = 'card';
        card.innerHTML =
            '<div class="card-inner">' +
                '<div class="card-front">?</div>' +
                '<div class="card-back" style="color: ' + val.color + '">' + val.symbol + '</div>' +
            '</div>';
        card.addEventListener('click', function() { handleCardClick(idx); });
        grid.appendChild(card);
        state.cards.push({ el: card, matched: false, revealed: false });
    });
}

function getColor(idx) {
    var colors = ['#78beff', '#f87171', '#50dcff', '#4ade80', '#c084fc',
                  '#fb923c', '#50dcff', '#f472b6', '#60a5fa', '#78beff',
                  '#60a5fa', '#f87171', '#ffca2d', '#f472b6', '#fb923c',
                  '#c084fc', '#4ade80', '#50dcff', '#78beff', '#f472b6'];
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

    card.revealed = true;
    card.el.classList.add('flipped');

    if (state.firstCard === null) {
        state.firstCard = index;
        setStatus('CHOOSE SECOND CARD');
        return;
    }

    state.secondCard = index;
    state.flipsUsed++;
    updateHUD();
    checkMatch();
}

function checkMatch() {
    var a = state.firstCard;
    var b = state.secondCard;
    var valA = state.cardValues[a].symbol;
    var valB = state.cardValues[b].symbol;

    if (valA === valB) {
        state.matchedPairs++;
        state.score += MATCH_POINTS;
        state.totalMatches++;

        state.cards[a].matched = true;
        state.cards[b].matched = true;
        state.cards[a].el.classList.add('matched');
        state.cards[b].el.classList.add('matched');

        playMatchSound();
        updateHUD();
        setStatus('MATCH! +' + MATCH_POINTS + ' (' + state.matchedPairs + '/' + state.pairs + ')');

        state.firstCard = null;
        state.secondCard = null;

        if (state.matchedPairs === state.pairs) {
            setTimeout(finishLevel, 600);
        }
    } else {
        var oldScore = state.score;
        state.score = Math.max(0, state.score - WRONG_PENALTY);
        var deducted = oldScore - state.score;

        state.cards[a].el.classList.add('wrong');
        state.cards[b].el.classList.add('wrong');
        updateHUD();
        setStatus('WRONG PAIR -' + deducted);

        state.waiting = true;

        setTimeout(function() {
            state.cards[a].el.classList.remove('wrong', 'flipped');
            state.cards[b].el.classList.remove('wrong', 'flipped');
            state.cards[a].revealed = false;
            state.cards[b].revealed = false;

            state.firstCard = null;
            state.secondCard = null;
            state.waiting = false;

            if (state.flipsUsed >= state.flipsAllowed && state.matchedPairs < state.pairs) {
                levelFailed();
            } else {
                setStatus('TRY AGAIN');
            }
        }, 800);
    }
}

function updateHUD() {
    $('hud-level').textContent = 'LVL: ' + state.currentLevel;
    $('hud-flips').textContent = 'FLIPS: ' + state.flipsUsed + '/' + state.flipsAllowed;
    $('hud-score').textContent = 'SCORE: ' + state.score;
    $('hud-hints').textContent = 'HINTS: ' + state.hintsLeft + '/' + MAX_HINTS;
}

function setStatus(text) {
    $('hud-status').textContent = text;
}

function useHint() {
    if (state.gameOver || state.paused || state.waiting || state.hintActive) return;
    if (state.hintsLeft <= 0) {
        setStatus('NO HINTS LEFT!');
        return;
    }

    var map = {};
    for (var i = 0; i < state.cards.length; i++) {
        if (state.cards[i].matched) continue;
        var sym = state.cardValues[i].symbol;
        if (!map[sym]) map[sym] = [];
        map[sym].push(i);
    }

    for (var sym2 in map) {
        if (map[sym2].length >= 2) {
            var a = map[sym2][0];
            var b = map[sym2][1];
            state.hintsLeft--;
            state.hintActive = true;
            updateHUD();
            setStatus('HINT USED (' + state.hintsLeft + ' left)');

            state.cards[a].el.classList.add('hinted', 'flipped');
            state.cards[b].el.classList.add('hinted', 'flipped');

            setTimeout(function() {
                if (!state.cards[a].matched) {
                    state.cards[a].el.classList.remove('hinted', 'flipped');
                    state.cards[a].revealed = false;
                }
                if (!state.cards[b].matched) {
                    state.cards[b].el.classList.remove('hinted', 'flipped');
                    state.cards[b].revealed = false;
                }
                state.hintActive = false;
                setStatus('HINT FINISHED');
            }, 1300);
            return;
        }
    }
    setStatus('NO HINT AVAILABLE');
}

function finishLevel() {
    state.gameOver = true;

    var prev = state.levelBestScores[state.currentLevel] || 0;
    if (state.score > prev) {
        state.levelBestScores[state.currentLevel] = state.score;
    }

    if (!state.completedLevels.has(state.currentLevel)) {
        state.totalScore += state.score;
        state.completedLevels.add(state.currentLevel);
    }

    if (state.currentLevel + 1 > state.unlockedLevel) {
        state.unlockedLevel = state.currentLevel + 1;
    }
    if (state.currentLevel > state.bestLevel) {
        state.bestLevel = state.currentLevel;
    }

    saveProgress();

    if (window.ScoreAPI && window.getToken && window.getToken()) {
        window.ScoreAPI.update(state.currentLevel, state.score, true, state.pairs)
            .catch(function(err) { console.log('Score save failed:', err.message); });
    }

    showDialog({
        type: 'success',
        title: 'CONGRATULATIONS!',
        sub: 'Level ' + state.currentLevel + ' Complete!',
        score: 'Level Score: ' + state.score + ' | Total: ' + state.totalScore,
        next: '▶ NEXT LEVEL: ' + (state.currentLevel + 1),
        buttons: [
            { label: '🏠 HOME', cls: 'btn-home', action: function() { closeDialog(); goHome(); } },
            { label: '▶ NEXT', cls: 'btn-next', action: function() { closeDialog(); startGame(state.currentLevel + 1); } },
            { label: '⏹ STOP', cls: 'btn-stop', action: function() { closeDialog(); goHome(); } }
        ]
    });
}

function levelFailed() {
    state.gameOver = true;
    showDialog({
        type: 'fail',
        title: 'LEVEL FAILED!',
        sub: 'Flips khatam ho gaye!',
        score: 'Level ' + state.currentLevel + ' wapas khelna padega\nFlips used: ' + state.flipsUsed + ' / ' + state.flipsAllowed,
        next: '',
        buttons: [
            { label: '🏠 HOME', cls: 'btn-home', action: function() { closeDialog(); goHome(); } },
            { label: '🔄 RETRY', cls: 'btn-retry', action: function() { closeDialog(); startGame(state.currentLevel); } }
        ]
    });
}

function showDialog(opts) {
    var overlay = $('dialogOverlay');
    var dialog = $('dialog');
    dialog.className = 'dialog ' + (opts.type || '');
    $('dialogTitle').textContent = opts.title;
    $('dialogSub').textContent = opts.sub;
    $('dialogScore').textContent = opts.score;
    $('dialogNext').textContent = opts.next;

    var cont = $('dialogButtons');
    cont.innerHTML = '';
    opts.buttons.forEach(function(b) {
        var btn = document.createElement('button');
        btn.className = 'mini-btn ' + b.cls;
        btn.textContent = b.label;
        btn.onclick = b.action;
        cont.appendChild(btn);
    });
    overlay.classList.add('active');
}

function closeDialog() {
    $('dialogOverlay').classList.remove('active');
}

function goHome() {
    state.gameOver = true;
    renderHome();
    setTimeout(function() {
        resizePathCanvas();
        drawPath();
    }, 100);
    showScreen('home');
}

function setupButtons() {
    $('btnPlay').onclick = function() { startGame(state.unlockedLevel); };
    $('btnLevels').onclick = function() { alert('Click any level on the path above!'); };
    $('btnSound').onclick = function() {
        state.soundOn = !state.soundOn;
        saveProgress();
        renderHome();
    };
    $('btnRules').onclick = function() {
        showDialog({
            type: 'success',
            title: 'RULES',
            sub: 'How to Play',
            score: '• Fixed flips per level\n• Correct match: +' + MATCH_POINTS + ' points\n• Wrong match: -' + WRONG_PENALTY + ' points\n• Score never goes below 0\n• 3 Hints per level\n• Infinite levels\n• Drag the level line to scroll',
            next: '',
            buttons: [{ label: 'OK', cls: 'btn-next', action: closeDialog }]
        });
    };
    $('btnReset').onclick = function() {
        if (confirm('Delete all progress?')) {
            SAVE_KEY = getSaveKey();
            localStorage.removeItem(SAVE_KEY);
            state.unlockedLevel = 1;
            state.totalScore = 0;
            state.bestLevel = 1;
            state.totalMatches = 0;
            state.completedLevels = new Set();
            state.levelBestScores = {};
            state.pathScrollOffset = 0;
            renderHome();
            drawPath();
        }
    };
    $('btnExit').onclick = function() {
        saveProgress();
        if (confirm('Logout and close?')) {
            // Sirf user aur token remove karo — game progress (per-user key) rehne do
            localStorage.removeItem(USER_KEY);
            localStorage.removeItem('card_matching_token');
            window.location.href = 'login.html';
        }
    };

    $('btnGameHome').onclick = goHome;
    $('btnGameLevels').onclick = goHome;
    $('btnHint').onclick = useHint;
    $('btnPause').onclick = function() {
        if (state.gameOver) return;
        state.paused = !state.paused;
        setStatus(state.paused ? 'PAUSED' : 'RESUMED');
    };
    $('btnRestart').onclick = function() {
        if (confirm('Restart level?')) startGame(state.currentLevel);
    };
    $('btnGameRules').onclick = $('btnRules').onclick;
}

// ============================================================
//  PROFILE
// ============================================================
function openProfileModal() {
    var user = null;
    try {
        var raw = localStorage.getItem(USER_KEY);
        if (raw) user = JSON.parse(raw);
    } catch (e) {}

    var nameEl = document.getElementById('profileName');
    if (nameEl) nameEl.textContent = user && user.name ? user.name : 'Guest Player';

    var typeBadge = document.getElementById('profileTypeBadge');
    if (typeBadge) {
        if (user && user.type === 'mobile') typeBadge.textContent = '📱 Mobile Account';
        else if (user && user.type === 'email') typeBadge.textContent = '📧 Email Account';
        else typeBadge.textContent = '❓ Unknown';
    }

    var nameField = document.getElementById('profileInfoName');
    if (nameField) nameField.textContent = user && user.name ? user.name : 'Guest Player';

    var idField = document.getElementById('profileInfoIdentifier');
    if (idField) idField.textContent = user && user.identifier ? user.identifier : 'Not logged in';

    var accountTypeField = document.getElementById('profileInfoAccountType');
    if (accountTypeField) {
        if (user && user.type === 'mobile') accountTypeField.textContent = 'Mobile Number';
        else if (user && user.type === 'email') accountTypeField.textContent = 'Email Address';
        else accountTypeField.textContent = 'Guest';
    }

    var loginTimeField = document.getElementById('profileInfoLoginTime');
    if (loginTimeField) {
        if (user && user.loginTime) {
            var date = new Date(user.loginTime);
            loginTimeField.textContent = date.toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } else {
            loginTimeField.textContent = 'Just now';
        }
    }

    var statusField = document.getElementById('profileInfoStatus');
    if (statusField) {
        if (user && user.loggedIn) {
            statusField.textContent = '✅ Active & Verified';
            statusField.style.color = '#4ade80';
        } else {
            statusField.textContent = '❌ Not logged in';
            statusField.style.color = '#f87171';
        }
    }

    document.getElementById('profileModal').classList.add('active');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
}

function openSettingsModal() {
    document.getElementById('settingsModal').classList.add('active');
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('active');
}

function openHelpModal() {
    closeSettingsModal();
    document.getElementById('helpModal').classList.add('active');
}

function closeHelpModal() {
    document.getElementById('helpModal').classList.remove('active');
}

function openTermsModal() {
    closeSettingsModal();
    document.getElementById('termsModal').classList.add('active');
}

function closeTermsModal() {
    document.getElementById('termsModal').classList.remove('active');
}

function handleLogout() {
    if (confirm('Kya aap logout karna chahte ho?')) {
        // Sirf user aur token remove karo — game progress (per-user key) safe rahega
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem('card_matching_token');
        window.location.href = 'login.html';
    }
}

function setupProfileAndSettings() {
    var btnProfile = document.getElementById('btnProfile');
    if (btnProfile) btnProfile.onclick = openProfileModal;

    var btnSettings = document.getElementById('btnSettings');
    if (btnSettings) btnSettings.onclick = openSettingsModal;

    var closeProfile = document.getElementById('closeProfile');
    if (closeProfile) closeProfile.onclick = closeProfileModal;

    var closeSettings = document.getElementById('closeSettings');
    if (closeSettings) closeSettings.onclick = closeSettingsModal;

    var closeHelp = document.getElementById('closeHelp');
    if (closeHelp) closeHelp.onclick = closeHelpModal;

    var closeTerms = document.getElementById('closeTerms');
    if (closeTerms) closeTerms.onclick = closeTermsModal;

    var btnHelp = document.getElementById('btnHelp');
    if (btnHelp) btnHelp.onclick = openHelpModal;

    var btnTerms = document.getElementById('btnTerms');
    if (btnTerms) btnTerms.onclick = openTermsModal;

    var btnLogout = document.getElementById('btnLogout');
    if (btnLogout) btnLogout.onclick = handleLogout;

    document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay').forEach(function(o) {
                o.classList.remove('active');
            });
        }
    });
}

// ============================================================
//  INITIALIZE
// ============================================================
window.addEventListener('DOMContentLoaded', function() {
    loadProgress();
    initLevelPath();
    setupButtons();
    setupProfileAndSettings();
    startSplash();
});