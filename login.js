// ============================================================
//  LOGIN PAGE - Email Only + Forgot Password Flow
// ============================================================

var forgotEmailValue = '';
var forgotOtpValue = '';

window.addEventListener('DOMContentLoaded', function() {
    setupPasswordToggles();
    setupButtons();
    setupInputs();
    setupForgotPassword();
});

// ---------- PASSWORD TOGGLES ----------
function setupPasswordToggles() {
    var eyeOpen = 'M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z';
    var eyeClosed = 'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z';

    function makeToggle(inputId, btnId, iconId) {
        var input = document.getElementById(inputId);
        var btn = document.getElementById(btnId);
        var icon = document.getElementById(iconId);
        if (!input || !btn || !icon) return;

        btn.addEventListener('click', function() {
            if (input.type === 'password') {
                input.type = 'text';
                icon.querySelector('path').setAttribute('d', eyeClosed);
                btn.classList.add('active');
            } else {
                input.type = 'password';
                icon.querySelector('path').setAttribute('d', eyeOpen);
                btn.classList.remove('active');
            }
        });
    }

    makeToggle('passwordInput', 'togglePassword', 'eyeIcon');
    makeToggle('newPassword', 'toggleNewPassword', 'eyeIconNew');
    makeToggle('confirmNewPassword', 'toggleConfirmNewPassword', 'eyeIconConfirmNew');
}

function setupInputs() {
    var emailInput = document.getElementById('emailInput');
    var pwInput = document.getElementById('passwordInput');

    emailInput.addEventListener('input', hideMessages);
    pwInput.addEventListener('input', hideMessages);

    emailInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleLogin();
    });
    pwInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleLogin();
    });
}

function setupButtons() {
    document.getElementById('btnLogin').onclick = handleLogin;
    document.getElementById('forgotPassword').onclick = function(e) {
        e.preventDefault();
        openForgotModal();
    };
}

// ============================================================
//  LOGIN HANDLER
// ============================================================
async function handleLogin() {
    hideMessages();

    var email = document.getElementById('emailInput').value.trim();
    var password = document.getElementById('passwordInput').value;

    if (!email) { showError('Please enter your email address'); return; }
    if (!password) { showError('Please enter password'); return; }
    if (password.length < 6) { showError('Password must be at least 6 characters'); return; }

    var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isEmail) { showError('Please enter a valid email address'); return; }

    var btn = document.getElementById('btnLogin');
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'LOGGING IN...';

    try {
        await window.AuthAPI.login(email, password);

        showSuccess('Login successful! Redirecting...');

        setTimeout(function() {
            // Login successful, go to splash
            window.location.href = 'splash.html';
        }, 800);

    } catch (err) {
        showError(err.message);
        btn.disabled = false;
        btn.querySelector('.btn-text').textContent = 'LOGIN';
    }
}

// ============================================================
//  FORGOT PASSWORD FLOW
// ============================================================
function openForgotModal() {
    document.getElementById('forgotStep1').style.display = 'block';
    document.getElementById('forgotStep2').style.display = 'none';
    document.getElementById('forgotStep3').style.display = 'none';
    document.getElementById('forgotStep4').style.display = 'none';

    document.getElementById('forgotEmail').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmNewPassword').value = '';
    document.querySelectorAll('#forgotOtpInputs .otp-box').forEach(function(b) {
        b.value = '';
        b.classList.remove('filled');
    });

    ['forgotError1', 'forgotError2', 'forgotError3'].forEach(function(id) {
        document.getElementById(id).classList.add('hidden');
    });

    var loginEmail = document.getElementById('emailInput').value.trim();
    if (loginEmail) document.getElementById('forgotEmail').value = loginEmail;

    document.getElementById('forgotModal').classList.add('active');
}

function closeForgotModal() {
    document.getElementById('forgotModal').classList.remove('active');
}

function setupForgotPassword() {
    document.getElementById('closeForgot').onclick = closeForgotModal;
    document.getElementById('btnSendForgotOtp').onclick = handleSendForgotOtp;
    document.getElementById('btnVerifyForgotOtp').onclick = handleVerifyForgotOtp;
    document.getElementById('btnResendForgotOtp').onclick = handleResendForgotOtp;
    document.getElementById('btnResetPassword').onclick = handleResetPassword;
    document.getElementById('btnBackToLogin').onclick = function() {
        closeForgotModal();
    };

    var otpBoxes = document.querySelectorAll('#forgotOtpInputs .otp-box');
    otpBoxes.forEach(function(box, idx) {
        box.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 1);
            if (e.target.value) {
                box.classList.add('filled');
                if (idx < otpBoxes.length - 1) otpBoxes[idx + 1].focus();
            } else {
                box.classList.remove('filled');
            }
        });

        box.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !box.value && idx > 0) {
                otpBoxes[idx - 1].focus();
                otpBoxes[idx - 1].value = '';
                otpBoxes[idx - 1].classList.remove('filled');
            }
            if (e.key === 'Enter') handleVerifyForgotOtp();
        });

        box.addEventListener('paste', function(e) {
            e.preventDefault();
            var pasted = (e.clipboardData || window.clipboardData).getData('text');
            var digits = pasted.replace(/\D/g, '').slice(0, 6).split('');
            digits.forEach(function(d, i) {
                if (otpBoxes[i]) {
                    otpBoxes[i].value = d;
                    otpBoxes[i].classList.add('filled');
                }
            });
            if (digits.length < 6 && otpBoxes[digits.length]) otpBoxes[digits.length].focus();
        });
    });

    document.getElementById('forgotEmail').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleSendForgotOtp();
    });
}

