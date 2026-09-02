// ===================== APP.JS - FIXED VERSION =====================

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
    
    var pageEl = document.getElementById('page-' + b.dataset.page);
    if (pageEl) {
      pageEl.classList.add('active');
    }
    b.classList.add('active');
    activeTab = b.dataset.page;
    
    // FIXED: Handle each tab with proper checks
    if (activeTab === 'laporan') { 
      setDefaultDateFilter(); 
      muatLaporan(); 
    }
    if (activeTab === 'setting') { 
      if (typeof muatProfilToko === 'function') muatProfilToko(); 
      if (typeof tampilkanUserList === 'function') tampilkanUserList(); 
      if (typeof aturHakAkses === 'function') aturHakAkses(); 
      if (typeof loadFeatures === 'function') loadFeatures(); 
    }
    if (activeTab === 'fitur') { 
      if (typeof setupFiturPage === 'function') setupFiturPage(); 
    }
    if (activeTab === 'utang') { 
      if (typeof setupUtang === 'function') setupUtang(); 
    }
    if (activeTab === 'opname') { 
      if (typeof setupOpname === 'function') setupOpname(); 
    }
    if (activeTab === 'biaya') { 
      if (typeof setupBiaya === 'function') setupBiaya(); 
    }
    if (activeTab === 'multiuser') { 
      if (typeof setupMultiUser === 'function') setupMultiUser(); 
    }
    if (activeTab === 'emailstruk') { 
      if (typeof setupEmailStruk === 'function') setupEmailStruk(); 
    }
    if (activeTab === 'inventory') {
      if (typeof refreshProductList === 'function') refreshProductList();
    }
    if (activeTab === 'transaksi') {
      var scanInput = document.getElementById('scanInputTrans');
      if (scanInput) scanInput.focus();
      setTimeout(() => { 
        if (typeof checkLowStockBanner === 'function') checkLowStockBanner(); 
      }, 500);
    }
  });
});

function initApp() {
  checkSession();
}

// FIXED: Wait for DOM ready before init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// ===================== BACK BUTTON PREVENTION =====================
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

// ===================== ERROR HANDLING =====================
window.addEventListener('error', function(e) {
  console.error('Global error:', e.message, e.filename, e.lineno);
});

window.addEventListener('unhandledrejection', function(e) {
  console.error('Unhandled promise rejection:', e.reason);
});