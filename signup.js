// ============================================================
//  SIGNUP PAGE - Email Only
// ============================================================

var pendingUserData = null;

window.addEventListener('DOMContentLoaded', function() {
    setupPasswordToggles();
    setupButtons();
    setupInputs();
    setupOTPInputs();
});

function setupPasswordToggles() {
    var pwInput = document.getElementById('passwordInput');
    var pwToggle = document.getElementById('togglePassword');
    var pwIcon = document.getElementById('eyeIcon');

    var cpwInput = document.getElementById('confirmPasswordInput');
    var cpwToggle = document.getElementById('toggleConfirmPassword');
    var cpwIcon = document.getElementById('eyeIcon2');

    var eyeOpen = 'M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z';
    var eyeClosed = 'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z';

    function toggle(input, btn, icon) {
        if (input.type === 'password') {
            input.type = 'text';
            icon.querySelector('path').setAttribute('d', eyeClosed);
            btn.classList.add('active');
        } else {
            input.type = 'password';
            icon.querySelector('path').setAttribute('d', eyeOpen);
            btn.classList.remove('active');
        }
    }

    pwToggle.addEventListener('click', function() { toggle(pwInput, pwToggle, pwIcon); });
    cpwToggle.addEventListener('click', function() { toggle(cpwInput, cpwToggle, cpwIcon); });
}

function setupInputs() {
    ['nameInput', 'emailInput', 'passwordInput', 'confirmPasswordInput'].forEach(function(id) {
        var el = document.getElementById(id);
        el.addEventListener('input', hideMessages);
        el.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleSignup();
        });
    });
}

function setupButtons() {
    document.getElementById('btnSignup').onclick = handleSignup;
    document.getElementById('btnVerifyOtp').onclick = verifyOTP;
    document.getElementById('btnResendOtp').onclick = resendOTP;
    document.getElementById('btnCloseOtp').onclick = closeOTPModal;
}

async function handleSignup() {
    hideMessages();

    var name = document.getElementById('nameInput').value.trim();
    var email = document.getElementById('emailInput').value.trim();
    var password = document.getElementById('passwordInput').value;
    var confirmPassword = document.getElementById('confirmPasswordInput').value;

    if (!name) { showError('Please enter your name'); return; }
    if (name.length < 2) { showError('Name must be at least 2 characters'); return; }
    if (!email) { showError('Please enter your email address'); return; }

    var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isEmail) {
        showError('Please enter a valid email address');
        return;
    }

    if (!password) { showError('Please enter password'); return; }
    if (password.length < 6) { showError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { showError('Passwords do not match'); return; }

    pendingUserData = {
        name: name,
        email: email.toLowerCase(),
        password: password
    };

    var btn = document.getElementById('btnSignup');
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'SENDING OTP...';

    // ✅ TURANT OTP MODAL KHOLO (Backend response ka wait nahi karega)
    showOTPModal(email);

    try {
        await window.AuthAPI.sendOTP(name, email, password);
        btn.disabled = false;
        btn.querySelector('.btn-text').textContent = 'CREATE ACCOUNT';
    } catch (err) {
        showError(err.message);
        btn.disabled = false;
        btn.querySelector('.btn-text').textContent = 'CREATE ACCOUNT';
    }
}

function showOTPModal(email) {
    document.getElementById('otpSubtitle').textContent =
        'We\'ve sent a 6-digit OTP to ' + email;
    document.getElementById('otpModal').classList.add('active');

    document.querySelectorAll('.otp-box').forEach(function(box) {
        box.value = '';
        box.classList.remove('filled');
    });

    setTimeout(function() {
        var first = document.querySelector('.otp-box');
        if (first) first.focus();
    }, 200);

    document.getElementById('otpError').classList.add('hidden');
}

function setupOTPInputs() {
    var boxes = document.querySelectorAll('.otp-box');

    boxes.forEach(function(box, idx) {
        box.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 1);
            if (e.target.value) {
                box.classList.add('filled');
                if (idx < boxes.length - 1) boxes[idx + 1].focus();
            } else {
                box.classList.remove('filled');
            }
        });

        box.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !box.value && idx > 0) {
                boxes[idx - 1].focus();
                boxes[idx - 1].value = '';
                boxes[idx - 1].classList.remove('filled');
            }
            if (e.key === 'Enter') verifyOTP();
        });

        box.addEventListener('paste', function(e) {
            e.preventDefault();
            var pasted = (e.clipboardData || window.clipboardData).getData('text');
            var digits = pasted.replace(/\D/g, '').slice(0, 6).split('');
            digits.forEach(function(d, i) {
                if (boxes[i]) {
                    boxes[i].value = d;
                    boxes[i].classList.add('filled');
                }
            });
            if (digits.length < 6 && boxes[digits.length]) boxes[digits.length].focus();
            else verifyOTP();
        });
    });
}

async function verifyOTP() {
    var boxes = document.querySelectorAll('.otp-box');
    var entered = '';
    boxes.forEach(function(box) { entered += box.value; });

    if (entered.length !== 6) {
        document.getElementById('otpError').textContent = '❌ Please enter all 6 digits';
        document.getElementById('otpError').classList.remove('hidden');
        return;
    }

    var btn = document.getElementById('btnVerifyOtp');
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'VERIFYING...';

    try {
        await window.AuthAPI.verifyOTP(entered, pendingUserData.email);

        closeOTPModal();
        showSuccess('Account created! Redirecting...');

        setTimeout(function() {
            window.location.href = 'splash.html';
        }, 1000);

    } catch (err) {
        document.getElementById('otpError').textContent = '❌ ' + err.message;
        document.getElementById('otpError').classList.remove('hidden');
        btn.disabled = false;
        btn.querySelector('.btn-text').textContent = 'VERIFY OTP';
    }
}

async function resendOTP() {
    if (!pendingUserData) return;

    try {
        var btn = document.getElementById('btnResendOtp');
        btn.textContent = 'Sending...';
        
        await window.AuthAPI.sendOTP(
            pendingUserData.name,
            pendingUserData.email,
            pendingUserData.password
        );

        document.querySelectorAll('.otp-box').forEach(function(box) {
            box.value = '';
            box.classList.remove('filled');
        });
        var first = document.querySelector('.otp-box');
        if (first) first.focus();

        var original = 'Didn\'t receive? Resend OTP';
        btn.textContent = '✓ New OTP sent to your email!';
        btn.style.color = '#4ade80';
        setTimeout(function() {
            btn.textContent = original;
            btn.style.color = '';
        }, 3000);

    } catch (err) {
        alert('Failed to resend OTP: ' + err.message);
    }
}

function closeOTPModal() {
    document.getElementById('otpModal').classList.remove('active');
    document.querySelectorAll('.otp-box').forEach(function(box) {
        box.value = '';
        box.classList.remove('filled');
    });
    document.getElementById('otpError').classList.add('hidden');
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