// ===================== FITUR BIAYA OPERASIONAL - WITH CUSTOM CATEGORIES =====================
var currentBiayaFilter = 'bulan-ini';

// Default kategori
var DEFAULT_CATEGORIES = ['BAR', 'KITCHEN', 'UMUM'];

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
  
  // Gabungkan default + custom (unique)
  var allCats = DEFAULT_CATEGORIES.slice();
  catList.forEach(function(c) {
    if (allCats.indexOf(c) === -1 && c) allCats.push(c);
  });
  
  return allCats;
}

// ===================== DAFTAR BIAYA =====================
async function muatDaftarBiaya() {
  var container = document.getElementById('biayaContent');
  if (!container) return;
  
  var today = new Date();
  var startDate = today.toISOString().slice(0, 10);
  var endDate = today.toISOString().slice(0, 10);
  
  if (currentBiayaFilter === 'hari-ini') {
    startDate = today.toISOString().slice(0, 10);
    endDate = today.toISOString().slice(0, 10);
  } else if (currentBiayaFilter === 'bulan-ini') {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    endDate = today.toISOString().slice(0, 10);
  }
  
  var r = await supabaseClient.from('expenses')
    .select('*')
    .gte('tanggal', startDate)
    .lte('tanggal', endDate)
    .order('tanggal', { ascending: false });
  
  var expenses = r.data || [];
  var total = expenses.reduce(function(sum, e) { return sum + (e.jumlah || 0); }, 0);
  
  var html = '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">';
  html += '<button class="btn btn-sm" onclick="filterBiaya(\'hari-ini\')" style="' + (currentBiayaFilter === 'hari-ini' ? 'background:#00897b;color:white;' : '') + '">Hari Ini</button>';
  html += '<button class="btn btn-sm" onclick="filterBiaya(\'bulan-ini\')" style="' + (currentBiayaFilter === 'bulan-ini' ? 'background:#00897b;color:white;' : '') + '">Bulan Ini</button>';
  html += '<button class="btn" onclick="formTambahBiaya()">➕ Tambah Biaya</button>';
  html += '<button class="btn btn-sm" onclick="formKelolaKategori()" style="background:#ff9800;color:white;">📁 Kelola Kategori</button>';
  html += '</div>';
  
  html += '<div style="background:#e0f2f1;padding:12px;border-radius:8px;margin-bottom:12px;">';
  html += '<small>Total Pengeluaran (' + currentBiayaFilter + ')</small><br><strong style="font-size:20px;">Rp ' + total.toLocaleString('id') + '</strong>';
  html += '</div>';
  
  if (!expenses.length) {
    html += '<p style="text-align:center;color:#999;padding:20px;">Tidak ada biaya tercatat</p>';
    container.innerHTML = html;
    return;
  }
  
  html += '<table class="user-table"><thead><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th>Jumlah</th><th>Aksi</th></tr></thead><tbody>';
  
  expenses.forEach(function(e) {
    html += '<tr><td>' + e.tanggal + '</td><td><b>' + e.kategori + '</b></td><td>' + (e.keterangan || '-') + '</td><td>Rp ' + (e.jumlah||0).toLocaleString('id') + '</td>';
    html += '<td><button class="btn-sm btn-danger" onclick="hapusBiaya(' + e.id + ')">🗑</button></td></tr>';
  });
  
  html += '</tbody></table>';
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
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  
  var catOptions = '';
  allCats.forEach(function(c) {
    catOptions += '<option value="' + c + '">' + c + '</option>';
  });
  
  modal.innerHTML = '<div style="background:#fff;padding:20px;border-radius:12px;width:340px;max-height:90vh;overflow-y:auto;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
    '<h3 style="margin:0;">➕ Tambah Biaya</h3>' +
    '<button class="btn btn-danger btn-sm" onclick="tutupModalBiaya()">✕</button>' +
    '</div>' +
    '<label style="font-size:13px;font-weight:600;color:#455a64;">Tanggal</label>' +
    '<input type="date" id="biayaTanggal" style="width:100%;padding:10px;margin-bottom:8px;box-sizing:border-box;border:1px solid #ddd;border-radius:6px;" value="' + new Date().toISOString().slice(0, 10) + '">' +
    '<label style="font-size:13px;font-weight:600;color:#455a64;">Kategori</label>' +
    '<select id="biayaKategori" style="width:100%;padding:10px;margin-bottom:8px;border:1px solid #ddd;border-radius:6px;">' +
    '<option value="">-- Pilih Kategori --</option>' +
    catOptions +
    '</select>' +
    '<label style="font-size:13px;font-weight:600;color:#455a64;">Jumlah (Rp)</label>' +
    '<input type="number" id="biayaJumlah" placeholder="0" style="width:100%;padding:10px;margin-bottom:8px;box-sizing:border-box;border:1px solid #ddd;border-radius:6px;">' +
    '<label style="font-size:13px;font-weight:600;color:#455a64;">Keterangan (opsional)</label>' +
    '<input type="text" id="biayaKeterangan" placeholder="Keterangan..." style="width:100%;padding:10px;margin-bottom:12px;box-sizing:border-box;border:1px solid #ddd;border-radius:6px;">' +
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
  var keterangan = document.getElementById('biayaKeterangan').value.trim();
  var jumlah = parseFloat(document.getElementById('biayaJumlah').value) || 0;
  var tanggal = document.getElementById('biayaTanggal').value || new Date().toISOString().slice(0, 10);
  
  if (!kategori) { alert('❌ Pilih kategori!'); return; }
  if (jumlah <= 0) { alert('❌ Isi jumlah yang valid!'); return; }
  
  var result = await supabaseClient.from('expenses').insert({
    kategori: kategori,
    keterangan: keterangan,
    jumlah: jumlah,
    tanggal: tanggal,
    created_by: currentUser.username
  });
  
  if (result.error) {
    alert('❌ Gagal menyimpan: ' + result.error.message);
    return;
  }
  
  tutupModalBiaya();
  alert('✅ Biaya dicatat');
  muatDaftarBiaya();
}

async function hapusBiaya(id) {
  if (!confirm('Hapus biaya ini?')) return;
  await supabaseClient.from('expenses').delete().eq('id', id);
  muatDaftarBiaya();
}

// ===================== KELOLA KATEGORI =====================
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
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10001;';
  
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
  
  // Cek duplikat dengan default
  if (DEFAULT_CATEGORIES.indexOf(nama) !== -1) {
    alert('❌ Kategori "' + nama + '" sudah ada di default!');
    return;
  }
  
  try {
    // Cek apakah sudah ada di database
    var check = await supabaseClient.from('expense_categories').select('*').eq('nama', nama).single();
    if (check.data) {
      alert('❌ Kategori "' + nama + '" sudah ada!');
      return;
    }
  } catch(e) {
    // Tidak ditemukan, lanjut insert
  }
  
  try {
    var result = await supabaseClient.from('expense_categories').insert({ nama: nama });
    if (result.error) throw result.error;
    
    alert('✅ Kategori "' + nama + '" ditambahkan');
    
    // Refresh modal
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
    
    // Refresh modal
    var modal = document.getElementById('kategoriModal');
    if (modal) modal.remove();
    formKelolaKategori();
  } catch(e) {
    alert('❌ Gagal: ' + e.message);
  }
}