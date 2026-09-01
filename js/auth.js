// ===================== AUTH.JS - FORCE LOGIN FIX =====================

var SALT_PREFIX = 'RDNPS_';
var MAX_LOGIN_ATTEMPTS = 5;
var LOCKOUT_MINUTES = 15;
var ADMIN_HASH = null;

// ===================== FORCE LOGIN - Override Session Check =====================
window.checkSession = function() {
  console.log('⚠️ Session check disabled - forcing login page');
  
  // Clear any existing session
  localStorage.removeItem('rodanpos_session');
  localStorage.removeItem('cachedProducts');
  localStorage.removeItem('cachedSettings');
  localStorage.removeItem('lastReportSent');
  localStorage.removeItem('lastReportSchedule');
  
  // Reset currentUser
  window.currentUser = null;
  
  // Show login overlay
  var login = document.getElementById('loginOverlay');
  if (login) {
    login.style.display = 'flex';
    login.style.visibility = 'visible';
    login.style.opacity = '1';
    login.style.zIndex = '99999';
    login.style.position = 'fixed';
    login.style.top = '0';
    login.style.left = '0';
    login.style.width = '100%';
    login.style.height = '100%';
    login.style.background = 'rgba(0,0,0,0.5)';
    login.style.backdropFilter = 'blur(2px)';
  } else {
    console.error('Login overlay not found!');
  }
  
  // Hide all other modals
  document.querySelectorAll('.overlay, .modal, .setting-modal').forEach(function(el) {
    if (el.id !== 'loginOverlay') {
      el.style.display = 'none';
      el.style.visibility = 'hidden';
    }
  });
  
  // Hide label printer modal specifically
  var labelModal = document.getElementById('labelPrintModal');
  if (labelModal) {
    labelModal.style.display = 'none';
    labelModal.style.visibility = 'hidden';
  }
  
  // Clear login error
  var errorEl = document.getElementById('loginError');
  if (errorEl) {
    errorEl.textContent = '';
  }
  
  // Focus on username field
  setTimeout(function() {
    var userInput = document.getElementById('loginUser');
    if (userInput) {
      userInput.focus();
    }
  }, 200);
  
  console.log('✅ Login page forced!');
  return false;
};

// Override initApp
window.initApp = function() {
  console.log('initApp called - forcing login');
  checkSession();
};

// ===================== HASH PASSWORD =====================
async function hashPassword(password) {
  var salted = SALT_PREFIX + password + SALT_PREFIX.split('').reverse().join('');
  if (window.crypto && crypto.subtle) {
    var encoder = new TextEncoder();
    var hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(salted));
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  var hash = 0;
  for (var i = 0; i < salted.length; i++) { 
    hash = ((hash << 5) - hash) + salted.charCodeAt(i); 
    hash |= 0; 
  }
  return 'fallback_' + Math.abs(hash).toString(16);
}

// ===================== LOGIN ATTEMPTS =====================
function getLoginAttempts() {
  try { 
    return JSON.parse(localStorage.getItem('login_attempts') || '{"count":0,"lockedUntil":null}'); 
  } catch(e) { 
    return { count: 0, lockedUntil: null }; 
  }
}

function recordFailedAttempt() {
  var attempts = getLoginAttempts();
  attempts.count++;
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    attempts.lockedUntil = Date.now() + (LOCKOUT_MINUTES * 60 * 1000);
    localStorage.setItem('login_attempts', JSON.stringify(attempts));
    return { locked: true, remainingMinutes: LOCKOUT_MINUTES };
  }
  localStorage.setItem('login_attempts', JSON.stringify(attempts));
  return { locked: false, remainingAttempts: MAX_LOGIN_ATTEMPTS - attempts.count };
}

function resetLoginAttempts() {
  localStorage.setItem('login_attempts', JSON.stringify({ count: 0, lockedUntil: null }));
}

function isAccountLocked() {
  var attempts = getLoginAttempts();
  if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
    var remainingMs = attempts.lockedUntil - Date.now();
    return { locked: true, remainingMinutes: Math.ceil(remainingMs / 60000) };
  }
  if (attempts.lockedUntil && Date.now() >= attempts.lockedUntil) {
    resetLoginAttempts();
  }
  return { locked: false, remainingMinutes: 0 };
}

