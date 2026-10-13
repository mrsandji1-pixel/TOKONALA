// ===================== FITUR BIAYA OPERASIONAL - FINAL v5 =====================
var currentBiayaFilter = 'hari-ini';

var DEFAULT_CATEGORIES = ['BAR', 'KITCHEN', 'UMUM'];

// ===================== SETUP =====================
async function setupBiaya() {
  await muatDaftarBiaya();
}

// ===================== LOAD KATEGORI =====================
async function loadKategoriBiaya() {
  var catList = [];
  
  try {
    var r = await supabaseClient.from('expense_categories').select('*').order('nama');
    catList = (r.data || []).map(function(c) { return c.nama; });
  } catch(e) {
    console.log('Error load kategori:', e);
  }
  
  var allCats = DEFAULT_CATEGORIES.slice();
  catList.forEach(function(c) {
    if (allCats.indexOf(c) === -1 && c) allCats.push(c);
  });
  
  return allCats;
}

// ===================== HELPER =====================
function getLocalDateStr(date) {
  var y = date.getFullYear();
  var m = ('0' + (date.getMonth() + 1)).slice(-2);
  var d = ('0' + date.getDate()).slice(-2);
  return y + '-' + m + '-' + d;
}

function formatTanggalIndo(date) {
  var bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return date.getDate() + ' ' + bulan[date.getMonth()] + ' ' + date.getFullYear();
}

function formatBulanIndo(date) {
  var bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return bulan[date.getMonth()] + ' ' + date.getFullYear();
}

// ===================== DAFTAR BIAYA =====================
async function muatDaftarBiaya() {
  var container = document.getElementById('biayaContent');
  if (!container) return;
  
  var isAdmin = currentUser && currentUser.role === 'admin';
  
  var today = new Date();
  var startDate, endDate;
  
  if (currentBiayaFilter === 'hari-ini') {
    startDate = getLocalDateStr(today);
    endDate = getLocalDateStr(today);
  } else if (currentBiayaFilter === 'bulan-ini') {
    startDate = getLocalDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
    endDate = getLocalDateStr(today);
  } else {
    startDate = getLocalDateStr(today);
    endDate = getLocalDateStr(today);
  }
  
  var r = await supabaseClient.from('expenses')
    .select('*')
    .gte('tanggal', startDate)
    .lte('tanggal', endDate)
    .order('tanggal', { ascending: false });
  
  var expenses = r.data || [];
  var total = expenses.reduce(function(sum, e) { return sum + (e.jumlah || 0); }, 0);
  
  var totalPerKategori = {};
  expenses.forEach(function(e) {
    var kat = e.kategori || 'LAIN-LAIN';
    if (!totalPerKategori[kat]) totalPerKategori[kat] = 0;
    totalPerKategori[kat] += (e.jumlah || 0);
  });
  
  var periodeLabel = '';
  if (currentBiayaFilter === 'hari-ini') {
    periodeLabel = formatTanggalIndo(today);
  } else {
    periodeLabel = formatBulanIndo(today);
  }
  
  var html = '';
  
  // Tombol Tambah Biaya (semua user)
  // Tombol Kelola Kategori (admin only)
  html += '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">';
  html += '<button class="btn" onclick="formTambahBiaya()" style="flex:1;background:#009688;color:white;">➕ Tambah Biaya</button>';
  if (isAdmin) {
    html += '<button class="btn btn-sm" onclick="formKelolaKategori()" style="background:#ff9800;color:white;">📁 Kelola Kategori</button>';
  }
  html += '</div>';
  
  // Total keseluruhan
  html += '<div style="background:#e0f2f1;padding:12px;border-radius:8px;margin-bottom:12px;">';
  html += '<small>Total Pengeluaran ' + periodeLabel + '</small><br><strong style="font-size:20px;">Rp ' + total.toLocaleString('id') + '</strong>';
  html += '</div>';
  
  // Tabel detail
  if (!expenses.length) {
    html += '<p style="text-align:center;color:#999;padding:20px;">Tidak ada biaya tercatat</p>';
  } else {
    html += '<table class="user-table"><thead><tr><th>Tanggal</th><th>Kategori</th><th>Item</th><th>Jumlah</th>' + (isAdmin ? '<th>Aksi</th>' : '') + '</tr></thead><tbody>';
    
    expenses.forEach(function(e) {
      var itemDisplay = '';
      if (e.qty && e.unit) {
        itemDisplay = e.qty + ' ' + e.unit;
      } else if (e.qty) {
        itemDisplay = e.qty;
      } else {
        itemDisplay = '-';
      }
      
      var keteranganDisplay = '';
      if (e.keterangan) {
        keteranganDisplay = '<br><small style="color:#666;font-size:11px;">' + e.keterangan + '</small>';
      }
      
      html += '<tr>';
      html += '<td style="font-size:11px;">' + e.tanggal + '</td>';
      html += '<td><b>' + e.kategori + '</b></td>';
      html += '<td>' + itemDisplay + keteranganDisplay + '</td>';
      html += '<td>Rp ' + (e.jumlah||0).toLocaleString('id') + '</td>';
      if (isAdmin) {
        html += '<td><button class="btn-sm btn-danger" onclick="hapusBiaya(' + e.id + ')">🗑</button></td>';
      }
      html += '</tr>';
    });
    
    html += '</tbody></table>';
  }
  
  // Summary per kategori
  html += '<div style="margin-top:16px;background:#f8fafb;border-radius:8px;padding:12px;border:1px solid #e8ecf0;">';
  html += '<h4 style="margin:0 0 12px 0;color:#00695c;">📊 Total per Kategori - ' + periodeLabel + '</h4>';
  html += '<table style="width:100%;border-collapse:collapse;">';
  
  if (Object.keys(totalPerKategori).length === 0) {
    html += '<tr><td style="padding:8px;color:#999;text-align:center;">Belum ada data</td></tr>';
  } else {
    var kategoriKeys = Object.keys(totalPerKategori).sort();
    kategoriKeys.forEach(function(kat) {
      var subtotal = totalPerKategori[kat];
      var persen = total > 0 ? ((subtotal / total) * 100).toFixed(1) : 0;
      
      html += '<tr style="border-bottom:1px solid #e8ecf0;">';
      html += '<td style="padding:8px 4px;font-weight:600;">' + kat + '</td>';
      html += '<td style="padding:8px 4px;text-align:right;">Rp ' + subtotal.toLocaleString('id') + '</td>';
      html += '<td style="padding:8px 4px;text-align:right;font-size:12px;color:#666;width:60px;">' + persen + '%</td>';
      html += '</tr>';
    });
    
    html += '<tr style="background:#e0f2f1;font-weight:bold;">';
    html += '<td style="padding:10px 4px;">TOTAL</td>';
    html += '<td style="padding:10px 4px;text-align:right;">Rp ' + total.toLocaleString('id') + '</td>';
    html += '<td style="padding:10px 4px;text-align:right;font-size:12px;">100%</td>';
    html += '</tr>';
  }
  
  html += '</table>';
  html += '</div>';
  
  // Tombol filter di paling bawah
  html += '<div style="display:flex;gap:8px;margin-top:16px;justify-content:center;">';
  html += '<button class="btn btn-sm" onclick="filterBiaya(\'hari-ini\')" style="' + (currentBiayaFilter === 'hari-ini' ? 'background:#00897b;color:white;' : 'background:#e0e0e0;color:#333;') + '">📅 Hari Ini</button>';
  html += '<button class="btn btn-sm" onclick="filterBiaya(\'bulan-ini\')" style="' + (currentBiayaFilter === 'bulan-ini' ? 'background:#00897b;color:white;' : 'background:#e0e0e0;color:#333;') + '">📆 Bulan Ini</button>';
  html += '</div>';
  
  container.innerHTML = html;
}

