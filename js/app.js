// ===================== APP.JS - FINAL =====================

document.addEventListener('DOMContentLoaded', function() {
  var loginOverlay = document.getElementById('loginOverlay');
  if (loginOverlay && loginOverlay.parentElement !== document.body) {
    document.body.appendChild(loginOverlay);
    console.log('Login overlay dipindahkan ke body');
  }
  
  var modals = document.querySelectorAll('.overlay, .setting-modal');
  modals.forEach(function(modal) {
    if (modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }
  });
  
  var modalIds = ['editUserModal', 'productDetailModal', 'pesananModal', 'labelPrintModal'];
  modalIds.forEach(function(id) {
    var modal = document.getElementById(id);
    if (modal && modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }
  });
});

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
    
    // Cegah non-admin akses fitur
    if (b.dataset.page === 'fitur' && currentUser.role !== 'admin') {
      return;
    }
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active'));
    
    var pageEl = document.getElementById('page-' + b.dataset.page);
    if (pageEl) {
      pageEl.classList.add('active');
    }
    b.classList.add('active');
    activeTab = b.dataset.page;
    
    if (activeTab === 'laporan') { 
      if (typeof setDefaultDateFilter === 'function') setDefaultDateFilter(); 
      if (typeof muatLaporan === 'function') muatLaporan(); 
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
  var loginOverlay = document.getElementById('loginOverlay');
  if (loginOverlay && loginOverlay.parentElement !== document.body) {
    document.body.appendChild(loginOverlay);
  }
  
  var modalIds = ['editUserModal', 'productDetailModal', 'pesananModal', 'labelPrintModal'];
  modalIds.forEach(function(id) {
    var modal = document.getElementById(id);
    if (modal && modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }
  });
  
  checkSession();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

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

window.addEventListener('error', function(e) {
  console.error('Global error:', e.message, e.filename, e.lineno);
});

window.addEventListener('unhandledrejection', function(e) {
  console.error('Unhandled promise rejection:', e.reason);
});