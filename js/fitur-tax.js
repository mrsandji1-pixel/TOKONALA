// ===================== FITUR TAX & SERVICE =====================
var taxSettings = {
  taxes: []
};

async function loadTaxSettings() {
  var s = await getSettings();
  if (s.tax_config && Array.isArray(s.tax_config)) {
    taxSettings.taxes = s.tax_config;
  } else {
    taxSettings.taxes = [];
  }
}

function hitungTax(subtotal) {
  if (!taxSettings.taxes || !taxSettings.taxes.length) return 0;
  
  var totalTax = 0;
  taxSettings.taxes.forEach(function(t) {
    if (!t.aktif) return;
    
    var amount = 0;
    if (t.tipe === 'persen') {
      amount = Math.round((t.nilai / 100) * subtotal);
    } else {
      amount = t.nilai;
    }
    
    if (t.mode === 'include') {
      totalTax += Math.round(subtotal - (subtotal / (1 + t.nilai / 100)));
    } else if (t.mode === 'add') {
      totalTax += amount;
    } else if (t.mode === 'deduct') {
      totalTax -= amount;
    }
  });
  return totalTax;
}

function getTaxList(subtotal) {
  var list = [];
  taxSettings.taxes.forEach(function(t) {
    if (!t.aktif) return;
    
    var amount = 0;
    if (t.tipe === 'persen') {
      amount = Math.round((t.nilai / 100) * subtotal);
    } else {
      amount = t.nilai;
    }
    
    var jumlah = t.mode === 'include' ? Math.round(subtotal - (subtotal / (1 + t.nilai / 100))) : (t.mode === 'add' ? amount : -amount);
    
    list.push({
      nama: t.nama,
      detail: (t.tipe === 'persen' ? t.nilai + '%' : 'Rp ' + t.nilai.toLocaleString('id')) + ' (' + t.mode + ')',
      jumlah: jumlah
    });
  });
  return list;
}

async function formPengaturanTax() {
  if (!currentUser || currentUser.role !== 'admin') {
    alert('Hanya admin yang dapat mengatur pajak');
    return;
  }
  
  await loadTaxSettings();
  
  var modal = document.createElement('div');
  modal.id = 'taxModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
  
  var html = '<div style="background:#fff;padding:20px;border-radius:12px;width:95%;max-width:650px;max-height:85vh;overflow-y:auto;">';
  html += '<h3>🧾 Tax & Service</h3>';
  html += '<table class="user-table" style="width:100%;"><thead><tr><th>Aktif</th><th>Nama</th><th>Tipe</th><th>Nilai</th><th>Mode</th><th>Aksi</th></tr></thead><tbody id="taxRows">';
  
  if (taxSettings.taxes.length === 0) {
    html += '<tr><td colspan="6" style="text-align:center;">Belum ada tax/service</td></tr>';
  } else {
    taxSettings.taxes.forEach(function(t, index) {
      html += '<tr>';
      html += '<td><input type="checkbox" id="taxAktif_' + index + '" ' + (t.aktif ? 'checked' : '') + '></td>';
      html += '<td><input type="text" id="taxNama_' + index + '" value="' + (t.nama || '') + '" style="width:90px;padding:4px;border:1px solid #ddd;border-radius:4px;"></td>';
      html += '<td><select id="taxTipe_' + index + '" style="padding:4px;border:1px solid #ddd;border-radius:4px;">';
      html += '<option value="persen" ' + (t.tipe === 'persen' ? 'selected' : '') + '>%</option>';
      html += '<option value="nominal" ' + (t.tipe === 'nominal' ? 'selected' : '') + '>Rp</option>';
      html += '</select></td>';
      html += '<td><input type="number" id="taxNilai_' + index + '" value="' + (t.nilai || 0) + '" style="width:70px;padding:4px;border:1px solid #ddd;border-radius:4px;"></td>';
      html += '<td><select id="taxMode_' + index + '" style="padding:4px;border:1px solid #ddd;border-radius:4px;">';
      html += '<option value="include" ' + (t.mode === 'include' ? 'selected' : '') + '>Include</option>';
      html += '<option value="add" ' + (t.mode === 'add' ? 'selected' : '') + '>Add</option>';
      html += '<option value="deduct" ' + (t.mode === 'deduct' ? 'selected' : '') + '>Deduct</option>';
      html += '</select></td>';
      html += '<td><button class="btn btn-sm btn-danger" onclick="this.closest(\'tr\').remove()">🗑</button></td>';
      html += '</tr>';
    });
  }
  
  html += '</tbody></table>';
  html += '<button class="btn btn-sm" onclick="tambahTaxRow()" style="margin-top:8px;">➕ Tambah</button>';
  html += '<div style="display:flex;gap:8px;margin-top:12px;">';
  html += '<button class="btn" onclick="simpanTax()" style="flex:1;background:#009688;color:white;">💾 Simpan</button>';
  html += '<button class="btn btn-danger" onclick="document.getElementById(\'taxModal\').remove()">Batal</button>';
  html += '</div></div>';
  
  modal.innerHTML = html;
  document.body.appendChild(modal);
}

