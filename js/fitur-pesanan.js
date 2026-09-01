// ===================== FITUR PESANAN (TOGGLE) =====================
var pesananSettings = {
  simpanPesananActive: true,
  pesananTersimpanActive: true
};

async function loadPesananSettings() {
  var s = await getSettings();
  if (s.pesanan_config) {
    var config = s.pesanan_config;
    if (typeof config === 'string') {
      try { config = JSON.parse(config); } catch(e) { config = {}; }
    }
    pesananSettings.simpanPesananActive = config.simpan_pesanan !== false;
    pesananSettings.pesananTersimpanActive = config.pesanan_tersimpan !== false;
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
  
  var modal = document.createElement('div');
  modal.id = 'pesananModalConfig';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
  
  var html = '<div style="background:#fff;padding:20px;border-radius:12px;width:350px;">';
  html += '<h3>📋 Pengaturan Pesanan</h3>';
  html += '<label style="display:block;margin-bottom:8px;"><input type="checkbox" id="simpanPesananToggle" ' + (pesananSettings.simpanPesananActive ? 'checked' : '') + '> <b>Simpan Pesanan</b></label>';
  html += '<label style="display:block;margin-bottom:8px;"><input type="checkbox" id="pesananTersimpanToggle" ' + (pesananSettings.pesananTersimpanActive ? 'checked' : '') + '> <b>Pesanan Tersimpan</b></label>';
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
  
  document.getElementById('pesananModalConfig').remove();
  alert('✅ Pengaturan pesanan disimpan');
}

async function setupPesananModal(containerId) {
  var container = document.getElementById(containerId);
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