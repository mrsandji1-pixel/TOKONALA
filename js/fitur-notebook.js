// ===================== FITUR NOTEBOOK - SALES & KC =====================
var currentNotebookDate = null;

// ===================== SETUP =====================
async function setupNotebook() {
  // Set tanggal default hari ini
  var today = new Date();
  currentNotebookDate = getLocalDateStr(today);
  await muatNotebook();
}

function getLocalDateStr(date) {
  var y = date.getFullYear();
  var m = ('0' + (date.getMonth() + 1)).slice(-2);
  var d = ('0' + date.getDate()).slice(-2);
  return y + '-' + m + '-' + d;
}

function formatRupiah(n) {
  return 'Rp ' + (parseFloat(n) || 0).toLocaleString('id');
}

// ===================== LOAD DATA =====================
async function muatNotebook() {
  var container = document.getElementById('notebookContent');
  if (!container) return;
  
  var tanggal = currentNotebookDate || getLocalDateStr(new Date());
  
  // Ambil data sales untuk tanggal ini
  var r = await supabaseClient.from('daily_sales').select('*').eq('tanggal', tanggal).single();
  var data = r.data || {
    tanggal: tanggal,
    cash: 0, edc: 0, grab: 0, total_sales: 0,
    km: 0, pl: 0, belanja: 0, kc: 0,
    keterangan: ''
  };
  
  // Ambil total belanja dari expenses untuk tanggal yang sama
  var belanjaR = await supabaseClient.from('expenses')
    .select('jumlah')
    .eq('tanggal', tanggal);
  
  var totalBelanja = (belanjaR.data || []).reduce(function(s, e) { return s + (e.jumlah || 0); }, 0);
  
  // Set belanja otomatis dari expenses
  data.belanja = totalBelanja;
  
  // Hitung total sales & KC
  var totalSales = (data.cash || 0) + (data.edc || 0) + (data.grab || 0);
  var kc = (data.km || 0) + (data.cash || 0) + (data.pl || 0) - totalBelanja;
  
  var isAdmin = currentUser && currentUser.role === 'admin';
  
  var html = '';
  
  // Date picker
  html += '<div style="display:flex;gap:8px;margin-bottom:16px;align-items:center;flex-wrap:wrap;">';
  html += '<label style="font-size:13px;font-weight:600;color:#455a64;">Tanggal:</label>';
  html += '<input type="date" id="notebookDate" value="' + tanggal + '" onchange="gantiTanggalNotebook()" style="padding:8px 12px;border:1.5px solid #e0e4e8;border-radius:6px;font-size:14px;">';
  html += '</div>';
  
  // ================== FORM INPUT ==================
  html += '<div style="background:#f8fafb;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #e8ecf0;">';
  html += '<h4 style="margin:0 0 12px 0;color:#00695c;">💰 SALES</h4>';
  
  html += '<div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">';
  html += '<label style="flex:0 0 80px;font-size:13px;">Cash</label>';
  html += '<input type="number" id="nbCash" value="' + (data.cash || 0) + '" placeholder="0" style="flex:1;padding:10px;border:1.5px solid #e0e4e8;border-radius:6px;font-size:14px;text-align:right;" oninput="hitungNotebook()">';
  html += '</div>';
  
  html += '<div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">';
  html += '<label style="flex:0 0 80px;font-size:13px;">EDC</label>';
  html += '<input type="number" id="nbEdc" value="' + (data.edc || 0) + '" placeholder="0" style="flex:1;padding:10px;border:1.5px solid #e0e4e8;border-radius:6px;font-size:14px;text-align:right;" oninput="hitungNotebook()">';
  html += '</div>';
  
  html += '<div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">';
  html += '<label style="flex:0 0 80px;font-size:13px;">Grab</label>';
  html += '<input type="number" id="nbGrab" value="' + (data.grab || 0) + '" placeholder="0" style="flex:1;padding:10px;border:1.5px solid #e0e4e8;border-radius:6px;font-size:14px;text-align:right;" oninput="hitungNotebook()">';
  html += '</div>';
  
  html += '<div style="display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:2px solid #e0e4e8;align-items:center;">';
  html += '<label style="flex:0 0 80px;font-size:14px;font-weight:bold;color:#00695c;">SALES</label>';
  html += '<div style="flex:1;font-size:20px;font-weight:bold;color:#00695c;text-align:right;" id="nbTotalSales">' + formatRupiah(totalSales) + '</div>';
  html += '</div>';
  html += '</div>';
  
  // ================== FORM KC ==================
  html += '<div style="background:#fff8e1;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #ffe082;">';
  html += '<h4 style="margin:0 0 12px 0;color:#e65100;">📊 KC</h4>';
  
  html += '<div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">';
  html += '<label style="flex:0 0 80px;font-size:13px;">Km</label>';
  html += '<input type="number" id="nbKm" value="' + (data.km || 0) + '" placeholder="0" style="flex:1;padding:10px;border:1.5px solid #e0e4e8;border-radius:6px;font-size:14px;text-align:right;" oninput="hitungNotebook()">';
  html += '</div>';
  
  html += '<div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">';
  html += '<label style="flex:0 0 80px;font-size:13px;">Cash</label>';
  html += '<div style="flex:1;padding:10px;background:#f5f5f5;border-radius:6px;font-size:14px;text-align:right;color:#666;" id="nbCashSync">' + formatRupiah(data.cash || 0) + '</div>';
  html += '</div>';
  
  html += '<div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">';
  html += '<label style="flex:0 0 80px;font-size:13px;">PL</label>';
  html += '<input type="number" id="nbPl" value="' + (data.pl || 0) + '" placeholder="0" style="flex:1;padding:10px;border:1.5px solid #e0e4e8;border-radius:6px;font-size:14px;text-align:right;" oninput="hitungNotebook()">';
  html += '</div>';
  
  html += '<div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">';
  html += '<label style="flex:0 0 80px;font-size:13px;">Belanja</label>';
  html += '<div style="flex:1;padding:10px;background:#f5f5f5;border-radius:6px;font-size:14px;text-align:right;color:#666;" id="nbBelanjaSync">' + formatRupiah(totalBelanja) + '</div>';
  html += '</div>';
  html += '<small style="color:#e65100;font-size:11px;">💡 Belanja otomatis dari total Biaya Operasional tanggal ini</small>';
  
  html += '<div style="display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:2px solid #ffe082;align-items:center;">';
  html += '<label style="flex:0 0 80px;font-size:14px;font-weight:bold;color:#e65100;">KC</label>';
  html += '<div style="flex:1;font-size:20px;font-weight:bold;color:#e65100;text-align:right;" id="nbTotalKc">' + formatRupiah(kc) + '</div>';
  html += '</div>';
  html += '</div>';
  
  // ================== KETERANGAN ==================
  html += '<div class="form-group" style="margin-bottom:12px;">';
  html += '<label style="font-size:13px;font-weight:600;color:#455a64;">Keterangan</label>';
  html += '<input type="text" id="nbKeterangan" value="' + (data.keterangan || '') + '" placeholder="Catatan..." style="width:100%;padding:10px;border:1.5px solid #e0e4e8;border-radius:6px;font-size:14px;box-sizing:border-box;">';
  html += '</div>';
  
  // ================== TOMBOL SIMPAN ==================
  html += '<button class="btn" onclick="simpanNotebook()" style="width:100%;background:#009688;color:white;padding:14px;font-size:15px;font-weight:bold;">💾 Simpan Catatan</button>';
  
  container.innerHTML = html;
}

