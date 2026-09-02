// ===================== SETTING.JS - FIXED VERSION =====================
window.logoTokoDihapus = false;

// ===================== SETTING POPUP FUNCTIONS =====================
function bukaPopupSetting(jenis) {
  var modalId = 'modal' + jenis.charAt(0).toUpperCase() + jenis.slice(1);
  var modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    // Force reflow
    void modal.offsetWidth;
    modal.classList.add('modal-show');
    
    // FIXED: Load data based on modal type
    if (jenis === 'user') {
      // FIXED: Use tampilkanUserList instead of muatUserList
      if (typeof tampilkanUserList === 'function') {
        tampilkanUserList();
      }
    }
    if (jenis === 'profil') {
      if (typeof muatProfilToko === 'function') {
        muatProfilToko();
      }
    }
    if (jenis === 'laporan') {
      if (typeof muatProfilToko === 'function') {
        muatProfilToko();
      }
    }
  }
}

function tutupPopupSetting(jenis) {
  var modalId = 'modal' + jenis.charAt(0).toUpperCase() + jenis.slice(1);
  var modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('modal-show');
    setTimeout(function() {
      modal.style.display = 'none';
    }, 200);
  }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('setting-modal')) {
    e.target.classList.remove('modal-show');
    setTimeout(function() {
      e.target.style.display = 'none';
    }, 200);
  }
});

async function muatProfilToko() {
  try {
    var s = await getSettings();
    
    // FIXED: Check if elements exist before setting values
    var setVal = function(id, val) {
      var el = document.getElementById(id);
      if (el) el.value = val || '';
    };
    
    if (s) {
      setVal('tokoNama', s.nama);
      setVal('tokoAlamat', s.alamat);
      setVal('tokoTelp', s.telp);
      setVal('tokoFooter', s.footer);
      setVal('kertasLebar', s.kertas_lebar || '80');
      setVal('jenisKertas', s.jenis_kertas || 'thermal');
      setVal('printerPilihan', s.printer || 'default');
      setVal('labelWidth', s.label_width || 50);
      setVal('labelHeight', s.label_height || 30);
      setVal('labelGap', s.label_gap || 3);
      setVal('paperCols', s.label_cols || 1);
      
      // FIXED: Also set label printer modal fields
      setVal('labelWidthMM', s.label_width_mm || 33);
      setVal('labelHeightMM', s.label_height_mm || 15);
      setVal('labelGapMM', s.label_gap_mm || 2);
      setVal('labelOffsetX', s.label_offset_x || 20);
      setVal('labelOffsetY', s.label_offset_y || 0);
      setVal('labelCols', s.label_cols || 2);
      setVal('labelQty', s.label_qty || 10);
      setVal('labelPrinterModel', s.label_printer_model || 'AD240');
      setVal('labelDirection', s.label_direction || '0');
      
      toggleLabelSettings();
      
      var logoPreview = document.getElementById('logoPreview');
      var logoContainer = document.getElementById('logoPreviewContainer');
      if (logoPreview && logoContainer) {
        if (s.logo) { 
          logoPreview.src = s.logo; 
          logoContainer.style.display = 'block'; 
        } else {
          logoContainer.style.display = 'none';
        }
      }
      
      setVal('reportEmail', s.report_email);
      setVal('reportFrequency', s.report_frequency || 'none');
      setVal('dailyTime', s.report_daily_time || '21');
      setVal('weeklyDay', s.report_weekly_day || '1');
      setVal('weeklyTime', s.report_weekly_time || '21');
      setVal('monthlyDate', s.report_monthly_date || '1');
      setVal('monthlyTime', s.report_monthly_time || '21');
      
      toggleReportOptions();
    } else {
      setVal('tokoNama', '');
      setVal('tokoAlamat', '');
      setVal('tokoTelp', '');
      setVal('tokoFooter', '');
      setVal('kertasLebar', '80');
      setVal('jenisKertas', 'thermal');
      setVal('printerPilihan', 'default');
      setVal('labelWidth', 50);
      setVal('labelHeight', 30);
      setVal('labelGap', 3);
      setVal('paperCols', 1);
      
      toggleLabelSettings();
      
      var logoContainer = document.getElementById('logoPreviewContainer');
      if (logoContainer) logoContainer.style.display = 'none';
      
      setVal('reportEmail', '');
      setVal('reportFrequency', 'none');
      setVal('dailyTime', '21');
      setVal('weeklyDay', '1');
      setVal('weeklyTime', '21');
      setVal('monthlyDate', '1');
      setVal('monthlyTime', '21');
      
      toggleReportOptions();
    }
  } catch(e) {
    console.error('muatProfilToko error:', e);
  }
}

