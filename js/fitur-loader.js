// ===================== FITUR LOADER =====================
var activeFeatures = {};

async function loadFeatures() {
  try {
    var s = await getSettings();
    activeFeatures = s.features || {};
  } catch(e) {
    activeFeatures = {};
  }
  renderFiturCards();
  if (currentUser && currentUser.role === 'admin') {
    renderFiturToggles();
  }
  // Update button visibility
  updateVoucherButtonVisibility();
  updateLabelButtonVisibility();
  updateGrosirVisibility();
}

function setupFiturPage() {
  renderFiturCards();
}

function renderFiturCards() {
  var container = document.getElementById('fiturCards');
  if (!container) return;
  
  var features = [
    { key: 'utang', label: 'Customer Utang', icon: '💳', desc: 'Catat utang customer dan pembayaran' },
    { key: 'member', label: 'Customer Member', icon: '⭐', desc: 'Program loyalitas pelanggan' },
    { key: 'shift', label: 'Shift Karyawan', icon: '👥', desc: 'Kelola shift dan komisi' },
    { key: 'supplier', label: 'Supplier', icon: '📦', desc: 'Manajemen pemasok barang' },
    { key: 'biaya', label: 'Biaya Operasional', icon: '💰', desc: 'Catat pengeluaran harian' },
    { key: 'opname', label: 'Stock Opname', icon: '📋', desc: 'Hitung stok berkala' },
    { key: 'voucher', label: 'Voucher Diskon', icon: '🎟️', desc: 'Buat kode voucher promo' },
    { key: 'tax', label: 'Tax & Service', icon: '🧾', desc: 'Atur pajak dan biaya layanan' },
    { key: 'diskon', label: 'Manajemen Diskon', icon: '💲', desc: 'Atur diskon item, total & grosir' },
    { key: 'pesanan', label: 'Manajemen Pesanan', icon: '📝', desc: 'Atur tombol simpan pesanan' },
    { key: 'payment', label: 'Multi Payment', icon: '💳', desc: 'Atur metode pembayaran' },
    { key: 'multiuser', label: 'Multi User', icon: '👤', desc: 'Kelola banyak user' },
    { key: 'emailstruk', label: 'Email Struk', icon: '📧', desc: 'Kirim struk via email' },
    { key: 'whatsapp', label: 'WhatsApp', icon: '📱', desc: 'Kirim struk via WhatsApp' },
    { key: 'label', label: 'Label Printer', icon: '🏷️', desc: 'Cetak label harga produk' }
  ];
  
  if (currentUser && currentUser.role === 'admin') {
    features.push({ key: 'superadmin', label: 'Super Admin', icon: '🛡️', desc: 'Pantau sesi user aktif', alwaysActive: true });
  }
  
  var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:12px;">';
  
  features.forEach(function(f) {
    var isActive = f.alwaysActive || activeFeatures[f.key];
    var cardStyle = isActive 
      ? 'border:2px solid #009688;background:#e0f2f1;cursor:pointer;' 
      : 'border:2px solid #e0e0e0;background:#f5f5f5;opacity:0.6;';
    
    html += '<div style="' + cardStyle + 'border-radius:12px;padding:16px;text-align:center;" onclick="' + (isActive ? "bukaFitur('" + f.key + "')" : '') + '">';
    html += '<div style="font-size:32px;">' + f.icon + '</div>';
    html += '<div style="font-weight:bold;margin-top:8px;">' + f.label + '</div>';
    html += '<div style="font-size:11px;color:#666;margin-top:4px;">' + f.desc + '</div>';
    html += '<div style="margin-top:8px;font-size:11px;font-weight:bold;color:' + (isActive ? '#009688' : '#999') + ';">' + (isActive ? '✓ AKTIF' : 'NONAKTIF') + '</div>';
    html += '</div>';
  });
  
  html += '</div>';
  container.innerHTML = html;
}