// ===================== HITUNG OTOMATIS =====================
function hitungNotebook() {
  var cash = parseFloat(document.getElementById('nbCash').value) || 0;
  var edc = parseFloat(document.getElementById('nbEdc').value) || 0;
  var grab = parseFloat(document.getElementById('nbGrab').value) || 0;
  var km = parseFloat(document.getElementById('nbKm').value) || 0;
  var pl = parseFloat(document.getElementById('nbPl').value) || 0;
  
  // Total Sales
  var totalSales = cash + edc + grab;
  document.getElementById('nbTotalSales').textContent = formatRupiah(totalSales);
  
  // Sync cash ke KC
  document.getElementById('nbCashSync').textContent = formatRupiah(cash);
  
  // Ambil belanja dari sync
  var belanjaText = document.getElementById('nbBelanjaSync').textContent;
  var belanja = parseFloat(belanjaText.replace(/[^0-9]/g, '')) || 0;
  
  // Total KC
  var kc = km + cash + pl - belanja;
  document.getElementById('nbTotalKc').textContent = formatRupiah(kc);
}

// ===================== GANTI TANGGAL =====================
async function gantiTanggalNotebook() {
  currentNotebookDate = document.getElementById('notebookDate').value;
  await muatNotebook();
}

// ===================== SIMPAN =====================
async function simpanNotebook() {
  var tanggal = document.getElementById('notebookDate').value;
  var cash = parseFloat(document.getElementById('nbCash').value) || 0;
  var edc = parseFloat(document.getElementById('nbEdc').value) || 0;
  var grab = parseFloat(document.getElementById('nbGrab').value) || 0;
  var km = parseFloat(document.getElementById('nbKm').value) || 0;
  var pl = parseFloat(document.getElementById('nbPl').value) || 0;
  var keterangan = document.getElementById('nbKeterangan').value.trim();
  
  if (!tanggal) { alert('❌ Pilih tanggal!'); return; }
  
  // Total sales
  var totalSales = cash + edc + grab;
  
  // Ambil belanja dari expenses
  var belanjaR = await supabaseClient.from('expenses').select('jumlah').eq('tanggal', tanggal);
  var totalBelanja = (belanjaR.data || []).reduce(function(s, e) { return s + (e.jumlah || 0); }, 0);
  
  // Total KC
  var kc = km + cash + pl - totalBelanja;
  
  var data = {
    tanggal: tanggal,
    cash: cash,
    edc: edc,
    grab: grab,
    total_sales: totalSales,
    km: km,
    pl: pl,
    belanja: totalBelanja,
    kc: kc,
    keterangan: keterangan,
    created_by: currentUser.username,
    updated_at: new Date().toISOString()
  };
  
  try {
    // Cek apakah sudah ada data untuk tanggal ini
    var check = await supabaseClient.from('daily_sales').select('id').eq('tanggal', tanggal).single();
    
    if (check.data) {
      // Update
      var result = await supabaseClient.from('daily_sales').update(data).eq('tanggal', tanggal);
      if (result.error) throw result.error;
      alert('✅ Catatan diupdate');
    } else {
      // Insert
      var result2 = await supabaseClient.from('daily_sales').insert(data);
      if (result2.error) throw result2.error;
      alert('✅ Catatan disimpan');
    }
    
    await muatNotebook();
  } catch(e) {
    alert('❌ Gagal: ' + e.message);
  }
}

// ===================== MODAL CEPAT =====================
function bukaNotebookCepat() {
  var modal = document.createElement('div');
  modal.id = 'notebookCepatModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  
  modal.innerHTML = '<div style="background:#fff;padding:20px;border-radius:12px;width:95%;max-width:600px;max-height:90vh;overflow-y:auto;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
    '<h3 style="margin:0;">📓 Notebook Sales</h3>' +
    '<button class="btn btn-danger btn-sm" onclick="document.getElementById(\'notebookCepatModal\').remove()">✕ Tutup</button>' +
    '</div>' +
    '<div id="notebookContent"></div>' +
    '</div>';
  
  document.body.appendChild(modal);
  
  if (typeof setupNotebook === 'function') {
    setupNotebook();
  }
}

// ===================== VISIBILITY TOMBOL =====================
function updateNotebookButtonVisibility() {
  var btn = document.getElementById('btnNotebookCepat');
  if (!btn) return;
  
  var isActive = typeof activeFeatures !== 'undefined' && activeFeatures && activeFeatures.notebook;
  
  if (currentUser && isActive) {
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
  } else {
    btn.style.display = 'none';
  }
}