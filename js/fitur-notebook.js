// ===================== FITUR NOTEBOOK - CLEAN v2 =====================
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

function formatAngka(n) {
  return (parseFloat(n) || 0).toLocaleString('id');
}

function formatTanggalIndo(dateStr) {
  if (!dateStr) return '-';
  var bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var d = new Date(dateStr + 'T00:00:00');
  return d.getDate() + ' ' + bulan[d.getMonth()] + ' ' + d.getFullYear();
}

function formatTanggalLengkap(dateStr) {
  if (!dateStr) return '-';
  var hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var d = new Date(dateStr + 'T00:00:00');
  return hari[d.getDay()] + ', ' + d.getDate() + ' ' + bulan[d.getMonth()] + ' ' + d.getFullYear();
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
  
  var isToday = tanggal === getLocalDateStr(new Date());
  
  var html = '';
  
  // ================== TAB SWITCHER ==================
  html += '<div style="display:flex;gap:6px;margin-bottom:8px;">';
  html += '<button onclick="switchNotebookTab(\'input\')" style="flex:1;padding:6px;font-size:12px;border:none;border-radius:6px;font-weight:600;cursor:pointer;' + (!notebookHistoryMode ? 'background:#00897b;color:white;' : 'background:#e0e0e0;color:#333;') + '">📝 Input</button>';
  html += '<button onclick="switchNotebookTab(\'history\')" style="flex:1;padding:6px;font-size:12px;border:none;border-radius:6px;font-weight:600;cursor:pointer;' + (notebookHistoryMode ? 'background:#00897b;color:white;' : 'background:#e0e0e0;color:#333;') + '">📅 Riwayat</button>';
  html += '</div>';
  
  if (notebookHistoryMode) {
    html += '<div id="notebookHistoryContent"></div>';
    container.innerHTML = html;
    await renderNotebookHistory();
    return;
  }
  
  // ================== HEADER TANGGAL (SATU BARIS) ==================
  html += '<div style="display:flex;align-items:center;gap:4px;margin-bottom:8px;background:#e0f2f1;padding:6px;border-radius:6px;">';
  html += '<button onclick="prevNotebookDay()" style="background:white;border:none;font-size:14px;cursor:pointer;padding:4px 10px;border-radius:4px;font-weight:bold;color:#00695c;">◀</button>';
  html += '<div style="flex:1;text-align:center;position:relative;">';
  html += '<input type="date" id="notebookDate" value="' + tanggal + '" onchange="gantiTanggalNotebook()" style="width:100%;background:transparent;border:none;text-align:center;font-size:13px;font-weight:bold;color:#00695c;cursor:pointer;font-family:inherit;padding:4px;" />';
  html += '</div>';
  html += '<button onclick="nextNotebookDay()" style="background:white;border:none;font-size:14px;cursor:pointer;padding:4px 10px;border-radius:4px;font-weight:bold;color:#00695c;">▶</button>';
  html += '</div>';
  
  // Tombol Hari Ini jika bukan hari ini
  if (!isToday) {
    html += '<div style="text-align:center;margin-bottom:8px;">';
    html += '<button onclick="goToTodayNotebook()" style="padding:3px 12px;font-size:11px;background:#ff9800;color:white;border:none;border-radius:12px;cursor:pointer;font-weight:600;">↩️ Kembali ke Hari Ini</button>';
    html += '</div>';
  }
  
  // ================== SALES ==================
  html += '<div style="background:#f8fafb;border-radius:8px;padding:8px;margin-bottom:6px;border:1px solid #e8ecf0;">';
  html += '<div style="font-size:11px;font-weight:bold;color:#00695c;margin-bottom:4px;">💰 SALES</div>';
  
  html += '<div style="display:flex;gap:4px;margin-bottom:3px;align-items:center;">';
  html += '<label style="flex:0 0 45px;font-size:11px;color:#666;">Cash</label>';
  html += '<input type="number" id="nbCash" value="' + (data.cash || 0) + '" oninput="hitungNotebook()" style="flex:1;padding:4px 6px;border:1px solid #e0e4e8;border-radius:4px;font-size:12px;text-align:right;font-weight:600;">';
  html += '</div>';
  
  html += '<div style="display:flex;gap:4px;margin-bottom:3px;align-items:center;">';
  html += '<label style="flex:0 0 45px;font-size:11px;color:#666;">EDC</label>';
  html += '<input type="number" id="nbEdc" value="' + (data.edc || 0) + '" oninput="hitungNotebook()" style="flex:1;padding:4px 6px;border:1px solid #e0e4e8;border-radius:4px;font-size:12px;text-align:right;font-weight:600;">';
  html += '</div>';
  
  html += '<div style="display:flex;gap:4px;margin-bottom:3px;align-items:center;">';
  html += '<label style="flex:0 0 45px;font-size:11px;color:#666;">Grab</label>';
  html += '<input type="number" id="nbGrab" value="' + (data.grab || 0) + '" oninput="hitungNotebook()" style="flex:1;padding:4px 6px;border:1px solid #e0e4e8;border-radius:4px;font-size:12px;text-align:right;font-weight:600;">';
  html += '</div>';
  
  html += '<div style="display:flex;gap:4px;margin-top:5px;padding-top:5px;border-top:1px dashed #cfd8dc;align-items:center;">';
  html += '<label style="flex:0 0 45px;font-size:11px;font-weight:bold;color:#00695c;">SALES</label>';
  html += '<div style="flex:1;font-size:15px;font-weight:bold;color:#00695c;text-align:right;" id="nbTotalSales">' + formatAngka(totalSales) + '</div>';
  html += '</div>';
  html += '</div>';
  
  // ================== KC ==================
  html += '<div style="background:#fff8e1;border-radius:8px;padding:8px;margin-bottom:6px;border:1px solid #ffe082;">';
  html += '<div style="font-size:11px;font-weight:bold;color:#e65100;margin-bottom:4px;">📊 KC</div>';
  
  html += '<div style="display:flex;gap:4px;margin-bottom:3px;align-items:center;">';
  html += '<label style="flex:0 0 45px;font-size:11px;color:#666;">Km</label>';
  html += '<input type="number" id="nbKm" value="' + (data.km || 0) + '" oninput="hitungNotebook()" style="flex:1;padding:4px 6px;border:1px solid #e0e4e8;border-radius:4px;font-size:12px;text-align:right;font-weight:600;">';
  html += '</div>';
  
  html += '<div style="display:flex;gap:4px;margin-bottom:3px;align-items:center;">';
  html += '<label style="flex:0 0 45px;font-size:11px;color:#666;">Cash</label>';
  html += '<div style="flex:1;padding:4px 6px;background:#fff;border-radius:4px;font-size:12px;text-align:right;color:#999;font-weight:600;border:1px dashed #e0e0e0;" id="nbCashSync">' + formatAngka(data.cash || 0) + '</div>';
  html += '</div>';
  
  html += '<div style="display:flex;gap:4px;margin-bottom:3px;align-items:center;">';
  html += '<label style="flex:0 0 45px;font-size:11px;color:#666;">PL</label>';
  html += '<input type="number" id="nbPl" value="' + (data.pl || 0) + '" oninput="hitungNotebook()" style="flex:1;padding:4px 6px;border:1px solid #e0e4e8;border-radius:4px;font-size:12px;text-align:right;font-weight:600;">';
  html += '</div>';
  
  html += '<div style="display:flex;gap:4px;margin-bottom:3px;align-items:center;">';
  html += '<label style="flex:0 0 45px;font-size:11px;color:#666;">Belanja</label>';
  html += '<div style="flex:1;padding:4px 6px;background:#fff;border-radius:4px;font-size:12px;text-align:right;color:#e65100;font-weight:600;border:1px dashed #e0e0e0;" id="nbBelanjaSync" data-belanja="' + totalBelanja + '">' + formatAngka(totalBelanja) + '</div>';
  html += '</div>';
  
  html += '<div style="display:flex;gap:4px;margin-top:5px;padding-top:5px;border-top:1px dashed #ffe082;align-items:center;">';
  html += '<label style="flex:0 0 45px;font-size:11px;font-weight:bold;color:#e65100;">KC</label>';
  html += '<div style="flex:1;font-size:15px;font-weight:bold;color:#e65100;text-align:right;" id="nbTotalKc">' + formatAngka(kc) + '</div>';
  html += '</div>';
  html += '</div>';
  
  // ================== KETERANGAN ==================
  html += '<div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">';
  html += '<label style="flex:0 0 45px;font-size:11px;color:#666;">Note</label>';
  html += '<input type="text" id="nbKeterangan" value="' + (data.keterangan || '') + '" placeholder="Catatan..." style="flex:1;padding:5px 6px;border:1px solid #e0e4e8;border-radius:4px;font-size:11px;">';
  html += '</div>';
  
  // ================== TOMBOL SIMPAN ==================
  html += '<button onclick="simpanNotebook()" style="width:100%;background:#009688;color:white;padding:8px;font-size:12px;font-weight:bold;border:none;border-radius:6px;cursor:pointer;">💾 Simpan</button>';
  
  container.innerHTML = html;
}