function bukaFitur(key) {
  var featureInfo = {
    'utang': { title: '💳 Customer Utang', icon: '💳' },
    'member': { title: '⭐ Customer Member', icon: '⭐' },
    'shift': { title: '👥 Shift Karyawan', icon: '👥' },
    'supplier': { title: '📦 Supplier', icon: '📦' },
    'biaya': { title: '💰 Biaya Operasional', icon: '💰' },
    'opname': { title: '📋 Stock Opname', icon: '📋' },
    'voucher': { title: '🎟️ Voucher Diskon', icon: '🎟️' },
    'tax': { title: '🧾 Tax & Service', icon: '🧾' },
    'diskon': { title: '💲 Manajemen Diskon', icon: '💲' },
    'pesanan': { title: '📝 Manajemen Pesanan', icon: '📝' },
    'payment': { title: '💳 Multi Payment', icon: '💳' },
    'multiuser': { title: '👤 Multi User', icon: '👤' },
    'emailstruk': { title: '📧 Email Struk', icon: '📧' },
    'whatsapp': { title: '📱 WhatsApp', icon: '📱' },
    'label': { title: '🏷️ Label Printer', icon: '🏷️' },
    'superadmin': { title: '🛡️ Super Admin', icon: '🛡️' }
  };
  
  var info = featureInfo[key];
  if (!info) return;
  
  var modal = document.createElement('div');
  modal.id = 'fiturModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  
  var contentId = 'fiturContent_' + key;
  
  modal.innerHTML = '<div style="background:#fff;padding:20px;border-radius:12px;width:95%;max-width:600px;max-height:85vh;overflow-y:auto;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
    '<h3 style="margin:0;">' + info.icon + ' ' + info.title + '</h3>' +
    '<button class="btn btn-danger btn-sm" onclick="document.getElementById(\'fiturModal\').remove()">✕ Tutup</button>' +
    '</div>' +
    '<div id="' + contentId + '"></div>' +
    '</div>';
  
  document.body.appendChild(modal);
  
  if (typeof window['setupModal_' + key] === 'function') {
    window['setupModal_' + key](contentId);
  }
}

// ===================== MODAL SETUP FUNCTIONS =====================