// ===================== LOGIN FUNCTION =====================
async function login() {
  var u = document.getElementById('loginUser').value.trim();
  var p = document.getElementById('loginPass').value;
  var errorEl = document.getElementById('loginError');
  
  if (!u || !p) { 
    errorEl.textContent = 'Mohon isi username dan password'; 
    return; 
  }
  
  var lockStatus = isAccountLocked();
  if (lockStatus.locked) {
    errorEl.textContent = 'Akun terkunci. Tunggu ' + lockStatus.remainingMinutes + ' menit.';
    return;
  }
  
  errorEl.textContent = '';
  clearAllCaches();
  
  try {
    var result = await supabaseClient.from('users').select('*').eq('username', u).single();
    var user = result.data;
    var error = result.error;
    
    if (error || !user) {
      var ar = recordFailedAttempt();
      errorEl.textContent = ar.locked ? 'Akun terkunci selama ' + LOCKOUT_MINUTES + ' menit.' : 'Username atau password salah. Sisa: ' + ar.remainingAttempts;
      return;
    }
    
    var inputHash = await hashPassword(p);
    if (user.password_hash !== inputHash) {
      var ar2 = recordFailedAttempt();
      errorEl.textContent = ar2.locked ? 'Akun terkunci selama ' + LOCKOUT_MINUTES + ' menit.' : 'Username atau password salah. Sisa: ' + ar2.remainingAttempts;
      return;
    }
    
    resetLoginAttempts();
    
    await supabaseClient.from('users').update({ last_login: new Date().toISOString() }).eq('username', u);
    
    currentUser = { 
      username: user.username, 
      role: user.role, 
      store_id: user.store_id, 
      login_time: Date.now() 
    };
    saveSession();
    updateActiveUserDisplay();
    
    // Hide login overlay
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
    
    applyRoleRestrictions();
    await muatProfilToko();
    tampilkanUserList();
    setupTransaksi();
    setupInventory();
    refreshProductList();
    setDefaultDateFilter();
    if (activeTab === 'laporan') muatLaporan();
    aturHakAkses();
    
    if (typeof loadFeatures === 'function') {
      await loadFeatures();
    }
    
    setTimeout(function() { if (typeof checkAutoEmailReport === 'function') checkAutoEmailReport(); }, 2000);
    setTimeout(function() { if (typeof checkLowStockBanner === 'function') checkLowStockBanner(); }, 1500);
    
    resetInactivityTimer();

    if (typeof initOfflineMode === 'function') {
      initOfflineMode();
    }

    startSessionTracking();
    
    // Fix inputs after login
    if (typeof fixInputsAfterLogin === 'function') {
      fixInputsAfterLogin();
    }

  } catch(err) {
    errorEl.textContent = 'Error koneksi. Coba lagi.';
    console.error('Login error:', err);
  }
}

// ===================== SESSION FUNCTIONS =====================
function saveSession() {
  if (!currentUser) return;
  var session = {
    username: currentUser.username, 
    role: currentUser.role,
    store_id: currentUser.store_id, 
    login_time: currentUser.login_time,
    expires_at: Date.now() + (8 * 60 * 60 * 1000)
  };
  try {
    var encoded = btoa(unescape(encodeURIComponent(JSON.stringify(session))));
    localStorage.setItem('rodanpos_session', encoded);
  } catch(e) {
    console.error('Save session error:', e);
  }
}

function clearSession() { 
  localStorage.removeItem('rodanpos_session'); 
}

function getSession() {
  try {
    var encoded = localStorage.getItem('rodanpos_session');
    if (!encoded) return null;
    var decoded = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    if (decoded.expires_at && Date.now() > decoded.expires_at) { 
      clearSession(); 
      return null; 
    }
    return decoded;
  } catch(e) { 
    clearSession(); 
    return null; 
  }
}

// ===================== CHECK SESSION (FORCED LOGIN) =====================
// This function is already overridden above, but keep this for reference
function checkSessionOriginal() {
  console.log('⚠️ Session check disabled - forcing login page');
  
  localStorage.removeItem('rodanpos_session');
  window.currentUser = null;
  
  var login = document.getElementById('loginOverlay');
  if (login) {
    login.style.display = 'flex';
    login.style.visibility = 'visible';
    login.style.opacity = '1';
    login.style.zIndex = '99999';
  }
  
  document.querySelectorAll('.overlay, .modal, .setting-modal').forEach(function(el) {
    if (el.id !== 'loginOverlay') {
      el.style.display = 'none';
    }
  });
  
  var labelModal = document.getElementById('labelPrintModal');
  if (labelModal) {
    labelModal.style.display = 'none';
  }
  
  return false;
}