function toggleLabelSettings() { 
  var jenisKertas = document.getElementById('jenisKertas');
  var labelSettings = document.getElementById('labelSettings');
  if (jenisKertas && labelSettings) {
    labelSettings.style.display = jenisKertas.value === 'label' ? 'block' : 'none'; 
  }
}

function toggleReportOptions() { 
  var f = document.getElementById('reportFrequency');
  if (!f) return;
  var dailyOpt = document.getElementById('dailyOptions');
  var weeklyOpt = document.getElementById('weeklyOptions');
  var monthlyOpt = document.getElementById('monthlyOptions');
  
  if (dailyOpt) dailyOpt.style.display = f.value === 'daily' ? 'block' : 'none';
  if (weeklyOpt) weeklyOpt.style.display = f.value === 'weekly' ? 'block' : 'none';
  if (monthlyOpt) monthlyOpt.style.display = f.value === 'monthly' ? 'block' : 'none';
}

async function simpanPengaturanLaporan() {
  var e = document.getElementById('reportEmail').value.trim();
  var f = document.getElementById('reportFrequency').value;
  var dt = document.getElementById('dailyTime').value;
  var wd = document.getElementById('weeklyDay').value;
  var wt = document.getElementById('weeklyTime').value;
  var md = document.getElementById('monthlyDate').value;
  var mt = document.getElementById('monthlyTime').value;
  
  if (f !== 'none' && !e) { alert('Silakan isi email tujuan terlebih dahulu.'); return; }
  
  await updateSettings({ 
    report_email: e, 
    report_frequency: f, 
    report_daily_time: dt, 
    report_weekly_day: wd, 
    report_weekly_time: wt, 
    report_monthly_date: md, 
    report_monthly_time: mt 
  });
  
  alert('✅ Pengaturan laporan disimpan!'); 
  localStorage.removeItem('lastReportSent'); 
  localStorage.removeItem('lastReportSchedule');
}

async function tesKirimLaporan() { 
  var e = document.getElementById('reportEmail').value.trim(); 
  if (!e) { alert('Isi email tujuan terlebih dahulu.'); return; } 
  await simpanPengaturanLaporan(); 
  var s = await getSettings(); 
  var t = new Date(); 
  try { 
    await sendEmailResend(e, '📊 TES - Laporan POS', '✅ Ini adalah email percobaan.\n\nToko: ' + (s.nama || 'POS') + '\nTanggal: ' + t.toLocaleDateString('id-ID')); 
    alert('✅ Email tes berhasil dikirim!'); 
  } catch (er) { 
    alert('❌ Gagal mengirim email. Pastikan backend email sudah dikonfigurasi.\n\nError: ' + er.message); 
  } 
}

function previewLogoToko() { 
  var f = document.getElementById('tokoLogo').files[0]; 
  if (f) { 
    var r = new FileReader(); 
    r.onload = function(e) { 
      var preview = document.getElementById('logoPreview');
      var container = document.getElementById('logoPreviewContainer');
      if (preview && container) {
        preview.src = e.target.result; 
        container.style.display = 'block'; 
      }
    }; 
    r.readAsDataURL(f); 
    window.logoTokoDihapus = false; 
  } 
}

function hapusLogoToko() { 
  var preview = document.getElementById('logoPreview');
  var container = document.getElementById('logoPreviewContainer');
  var input = document.getElementById('tokoLogo');
  
  if (preview) preview.src = ''; 
  if (container) container.style.display = 'none'; 
  if (input) input.value = ''; 
  window.logoTokoDihapus = true; 
}