async function filterBiaya(periode) {
  currentBiayaFilter = periode;
  await muatDaftarBiaya();
}

// ===================== FORM TAMBAH BIAYA =====================
async function formTambahBiaya() {
  var allCats = await loadKategoriBiaya();
  
  var modal = document.createElement('div');
  modal.id = 'biayaModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10001;';
  
  var catOptions = '';
  allCats.forEach(function(c) {
    catOptions += '<option value="' + c + '">' + c + '</option>';
  });
  
  modal.innerHTML = '<div style="background:#fff;padding:20px;border-radius:12px;width:360px;max-height:90vh;overflow-y:auto;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
    '<h3 style="margin:0;">➕ Tambah Biaya</h3>' +
    '<button class="btn btn-danger btn-sm" onclick="tutupModalBiaya()">✕</button>' +
    '</div>' +
    
    '<label style="font-size:13px;font-weight:600;color:#455a64;">Tanggal</label>' +
    '<input type="date" id="biayaTanggal" style="width:100%;padding:10px;margin-bottom:8px;box-sizing:border-box;border:1px solid #ddd;border-radius:6px;" value="' + getLocalDateStr(new Date()) + '">' +
    
    '<label style="font-size:13px;font-weight:600;color:#455a64;">Kategori</label>' +
    '<select id="biayaKategori" style="width:100%;padding:10px;margin-bottom:8px;border:1px solid #ddd;border-radius:6px;">' +
    '<option value="">-- Pilih Kategori --</option>' +
    catOptions +
    '</select>' +
    
    '<label style="font-size:13px;font-weight:600;color:#455a64;">Nama Item</label>' +
    '<input type="text" id="biayaItem" placeholder="cth: Beras, Gas LPG, dll" style="width:100%;padding:10px;margin-bottom:8px;box-sizing:border-box;border:1px solid #ddd;border-radius:6px;">' +
    
    '<label style="font-size:13px;font-weight:600;color:#455a64;">Jumlah & Unit</label>' +
    '<div style="display:flex;gap:8px;margin-bottom:8px;">' +
    '<input type="number" id="biayaQty" placeholder="0" step="0.01" min="0" style="flex:1;padding:10px;box-sizing:border-box;border:1px solid #ddd;border-radius:6px;">' +
    '<select id="biayaUnit" style="width:100px;padding:10px;border:1px solid #ddd;border-radius:6px;">' +
    '<option value="pcs">pcs</option>' +
    '<option value="kg">kg</option>' +
    '<option value="gram">gram</option>' +
    '<option value="liter">liter</option>' +
    '<option value="ml">ml</option>' +
    '<option value="box">box</option>' +
    '<option value="pack">pack</option>' +
    '<option value="lusin">lusin</option>' +
    '<option value="unit">unit</option>' +
    '<option value="set">set</option>' +
    '</select>' +
    '</div>' +
    
    '<label style="font-size:13px;font-weight:600;color:#455a64;">Total Harga (Rp)</label>' +
    '<input type="number" id="biayaJumlah" placeholder="0" style="width:100%;padding:10px;margin-bottom:8px;box-sizing:border-box;border:1px solid #ddd;border-radius:6px;">' +
    
    '<label style="font-size:13px;font-weight:600;color:#455a64;">Keterangan</label>' +
    '<input type="text" id="biayaKeterangan" placeholder="Catatan tambahan..." style="width:100%;padding:10px;margin-bottom:12px;box-sizing:border-box;border:1px solid #ddd;border-radius:6px;">' +
    
    '<div style="display:flex;gap:8px;">' +
    '<button class="btn" onclick="simpanBiaya()" style="flex:1;background:#009688;color:white;">💾 Simpan</button>' +
    '<button class="btn btn-danger" onclick="tutupModalBiaya()">Batal</button>' +
    '</div></div>';
  
  document.body.appendChild(modal);
  
  setTimeout(function() {
    var el = document.getElementById('biayaJumlah');
    if (el) el.focus();
  }, 200);
}

