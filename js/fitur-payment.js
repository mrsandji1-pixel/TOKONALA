// ===================== FITUR MULTI PAYMENT =====================
var paymentSettings = {
  methods: [
    { nama: 'TUNAI', aktif: true },
    { nama: 'QRIS', aktif: true }
  ]
};

async function loadPaymentSettings() {
  var s = await getSettings();
  if (s.payment_config && Array.isArray(s.payment_config)) {
    paymentSettings.methods = s.payment_config;
  }
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
  
  var modal = document.createElement('div');
  modal.id = 'paymentModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
  
  var html = '<div style="background:#fff;padding:20px;border-radius:12px;width:350px;">';
  html += '<h3>💳 Multi Payment</h3>';
  html += '<table class="user-table" style="width:100%;"><thead><tr><th>Aktif</th><th>Nama</th><th>Aksi</th></tr></thead><tbody id="paymentRows">';
  
  paymentSettings.methods.forEach(function(m, index) {
    html += '<tr>';
    html += '<td><input type="checkbox" id="paymentAktif_' + index + '" ' + (m.aktif ? 'checked' : '') + '></td>';
    html += '<td><input type="text" id="paymentNama_' + index + '" value="' + m.nama + '" style="width:120px;padding:4px;border:1px solid #ddd;border-radius:4px;"></td>';
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
  var index = tbody.querySelectorAll('tr').length;
  
  var tr = document.createElement('tr');
  tr.innerHTML = '<td><input type="checkbox" checked></td>' +
    '<td><input type="text" placeholder="Nama metode" style="width:120px;padding:4px;border:1px solid #ddd;border-radius:4px;"></td>' +
    '<td><button class="btn btn-sm btn-danger" onclick="this.closest(\'tr\').remove()">🗑</button></td>';
  
  tbody.appendChild(tr);
}

async function simpanPayment() {
  var tbody = document.getElementById('paymentRows');
  var rows = tbody.querySelectorAll('tr');
  var methods = [];
  
  rows.forEach(function(tr) {
    var inputs = tr.querySelectorAll('input');
    if (inputs.length < 2) return;
    
    var aktif = inputs[0].checked;
    var nama = inputs[1].value.trim();
    
    if (nama) {
      methods.push({ nama: nama, aktif: aktif });
    }
  });
  
  await updateSettings({ payment_config: methods });
  paymentSettings.methods = methods;
  
  var modal = document.getElementById('paymentModal');
  if (modal) modal.remove();
  
  alert('✅ Pembayaran disimpan');
  
  // Refresh payment buttons on Transaksi page
  if (typeof renderPaymentButtons === 'function') {
    renderPaymentButtons();
  }
  
  // Refresh modal content
  if (typeof setupModal_payment === 'function') {
    var fiturModal = document.getElementById('fiturModal');
    if (fiturModal) {
      setupModal_payment('fiturContent_payment');
    }
  }
}

async function setupModal_payment(containerId) {
  var container = document.getElementById(containerId);
  await loadPaymentSettings();
  
  var isAdminUser = currentUser && currentUser.role === 'admin';
  
  var html = '';
  if (isAdminUser) {
    html += '<button class="btn" onclick="formPengaturanPayment()">⚙️ Atur Payment</button>';
  }
  
  html += '<div style="margin-top:12px;background:#f5f5f5;padding:12px;border-radius:8px;">';
  
  paymentSettings.methods.forEach(function(m) {
    html += '<p>💳 <b>' + m.nama + ':</b> ' + (m.aktif ? '✅ Aktif' : '❌ Nonaktif') + '</p>';
  });
  
  html += '</div>';
  container.innerHTML = html;
}