async function simpanProfil() {
  if (!currentUser || currentUser.role !== 'admin') return;
  
  var n = document.getElementById('tokoNama').value;
  var a = document.getElementById('tokoAlamat').value;
  var t = document.getElementById('tokoTelp').value;
  var f = document.getElementById('tokoFooter').value;
  var kl = document.getElementById('kertasLebar').value;
  var jk = document.getElementById('jenisKertas').value;
  var pr = document.getElementById('printerPilihan').value;
  var lw = parseFloat(document.getElementById('labelWidth').value) || 50;
  var lh = parseFloat(document.getElementById('labelHeight').value) || 30;
  var lg = parseFloat(document.getElementById('labelGap').value) || 3;
  var lc = parseInt(document.getElementById('paperCols').value) || 1;
  
  var logo = null; 
  if (!window.logoTokoDihapus) { 
    var fi = document.getElementById('tokoLogo'); 
    if (fi && fi.files[0]) { 
      logo = await toBase64(fi.files[0]); 
    } else { 
      var ss = await getSettings(); 
      logo = ss.logo || null; 
    } 
  }
  
  await updateSettings({ 
    nama: n, alamat: a, telp: t, logo: logo, footer: f, 
    kertas_lebar: kl, jenis_kertas: jk, printer: pr, 
    label_width: lw, label_height: lh, label_gap: lg, label_cols: lc 
  });
  
  alert('Profil disimpan!'); 
  window.logoTokoDihapus = false; 
  var input = document.getElementById('tokoLogo');
  if (input) input.value = ''; 
  if (typeof invalidateSettingsCache === 'function') invalidateSettingsCache(); 
  await muatProfilToko();
}

async function simpanPengaturanCetak() { 
  var s = await getSettings(); 
  
  // FIXED: Also save label printer settings
  await updateSettings({ 
    ...s, 
    kertas_lebar: document.getElementById('kertasLebar').value, 
    jenis_kertas: document.getElementById('jenisKertas').value, 
    printer: document.getElementById('printerPilihan').value, 
    label_width: parseFloat(document.getElementById('labelWidth').value) || 50, 
    label_height: parseFloat(document.getElementById('labelHeight').value) || 30, 
    label_gap: parseFloat(document.getElementById('labelGap').value) || 3, 
    label_cols: parseInt(document.getElementById('paperCols').value) || 1,
    label_width_mm: parseFloat(document.getElementById('labelWidthMM').value) || 33,
    label_height_mm: parseFloat(document.getElementById('labelHeightMM').value) || 15,
    label_gap_mm: parseFloat(document.getElementById('labelGapMM').value) || 2,
    label_offset_x: parseFloat(document.getElementById('labelOffsetX').value) || 20,
    label_offset_y: parseFloat(document.getElementById('labelOffsetY').value) || 0,
    label_direction: document.getElementById('labelDirection').value || '0',
    label_qty: parseInt(document.getElementById('labelQty').value) || 10,
    label_printer_model: document.getElementById('labelPrinterModel').value || 'AD240'
  }); 
  
  alert('Pengaturan cetak disimpan!'); 
  if (typeof invalidateSettingsCache === 'function') invalidateSettingsCache(); 
}

function aturHakAkses() {
  var role = currentUser ? currentUser.role : 'kasir';
  var isAdmin = role === 'admin';
  var isKasir = role === 'kasir';
  var isStaff = role === 'staff';
  var isGudang = role === 'gudang';
  
  // FIXED: Check if elements exist before setting display
  var setDisplay = function(id, show) {
    var el = document.getElementById(id);
    if (el) el.style.display = show ? 'flex' : 'none';
  };
  
  setDisplay('settingItemProfil', isAdmin);
  setDisplay('settingItemFitur', isAdmin);
  setDisplay('settingItemLaporan', isAdmin);
  setDisplay('settingItemCetak', isAdmin || isKasir);
  setDisplay('settingItemUser', isAdmin);
  setDisplay('settingItemData', isAdmin);
  
  // Existing access control
  var thAksi = document.getElementById('thAksi');
  if (thAksi) thAksi.style.display = (isAdmin || isGudang) ? '' : 'none';
  
  var bb = document.querySelector('button[onclick="bayarDanCetak()"]'); 
  if (bb) bb.style.display = (isAdmin || isKasir) ? '' : 'none';
  
  var ps = document.getElementById('pembayaranSummary'); 
  if (ps) ps.style.display = (isAdmin || isKasir) ? '' : 'none';
  
  setTimeout(function() { 
    document.querySelectorAll('button[onclick^="editDiskonItem"], button[onclick^="bukaPopupDiskonTotal"]').forEach(function(b) { 
      if (!isAdmin) b.style.display = 'none'; 
    }); 
  }, 500);
  
  var es = document.querySelector('#page-laporan div[style*="margin-top:12px"]'); 
  if (es) es.style.display = isAdmin ? '' : 'none';
  
  if (typeof activeTab !== 'undefined' && activeTab === 'inventory' && typeof refreshProductList === 'function') refreshProductList(); 
  if (typeof activeTab !== 'undefined' && activeTab === 'laporan' && typeof muatLaporan === 'function') muatLaporan();
}