// ===================== SWITCH TAB =====================
function switchNotebookTab(tab) {
  notebookHistoryMode = (tab === 'history');
  muatNotebook();
}

// ===================== NAVIGASI TANGGAL =====================
function prevNotebookDay() {
  var current = currentNotebookDate || getLocalDateStr(new Date());
  var d = new Date(current + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  currentNotebookDate = getLocalDateStr(d);
  muatNotebook();
}

function nextNotebookDay() {
  var current = currentNotebookDate || getLocalDateStr(new Date());
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
  document.getElementById('nbTotalSales').textContent = formatAngka(totalSales);
  
  document.getElementById('nbCashSync').textContent = formatAngka(cash);
  
  var belanjaEl = document.getElementById('nbBelanjaSync');
  var belanja = parseFloat(belanjaEl.getAttribute('data-belanja')) || 0;
  
  var kc = km + cash + pl - belanja;
  document.getElementById('nbTotalKc').textContent = formatAngka(kc);
}

// ===================== GANTI TANGGAL =====================
async function gantiTanggalNotebook() {
  currentNotebookDate = document.getElementById('notebookDate').value;
  await muatNotebook();
}

// ===================== SIMPAN =====================
async function simpanNotebook() {
  var tanggal = currentNotebookDate || document.getElementById('notebookDate').value;
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
  
  container.innerHTML = '<p style="text-align:center;color:#999;font-size:12px;">Memuat...</p>';
  
  var r = await supabaseClient.from('daily_sales')
    .select('*')
    .order('tanggal', { ascending: false })
    .limit(30);
  
  var data = r.data || [];
  
  if (!data.length) {
    container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;font-size:12px;">Belum ada riwayat</p>';
    return;
  }
  
  var totalSalesAll = data.reduce(function(s, d) { return s + (d.total_sales || 0); }, 0);
  var totalKcAll = data.reduce(function(s, d) { return s + (d.kc || 0); }, 0);
  
  var html = '';
  
  html += '<div style="display:flex;gap:6px;margin-bottom:8px;">';
  html += '<div style="flex:1;background:#e0f2f1;padding:6px;border-radius:6px;text-align:center;">';
  html += '<div style="font-size:10px;color:#00695c;">Total Sales</div>';
  html += '<div style="font-size:12px;font-weight:bold;color:#00695c;">' + formatAngka(totalSalesAll) + '</div>';
  html += '</div>';
  html += '<div style="flex:1;background:#fff8e1;padding:6px;border-radius:6px;text-align:center;">';
  html += '<div style="font-size:10px;color:#e65100;">Total KC</div>';
  html += '<div style="font-size:12px;font-weight:bold;color:#e65100;">' + formatAngka(totalKcAll) + '</div>';
  html += '</div>';
  html += '</div>';
  
  html += '<table style="width:100%;border-collapse:collapse;font-size:11px;">';
  html += '<thead><tr style="background:#f0f4f8;">';
  html += '<th style="padding:5px 3px;text-align:left;font-size:10px;color:#666;">Tanggal</th>';
  html += '<th style="padding:5px 3px;text-align:right;font-size:10px;color:#666;">Sales</th>';
  html += '<th style="padding:5px 3px;text-align:right;font-size:10px;color:#666;">KC</th>';
  html += '<th style="padding:5px 3px;width:40px;"></th>';
  html += '</tr></thead><tbody>';
  
  data.forEach(function(d) {
    html += '<tr style="border-bottom:1px solid #f0f0f0;">';
    html += '<td style="padding:4px 3px;font-size:11px;">' + formatTanggalIndo(d.tanggal) + '</td>';
    html += '<td style="text-align:right;font-weight:bold;color:#00695c;font-size:11px;padding:4px 3px;">' + formatAngka(d.total_sales || 0) + '</td>';
    html += '<td style="text-align:right;font-weight:bold;color:#e65100;font-size:11px;padding:4px 3px;">' + formatAngka(d.kc || 0) + '</td>';
    html += '<td style="padding:4px 3px;"><button onclick="lihatNotebookTanggal(\'' + d.tanggal + '\')" style="background:#009688;color:white;border:none;border-radius:3px;padding:2px 6px;font-size:10px;cursor:pointer;">Lihat</button></td>';
    html += '</tr>';
  });
  
  html += '</tbody></table>';
  
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
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;padding:10px;box-sizing:border-box;';
  
  modal.innerHTML = '<div style="background:#fff;padding:10px;border-radius:10px;width:100%;max-width:360px;max-height:96vh;overflow-y:auto;box-shadow:0 10px 40px rgba(0,0,0,0.2);">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
    '<h3 style="margin:0;font-size:14px;">📓 Notebook Sales</h3>' +
    '<button onclick="document.getElementById(\'notebookCepatModal\').remove()" style="background:#e53935;color:white;border:none;border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer;font-weight:600;">✕</button>' +
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