function tutupModalBiaya() {
  var modal = document.getElementById('biayaModal');
  if (modal) modal.remove();
}

// ===================== SIMPAN BIAYA =====================
async function simpanBiaya() {
  var kategori = document.getElementById('biayaKategori').value.trim();
  var item = document.getElementById('biayaItem').value.trim();
  var qty = parseFloat(document.getElementById('biayaQty').value) || 0;
  var unit = document.getElementById('biayaUnit').value;
  var jumlah = parseFloat(document.getElementById('biayaJumlah').value) || 0;
  var keterangan = document.getElementById('biayaKeterangan').value.trim();
  var tanggal = document.getElementById('biayaTanggal').value || getLocalDateStr(new Date());
  
  if (!kategori) { alert('❌ Pilih kategori!'); return; }
  if (jumlah <= 0) { alert('❌ Isi total harga yang valid!'); return; }
  
  var keteranganFinal = keterangan;
  if (item) {
    keteranganFinal = item + (keterangan ? ' - ' + keterangan : '');
  }
  
  var result = await supabaseClient.from('expenses').insert({
    kategori: kategori,
    keterangan: keteranganFinal,
    qty: qty,
    unit: unit,
    jumlah: jumlah,
    tanggal: tanggal,
    created_by: currentUser.username
  });
  
  if (result.error) {
    alert('❌ Gagal menyimpan: ' + result.error.message);
    return;
  }
  
  tutupModalBiaya();
  await muatDaftarBiaya();
  alert('✅ Biaya dicatat');
}

// ===================== HAPUS BIAYA (ADMIN ONLY) =====================
async function hapusBiaya(id) {
  if (!currentUser || currentUser.role !== 'admin') {
    alert('❌ Hanya admin yang dapat menghapus biaya');
    return;
  }
  if (!confirm('Hapus biaya ini?')) return;
  await supabaseClient.from('expenses').delete().eq('id', id);
  await muatDaftarBiaya();
}