// ===================== LOGOUT =====================
function logout() {
  stopSessionTracking();
  
  if (inactivityTimer) clearTimeout(inactivityTimer);
  clearSession(); 
  currentUser = null; 
  clearAllCaches();
  
  // Clear all displayed data
  var el;
  el = document.querySelector('#cartTable tbody'); if (el) el.innerHTML = '';
  el = document.querySelector('#reportTable tbody'); if (el) el.innerHTML = '';
  el = document.querySelector('#productListTable tbody'); if (el) el.innerHTML = '';
  el = document.getElementById('totalTransaksi'); if (el) el.textContent = '0';
  el = document.getElementById('totalPendapatan'); if (el) el.textContent = 'Rp 0';
  el = document.getElementById('productCount'); if (el) el.textContent = '0';
  if (typeof chartInstance !== 'undefined' && chartInstance) { chartInstance.destroy(); chartInstance = null; }
  if (typeof topProductsChart !== 'undefined' && topProductsChart) { topProductsChart.destroy(); topProductsChart = null; }
  el = document.getElementById('lowStockBanner'); if (el) el.style.display = 'none';
  el = document.getElementById('lowStockAlert'); if (el) el.style.display = 'none';
  
  ['scanInputTrans','custName','invSearch','searchProduct','prodBarcode','prodNama','prodKategori','prodKeterangan','prodLokasi','prodHargaBeli','prodHargaJual','perubahanStok','bayar','newUsername','newPassword'].forEach(function(id){
    var i = document.getElementById(id);
    if(i) i.value = '';
  });
  
  var d = document.getElementById('activeUserDisplay');
  if(d) d.textContent = '-';
  var r = document.getElementById('activeUserRole');
  if(r) r.textContent = '-';
  
  document.querySelectorAll('.tab-btn').forEach(function(b){b.style.display = '';});
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  document.getElementById('page-transaksi').classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
  var tt = document.querySelector('.tab-btn[data-page="transaksi"]');
  if(tt) tt.classList.add('active');
  activeTab = 'transaksi';
  
  // Show login overlay
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').textContent = '';
}

// ===================== CLEAR CACHES =====================
function clearAllCaches() {
  localStorage.removeItem('cachedProducts'); 
  localStorage.removeItem('cachedSettings');
  localStorage.removeItem('lastReportSent'); 
  localStorage.removeItem('lastReportSchedule');
  if (typeof lastSyncTime !== 'undefined') lastSyncTime = 0;
  if (typeof cacheTimestamp !== 'undefined') cacheTimestamp = null;
  if (typeof cachedProducts !== 'undefined') cachedProducts = null;
  if (typeof cart !== 'undefined') cart = [];
  if (typeof totalDiskonValue !== 'undefined') totalDiskonValue = 0;
  if (typeof bayarValue !== 'undefined') bayarValue = 0;
  if (typeof invalidateSettingsCache === 'function') invalidateSettingsCache();
  if (typeof appSettings !== 'undefined') appSettings = {};
  if (typeof window.cachedSettings !== 'undefined') window.cachedSettings = null;
}

// ===================== UPDATE DISPLAY =====================
function updateActiveUserDisplay() {
  var d = document.getElementById('activeUserDisplay');
  var r = document.getElementById('activeUserRole');
  if(d && currentUser) d.textContent = currentUser.username;
  if(r && currentUser){
    var n = {admin:'Admin', kasir:'Kasir', staff:'User', gudang:'Gudang'};
    r.textContent = n[currentUser.role] || currentUser.role;
  }
}

