// ===================== FITUR PESANAN - FIXED VERSION =====================
var pesananSettings = {
  simpanPesananActive: true,
  pesananTersimpanActive: true
};

async function loadPesananSettings() {
  try {
    var s = await getSettings();
    if (s.pesanan_config) {
      var config = s.pesanan_config;
      if (typeof config === 'string') {
        try { config = JSON.parse(config); } catch(e) { config = {}; }
      }
      pesananSettings.simpanPesananActive = config.simpan_pesanan !== false;
      pesananSettings.pesananTersimpanActive = config.pesanan_tersimpan !== false;
    }
  } catch(e) {
    pesananSettings.simpanPesananActive = true;
    pesananSettings.pesananTersimpanActive = true;
  }
}

function isSimpanPesananActive() { return pesananSettings.simpanPesananActive; }
function isPesananTersimpanActive() { return pesananSettings.pesananTersimpanActive; }

async function formPengaturanPesanan() {
  if (!currentUser || currentUser.role !== 'admin') {
    alert('Hanya admin yang dapat mengatur pesanan');
    return;
  }
  
  await loadPesananSettings();
  
  // Close existing modal
  var existingModal = document.getElementById('pesananModalConfig');
  if (existingModal) existingModal.remove();
  
  var modal = document.createElement('div');
  modal.id = 'pesananModalConfig';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
  
  var html = '<div style="background:#fff;padding:20px;border-radius:12px;width:350px;">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';
  html += '<h3 style="margin:0;">📋 Pengaturan Pesanan</h3>';
  html += '<button class="btn btn-danger btn-sm" onclick="document.getElementById(\'pesananModalConfig\').remove()">✕</button>';
  html += '</div>';
  
  html += '<div style="background:#f5f5f5;padding:12px;border-radius:8px;margin-bottom:12px;">';
  html += '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:0;">';
  html += '<input type="checkbox" id="simpanPesananToggle" ' + (pesananSettings.simpanPesananActive ? 'checked' : '') + ' style="width:20px;height:20px;cursor:pointer;">';
  html += '<span><b>Simpan Pesanan</b><br><small style="color:#666;">Tombol 💾 Simpan Pesanan di transaksi</small></span>';
  html += '</label>';
  html += '</div>';
  
  html += '<div style="background:#f5f5f5;padding:12px;border-radius:8px;margin-bottom:12px;">';
  html += '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:0;">';
  html += '<input type="checkbox" id="pesananTersimpanToggle" ' + (pesananSettings.pesananTersimpanActive ? 'checked' : '') + ' style="width:20px;height:20px;cursor:pointer;">';
  html += '<span><b>Pesanan Tersimpan</b><br><small style="color:#666;">Tombol 📋 Pesanan Tersimpan di transaksi</small></span>';
  html += '</label>';
  html += '</div>';
  
  html += '<div style="display:flex;gap:8px;margin-top:12px;">';
  html += '<button class="btn" onclick="simpanPesananConfig()" style="flex:1;background:#009688;color:white;">💾 Simpan</button>';
  html += '<button class="btn btn-danger" onclick="document.getElementById(\'pesananModalConfig\').remove()">Batal</button>';
  html += '</div></div>';
  
  modal.innerHTML = html;
  document.body.appendChild(modal);
}

async function simpanPesananConfig() {
  var simpanActive = document.getElementById('simpanPesananToggle').checked;
  var tersimpanActive = document.getElementById('pesananTersimpanToggle').checked;
  
  pesananSettings.simpanPesananActive = simpanActive;
  pesananSettings.pesananTersimpanActive = tersimpanActive;
  
  await updateSettings({
    pesanan_config: {
      simpan_pesanan: simpanActive,
      pesanan_tersimpan: tersimpanActive
    }
  });
  
  var modal = document.getElementById('pesananModalConfig');
  if (modal) modal.remove();
  
  alert('✅ Pengaturan pesanan disimpan');
  
  // Refresh pesanan buttons on transaksi page
  if (typeof renderPesananButtons === 'function') {
    renderPesananButtons();
  }
}

// FIXED: This is the function that fitur-loader.js calls
async function setupModal_pesanan(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  
  await loadPesananSettings();
  
  var isAdminUser = currentUser && currentUser.role === 'admin';
  
  var html = '';
  if (isAdminUser) {
    html += '<button class="btn" onclick="formPengaturanPesanan()">⚙️ Atur Pesanan</button>';
  }
  
  html += '<div style="margin-top:12px;background:#f5f5f5;padding:12px;border-radius:8px;">';
  html += '<p>📋 <b>Simpan Pesanan:</b> ' + (pesananSettings.simpanPesananActive ? '✅ Aktif' : '❌ Nonaktif') + '</p>';
  html += '<p>📋 <b>Pesanan Tersimpan:</b> ' + (pesananSettings.pesananTersimpanActive ? '✅ Aktif' : '❌ Nonaktif') + '</p>';
  html += '</div>';
  container.innerHTML = html;
}

// For backward compatibility
async function setupPesananModal(containerId) {
  await setupModal_pesanan(containerId);
}