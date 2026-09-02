// ===================== APP.JS =====================

// ===================== FIX INPUTS =====================
function fixInputsAfterLogin() {
  setTimeout(function() {
    var searchInput = document.getElementById('searchProduct');
    if (searchInput) {
      searchInput.disabled = false;
      searchInput.readOnly = false;
      searchInput.style.pointerEvents = 'auto';
    }
    var inputs = document.querySelectorAll('input[type="text"], input[type="number"], input[type="password"]');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].disabled = false;
      inputs[i].readOnly = false;
    }
  }, 500);
}

// ===================== HIDE LOGIN OVERLAY =====================
function hideLoginOverlay() {
  var loginOverlay = document.getElementById('loginOverlay');
  if (loginOverlay) {
    loginOverlay.style.display = 'none';
    loginOverlay.style.visibility = 'hidden';
    loginOverlay.style.opacity = '0';
    loginOverlay.style.pointerEvents = 'none';
    loginOverlay.style.zIndex = '-1';
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    registrations.forEach(function(registration) {
      registration.unregister();
    });
  });
}

let activeTab = 'transaksi';

document.querySelectorAll('.tab-btn').forEach(b => {
  b.addEventListener('click', () => {
    if (!currentUser) return;
    if (!b.dataset.page) return;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active'));
    document.getElementById('page-' + b.dataset.page).classList.add('active');
    b.classList.add('active');
    activeTab = b.dataset.page;
    if (activeTab === 'laporan') { setDefaultDateFilter(); muatLaporan(); }
    if (activeTab === 'setting') { muatProfilToko(); tampilkanUserList(); aturHakAkses(); loadFeatures(); }
    if (activeTab === 'fitur') { setupFiturPage(); }
    if (activeTab === 'utang') { if (typeof setupUtang === 'function') setupUtang(); }
    if (activeTab === 'opname') { if (typeof setupOpname === 'function') setupOpname(); }
    if (activeTab === 'biaya') { if (typeof setupBiaya === 'function') setupBiaya(); }
    if (activeTab === 'multiuser') { if (typeof setupMultiUser === 'function') setupMultiUser(); }
    if (activeTab === 'emailstruk') { if (typeof setupEmailStruk === 'function') setupEmailStruk(); }
    if (activeTab === 'inventory') refreshProductList();
    if (activeTab === 'transaksi') {
      document.getElementById('scanInputTrans').focus();
      setTimeout(() => { if (typeof checkLowStockBanner === 'function') checkLowStockBanner(); }, 500);
    }
  });
});

function initApp() {
  checkSession();
}
initApp();

let backCount = 0;
let backTimer = null;

history.pushState(null, '', location.href);

window.addEventListener('popstate', function(event) {
  history.pushState(null, '', location.href);
  backCount++;
  clearTimeout(backTimer);
  if (backCount === 1) {
    alert('ℹ️ Harap gunakan tombol LOGOUT\nuntuk keluar dari aplikasi');
  } else if (backCount === 2) {
    alert('⚠️ Tombol BACK tidak disarankan!\nSilakan tekan LOGOUT di pojok kanan atas');
  } else if (backCount === 3) {
    alert('⛔ Satu kali lagi aplikasi akan keluar paksa!\nGunakan LOGOUT untuk keluar dengan benar');
  } else if (backCount >= 4) {
    backCount = 0;
    clearTimeout(backTimer);
    history.back();
    return;
  }
  backTimer = setTimeout(function() { backCount = 0; }, 3000);
});

document.addEventListener('visibilitychange', function() {
  if (document.hidden) { backCount = 0; clearTimeout(backTimer); }
});

// ===================== EXPOSE FUNCTIONS =====================
window.fixInputsAfterLogin = fixInputsAfterLogin;
window.hideLoginOverlay = hideLoginOverlay;