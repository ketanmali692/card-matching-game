// ============================================================
//  LEVELS SCREEN LOGIC - 1 se unlimited levels
//  (game.js ke state / startGame / showScreen use karta hai)
//  Ek level paar karne par hi agla level khulta hai.
// ============================================================
(function() {
    var ROW_H = 110;
    var rowsRendered = 0;
    var pathEl = null;
    var toastTimer = null;

    // Zig-zag path: har level ka left position (%)
    function lx(l) { return 50 + 26 * Math.sin(l * 0.9); }

    function rowHTML(l) {
        var x1 = lx(l).toFixed(2);
        var x2 = lx(l + 1).toFixed(2);
        var unlocked = l <= state.unlockedLevel;
        var done = state.completedLevels.has(l);
        var current = (l === state.unlockedLevel);

        var cls = 'locked';
        var sub = '🔒';
        if (current) { cls = 'current'; sub = 'PLAY'; }
        else if (done) { cls = 'done'; sub = '★ ' + (state.levelBestScores[l] || 0); }
        else if (unlocked) { cls = 'open'; sub = 'PLAY'; }

        var lineCls = (l < state.unlockedLevel) ? 'level-line done' : 'level-line';

        return '<div class="level-row">' +
            '<svg class="' + lineCls + '" viewBox="0 0 100 100" preserveAspectRatio="none">' +
                '<line x1="' + x1 + '" y1="50" x2="' + x2 + '" y2="150"/>' +
            '</svg>' +
            '<button class="level-node ' + cls + '" data-level="' + l + '" style="left:' + x1 + '%">' +
                '<span class="ln-num">' + l + '</span>' +
                '<span class="ln-sub">' + sub + '</span>' +
            '</button>' +
        '</div>';
    }

    function appendRows(to) {
        var html = '';
        for (var l = rowsRendered + 1; l <= to; l++) html += rowHTML(l);
        pathEl.insertAdjacentHTML('beforeend', html);
        rowsRendered = to;
    }

    function toast(msg) {
        var t = document.getElementById('levelToast');
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function() { t.classList.remove('show'); }, 2000);
    }

    function openLevels() {
        pathEl.innerHTML = '';
        rowsRendered = 0;
        appendRows(Math.max(30, state.unlockedLevel + 12));
        document.getElementById('levelsCount').textContent = 'LVL ' + state.unlockedLevel;
        showScreen('levels-screen');

        // Current level ko screen ke beech me laao
        setTimeout(function() {
            var top = (state.unlockedLevel - 1) * ROW_H - pathEl.clientHeight / 2 + ROW_H / 2 + 20;
            pathEl.scrollTop = Math.max(0, top);
        }, 60);
    }

    // game.js ke DOMContentLoaded ke BAAD chalna chahiye (taaki "coming soon" wala alert replace ho)
    window.addEventListener('DOMContentLoaded', function() {
        pathEl = document.getElementById('levelPath');

        document.getElementById('btnLevels').onclick = openLevels;

        document.getElementById('btnLevelsBack').onclick = function() {
            renderHome();
            showScreen('home');
        };

        // Level par tap
        pathEl.addEventListener('click', function(e) {
            var node = e.target.closest('.level-node');
            if (!node) return;
            var l = parseInt(node.getAttribute('data-level'), 10);
            if (l <= state.unlockedLevel) {
                startGame(l);
            } else {
                toast('🔒 Pehle Level ' + state.unlockedLevel + ' complete karo');
            }
        });

        // Neeche scroll karne par aur levels jodte jao (unlimited)
        pathEl.addEventListener('scroll', function() {
            if (pathEl.scrollTop + pathEl.clientHeight > pathEl.scrollHeight - 500) {
                appendRows(rowsRendered + 20);
            }
        });
    });
})();