function clearAllDisplayedData() {
  var el;
  el = document.querySelector('#cartTable tbody'); if(el) el.innerHTML = '';
  el = document.querySelector('#reportTable tbody'); if(el) el.innerHTML = '';
  el = document.querySelector('#productListTable tbody'); if(el) el.innerHTML = '';
  el = document.getElementById('totalTransaksi'); if(el) el.textContent = '0';
  el = document.getElementById('totalPendapatan'); if(el) el.textContent = 'Rp 0';
  el = document.getElementById('productCount'); if(el) el.textContent = '0';
  if(typeof chartInstance !== 'undefined' && chartInstance){ chartInstance.destroy(); chartInstance = null; }
  if(typeof topProductsChart !== 'undefined' && topProductsChart){ topProductsChart.destroy(); topProductsChart = null; }
  el = document.getElementById('lowStockBanner'); if(el) el.style.display = 'none';
  el = document.getElementById('lowStockAlert'); if(el) el.style.display = 'none';
  ['scanInputTrans','custName','invSearch','searchProduct','prodBarcode','prodNama','prodKategori','prodKeterangan','prodLokasi','prodHargaBeli','prodHargaJual','perubahanStok','bayar'].forEach(function(id){
    var i = document.getElementById(id);
    if(i) i.value = '';
  });
  el = document.getElementById('searchResults'); if(el){ el.innerHTML = ''; el.style.display = 'none'; }
  el = document.getElementById('productForm'); if(el) el.style.display = 'none';
  el = document.getElementById('fotoPreviewContainer'); if(el) el.style.display = 'none';
  if(typeof invalidateSettingsCache === 'function') invalidateSettingsCache();
  if(typeof appSettings !== 'undefined') appSettings = {};
  if(typeof window.cachedSettings !== 'undefined') window.cachedSettings = null;
}

// ===================== ROLE RESTRICTIONS =====================
function applyRoleRestrictions() {
  var role = currentUser ? currentUser.role : '';
  var tT = document.querySelector('.tab-btn[data-page="transaksi"]');
  var tI = document.querySelector('.tab-btn[data-page="inventory"]');
  var tL = document.querySelector('.tab-btn[data-page="laporan"]');
  var tS = document.querySelector('.tab-btn[data-page="setting"]');
  
  if(tT) tT.style.display = '';
  if(tI) tI.style.display = '';
  if(tL) tL.style.display = '';
  if(tS) tS.style.display = '';
  
  if(role === 'gudang'){
    if(tT) tT.style.display = 'none';
    if(tL) tL.style.display = 'none';
    if(tS) tS.style.display = 'none';
    document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
    document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
    if(tI) tI.classList.add('active');
    var iP = document.getElementById('page-inventory');
    if(iP) iP.classList.add('active');
    activeTab = 'inventory';
  }
  else if(role === 'staff'){
    if(tI) tI.style.display = 'none';
    if(tL) tL.style.display = 'none';
    if(tS) tS.style.display = 'none';
    document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
    document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
    if(tT) tT.classList.add('active');
    var tP = document.getElementById('page-transaksi');
    if(tP) tP.classList.add('active');
    activeTab = 'transaksi';
  }
  
  var fiturSection = document.getElementById('fiturSection');
  if (fiturSection) {
    fiturSection.style.display = (role === 'admin') ? 'block' : 'none';
  }
}

// ===================== INACTIVITY TIMER =====================
var inactivityTimer = null;

function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(function() { 
    logout(); 
    alert('Logout otomatis karena tidak ada aktivitas.'); 
  }, 4 * 60 * 60 * 1000);
}

document.addEventListener('click', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);
document.addEventListener('touchstart', resetInactivityTimer);

// ===================== SESSION TRACKING =====================
var sessionPingInterval = null;

function startSessionTracking() {
  if (!currentUser || !currentUser.username) return;
  
  var uname = currentUser.username;
  var device = getDeviceInfo();
  var now = new Date().toISOString();
  
  supabaseClient.from('active_sessions').delete().eq('username', uname).then(function() {
    supabaseClient.from('active_sessions').insert({
      username: uname,
      role: currentUser.role,
      device: device,
      last_ping: now,
      is_active: true,
      login_time: now
    }).then(function(r) {
      console.log('Session insert:', r.error ? r.error.message : 'OK');
    });
  });
  
  if (sessionPingInterval) clearInterval(sessionPingInterval);
  sessionPingInterval = setInterval(function() {
    supabaseClient.from('active_sessions').update({
      last_ping: new Date().toISOString(),
      is_active: true
    }).eq('username', uname);
  }, 30000);
}

function getDeviceInfo() {
  var ua = navigator.userAgent;
  var browser = 'Unknown';
  var os = 'Unknown';
  
  if (ua.indexOf('Chrome') !== -1 && ua.indexOf('Edg') === -1) browser = 'Chrome';
  else if (ua.indexOf('Safari') !== -1) browser = 'Safari';
  else if (ua.indexOf('Firefox') !== -1) browser = 'Firefox';
  else if (ua.indexOf('Edg') !== -1) browser = 'Edge';
  
  if (ua.indexOf('Android') !== -1) os = 'Android';
  else if (ua.indexOf('iPhone') !== -1) os = 'iPhone';
  else if (ua.indexOf('Windows') !== -1) os = 'Windows';
  else if (ua.indexOf('Mac') !== -1) os = 'Mac';
  
  return browser + '/' + os;
}