async function pilihFolder() { 
  try { 
    if (typeof window.showDirectoryPicker === 'function') {
      var d = await window.showDirectoryPicker(); 
      workingDirHandle = d; 
      var pathEl = document.getElementById('folderPath');
      if (pathEl) pathEl.textContent = d.name; 
      alert('Folder dipilih!'); 
    } else {
      alert('Browser tidak mendukung File System Access API.\nGunakan Chrome/Edge terbaru.');
    }
  } catch (e) { 
    if (e.name !== 'AbortError') alert('Gagal memilih folder'); 
  } 
}

// ===================== BACKUP DATA =====================
async function backupData() {
  try {
    var btn = document.getElementById('btnBackup');
    var originalText = btn ? btn.textContent : '';
    if (btn) {
      btn.textContent = '⏳ Memproses...';
      btn.disabled = true;
    }

    var zip = new JSZip();
    var tables = [
      { name: 'users', fn: supabaseClient.from('users').select('*') },
      { name: 'products', fn: supabaseClient.from('products').select('*') },
      { name: 'transactions', fn: supabaseClient.from('transactions').select('*') },
      { name: 'settings', fn: supabaseClient.from('settings').select('*') },
      { name: 'saved_orders', fn: supabaseClient.from('saved_orders').select('*') }
    ];

    var totalRows = 0;
    
    for (var i = 0; i < tables.length; i++) {
      try {
        var result = await tables[i].fn;
        if (result.data && result.data.length > 0) {
          zip.file(tables[i].name + '.json', JSON.stringify(result.data, null, 2));
          totalRows += result.data.length;
        }
      } catch(e) {
        console.error('Backup ' + tables[i].name + ' failed:', e);
      }
    }

    zip.file('backup-info.json', JSON.stringify({
      version: '1.0',
      timestamp: new Date().toISOString(),
      total_rows: totalRows
    }, null, 2));

    var blob = await zip.generateAsync({ type: 'blob' });
    var timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    var filename = 'rodanpos-backup-' + timestamp + '.zip';
    
    // Download to computer
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    
    // Upload to Supabase Storage
    try {
      var { data, error } = await supabaseClient.storage
        .from('backups')
        .upload(filename, blob, {
          contentType: 'application/zip',
          upsert: true
        });
      
      if (error) {
        console.error('Cloud upload error:', error.message);
      }
    } catch(e) {
      console.error('Cloud backup failed:', e.message);
    }

    alert('✅ Backup berhasil!\n\n📁 File: ' + filename + '\n📊 Total data: ' + totalRows + ' rows\n💾 Size: ' + (blob.size / 1024).toFixed(1) + ' KB');

  } catch (e) {
    alert('❌ Gagal backup: ' + e.message);
  } finally {
    var btn = document.getElementById('btnBackup');
    if (btn) {
      btn.textContent = '⬇ Backup (ZIP)';
      btn.disabled = false;
    }
  }
}

