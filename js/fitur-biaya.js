// ===================== FITUR BIAYA OPERASIONAL =====================
var currentBiayaFilter = 'bulan-ini';

async function setupBiaya() {
  await muatDaftarBiaya();
}

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
  html += '<button class="btn btn-sm" onclick="filterBiaya(\'hari-ini\')">Hari Ini</button>';
  html += '<button class="btn btn-sm" onclick="filterBiaya(\'bulan-ini\')">Bulan Ini</button>';
  html += '<button class="btn" onclick="formTambahBiaya()">➕ Tambah Biaya</button>';
  html += '</div>';
  
  html += '<div style="background:#e0f2f1;padding:12px;border-radius:8px;margin-bottom:12px;">';
  html += '<small>Total Pengeluaran (' + currentBiayaFilter + ')</small><br><strong style="font-size:20px;">Rp ' + total.toLocaleString('id') + '</strong>';
  html += '</div>';
  
  if (!expenses.length) {
    html += '<p>Tidak ada biaya tercatat</p>';
    container.innerHTML = html;
    return;
  }
  
  html += '<table class="user-table"><thead><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th>Jumlah</th><th>Aksi</th></tr></thead><tbody>';
  
  expenses.forEach(function(e) {
    html += '<tr><td>' + e.tanggal + '</td><td>' + e.kategori + '</td><td>' + (e.keterangan || '-') + '</td><td>Rp ' + (e.jumlah||0).toLocaleString('id') + '</td>';
    html += '<td><button class="btn-sm btn-danger" onclick="hapusBiaya(' + e.id + ')">🗑</button></td></tr>';
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

async function filterBiaya(periode) {
  currentBiayaFilter = periode;
  await muatDaftarBiaya();
}

async function formTambahBiaya() {
  var categories = await supabaseClient.from('expense_categories').select('*').order('nama');
  var catList = categories.data || [];
  
  var modal = document.createElement('div');
  modal.id = 'biayaModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  
  var catOptions = '';
  catList.forEach(function(c) {
    catOptions += '<option value="' + c.nama + '">' + c.nama + '</option>';
  });
  
  modal.innerHTML = '<div style="background:#fff;padding:20px;border-radius:12px;width:320px;text-align:center;">' +
    '<h3>➕ Tambah Biaya</h3>' +
    '<select id="biayaKategori" style="width:100%;padding:10px;margin-bottom:8px;border:1px solid #ddd;border-radius:6px;">' + catOptions + '</select>' +
    '<input type="text" id="biayaKeterangan" placeholder="Keterangan (opsional)" style="width:100%;padding:10px;margin-bottom:8px;box-sizing:border-box;border:1px solid #ddd;border-radius:6px;">' +
    '<input type="number" id="biayaJumlah" placeholder="Jumlah (Rp)" style="width:100%;padding:10px;margin-bottom:8px;box-sizing:border-box;border:1px solid #ddd;border-radius:6px;">' +
    '<input type="date" id="biayaTanggal" style="width:100%;padding:10px;margin-bottom:8px;box-sizing:border-box;border:1px solid #ddd;border-radius:6px;" value="' + new Date().toISOString().slice(0, 10) + '">' +
    '<div style="display:flex;gap:8px;">' +
    '<button class="btn" onclick="simpanBiaya()" style="flex:1;background:#009688;color:white;">Simpan</button>' +
    '<button class="btn btn-danger" onclick="tutupModalBiaya()">Batal</button>' +
    '</div></div>';
  
  document.body.appendChild(modal);
}

function tutupModalBiaya() {
  var modal = document.getElementById('biayaModal');
  if (modal) modal.remove();
}

async function simpanBiaya() {
  var kategori = document.getElementById('biayaKategori').value;
  var keterangan = document.getElementById('biayaKeterangan').value.trim();
  var jumlah = parseFloat(document.getElementById('biayaJumlah').value) || 0;
  var tanggal = document.getElementById('biayaTanggal').value || new Date().toISOString().slice(0, 10);
  
  if (!kategori || !jumlah) {
    alert('Isi kategori dan jumlah');
    return;
  }
  
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