function stopSessionTracking() {
  if (sessionPingInterval) {
    clearInterval(sessionPingInterval);
    sessionPingInterval = null;
  }
  
  if (currentUser && currentUser.username) {
    supabaseClient.from('active_sessions').update({
      is_active: false,
      last_ping: new Date().toISOString()
    }).eq('username', currentUser.username);
  }
}

// ===================== FIX INPUTS AFTER LOGIN =====================
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
    console.log('✅ Inputs fixed after login');
  }, 500);
}

// ===================== USER MANAGEMENT =====================
async function tambahUser() {
  if(!currentUser || currentUser.role !== 'admin') return;
  var u = document.getElementById('newUsername').value.trim();
  var p = document.getElementById('newPassword').value;
  var r = document.getElementById('newRole').value;
  if(!u || !p) return alert('Isi username dan password');
  
  var check = await supabaseClient.from('users').select('username').eq('username', u);
  if (check.data && check.data.length > 0) {
    alert('Username sudah digunakan!');
    return;
  }
  
  await supabaseClient.from('users').insert({
    username: u,
    password_hash: await hashPassword(p),
    role: r,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  tampilkanUserList();
  document.getElementById('newUsername').value = '';
  document.getElementById('newPassword').value = '';
  alert('✅ User ' + u + ' berhasil ditambahkan!');
}

async function hapusUser(username) {
  if(!currentUser || currentUser.role !== 'admin') return;
  if(username === 'admin') return alert('Admin tidak bisa dihapus');
  if(!confirm('Hapus user ' + username + '?')) return;
  await supabaseClient.from('users').delete().eq('username', username);
  tampilkanUserList();
}

function editUser(username) {
  if(!currentUser || currentUser.role !== 'admin') return;
  supabaseClient.from('users').select('*').eq('username', username).single().then(function(r){
    var u = r.data;
    if(!u) return;
    document.getElementById('editUsername').value = u.username;
    document.getElementById('editUsernameDisplay').value = u.username;
    document.getElementById('editRole').value = u.role;
    document.getElementById('editPassword').value = '';
    document.getElementById('editUserModal').style.display = 'flex';
  });
}

async function simpanEditUser() {
  var u = document.getElementById('editUsername').value;
  var p = document.getElementById('editPassword').value;
  var r = document.getElementById('editRole').value;
  var upd = { role: r, updated_at: new Date().toISOString() };
  if(p) upd.password_hash = await hashPassword(p);
  await supabaseClient.from('users').update(upd).eq('username', u);
  document.getElementById('editUserModal').style.display = 'none';
  tampilkanUserList();
  alert('✅ User ' + u + ' berhasil diupdate!');
}

async function tampilkanUserList() {
  if(!currentUser || currentUser.role !== 'admin'){
    var tbody = document.getElementById('userListBody');
    if(tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#90a4ae;">Admin only</td></tr>';
    return;
  }
  var r = await supabaseClient.from('users').select('*').order('username');
  var users = r.data;
  var tbody = document.getElementById('userListBody');
  if(!tbody) return;
  tbody.innerHTML = '';
  if(!users || !users.length){
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#90a4ae;">Belum ada user</td></tr>';
    return;
  }
  users.forEach(function(u){
    var row = tbody.insertRow();
    var h = '<td>' + u.username + '</td><td>' + u.role + '</td><td>';
    h += '<button class="btn-sm" onclick="editUser(\'' + u.username + '\')" style="padding:4px 8px;background:#2196f3;color:white;border:none;border-radius:4px;cursor:pointer;">✏️</button>';
    if(u.username !== 'admin') {
      h += ' <button class="btn-sm btn-danger" onclick="hapusUser(\'' + u.username + '\')" style="padding:4px 8px;background:#e53935;color:white;border:none;border-radius:4px;cursor:pointer;">🗑</button>';
    }
    h += '</td>';
    row.innerHTML = h;
  });
}

// ===================== SUPER ADMIN SESSIONS =====================
async function refreshSessions() {
  if (!currentUser || currentUser.role !== 'admin') return;
  
  try {
    var result = await supabaseClient.from('active_sessions')
      .select('*')
      .order('last_ping', { ascending: false });
    
    var sessions = result.data || [];
    var tbody = document.getElementById('sessionsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (sessions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Tidak ada sesi aktif</td></tr>';
      return;
    }
    
    sessions.forEach(function(s) {
      var now = new Date();
      var ping = new Date(s.last_ping);
      var diffMin = Math.floor((now - ping) / 60000);
      var status, statusColor;
      
      if (diffMin < 1 && s.is_active) { 
        status = '🟢 Online'; 
        statusColor = '#2e7d32'; 
      }
      else if (diffMin < 5 && s.is_active) { 
        status = '🟡 Idle'; 
        statusColor = '#f57f17'; 
      }
      else { 
        status = '🔴 Offline'; 
        statusColor = '#c62828'; 
      }
      
      var row = tbody.insertRow();
      row.innerHTML = 
        '<td>' + s.username + '</td>' +
        '<td>' + s.role + '</td>' +
        '<td>' + (s.device || '-') + '</td>' +
        '<td style="color:' + statusColor + ';font-weight:bold;">' + status + '</td>' +
        '<td style="font-size:11px;">' + (diffMin < 1 ? 'Baru saja' : diffMin + ' menit lalu') + '</td>' +
        '<td><button class="btn-sm btn-danger" onclick="forceDisconnect(\'' + s.username + '\')">🔌</button></td>';
    });
    
  } catch(e) {
    console.error('Failed to refresh sessions:', e);
  }
}

async function forceDisconnect(username) {
  if (!confirm('Putuskan ' + username + '?')) return;
  
  try {
    await supabaseClient.from('active_sessions').update({
      is_active: false,
      last_ping: new Date().toISOString()
    }).eq('username', username);
    
    alert('✅ ' + username + ' telah diputuskan.');
    refreshSessions();
  } catch(e) {
    alert('❌ Gagal: ' + e.message);
  }
}

async function disconnectAllUsers() {
  if (!confirm('⚠️ Putuskan SEMUA user? Mereka harus login ulang.')) return;
  
  try {
    await supabaseClient.from('active_sessions').update({
      is_active: false,
      last_ping: new Date().toISOString()
    }).neq('username', currentUser.username);
    
    alert('✅ Semua user diputuskan (kecuali Anda).');
    refreshSessions();
  } catch(e) {
    alert('❌ Gagal: ' + e.message);
  }
}

// ===================== DOM EVENTS =====================
document.addEventListener('DOMContentLoaded', function(){
  var lu = document.getElementById('loginUser');
  var lp = document.getElementById('loginPass');
  
  if(lu) {
    lu.addEventListener('input', function(){
      document.getElementById('loginError').textContent = '';
    });
    lu.addEventListener('keypress', function(e){
      if(e.key === 'Enter') {
        var lp2 = document.getElementById('loginPass');
        if(lp2) lp2.focus();
      }
    });
  }
  
  if(lp) {
    lp.addEventListener('input', function(){
      document.getElementById('loginError').textContent = '';
    });
    lp.addEventListener('keypress', function(e){
      if(e.key === 'Enter') login();
    });
  }
  
  // Force check session on load
  setTimeout(function() {
    checkSession();
  }, 100);
});

// ===================== EXPOSE FUNCTIONS TO GLOBAL =====================
window.login = login;
window.logout = logout;
window.hashPassword = hashPassword;
window.checkSession = checkSession;
window.fixInputsAfterLogin = fixInputsAfterLogin;
window.tambahUser = tambahUser;
window.hapusUser = hapusUser;
window.editUser = editUser;
window.simpanEditUser = simpanEditUser;
window.tampilkanUserList = tampilkanUserList;
window.refreshSessions = refreshSessions;
window.forceDisconnect = forceDisconnect;
window.disconnectAllUsers = disconnectAllUsers;
window.clearAllCaches = clearAllCaches;
window.updateActiveUserDisplay = updateActiveUserDisplay;
window.applyRoleRestrictions = applyRoleRestrictions;
window.resetInactivityTimer = resetInactivityTimer;
window.startSessionTracking = startSessionTracking;
window.stopSessionTracking = stopSessionTracking;
window.getDeviceInfo = getDeviceInfo;

console.log('✅ auth.js loaded - Login page forced!');