function tambahTaxRow() {
  var tbody = document.getElementById('taxRows');
  var index = tbody.querySelectorAll('tr').length;
  
  var tr = document.createElement('tr');
  tr.innerHTML = '<td><input type="checkbox" checked></td>' +
    '<td><input type="text" placeholder="Nama" style="width:90px;padding:4px;border:1px solid #ddd;border-radius:4px;"></td>' +
    '<td><select style="padding:4px;border:1px solid #ddd;border-radius:4px;"><option value="persen">%</option><option value="nominal">Rp</option></select></td>' +
    '<td><input type="number" value="0" style="width:70px;padding:4px;border:1px solid #ddd;border-radius:4px;"></td>' +
    '<td><select style="padding:4px;border:1px solid #ddd;border-radius:4px;"><option value="include">Include</option><option value="add">Add</option><option value="deduct">Deduct</option></select></td>' +
    '<td><button class="btn btn-sm btn-danger" onclick="this.closest(\'tr\').remove()">🗑</button></td>';
  
  tbody.appendChild(tr);
}

async function simpanTax() {
  if (!currentUser || currentUser.role !== 'admin') return;
  
  var tbody = document.getElementById('taxRows');
  var rows = tbody.querySelectorAll('tr');
  var taxes = [];
  
  rows.forEach(function(tr) {
    var inputs = tr.querySelectorAll('input');
    var selects = tr.querySelectorAll('select');
    
    if (inputs.length < 3 || selects.length < 2) return;
    
    var aktif = inputs[0].checked;
    var nama = inputs[1].value.trim();
    var nilai = parseFloat(inputs[2].value) || 0;
    var tipe = selects[0].value;
    var mode = selects[1].value;
    
    if (nama && nilai > 0) {
      taxes.push({ aktif: aktif, nama: nama, tipe: tipe, nilai: nilai, mode: mode });
    }
  });
  
  console.log('Saving taxes:', taxes);
  
  await updateSettings({ tax_config: taxes });
  taxSettings.taxes = taxes;
  
  var modal = document.getElementById('taxModal');
  if (modal) modal.remove();
  
  alert('✅ Tax & Service disimpan (' + taxes.length + ' item)');
}

async function setupTaxModal(containerId) {
  var container = document.getElementById(containerId);
  await loadTaxSettings();
  
  var isAdminUser = currentUser && currentUser.role === 'admin';
  
  var html = '';
  if (isAdminUser) {
    html += '<button class="btn" onclick="formPengaturanTax()">⚙️ Atur Tax & Service</button>';
  }
  
  html += '<div style="margin-top:12px;background:#f5f5f5;padding:12px;border-radius:8px;">';
  
  var activeTaxes = taxSettings.taxes.filter(function(t) { return t.aktif; });
  
  if (activeTaxes.length === 0) {
    html += '<p>❌ Tidak ada tax/service aktif</p>';
  } else {
    html += '<table class="user-table"><thead><tr><th>Nama</th><th>Tipe</th><th>Nilai</th><th>Mode</th></tr></thead><tbody>';
    activeTaxes.forEach(function(t) {
      var modeLabel = t.mode === 'include' ? 'Include' : (t.mode === 'add' ? 'Add' : 'Deduct');
      var nilaiLabel = t.tipe === 'persen' ? t.nilai + '%' : 'Rp ' + t.nilai.toLocaleString('id');
      html += '<tr><td>' + t.nama + '</td><td>' + (t.tipe === 'persen' ? '%' : 'Rp') + '</td><td>' + nilaiLabel + '</td><td>' + modeLabel + '</td></tr>';
    });
    html += '</tbody></table>';
  }
  
  html += '</div>';
  container.innerHTML = html;
}