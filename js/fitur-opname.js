// ===================== FITUR STOCK OPNAME =====================
var currentOpnameSession = null;

async function setupOpname() {
  await muatDaftarOpname();
}

async function muatDaftarOpname() {
  var container = document.getElementById('opnameContent');
  if (!container) return;
  
  var r = await supabaseClient.from('stock_opname_sessions').select('*').order('created_at', { ascending: false });
  var sessions = r.data || [];
  
  var html = '<button class="btn" onclick="buatOpnameBaru()">➕ Buat Opname Baru</button>';
  
  if (!sessions.length) {
    html += '<p>Belum ada sesi opname</p>';
    container.innerHTML = html;
    return;
  }
  
  html += '<table class="user-table"><thead><tr><th>Sesi</th><th>Status</th><th>Tanggal</th><th>Aksi</th></tr></thead><tbody>';
  
  sessions.forEach(function(s) {
    var statusLabel = s.status === 'draft' ? '📝 Draft' : '✅ Selesai';
    html += '<tr><td>' + s.nama + '</td><td>' + statusLabel + '</td><td>' + new Date(s.created_at).toLocaleDateString('id-ID') + '</td>';
    html += '<td>';
    if (s.status === 'draft') {
      html += '<button class="btn-sm" onclick="bukaOpname(' + s.id + ')">📝 Lanjut</button> ';
    }
    html += '<button class="btn-sm btn-danger" onclick="hapusOpname(' + s.id + ')">🗑</button></td></tr>';
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function buatOpnameBaru() {
  var nama = prompt('Nama sesi opname:', 'Opname ' + new Date().toLocaleDateString('id-ID'));
  if (!nama) return;
  
  supabaseClient.from('stock_opname_sessions').insert({
    nama: nama,
    status: 'draft',
    created_by: currentUser.username
  }).select().single().then(function(r) {
    currentOpnameSession = r.data;
    alert('✅ Sesi opname dibuat');
    muatFormOpname(r.data.id);
  });
}

async function bukaOpname(id) {
  currentOpnameSession = { id: id };
  await muatFormOpname(id);
}

async function muatFormOpname(sessionId) {
  var container = document.getElementById('opnameContent');
  if (!container) return;
  
  // Load all products
  var products = await supabaseClient.from('products').select('*').order('nama');
  var productList = products.data || [];
  window.opnameProducts = productList;
  
  // Load opname items for this session
  var items = await supabaseClient.from('stock_opname_items').select('*').eq('session_id', sessionId);
  var existingItems = items.data || [];
  
  var html = '<button class="btn btn-sm" onclick="muatDaftarOpname()">⬅ Kembali ke Daftar</button>';
  html += '<h4>📋 Input Stok Aktual</h4>';
  html += '<p style="font-size:12px;color:#666;">Scan barcode lalu input stok aktual. Selisih dihitung otomatis.</p>';
  html += '<div class="form-group"><label>Scan Barcode</label><input type="text" id="opnameBarcode" placeholder="Scan barcode..." onkeydown="if(event.key===\'Enter\'){event.preventDefault();tambahItemOpname();}"></div>';
  
  html += '<table class="user-table"><thead><tr><th>Barcode</th><th>Nama</th><th>Stok Sistem</th><th>Stok Aktual</th><th>Selisih</th></tr></thead><tbody id="opnameItemsBody">';
  
  if (existingItems.length) {
    existingItems.forEach(function(item) {
      var selisih = (item.stok_aktual || 0) - (item.stok_sistem || 0);
      html += '<tr><td>' + item.barcode + '</td><td>' + item.nama + '</td><td>' + item.stok_sistem + '</td>';
      html += '<td><input type="number" id="aktual_' + item.id + '" value="' + item.stok_aktual + '" onchange="updateSelisih(' + item.id + ')" style="width:70px;"></td>';
      html += '<td id="selisih_' + item.id + '" style="color:' + (selisih !== 0 ? '#e53935' : '#333') + ';">' + selisih + '</td></tr>';
    });
  } else {
    html += '<tr><td colspan="5">Scan barcode untuk mulai</td></tr>';
  }
  
  html += '</tbody></table>';
  html += '<button class="btn" onclick="selesaiOpname(' + sessionId + ')" style="background:#009688;margin-top:8px;">✅ Selesai Opname</button>';
  
  container.innerHTML = html;
}

async function tambahItemOpname() {
  var barcode = document.getElementById('opnameBarcode').value.trim();
  if (!barcode) return;
  
  var product = window.opnameProducts.find(function(p) { return p.barcode === barcode; });
  if (!product) {
    alert('Produk tidak ditemukan');
    return;
  }
  
  var existing = await supabaseClient.from('stock_opname_items')
    .select('*')
    .eq('session_id', currentOpnameSession.id)
    .eq('barcode', barcode)
    .single();
  
  if (existing.data) {
    alert('Produk sudah diinput');
    document.getElementById('opnameBarcode').value = '';
    return;
  }
  
  await supabaseClient.from('stock_opname_items').insert({
    session_id: currentOpnameSession.id,
    barcode: product.barcode,
    nama: product.nama,
    stok_sistem: product.stok || 0,
    stok_aktual: 0,
    selisih: 0 - (product.stok || 0)
  });
  
  document.getElementById('opnameBarcode').value = '';
  muatFormOpname(currentOpnameSession.id);
}

async function updateSelisih(itemId) {
  var actual = parseInt(document.getElementById('aktual_' + itemId).value) || 0;
  
  var item = await supabaseClient.from('stock_opname_items').select('*').eq('id', itemId).single();
  var selisih = actual - (item.data.stok_sistem || 0);
  
  await supabaseClient.from('stock_opname_items').update({
    stok_aktual: actual,
    selisih: selisih
  }).eq('id', itemId);
  
  var selisihEl = document.getElementById('selisih_' + itemId);
  if (selisihEl) {
    selisihEl.textContent = selisih;
    selisihEl.style.color = selisih !== 0 ? '#e53935' : '#333';
  }
}

async function selesaiOpname(sessionId) {
  if (!confirm('Selesaikan opname? Stok sistem akan diupdate ke stok aktual.')) return;
  
  var items = await supabaseClient.from('stock_opname_items').select('*').eq('session_id', sessionId);
  
  for (var i = 0; i < (items.data || []).length; i++) {
    var item = items.data[i];
    await supabaseClient.from('products').update({
      stok: item.stok_aktual
    }).eq('barcode', item.barcode);
  }
  
  await supabaseClient.from('stock_opname_sessions').update({
    status: 'selesai',
    completed_at: new Date().toISOString()
  }).eq('id', sessionId);
  
  alert('✅ Opname selesai! Stok diupdate.');
  currentOpnameSession = null;
  muatDaftarOpname();
  refreshProductList();
}

async function hapusOpname(id) {
  if (!confirm('Hapus sesi opname ini?')) return;
  await supabaseClient.from('stock_opname_items').delete().eq('session_id', id);
  await supabaseClient.from('stock_opname_sessions').delete().eq('id', id);
  muatDaftarOpname();
}