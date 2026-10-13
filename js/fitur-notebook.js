// ===================== FITUR NOTEBOOK - SALES & KC - WITH HISTORY =====================
var currentNotebookDate = null;
var notebookHistoryMode = false;

// ===================== SETUP =====================
async function setupNotebook() {
  var today = new Date();
  currentNotebookDate = getLocalDateStr(today);
  notebookHistoryMode = false;
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

function formatTanggalIndo(dateStr) {
  if (!dateStr) return '-';
  var bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var d = new Date(dateStr + 'T00:00:00');
  return d.getDate() + ' ' + bulan[d.getMonth()] + ' ' + d.getFullYear();
}

// ===================== LOAD DATA =====================
async function muatNotebook() {
  var container = document.getElementById('notebookContent');
  if (!container) return;
  
  var tanggal = currentNotebookDate || getLocalDateStr(new Date());
  
  var r = await supabaseClient.from('daily_sales').select('*').eq('tanggal', tanggal).maybeSingle();
  var data = r.data || {
    tanggal: tanggal,
    cash: 0, edc: 0, grab: 0, total_sales: 0,
    km: 0, pl: 0, belanja: 0, kc: 0,
    keterangan: ''
  };
  
  var belanjaR = await supabaseClient.from('expenses')
    .select('jumlah')
    .eq('tanggal', tanggal);
  
  var totalBelanja = (belanjaR.data || []).reduce(function(s, e) { return s + (e.jumlah || 0); }, 0);
  
  data.belanja = totalBelanja;
  
  var totalSales = (data.cash || 0) + (data.edc || 0) + (data.grab || 0);
  var kc = (data.km || 0) + (data.cash || 0) + (data.pl || 0) - totalBelanja;
  
  var html = '';
  
  // ================== TAB SWITCHER ==================
  html += '<div style="display:flex;gap:8px;margin-bottom:16px;">';
  html += '<button class="btn btn-sm" onclick="switchNotebookTab(\'input\')" id="nbTabInput" style="flex:1;' + (!notebookHistoryMode ? 'background:#00897b;color:white;' : 'background:#e0e0e0;color:#333;') + '">📝 Input Harian</button>';
  html += '<button class="btn btn-sm" onclick="switchNotebookTab(\'history\')" id="nbTabHistory" style="flex:1;' + (notebookHistoryMode ? 'background:#00897b;color:white;' : 'background:#e0e0e0;color:#333;') + '">📅 Riwayat</button>';
  html += '</div>';
  
  if (notebookHistoryMode) {
    // ================== MODE RIWAYAT ==================
    html += '<div id="notebookHistoryContent"></div>';
    container.innerHTML = html;
    await renderNotebookHistory();
    return;
  }
  
  // ================== MODE INPUT ==================
  // Date picker dengan navigasi
  html += '<div style="display:flex;gap:8px;margin-bottom:16px;align-items:center;flex-wrap:wrap;">';
  html += '<button class="btn btn-sm" onclick="prevNotebookDay()" title="Hari sebelumnya">◀</button>';
  html += '<input type="date" id="notebookDate" value="' + tanggal + '" onchange="gantiTanggalNotebook()" style="padding:8px 12px;border:1.5px solid #e0e4e8;border-radius:6px;font-size:14px;">';
  html += '<button class="btn btn-sm" onclick="nextNotebookDay()" title="Hari berikutnya">▶</button>';
  html += '<button class="btn btn-sm" onclick="goToTodayNotebook()" style="background:#ff9800;color:white;">Hari Ini</button>';
  html += '</div>';
  
  // Info jika bukan hari ini
  var today = getLocalDateStr(new Date());
  if (tanggal !== today) {
    html += '<div style="background:#e3f2fd;padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:12px;color:#1565c0;">';
    html += '📅 Melihat data: <b>' + formatTanggalIndo(tanggal) + '</b>';
    html += '</div>';
  }
  
  // ================== FORM SALES ==================
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
  html += '<div style="flex:1;padding:10px;background:#f5f5f5;border-radius:6px;font-size:14px;text-align:right;color:#666;" id="nbBelanjaSync" data-belanja="' + totalBelanja + '">' + formatRupiah(totalBelanja) + '</div>';
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

// ===================== SWITCH TAB =====================
function switchNotebookTab(tab) {
  notebookHistoryMode = (tab === 'history');
  muatNotebook();
}

// ===================== NAVIGASI TANGGAL =====================
function prevNotebookDay() {
  var current = document.getElementById('notebookDate').value;
  var d = new Date(current + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  currentNotebookDate = getLocalDateStr(d);
  muatNotebook();
}

function nextNotebookDay() {
  var current = document.getElementById('notebookDate').value;
  var d = new Date(current + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  currentNotebookDate = getLocalDateStr(d);
  muatNotebook();
}

function goToTodayNotebook() {
  currentNotebookDate = getLocalDateStr(new Date());
  muatNotebook();
}

// ===================== HITUNG OTOMATIS =====================
function hitungNotebook() {
  var cash = parseFloat(document.getElementById('nbCash').value) || 0;
  var edc = parseFloat(document.getElementById('nbEdc').value) || 0;
  var grab = parseFloat(document.getElementById('nbGrab').value) || 0;
  var km = parseFloat(document.getElementById('nbKm').value) || 0;
  var pl = parseFloat(document.getElementById('nbPl').value) || 0;
  
  var totalSales = cash + edc + grab;
  document.getElementById('nbTotalSales').textContent = formatRupiah(totalSales);
  
  document.getElementById('nbCashSync').textContent = formatRupiah(cash);
  
  var belanjaEl = document.getElementById('nbBelanjaSync');
  var belanja = parseFloat(belanjaEl.getAttribute('data-belanja')) || 0;
  
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
  
  var totalSales = cash + edc + grab;
  
  var belanjaR = await supabaseClient.from('expenses').select('jumlah').eq('tanggal', tanggal);
  var totalBelanja = (belanjaR.data || []).reduce(function(s, e) { return s + (e.jumlah || 0); }, 0);
  
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
    var check = await supabaseClient.from('daily_sales').select('id').eq('tanggal', tanggal).maybeSingle();
    
    if (check.data) {
      var result = await supabaseClient.from('daily_sales').update(data).eq('tanggal', tanggal);
      if (result.error) throw result.error;
      alert('✅ Catatan diupdate');
    } else {
      var result2 = await supabaseClient.from('daily_sales').insert(data);
      if (result2.error) throw result2.error;
      alert('✅ Catatan disimpan');
    }
    
    await muatNotebook();
  } catch(e) {
    alert('❌ Gagal: ' + e.message);
  }
}

// ===================== RIWAYAT =====================
async function renderNotebookHistory() {
  var container = document.getElementById('notebookHistoryContent');
  if (!container) return;
  
  container.innerHTML = '<p>Memuat...</p>';
  
  var r = await supabaseClient.from('daily_sales')
    .select('*')
    .order('tanggal', { ascending: false })
    .limit(60);
  
  var data = r.data || [];
  
  if (!data.length) {
    container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">Belum ada riwayat</p>';
    return;
  }
  
  // Summary total
  var totalSalesAll = data.reduce(function(s, d) { return s + (d.total_sales || 0); }, 0);
  var totalKcAll = data.reduce(function(s, d) { return s + (d.kc || 0); }, 0);
  
  var html = '';
  
  // Summary card
  html += '<div style="display:flex;gap:8px;margin-bottom:12px;">';
  html += '<div style="flex:1;background:#e0f2f1;padding:10px;border-radius:8px;text-align:center;">';
  html += '<small style="font-size:11px;color:#00695c;">Total Sales (60 hari)</small><br>';
  html += '<strong style="font-size:14px;color:#00695c;">' + formatRupiah(totalSalesAll) + '</strong>';
  html += '</div>';
  html += '<div style="flex:1;background:#fff8e1;padding:10px;border-radius:8px;text-align:center;">';
  html += '<small style="font-size:11px;color:#e65100;">Total KC (60 hari)</small><br>';
  html += '<strong style="font-size:14px;color:#e65100;">' + formatRupiah(totalKcAll) + '</strong>';
  html += '</div>';
  html += '</div>';
  
  // Tabel riwayat
  html += '<div style="overflow-x:auto;">';
  html += '<table class="user-table" style="font-size:12px;"><thead><tr>';
  html += '<th>Tanggal</th><th>Cash</th><th>EDC</th><th>Grab</th><th>Sales</th><th>KC</th><th>Aksi</th>';
  html += '</tr></thead><tbody>';
  
  data.forEach(function(d) {
    html += '<tr>';
    html += '<td style="font-size:11px;white-space:nowrap;">' + formatTanggalIndo(d.tanggal) + '</td>';
    html += '<td style="text-align:right;font-size:11px;">' + (d.cash || 0).toLocaleString('id') + '</td>';
    html += '<td style="text-align:right;font-size:11px;">' + (d.edc || 0).toLocaleString('id') + '</td>';
    html += '<td style="text-align:right;font-size:11px;">' + (d.grab || 0).toLocaleString('id') + '</td>';
    html += '<td style="text-align:right;font-weight:bold;color:#00695c;font-size:11px;">' + (d.total_sales || 0).toLocaleString('id') + '</td>';
    html += '<td style="text-align:right;font-weight:bold;color:#e65100;font-size:11px;">' + (d.kc || 0).toLocaleString('id') + '</td>';
    html += '<td><button class="btn-sm" onclick="lihatNotebookTanggal(\'' + d.tanggal + '\')" title="Lihat">👁️</button></td>';
    html += '</tr>';
  });
  
  html += '</tbody></table>';
  html += '</div>';
  
  container.innerHTML = html;
}

async function lihatNotebookTanggal(tanggal) {
  currentNotebookDate = tanggal;
  notebookHistoryMode = false;
  await muatNotebook();
}

// ===================== MODAL CEPAT =====================
function bukaNotebookCepat() {
  var modal = document.createElement('div');
  modal.id = 'notebookCepatModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  
  modal.innerHTML = '<div style="background:#fff;padding:20px;border-radius:12px;width:95%;max-width:650px;max-height:90vh;overflow-y:auto;">' +
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