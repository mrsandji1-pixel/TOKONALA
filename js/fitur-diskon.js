// ===================== FITUR DISKON (SIMPLE TOGGLE) =====================
var discountSettings = {
  diskonItemActive: true,
  diskonTotalActive: true
};

async function loadDiscountSettings() {
  var s = await getSettings();
  if (s.discount_config) {
    var config = s.discount_config;
    if (typeof config === 'string') {
      try { config = JSON.parse(config); } catch(e) { config = {}; }
    }
    discountSettings.diskonItemActive = config.diskon_item !== false;
    discountSettings.diskonTotalActive = config.diskon_total !== false;
  }
}

function isDiskonItemActive() { return discountSettings.diskonItemActive; }
function isDiskonTotalActive() { return discountSettings.diskonTotalActive; }

async function formPengaturanDiskon() {
  if (!currentUser || currentUser.role !== 'admin') {
    alert('Hanya admin yang dapat mengatur diskon');
    return;
  }
  
  await loadDiscountSettings();
  
  // Close existing fitur modal if open
  var existingModal = document.getElementById('fiturModal');
  if (existingModal) existingModal.remove();
  
  var modal = document.createElement('div');
  modal.id = 'diskonModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
  
  var html = '<div style="background:#fff;padding:20px;border-radius:12px;width:350px;max-height:85vh;overflow-y:auto;">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';
  html += '<h3 style="margin:0;">💰 Pengaturan Diskon</h3>';
  html += '<button class="btn btn-danger btn-sm" onclick="document.getElementById(\'diskonModal\').remove()">✕</button>';
  html += '</div>';
  
  // Diskon Item toggle
  html += '<div style="background:#f5f5f5;padding:12px;border-radius:8px;margin-bottom:12px;">';
  html += '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:0;">';
  html += '<input type="checkbox" id="diskonItemToggle" ' + (discountSettings.diskonItemActive ? 'checked' : '') + ' style="width:20px;height:20px;cursor:pointer;">';
  html += '<span><b>Diskon Item</b><br><small style="color:#666;">Tombol 💰 untuk diskon per item</small></span>';
  html += '</label>';
  html += '</div>';
  
  // Diskon Total toggle
  html += '<div style="background:#f5f5f5;padding:12px;border-radius:8px;margin-bottom:12px;">';
  html += '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:0;">';
  html += '<input type="checkbox" id="diskonTotalToggle" ' + (discountSettings.diskonTotalActive ? 'checked' : '') + ' style="width:20px;height:20px;cursor:pointer;">';
  html += '<span><b>Diskon Total</b><br><small style="color:#666;">Tombol 💰 Diskon Lagi untuk total transaksi</small></span>';
  html += '</label>';
  html += '</div>';
  
  // Add Grosir Diskon section if feature is active
  if (activeFeatures && activeFeatures.grosir) {
    html += '<hr style="margin:16px 0;border:none;border-top:1px solid #e0e0e0;">';
    html += '<div style="background:#fff3e0;padding:12px;border-radius:8px;border:1px solid #ff9800;margin-bottom:12px;">';
    html += '<p style="margin:0 0 8px 0;"><b>🔥 Grosir Diskon</b></p>';
    html += '<p style="margin:0 0 8px 0;font-size:12px;color:#666;">Diskon grosir diatur per produk melalui form produk (bagian "Harga Grosir").</p>';
    html += '<button class="btn btn-sm" onclick="bukaFormGrosir()" style="background:#ff9800;color:white;margin-top:8px;width:100%;">📝 Atur Grosir Diskon</button>';
    html += '</div>';
  }
  
  // Action buttons
  html += '<div style="display:flex;gap:8px;margin-top:16px;">';
  html += '<button class="btn" onclick="simpanDiskon()" style="flex:1;background:#009688;color:white;">💾 Simpan</button>';
  html += '<button class="btn btn-danger" onclick="document.getElementById(\'diskonModal\').remove()">Batal</button>';
  html += '</div>';
  
  html += '</div>';
  
  modal.innerHTML = html;
  document.body.appendChild(modal);
}

// Function to open grosir form from diskon modal
function bukaFormGrosir() {
  // Close diskon modal
  var diskonModal = document.getElementById('diskonModal');
  if (diskonModal) diskonModal.remove();
  
  // Open grosir settings
  if (typeof formPengaturanGrosir === 'function') {
    formPengaturanGrosir();
  } else {
    // Fallback if function doesn't exist
    alert('🔥 Grosir Diskon diatur per produk melalui form produk.\n\nBuka Inventory → pilih produk → atur bagian "Harga Grosir".');
  }
}

async function simpanDiskon() {
  var itemActive = document.getElementById('diskonItemToggle').checked;
  var totalActive = document.getElementById('diskonTotalToggle').checked;
  
  discountSettings.diskonItemActive = itemActive;
  discountSettings.diskonTotalActive = totalActive;
  
  await updateSettings({
    discount_config: {
      diskon_item: itemActive,
      diskon_total: totalActive
    }
  });
  
  document.getElementById('diskonModal').remove();
  alert('✅ Pengaturan diskon disimpan');
  
  // Refresh UI if needed
  if (typeof aturHakAkses === 'function') {
    aturHakAkses();
  }
}

async function setupDiskonModal(containerId) {
  var container = document.getElementById(containerId);
  await loadDiscountSettings();
  
  var isAdminUser = currentUser && currentUser.role === 'admin';
  
  var html = '';
  if (isAdminUser) {
    html += '<button class="btn" onclick="formPengaturanDiskon()">⚙️ Atur Diskon</button>';
  }
  
  html += '<div style="margin-top:12px;background:#f5f5f5;padding:12px;border-radius:8px;">';
  html += '<p>💲 <b>Diskon Item:</b> ' + (discountSettings.diskonItemActive ? '✅ Aktif' : '❌ Nonaktif') + '</p>';
  html += '<p>💲 <b>Diskon Total:</b> ' + (discountSettings.diskonTotalActive ? '✅ Aktif' : '❌ Nonaktif') + '</p>';
  
  // Show grosir status if feature is active
  if (activeFeatures && activeFeatures.grosir) {
    html += '<p>🔥 <b>Grosir Diskon:</b> ✅ Aktif</p>';
  }
  
  html += '</div>';
  container.innerHTML = html;
}