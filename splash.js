// 5 second ki loading line, phir home page
var progress = 0;
var fill = document.getElementById('progressFill');
var interval = setInterval(function() {
    progress += 2;
    if (progress > 100) progress = 100;
    fill.style.width = progress + '%';

    if (progress >= 100) {
        clearInterval(interval);
        if (window.cmTrace) window.cmTrace('splash finished -> index.html');
        setTimeout(function() {
            window.location.replace('index.html');
        }, 500);
    }
}, 100);