// ===================== RESTORE DATA =====================
async function restoreData() {
  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.zip';
  inp.onchange = async function(e) {
    var file = e.target.files[0];
    if (!file) return;
    try {
      var zip = await JSZip.loadAsync(file);
      var rst = { users: 0, products: 0, transactions: 0, settings: 0, saved_orders: 0 };

      if (zip.files['users.json']) {
        var t = await zip.files['users.json'].async('text');
        var u = JSON.parse(t);
        if (u.length > 0) {
          var r = await supabaseClient.from('users').upsert(u, { onConflict: 'username' });
          if (!r.error) rst.users = u.length;
        }
      }

      if (zip.files['products.json']) {
        var t = await zip.files['products.json'].async('text');
        var p = JSON.parse(t);
        if (p.length > 0) {
          var r = await supabaseClient.from('products').upsert(p, { onConflict: 'barcode' });
          if (!r.error) rst.products = p.length;
        }
      }

      if (zip.files['transactions.json']) {
        var t = await zip.files['transactions.json'].async('text');
        var tr = JSON.parse(t);
        if (tr.length > 0) {
          var r = await supabaseClient.from('transactions').upsert(tr, { onConflict: 'no_invoice' });
          if (!r.error) rst.transactions = tr.length;
        }
      }

      if (zip.files['settings.json']) {
        var t = await zip.files['settings.json'].async('text');
        var s = JSON.parse(t);
        if (s.length > 0) {
          var r = await supabaseClient.from('settings').upsert(s, { onConflict: 'id' });
          if (!r.error) rst.settings = s.length;
        }
      }

      if (zip.files['saved_orders.json']) {
        var t = await zip.files['saved_orders.json'].async('text');
        var so = JSON.parse(t);
        if (so.length > 0) {
          var r = await supabaseClient.from('saved_orders').upsert(so, { onConflict: 'no_pesanan' });
          if (!r.error) rst.saved_orders = so.length;
        }
      }

      alert('✅ Restore berhasil!\n\nUsers: ' + rst.users + '\nProducts: ' + rst.products + '\nTransactions: ' + rst.transactions + '\nSettings: ' + rst.settings + '\nSaved Orders: ' + rst.saved_orders);
      
      if (typeof invalidateSettingsCache === 'function') invalidateSettingsCache();
      location.reload();
      
    } catch (er) {
      alert('❌ Gagal restore: ' + er.message);
    }
  };
  inp.click();
}

function resetDatabase() {
  if (confirm('⚠️ Reset semua data? Tindakan ini TIDAK BISA DIBATALKAN!\n\nKetik "RESET" untuk melanjutkan.')) {
    var confirmInput = prompt('Ketik "RESET" untuk mengkonfirmasi:');
    if (confirmInput === 'RESET') {
      alert('Fitur reset harus dilakukan melalui dashboard Supabase.\n\nBuka: https://supabase.com/dashboard');
    }
  }
}

// ===================== SUB-MENU TOGGLE =====================
function toggleSubMenu(menu) {
  var subMenu = document.getElementById('sub' + menu.charAt(0).toUpperCase() + menu.slice(1));
  var arrow = document.getElementById('arrow' + menu.charAt(0).toUpperCase() + menu.slice(1));
  
  if (subMenu && arrow) {
    if (subMenu.style.display === 'none' || subMenu.style.display === '') {
      subMenu.style.display = 'block';
      arrow.textContent = '▲';
    } else {
      subMenu.style.display = 'none';
      arrow.textContent = '▼';
    }
  }
}

function updateVoucherButtonVisibility() {
  var voucherBtn = document.getElementById('btnVoucherTransaksi');
  if (voucherBtn) {
    var isVoucherActive = typeof activeFeatures !== 'undefined' && activeFeatures && activeFeatures.voucher;
    voucherBtn.style.display = isVoucherActive ? 'inline-flex' : 'none';
  }
}

// ===================== HITUNG JUMLAH CETAK LABEL =====================
function hitungJumlahCetak() { 
  var qtyInput = document.getElementById('labelQty');
  var colsInput = document.getElementById('labelCols');
  var printCountInput = document.getElementById('labelPrintCount');
  
  if (!qtyInput || !colsInput || !printCountInput) return;
  
  var q = parseInt(qtyInput.value) || 0;
  var c = parseInt(colsInput.value) || 2;
  
  printCountInput.value = (q > 0 && c > 0) ? Math.ceil(q / c) : 0; 
}