async function handleSendForgotOtp() {
    var errEl = document.getElementById('forgotError1');
    errEl.classList.add('hidden');

    var email = document.getElementById('forgotEmail').value.trim();

    if (!email) {
        errEl.textContent = '⚠ Please enter your email address';
        errEl.classList.remove('hidden');
        return;
    }

    var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isEmail) {
        errEl.textContent = '⚠ Please enter a valid email address';
        errEl.classList.remove('hidden');
        return;
    }

    forgotEmailValue = email.toLowerCase();

    var btn = document.getElementById('btnSendForgotOtp');
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'SENDING...';

    try {
        await window.AuthAPI.forgotPassword(forgotEmailValue);

        document.getElementById('forgotOtpSubtitle').textContent =
            "Enter the 6-digit OTP sent to " + forgotEmailValue;

        document.getElementById('forgotStep1').style.display = 'none';
        document.getElementById('forgotStep2').style.display = 'block';

        setTimeout(function() {
            var first = document.querySelector('#forgotOtpInputs .otp-box');
            if (first) first.focus();
        }, 200);

    } catch (err) {
        errEl.textContent = '⚠ ' + err.message;
        errEl.classList.remove('hidden');
    }

    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'SEND OTP';
}

async function handleVerifyForgotOtp() {
    var errEl = document.getElementById('forgotError2');
    errEl.classList.add('hidden');

    var boxes = document.querySelectorAll('#forgotOtpInputs .otp-box');
    var entered = '';
    boxes.forEach(function(b) { entered += b.value; });

    if (entered.length !== 6) {
        errEl.textContent = '❌ Please enter all 6 digits';
        errEl.classList.remove('hidden');
        return;
    }

    forgotOtpValue = entered;

    document.getElementById('forgotStep2').style.display = 'none';
    document.getElementById('forgotStep3').style.display = 'block';

    setTimeout(function() {
        document.getElementById('newPassword').focus();
    }, 200);
}

async function handleResendForgotOtp() {
    var btn = document.getElementById('btnResendForgotOtp');
    var original = btn.textContent;
    btn.textContent = 'Sending...';
    btn.disabled = true;

    try {
        await window.AuthAPI.forgotPassword(forgotEmailValue);
        btn.textContent = '✓ New OTP sent!';
        btn.style.color = '#4ade80';

        document.querySelectorAll('#forgotOtpInputs .otp-box').forEach(function(b) {
            b.value = '';
            b.classList.remove('filled');
        });
        var first = document.querySelector('#forgotOtpInputs .otp-box');
        if (first) first.focus();

    } catch (err) {
        btn.textContent = '✗ Failed: ' + err.message;
        btn.style.color = '#f87171';
    }

    setTimeout(function() {
        btn.textContent = original;
        btn.style.color = '';
        btn.disabled = false;
    }, 2500);
}

async function handleResetPassword() {
    var errEl = document.getElementById('forgotError3');
    errEl.classList.add('hidden');

    var newPw = document.getElementById('newPassword').value;
    var confirmPw = document.getElementById('confirmNewPassword').value;

    if (!newPw) {
        errEl.textContent = '⚠ Please enter new password';
        errEl.classList.remove('hidden');
        return;
    }
    if (newPw.length < 6) {
        errEl.textContent = '⚠ Password must be at least 6 characters';
        errEl.classList.remove('hidden');
        return;
    }
    if (newPw !== confirmPw) {
        errEl.textContent = '⚠ Passwords do not match';
        errEl.classList.remove('hidden');
        return;
    }

    var btn = document.getElementById('btnResetPassword');
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'RESETTING...';

    try {
        await window.AuthAPI.resetPassword(forgotEmailValue, forgotOtpValue, newPw);

        document.getElementById('forgotStep3').style.display = 'none';
        document.getElementById('forgotStep4').style.display = 'block';

    } catch (err) {
        errEl.textContent = '❌ ' + err.message;
        errEl.classList.remove('hidden');
        btn.disabled = false;
        btn.querySelector('.btn-text').textContent = 'RESET PASSWORD';
    }
}

function showError(msg) {
    var el = document.getElementById('errorMsg');
    el.textContent = '⚠ ' + msg;
    el.classList.remove('hidden');
    el.style.animation = 'none';
    setTimeout(function() { el.style.animation = 'shake 0.4s ease'; }, 10);
    setTimeout(function() { el.classList.add('hidden'); }, 4000);
}

function showSuccess(msg) {
    var el = document.getElementById('successMsg');
    el.textContent = '✓ ' + msg;
    el.classList.remove('hidden');
}

function hideMessages() {
    document.getElementById('errorMsg').classList.add('hidden');
    document.getElementById('successMsg').classList.add('hidden');
}