// ===================== MODAL BIAYA CEPAT =====================
function bukaBiayaCepat() {
  var modal = document.createElement('div');
  modal.id = 'biayaCepatModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  
  modal.innerHTML = '<div style="background:#fff;padding:20px;border-radius:12px;width:95%;max-width:700px;max-height:90vh;overflow-y:auto;display:flex;flex-direction:column;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
    '<h3 style="margin:0;">📝 Biaya Operasional</h3>' +
    '<button class="btn btn-danger btn-sm" onclick="document.getElementById(\'biayaCepatModal\').remove()">✕ Tutup</button>' +
    '</div>' +
    '<div id="biayaContent" style="flex:1;overflow-y:auto;"></div>' +
    '</div>';
  
  document.body.appendChild(modal);
  
  if (typeof muatDaftarBiaya === 'function') {
    muatDaftarBiaya();
  }
}

// ===================== VISIBILITY TOMBOL BIAYA =====================
function updateBiayaButtonVisibility() {
  var btn = document.getElementById('btnBiayaCepat');
  if (!btn) return;
  
  var isActive = typeof activeFeatures !== 'undefined' && activeFeatures && activeFeatures.biaya;
  
  if (currentUser && isActive) {
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
  } else {
    btn.style.display = 'none';
  }
}

// ===================== KELOLA KATEGORI (ADMIN ONLY) =====================
async function formKelolaKategori() {
  if (!currentUser || currentUser.role !== 'admin') {
    alert('Hanya admin yang dapat mengelola kategori');
    return;
  }
  
  var catList = [];
  try {
    var r = await supabaseClient.from('expense_categories').select('*').order('nama');
    catList = r.data || [];
  } catch(e) {}
  
  var modal = document.createElement('div');
  modal.id = 'kategoriModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10002;';
  
  var html = '<div style="background:#fff;padding:20px;border-radius:12px;width:360px;max-height:90vh;overflow-y:auto;">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
  html += '<h3 style="margin:0;">📁 Kelola Kategori</h3>';
  html += '<button class="btn btn-danger btn-sm" onclick="document.getElementById(\'kategoriModal\').remove()">✕</button>';
  html += '</div>';
  
  html += '<div style="background:#e8f5e9;padding:10px;border-radius:6px;margin-bottom:12px;font-size:12px;color:#2e7d32;">';
  html += '<b>Default:</b> ' + DEFAULT_CATEGORIES.join(', ');
  html += '</div>';
  
  html += '<h4 style="margin:12px 0 8px 0;font-size:14px;">Kategori Custom:</h4>';
  
  if (!catList.length) {
    html += '<p style="color:#999;font-size:13px;">Belum ada kategori custom</p>';
  } else {
    html += '<div style="border:1px solid #e0e0e0;border-radius:6px;padding:8px;">';
    catList.forEach(function(c) {
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 4px;border-bottom:1px solid #f0f0f0;">';
      html += '<span>' + c.nama + '</span>';
      html += '<button class="btn-sm btn-danger" onclick="hapusKategori(' + c.id + ')">🗑</button>';
      html += '</div>';
    });
    html += '</div>';
  }
  
  html += '<h4 style="margin:16px 0 8px 0;font-size:14px;">Tambah Kategori Baru:</h4>';
  html += '<input type="text" id="kategoriBaru" placeholder="Nama kategori..." maxlength="30" style="width:100%;padding:10px;margin-bottom:8px;box-sizing:border-box;border:1px solid #ddd;border-radius:6px;">';
  html += '<button class="btn" onclick="simpanKategoriBaru()" style="width:100%;background:#009688;color:white;">➕ Tambah Kategori</button>';
  
  html += '</div>';
  
  modal.innerHTML = html;
  document.body.appendChild(modal);
}

async function simpanKategoriBaru() {
  var nama = document.getElementById('kategoriBaru').value.trim().toUpperCase();
  if (!nama) { alert('Isi nama kategori!'); return; }
  
  if (DEFAULT_CATEGORIES.indexOf(nama) !== -1) {
    alert('❌ Kategori "' + nama + '" sudah ada di default!');
    return;
  }
  
  try {
    var check = await supabaseClient.from('expense_categories').select('*').eq('nama', nama).single();
    if (check.data) {
      alert('❌ Kategori "' + nama + '" sudah ada!');
      return;
    }
  } catch(e) {}
  
  try {
    var result = await supabaseClient.from('expense_categories').insert({ nama: nama });
    if (result.error) throw result.error;
    
    alert('✅ Kategori "' + nama + '" ditambahkan');
    
    var modal = document.getElementById('kategoriModal');
    if (modal) modal.remove();
    formKelolaKategori();
  } catch(e) {
    alert('❌ Gagal: ' + e.message);
  }
}

async function hapusKategori(id) {
  if (!confirm('Hapus kategori ini?')) return;
  try {
    await supabaseClient.from('expense_categories').delete().eq('id', id);
    alert('✅ Kategori dihapus');
    
    var modal = document.getElementById('kategoriModal');
    if (modal) modal.remove();
    formKelolaKategori();
  } catch(e) {
    alert('❌ Gagal: ' + e.message);
  }
}