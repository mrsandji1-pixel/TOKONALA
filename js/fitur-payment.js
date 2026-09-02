// ===================== FITUR MULTI PAYMENT - FIXED VERSION =====================
var paymentSettings = {
  methods: [
    { nama: 'TUNAI', aktif: true },
    { nama: 'QRIS', aktif: true }
  ]
};

async function loadPaymentSettings() {
  try {
    var s = await getSettings();
    if (s.payment_config && Array.isArray(s.payment_config)) {
      paymentSettings.methods = s.payment_config;
    } else if (s.payment_config && typeof s.payment_config === 'string') {
      try { paymentSettings.methods = JSON.parse(s.payment_config); } catch(e) {}
    }
  } catch(e) {}
}

function isPaymentActive(nama) {
  var method = paymentSettings.methods.find(function(m) { return m.nama === nama; });
  return method ? method.aktif : false;
}

async function formPengaturanPayment() {
  if (!currentUser || currentUser.role !== 'admin') {
    alert('Hanya admin yang dapat mengatur pembayaran');
    return;
  }
  
  await loadPaymentSettings();
  
  // Close existing modal
  var existingModal = document.getElementById('paymentModal');
  if (existingModal) existingModal.remove();
  
  // Close fitur modal if open
  var fiturModal = document.getElementById('fiturModal');
  if (fiturModal) fiturModal.remove();
  
  var modal = document.createElement('div');
  modal.id = 'paymentModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
  
  var html = '<div style="background:#fff;padding:20px;border-radius:12px;width:400px;max-height:85vh;overflow-y:auto;">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';
  html += '<h3 style="margin:0;">💳 Multi Payment</h3>';
  html += '<button class="btn btn-danger btn-sm" onclick="document.getElementById(\'paymentModal\').remove()">✕</button>';
  html += '</div>';
  
  html += '<div style="background:#e3f2fd;padding:10px;border-radius:6px;margin-bottom:12px;">';
  html += '<p style="margin:0;font-size:12px;color:#1565c0;">ℹ️ Hanya TUNAI dan QRIS yang memiliki handler pembayaran khusus. Metode lain akan dianggap sebagai pembayaran tunai.</p>';
  html += '</div>';
  
  html += '<table class="user-table" style="width:100%;"><thead><tr><th>Aktif</th><th>Nama</th><th>Aksi</th></tr></thead><tbody id="paymentRows">';
  
  paymentSettings.methods.forEach(function(m, index) {
    html += '<tr>';
    html += '<td><input type="checkbox" id="paymentAktif_' + index + '" ' + (m.aktif ? 'checked' : '') + '></td>';
    html += '<td><input type="text" id="paymentNama_' + index + '" value="' + m.nama + '" style="width:150px;padding:4px;border:1px solid #ddd;border-radius:4px;"></td>';
    html += '<td><button class="btn btn-sm btn-danger" onclick="this.closest(\'tr\').remove()">🗑</button></td>';
    html += '</tr>';
  });
  
  html += '</tbody></table>';
  html += '<button class="btn btn-sm" onclick="tambahPaymentRow()" style="margin-top:8px;">➕ Tambah</button>';
  html += '<div style="display:flex;gap:8px;margin-top:12px;">';
  html += '<button class="btn" onclick="simpanPayment()" style="flex:1;background:#009688;color:white;">💾 Simpan</button>';
  html += '<button class="btn btn-danger" onclick="document.getElementById(\'paymentModal\').remove()">Batal</button>';
  html += '</div></div>';
  
  modal.innerHTML = html;
  document.body.appendChild(modal);
}

function tambahPaymentRow() {
  var tbody = document.getElementById('paymentRows');
  
  // Remove empty state if exists
  var emptyRow = tbody.querySelector('td[colspan]');
  if (emptyRow) {
    tbody.innerHTML = '';
  }
  
  var tr = document.createElement('tr');
  tr.innerHTML = '<td><input type="checkbox" checked></td>' +
    '<td><input type="text" placeholder="Nama metode" style="width:150px;padding:4px;border:1px solid #ddd;border-radius:4px;"></td>' +
    '<td><button class="btn btn-sm btn-danger" onclick="this.closest(\'tr\').remove()">🗑</button></td>';
  
  tbody.appendChild(tr);
}

async function simpanPayment() {
  var tbody = document.getElementById('paymentRows');
  var rows = tbody.querySelectorAll('tr');
  var methods = [];
  var seenNames = {};
  
  rows.forEach(function(tr) {
    var inputs = tr.querySelectorAll('input');
    if (inputs.length < 2) return;
    
    var aktif = inputs[0].checked;
    var nama = inputs[1].value.trim().toUpperCase();
    
    // FIXED: Validasi nama unik
    if (nama && !seenNames[nama]) {
      seenNames[nama] = true;
      methods.push({ nama: nama, aktif: aktif });
    }
  });
  
  // FIXED: Pastikan minimal ada satu metode aktif
  var hasActive = methods.some(function(m) { return m.aktif; });
  if (!hasActive) {
    alert('❌ Minimal satu metode pembayaran harus aktif!');
    return;
  }
  
  await updateSettings({ payment_config: methods });
  paymentSettings.methods = methods;
  
  var modal = document.getElementById('paymentModal');
  if (modal) modal.remove();
  
  alert('✅ Pembayaran disimpan');
  
  // Refresh payment buttons on Transaksi page
  if (typeof renderPaymentButtons === 'function') {
    renderPaymentButtons();
  }
}

// FIXED: This is the function that fitur-loader.js calls
async function setupModal_payment(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  
  await loadPaymentSettings();
  
  var isAdminUser = currentUser && currentUser.role === 'admin';
  
  var html = '';
  if (isAdminUser) {
    html += '<button class="btn" onclick="formPengaturanPayment()">⚙️ Atur Payment</button>';
  }
  
  html += '<div style="margin-top:12px;background:#f5f5f5;padding:12px;border-radius:8px;">';
  
  if (!paymentSettings.methods || paymentSettings.methods.length === 0) {
    html += '<p>❌ Tidak ada metode pembayaran</p>';
  } else {
    paymentSettings.methods.forEach(function(m) {
      html += '<p>💳 <b>' + m.nama + ':</b> ' + (m.aktif ? '✅ Aktif' : '❌ Nonaktif') + '</p>';
    });
  }
  
  html += '</div>';
  container.innerHTML = html;
}