async function setupModal_utang(containerId) {
  var container = document.getElementById(containerId);
  container.innerHTML = '<p>Memuat...</p>';
  
  var r = await supabaseClient.from('customer_debts').select('*').eq('status', 'active').order('created_at', { ascending: false });
  var debts = r.data || [];
  
  var html = '<button class="btn btn-sm" onclick="formTambahUtang()">➕ Tambah Utang</button>';
  
  if (!debts.length) {
    html += '<p>Tidak ada utang aktif</p>';
    container.innerHTML = html;
    return;
  }
  
  html += '<table class="user-table"><thead><tr><th>Customer</th><th>Total</th><th>Sudah Bayar</th><th>Sisa</th><th>Aksi</th></tr></thead><tbody>';
  debts.forEach(function(d) {
    var sisa = (d.amount || 0) - (d.paid || 0);
    html += '<tr><td>' + d.customer_name + '</td><td>Rp ' + (d.amount||0).toLocaleString('id') + '</td><td>Rp ' + (d.paid||0).toLocaleString('id') + '</td><td><b>Rp ' + sisa.toLocaleString('id') + '</b></td>';
    html += '<td><button class="btn-sm" onclick="formBayarUtang(' + d.id + ')">💰</button> <button class="btn-sm btn-danger" onclick="hapusUtang(' + d.id + ')">🗑</button></td></tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

async function setupModal_biaya(containerId) {
  var container = document.getElementById(containerId);
  container.innerHTML = '<p>Memuat...</p>';
  
  var r = await supabaseClient.from('expenses').select('*').order('tanggal', { ascending: false }).limit(50);
  var expenses = r.data || [];
  var total = expenses.reduce(function(s, e) { return s + (e.jumlah || 0); }, 0);
  
  var html = '<button class="btn btn-sm" onclick="formTambahBiaya()">➕ Tambah Biaya</button>';
  html += '<p>Total: <b>Rp ' + total.toLocaleString('id') + '</b></p>';
  
  if (!expenses.length) {
    html += '<p>Tidak ada biaya</p>';
    container.innerHTML = html;
    return;
  }
  
  html += '<table class="user-table"><thead><tr><th>Tanggal</th><th>Kategori</th><th>Jumlah</th></tr></thead><tbody>';
  expenses.forEach(function(e) {
    html += '<tr><td>' + e.tanggal + '</td><td>' + e.kategori + '</td><td>Rp ' + (e.jumlah||0).toLocaleString('id') + '</td></tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

async function setupModal_opname(containerId) {
  var container = document.getElementById(containerId);
  container.innerHTML = '<p>Memuat...</p>';
  
  var r = await supabaseClient.from('stock_opname_sessions').select('*').order('created_at', { ascending: false });
  var sessions = r.data || [];
  
  var html = '<button class="btn btn-sm" onclick="buatOpnameBaru()">➕ Buat Opname</button>';
  
  if (!sessions.length) {
    html += '<p>Belum ada sesi opname</p>';
    container.innerHTML = html;
    return;
  }
  
  html += '<table class="user-table"><thead><tr><th>Nama</th><th>Status</th><th>Tanggal</th></tr></thead><tbody>';
  sessions.forEach(function(s) {
    html += '<tr><td>' + s.nama + '</td><td>' + s.status + '</td><td>' + new Date(s.created_at).toLocaleDateString('id-ID') + '</td></tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

async function setupModal_voucher(containerId) {
  var container = document.getElementById(containerId);
  container.innerHTML = '<p>Memuat...</p>';
  
  var r = await supabaseClient.from('vouchers').select('*').order('created_at', { ascending: false });
  var vouchers = r.data || [];
  
  var html = '<button class="btn btn-sm" onclick="formTambahVoucher()">➕ Buat Voucher</button>';
  
  if (!vouchers.length) {
    html += '<p>Belum ada voucher</p>';
    container.innerHTML = html;
    return;
  }
  
  html += '<table class="user-table"><thead><tr><th>Nama</th><th>Tipe</th><th>Nilai</th><th>Berlaku</th><th>Aksi</th></tr></thead><tbody>';
  vouchers.forEach(function(v) {
    var nilai = v.tipe === 'persen' ? v.nilai + '%' : 'Rp ' + v.nilai.toLocaleString('id');
    html += '<tr><td>' + v.nama + '</td><td>' + v.tipe + '</td><td>' + nilai + '</td><td>' + (v.tanggal_mulai || '-') + ' s/d ' + (v.tanggal_akhir || '-') + '</td>';
    html += '<td><button class="btn-sm btn-danger" onclick="hapusVoucher(' + v.id + ')">🗑</button></td></tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

async function setupModal_tax(containerId) {
  var container = document.getElementById(containerId);
  await loadTaxSettings();
  
  var html = '<button class="btn" onclick="formPengaturanTax()">⚙️ Atur Tax & Service</button>';
  html += '<div style="margin-top:12px;background:#f5f5f5;padding:12px;border-radius:8px;">';
  
  var activeTaxes = taxSettings.taxes.filter(function(t) { return t.aktif; });
  
  if (activeTaxes.length === 0) {
    html += '<p>❌ Tidak ada tax/service aktif</p>';
  } else {
    html += '<table class="user-table"><thead><tr><th>Nama</th><th>Tipe</th><th>Nilai</th><th>Mode</th></tr></thead><tbody>';
    activeTaxes.forEach(function(t) {
      var modeLabel = t.mode === 'include' ? 'Include' : (t.mode === 'add' ? 'Add' : 'Deduct');
      html += '<tr><td>' + t.nama + '</td><td>' + (t.tipe === 'persen' ? '%' : 'Rp') + '</td><td>' + t.nilai + '</td><td>' + modeLabel + '</td></tr>';
    });
    html += '</tbody></table>';
  }
  html += '</div>';
  container.innerHTML = html;
}

async function setupModal_diskon(containerId) {
  var container = document.getElementById(containerId);
  await loadDiscountSettings();
  
  var html = '<button class="btn" onclick="formPengaturanDiskon()">⚙️ Atur Diskon</button>';
  
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

async function setupModal_pesanan(containerId) {
  var container = document.getElementById(containerId);
  await loadPesananSettings();
  
  var html = '<button class="btn" onclick="formPengaturanPesanan()">⚙️ Atur Pesanan</button>';
  html += '<div style="margin-top:12px;background:#f5f5f5;padding:12px;border-radius:8px;">';
  html += '<p>📝 <b>Simpan Pesanan:</b> ' + (pesananSettings.simpanPesananActive ? '✅ Aktif' : '❌ Nonaktif') + '</p>';
  html += '<p>📝 <b>Pesanan Tersimpan:</b> ' + (pesananSettings.pesananTersimpanActive ? '✅ Aktif' : '❌ Nonaktif') + '</p>';
  html += '</div>';
  container.innerHTML = html;
}

async function setupModal_payment(containerId) {
  var container = document.getElementById(containerId);
  await loadPaymentSettings();
  
  var html = '<button class="btn" onclick="formPengaturanPayment()">⚙️ Atur Payment</button>';
  html += '<div style="margin-top:12px;background:#f5f5f5;padding:12px;border-radius:8px;">';
  
  paymentSettings.methods.forEach(function(m) {
    html += '<p>💳 <b>' + m.nama + ':</b> ' + (m.aktif ? '✅ Aktif' : '❌ Nonaktif') + '</p>';
  });
  
  html += '</div>';
  container.innerHTML = html;
}

async function setupModal_multiuser(containerId) {
  var container = document.getElementById(containerId);
  
  var r = await supabaseClient.from('users').select('*').order('username');
  var users = r.data || [];
  
  var html = '<button class="btn btn-sm" onclick="formTambahMultiUser()">➕ Tambah User</button>';
  html += '<table class="user-table"><thead><tr><th>Username</th><th>Role</th><th>Aksi</th></tr></thead><tbody>';
  users.forEach(function(u) {
    html += '<tr><td>' + u.username + '</td><td>' + u.role + '</td>';
    html += '<td>' + (u.username !== 'admin' ? '<button class="btn-sm btn-danger" onclick="hapusMultiUser(\'' + u.username + '\')">🗑</button>' : '') + '</td></tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

async function setupModal_emailstruk(containerId) {
  var container = document.getElementById(containerId);
  
  var trx = await supabaseClient.from('transactions').select('*').order('tanggal', { ascending: false }).limit(20);
  var transactions = trx.data || [];
  
  var html = '<p>Klik 📧 untuk kirim struk</p>';
  html += '<table class="user-table"><thead><tr><th>Invoice</th><th>Total</th><th>Aksi</th></tr></thead><tbody>';
  transactions.forEach(function(t) {
    html += '<tr><td>' + t.no_invoice + '</td><td>Rp ' + (t.total||0).toLocaleString('id') + '</td>';
    html += '<td><button class="btn-sm" onclick="emailStrukDariLaporan(\'' + t.no_invoice + '\')">📧</button></td></tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

async function setupModal_whatsapp(containerId) {
  var container = document.getElementById(containerId);
  container.innerHTML = '<p>Gunakan tombol 📱 di Laporan untuk kirim struk via WhatsApp.</p>';
}

async function setupModal_label(containerId) {
  var container = document.getElementById(containerId);
  container.innerHTML = '<p>Gunakan tombol 🏷️ Label pada daftar produk untuk mencetak label harga.</p>';
}

async function setupModal_superadmin(containerId) {
  var container = document.getElementById(containerId);
  
  container.innerHTML = '<div style="display:flex;gap:8px;margin-bottom:12px;">' +
    '<button class="btn btn-sm" onclick="refreshSessions()">🔄 Refresh</button>' +
    '<button class="btn btn-sm btn-danger" onclick="disconnectAllUsers()">🔌 Putuskan Semua</button>' +
    '</div>' +
    '<table class="user-table" style="width:100%;"><thead><tr><th>User</th><th>Role</th><th>Device</th><th>Status</th><th>Aksi</th></tr></thead><tbody id="sessionsTableBody"></tbody></table>';
  
  if (typeof refreshSessions === 'function') {
    refreshSessions();
  }
}

// ===================== FORM PENGATURAN GROSIR =====================
function formPengaturanGrosir() {
  // Create modal for grosir settings
  var modal = document.createElement('div');
  modal.id = 'grosirSettingsModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  
  modal.innerHTML = '<div style="background:#fff;padding:20px;border-radius:12px;width:95%;max-width:500px;max-height:85vh;overflow-y:auto;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
    '<h3 style="margin:0;">🔥 Pengaturan Grosir Diskon</h3>' +
    '<button class="btn btn-danger btn-sm" onclick="document.getElementById(\'grosirSettingsModal\').remove()">✕ Tutup</button>' +
    '</div>' +
    '<div style="background:#fff3e0;padding:12px;border-radius:8px;margin-bottom:16px;border:1px solid #ff9800;">' +
    '<p style="margin:0;font-size:14px;">ℹ️ Diskon grosir diatur per produk melalui form produk.</p>' +
    '<p style="margin:8px 0 0 0;font-size:13px;color:#666;">Buka Inventory → pilih produk → atur bagian "Harga Grosir".</p>' +
    '</div>' +
    '<div style="background:#f5f5f5;padding:12px;border-radius:8px;">' +
    '<h4 style="margin:0 0 8px 0;">Cara Mengatur:</h4>' +
    '<ol style="margin:0;padding-left:20px;font-size:13px;color:#333;">' +
    '<li>Buka halaman Inventory</li>' +
    '<li>Cari atau tambah produk</li>' +
    '<li>Scroll ke bagian "Harga Grosir (opsional)"</li>' +
    '<li>Atur persentase diskon dan minimal quantity</li>' +
    '<li>Klik Simpan</li>' +
    '</ol>' +
    '</div>' +
    '<div style="background:#e8f5e9;padding:12px;border-radius:8px;margin-top:16px;">' +
    '<p style="margin:0;font-size:13px;color:#2e7d32;"><b>Contoh:</b> Diskon 5% setiap pembelian minimal 12 pcs.</p>' +
    '</div>' +
    '<button class="btn" onclick="document.getElementById(\'grosirSettingsModal\').remove()" style="width:100%;margin-top:16px;">✅ Mengerti</button>' +
    '</div>';
  
  document.body.appendChild(modal);
}

function renderFiturToggles() {
  var container = document.getElementById('fiturList');
  if (!container) return;
  
  var features = [
    { key: 'utang', label: '💳 Customer Utang' },
    { key: 'member', label: '⭐ Customer Member' },
    { key: 'shift', label: '👥 Shift Karyawan' },
    { key: 'supplier', label: '📦 Supplier' },
    { key: 'biaya', label: '💰 Biaya Operasional' },
    { key: 'opname', label: '📋 Stock Opname' },
    { key: 'voucher', label: '🎟️ Voucher Diskon' },
    { key: 'tax', label: '🧾 Tax & Service' },
    { key: 'diskon', label: '💲 Manajemen Diskon' },
    { key: 'grosir', label: '🔥 Grosir Diskon' },
    { key: 'pesanan', label: '📝 Manajemen Pesanan' },
    { key: 'payment', label: '💳 Multi Payment' },
    { key: 'multiuser', label: '👤 Multi User' },
    { key: 'emailstruk', label: '📧 Email Struk' },
    { key: 'whatsapp', label: '📱 WhatsApp' },
    { key: 'label', label: '🏷️ Label Printer' }
  ];
  
  var html = '';
  features.forEach(function(f) {
    var checked = activeFeatures[f.key] ? 'checked' : '';
    html += '<div class="fitur-item">';
    html += '<span class="fitur-name">' + f.label + '</span>';
    html += '<label class="toggle-switch">';
    html += '<input type="checkbox" id="fitur_' + f.key + '" ' + checked + '>';
    html += '<span class="toggle-slider"></span>';
    html += '</label>';
    html += '</div>';
  });
  
  container.innerHTML = html;
}

async function simpanFitur() {
  var keys = ['utang','member','shift','supplier','biaya','opname','voucher','tax','diskon','grosir','pesanan','payment','multiuser','emailstruk','whatsapp','label'];
  var features = {};
  
  keys.forEach(function(key) {
    var el = document.getElementById('fitur_' + key);
    if (el) features[key] = el.checked;
  });
  
  await updateSettings({ features: features });
  activeFeatures = features;
  renderFiturCards();
  // Update button visibility
  updateVoucherButtonVisibility();
  updateLabelButtonVisibility();
  updateGrosirVisibility();
  alert('✅ Fitur disimpan!');
}

// ===================== VOUCHER BUTTON VISIBILITY =====================
function updateVoucherButtonVisibility() {
  var voucherBtn = document.getElementById('btnVoucherTransaksi');
  if (voucherBtn) {
    // Check if voucher feature is active
    var isVoucherActive = activeFeatures && activeFeatures.voucher;
    
    // Show button only if voucher feature is active
    voucherBtn.style.display = isVoucherActive ? 'inline-flex' : 'none';
  }
}

// ===================== LABEL BUTTON VISIBILITY =====================
function updateLabelButtonVisibility() {
  var labelButtons = document.querySelectorAll('button[onclick^="bukaLabelDialog"]');
  var isLabelActive = activeFeatures && activeFeatures.label;
  
  labelButtons.forEach(function(btn) {
    btn.style.display = isLabelActive ? 'inline-block' : 'none';
  });
  
  // Also update the label settings in the print modal
  var labelMenuItem = document.getElementById('menuPrinterLabel');
  if (labelMenuItem) {
    labelMenuItem.style.display = isLabelActive ? 'flex' : 'none';
  }
  
  // Refresh product list if on inventory page
  if (typeof refreshProductList === 'function' && activeTab === 'inventory') {
    refreshProductList();
  }
}

// ===================== GROSIR VISIBILITY =====================
function updateGrosirVisibility() {
  var isGrosirActive = activeFeatures && activeFeatures.grosir;
  
  // Hide/show grosir fields in product form
  var grosirFields = document.getElementById('grosirFields');
  if (grosirFields) {
    grosirFields.style.display = isGrosirActive ? 'block' : 'none';
  }
  
  // Refresh product list if on inventory page
  if (typeof refreshProductList === 'function' && activeTab === 'inventory') {
    refreshProductList();
  }
}