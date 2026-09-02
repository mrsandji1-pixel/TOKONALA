// ===================== INVENTORY.JS (FIXED FINAL) =====================
function setupInventory() {
  var prodBarcode = document.getElementById('prodBarcode');
  if (prodBarcode) {
    prodBarcode.onkeydown = function(e) { 
      if (e.key === 'Enter') { 
        e.preventDefault(); 
        cariAtauTambahProduk(); 
      } 
    };
  }
  
  // Setup invSearch - TANPA mengganggu ketikan
  var invSearch = document.getElementById('invSearch');
  if (invSearch) {
    invSearch.onkeyup = function() {
      window.filterProductList();
    };
    invSearch.readOnly = false;
    invSearch.disabled = false;
  }
}

var currentBarcode = null, fotoDihapus = false;
var currentLabelBarcode = null;
var productPage = 1, productPageSize = 50, totalProducts = 0;

// ===================== LOCAL STORAGE CACHE =====================
function getLocalProducts() {
  try { var d = localStorage.getItem('cachedProducts'); if (d) return JSON.parse(d); } catch(e) {}
  return null;
}

function setLocalProducts(products) {
  try { localStorage.setItem('cachedProducts', JSON.stringify(products)); } catch(e) {}
}

var lastSyncTime = 0, SYNC_INTERVAL = 60000;

async function syncProductsIfNeeded() {
  var now = Date.now();
  if (now - lastSyncTime < SYNC_INTERVAL && getLocalProducts()) return getLocalProducts();
  try {
    var r = await supabaseClient.from('products').select('*').order('nama');
    if (r.data) { setLocalProducts(r.data); lastSyncTime = now; }
    return r.data || getLocalProducts() || [];
  } catch(e) { return getLocalProducts() || []; }
}

// ===================== FAST PRODUCT LIST =====================
async function refreshProductList() {
  productPage = 1; 
  var countEl = document.getElementById('productCount');
  if (countEl) countEl.textContent = '...';
  
  var cached = getLocalProducts();
  if (cached) { totalProducts = cached.length; renderProductTable(cached.slice(0, productPageSize)); }
  
  syncProductsIfNeeded().then(function(fresh) {
    if (fresh && (!cached || fresh.length !== cached.length)) {
      totalProducts = fresh.length; 
      renderProductTable(fresh.slice(0, productPageSize));
    }
  });
}

async function loadProductPage() {
  var cached = getLocalProducts() || await syncProductsIfNeeded();
  totalProducts = cached.length;
  renderProductTable(cached.slice((productPage-1)*productPageSize, productPage*productPageSize));
}

function nextPage() { 
  var tp = Math.ceil(totalProducts/productPageSize); 
  if (productPage < tp) { productPage++; loadProductPage(); } 
}

function prevPage() { 
  if (productPage > 1) { productPage--; loadProductPage(); } 
}

// ===================== INSTANT SEARCH - FIXED =====================
var filterTimer = null;

window.filterProductList = function() {
  clearTimeout(filterTimer);
  filterTimer = setTimeout(function() {
    var invSearchEl = document.getElementById('invSearch');
    if (!invSearchEl) return;
    
    // SIMPAN value SEBELUM render
    var savedValue = invSearchEl.value;
    
    var q = savedValue.trim().toLowerCase();
    var cached = getLocalProducts();
    
    if (!cached) { 
      refreshProductList(); 
      return; 
    }
    
    var filtered;
    if (!q) { 
      totalProducts = cached.length; 
      filtered = cached.slice(0, productPageSize); 
    } else {
      filtered = cached.filter(function(p) {
        return (p.nama && p.nama.toLowerCase().indexOf(q) !== -1) || 
               (p.barcode && p.barcode.toLowerCase().indexOf(q) !== -1) || 
               (p.kategori && p.kategori.toLowerCase().indexOf(q) !== -1) ||
               (p.lokasi && p.lokasi.toLowerCase().indexOf(q) !== -1);
      });
      totalProducts = filtered.length; 
    }
    
    // Render tabel
    renderProductTable(filtered.slice(0, 100));
    
    // RESTORE value SETELAH render
    var input = document.getElementById('invSearch');
    if (input) {
      input.value = savedValue;
    }
  }, 300);
};

// ===================== OPTIMISTIC DELETE =====================
async function hapusProdukDariDaftar(b) {
  if (!currentUser || currentUser.role !== 'admin') return;
  if (!confirm('Hapus?')) return;
  var cached = getLocalProducts() || [];
  var product = cached.find(function(p) { return p.barcode === b; });
  cached = cached.filter(function(p) { return p.barcode !== b; });
  setLocalProducts(cached); totalProducts = cached.length; loadProductPage();
  try {
    await supabaseClient.from('products').delete().eq('barcode', b);
    if (product && product.foto && product.foto.indexOf('supabase.co') !== -1) {
      var fileName = product.foto.split('/').pop();
      await supabaseClient.storage.from('product-photos').remove([fileName]);
    }
    lastSyncTime = 0;
  } catch(e) { localStorage.removeItem('cachedProducts'); refreshProductList(); }
}

function updateLocalProduct(product) {
  var cached = getLocalProducts() || [];
  var found = false;
  for (var i = 0; i < cached.length; i++) { 
    if (cached[i].barcode === product.barcode) { cached[i] = product; found = true; break; } 
  }
  if (!found) cached.push(product);
  setLocalProducts(cached); totalProducts = cached.length; lastSyncTime = 0;
}

// ===================== PRODUCT TABLE =====================
function renderProductTable(products) {
  var tbody = document.querySelector('#productListTable tbody'); 
  if (!tbody) return;
  
  // SIMPAN value input search
  var invSearchEl = document.getElementById('invSearch');
  var savedValue = invSearchEl ? invSearchEl.value : '';
  
  tbody.innerHTML = '';
  
  var countEl = document.getElementById('productCount');
  if (countEl) countEl.textContent = totalProducts;
  
  if (!products.length) { 
    tbody.innerHTML = '<tr><td colspan="8">Tidak ada produk</td></tr>'; 
    updatePagination(); 
    // RESTORE value
    if (invSearchEl) invSearchEl.value = savedValue;
    return; 
  }
  
  var isAdmin = currentUser && currentUser.role === 'admin';
  var isGudang = currentUser && currentUser.role === 'gudang';
  var canEdit = isAdmin || isGudang;
  
  var thAksi = document.getElementById('thAksi');
  if (thAksi) thAksi.style.display = canEdit ? '' : 'none';
  
  var isLabelActive = typeof activeFeatures !== 'undefined' && activeFeatures && activeFeatures.label;
  var isGrosirActive = typeof activeFeatures !== 'undefined' && activeFeatures && activeFeatures.grosir;
  
  var html = '';
  for (var i = 0; i < products.length; i++) {
    var p = products[i];
    var minStok = p.min_stok || 0;
    var isLowStock = (p.stok || 0) <= minStok;
    var rowBg = isLowStock ? 'background:#fff3e0;' : '';
    var stokStyle = isLowStock ? 'color:#e53935;font-weight:bold;' : 'color:#333;';
    var stokDisplay = (p.stok || 0) + (isLowStock ? ' ⚠️' : '');
    var grosirInfo = (isGrosirActive && p.diskon_persen > 0 && p.diskon_min_qty > 0) ? '<br><small style="color:#e53935;font-weight:bold;">🔥 Grosir ' + p.diskon_persen + '% min ' + p.diskon_min_qty + 'pcs</small>' : '';
    var fotoHtml = p.foto ? '<img src="' + p.foto + '" style="width:30px;height:30px;border-radius:4px;object-fit:cover;" loading="lazy" onerror="this.style.display=\'none\'">' : '<div style="width:30px;height:30px;background:#e0e0e0;border-radius:4px;display:flex;align-items:center;justify-content:center;">📦</div>';
    var editBtn = canEdit ? '<button class="btn-sm" onclick="editProdukDariDaftar(\'' + p.barcode + '\')">✏️</button> ' : '';
    var deleteBtn = isAdmin ? '<button class="btn-sm btn-danger" onclick="hapusProdukDariDaftar(\'' + p.barcode + '\')">🗑</button> ' : '';
    var labelBtn = isLabelActive ? '<button class="btn-sm" onclick="bukaLabelDialog(\'' + p.barcode + '\')">🏷️</button>' : '';
    var aksi = editBtn + deleteBtn + labelBtn;
    
    html += '<tr style="' + rowBg + '">' +
      '<td>' + (p.barcode || '') + '</td>' +
      '<td style="display:flex;align-items:center;gap:6px;">' + fotoHtml + '<div>' + (p.nama || '') + grosirInfo + '</div></td>' +
      '<td>' + (p.kategori || '-') + '</td>' +
      '<td>' + (p.keterangan || '-') + '</td>' +
      '<td>' + (p.lokasi || '-') + '</td>' +
      '<td>Rp' + (p.harga_jual || 0).toLocaleString('id') + '</td>' +
      '<td style="' + stokStyle + '">' + stokDisplay + '</td>' +
      '<td>' + aksi + '</td>' +
      '</tr>';
  }
  tbody.innerHTML = html;
  updatePagination();
  
  // RESTORE value
  if (invSearchEl) invSearchEl.value = savedValue;
}

function updatePagination() {
  var tp = Math.ceil(totalProducts / productPageSize);
  if (tp < 1) tp = 1;
  
  var ex = document.getElementById('productPagination'); 
  if (ex) ex.remove();
  
  var d = document.createElement('div'); 
  d.id = 'productPagination';
  d.style.cssText = 'display:flex;gap:8px;align-items:center;margin-top:8px;justify-content:center;';
  d.innerHTML = '<button class="btn btn-sm" onclick="prevPage()" ' + (productPage <= 1 ? 'disabled' : '') + '>◀ Sebelumnya</button>' +
    '<span style="font-size:12px;">Hal ' + productPage + ' dari ' + tp + ' (' + totalProducts + ' produk)</span>' +
    '<button class="btn btn-sm" onclick="nextPage()" ' + (productPage >= tp ? 'disabled' : '') + '>Selanjutnya ▶</button>';
  
  var table = document.getElementById('productListTable');
  if (table && table.parentNode) {
    table.parentNode.appendChild(d);
  }
}

// ===================== PRODUCT SEARCH =====================
async function cariAtauTambahProduk() {
  if (!currentUser) return;
  var barcodeInput = document.getElementById('prodBarcode');
  if (!barcodeInput) return;
  
  var barcode = barcodeInput.value.trim(); 
  if (!barcode) return;
  
  currentBarcode = barcode; 
  var productForm = document.getElementById('productForm');
  if (productForm) productForm.style.display = 'block'; 
  fotoDihapus = false;
  
  var cached = getLocalProducts(); 
  var product = null;
  if (cached) { 
    for (var i = 0; i < cached.length; i++) { 
      if (cached[i].barcode === barcode) { product = cached[i]; break; } 
    } 
  }
  if (!product) product = await getProductByBarcode(barcode);
  
  var isAdmin = currentUser.role === 'admin';
  var isGudang = currentUser.role === 'gudang';
  var canEdit = isAdmin || isGudang;
  
  if (product) { 
    isiFormProduk(product, false, canEdit, isAdmin); 
    var fotoPreview = document.getElementById('fotoPreview');
    var fotoContainer = document.getElementById('fotoPreviewContainer');
    if (product.foto && fotoPreview && fotoContainer) { 
      fotoPreview.src = product.foto; 
      fotoContainer.style.display = 'block'; 
    } else if (fotoContainer) {
      fotoContainer.style.display = 'none';
    }
  } else { 
    if (!canEdit) { 
      alert('Produk tidak ditemukan'); 
      tutupFormProduk(); 
      return; 
    } 
    isiFormProduk({
      barcode: barcode, nama: '', kategori: '', keterangan: '', lokasi: '', 
      harga_beli: 0, harga_jual: 0, min_stok: 0, diskon_persen: 0, diskon_min_qty: 0, stok: 0, foto: null
    }, true, true, isAdmin); 
    var fotoContainer2 = document.getElementById('fotoPreviewContainer');
    if (fotoContainer2) fotoContainer2.style.display = 'none';
  }
  
  if (canEdit) {
    var namaInput = document.getElementById('prodNama');
    if (namaInput) namaInput.focus();
  } else {
    ['prodNama','prodKategori','prodKeterangan','prodLokasi','prodHargaBeli','prodHargaJual','prodDiskonPersen','prodDiskonMinQty','prodMinStok','perubahanStok'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.readOnly = true;
    });
    ['btnSimpanProduk','btnBatalProduk','btnHapusProduk','btnHapusFoto'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }
}

// ===================== PHOTO UPLOAD =====================
function ambilFotoDariKamera() { 
  var input = document.getElementById('prodFotoCamera');
  if (input) input.click(); 
}

async function previewFotoDariKamera() { 
  var input = document.getElementById('prodFotoCamera');
  if (input && input.files[0]) await compressAndPreview(input.files[0]); 
}

async function previewFotoDariFile() { 
  var input = document.getElementById('prodFotoFile');
  if (input && input.files[0]) await compressAndPreview(input.files[0]); 
}

async function compressAndPreview(file) {
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'gudang')) return;
  try {
    var img = new Image(); 
    var url = URL.createObjectURL(file);
    img.onload = async function() { 
      URL.revokeObjectURL(url);
      var mw = 150, mh = 150, w = img.width, h = img.height;
      if (w > mw || h > mh) { 
        if (w > h) { h = Math.round((h/w)*mw); w = mw; } 
        else { w = Math.round((w/h)*mh); h = mh; } 
      }
      var c = document.getElementById('compressCanvas'); 
      if (!c) return;
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      var q = 0.5, comp = c.toDataURL('image/jpeg', q);
      while (comp.length > 30000 && q > 0.1) { q -= 0.1; comp = c.toDataURL('image/jpeg', q); }
      var fotoPreview = document.getElementById('fotoPreview');
      var fotoContainer = document.getElementById('fotoPreviewContainer');
      if (fotoPreview) fotoPreview.src = comp; 
      if (fotoContainer) fotoContainer.style.display = 'block';
      fotoDihapus = false; 
      window.tempCompressedPhoto = comp;
    }; 
    img.src = url;
  } catch(e) { alert('Gagal: ' + e.message); }
}

async function uploadPhotoToStorage(base64) {
  try {
    var res = await fetch(base64); 
    var blob = await res.blob();
    var fileName = Date.now() + '_' + Math.random().toString(36).substring(7) + '.jpg';
    var result = await supabaseClient.storage.from('product-photos').upload(fileName, blob, { cacheControl: '3600', upsert: true, contentType: 'image/jpeg' });
    if (result.error) throw result.error;
    var urlResult = supabaseClient.storage.from('product-photos').getPublicUrl(fileName);
    return urlResult.data.publicUrl;
  } catch(e) { 
    console.error('Storage upload failed:', e); 
    return null; 
  }
}

function hapusFoto() {
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'gudang')) return;
  var fotoPreview = document.getElementById('fotoPreview');
  var fotoContainer = document.getElementById('fotoPreviewContainer');
  if (fotoPreview) fotoPreview.src = ''; 
  if (fotoContainer) fotoContainer.style.display = 'none';
  var fileInput = document.getElementById('prodFotoFile');
  var camInput = document.getElementById('prodFotoCamera');
  if (fileInput) fileInput.value = ''; 
  if (camInput) camInput.value = ''; 
  window.tempCompressedPhoto = null; 
  fotoDihapus = true;
}

// ===================== PRODUCT FORM =====================
function isiFormProduk(produk, isNew, canEdit, isAdmin) {
  var formTitle = document.getElementById('formTitle');
  if (formTitle) formTitle.textContent = canEdit ? (isNew ? 'Tambah Baru' : 'Update') : 'Detail';
  
  var setVal = function(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val;
  };
  
  setVal('prodNama', produk.nama || '');
  setVal('prodKategori', produk.kategori || '');
  setVal('prodKeterangan', produk.keterangan || '');
  setVal('prodLokasi', produk.lokasi || '');
  setVal('prodHargaBeli', produk.harga_beli || 0);
  setVal('prodHargaJual', produk.harga_jual || 0);
  setVal('prodDiskonPersen', produk.diskon_persen || 0);
  setVal('prodDiskonMinQty', produk.diskon_min_qty || 0);
  setVal('prodMinStok', produk.min_stok || 0);
  setVal('perubahanStok', 0);
  
  var stokEl = document.getElementById('stokSaatIni');
  if (stokEl) stokEl.textContent = produk.stok || 0;
  
  hitungStokAkhir();
  
  if (canEdit) {
    var btnHapus = document.getElementById('btnHapusProduk');
    var btnSimpan = document.getElementById('btnSimpanProduk');
    var btnBatal = document.getElementById('btnBatalProduk');
    var btnHapusFoto = document.getElementById('btnHapusFoto');
    
    if (btnHapus) btnHapus.style.display = (isNew || !isAdmin) ? 'none' : 'inline-block';
    if (btnSimpan) btnSimpan.style.display = 'inline-block';
    if (btnBatal) btnBatal.style.display = 'inline-block';
    if (btnHapusFoto) btnHapusFoto.style.display = 'block';
    
    ['prodNama','prodKategori','prodKeterangan','prodLokasi','prodHargaBeli','prodHargaJual','prodDiskonPersen','prodDiskonMinQty','prodMinStok','perubahanStok'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) { el.readOnly = false; el.disabled = false; }
    });
    
    if (btnSimpan) {
      btnSimpan.onclick = async function() {
        if (!currentBarcode) return;
        var foto = produk.foto || null;
        
        if (fotoDihapus) {
          if (foto && foto.indexOf('supabase.co') !== -1) {
            try { 
              var fn = foto.split('/').pop(); 
              await supabaseClient.storage.from('product-photos').remove([fn]); 
            } catch(e) {}
          }
          foto = null;
        } else if (window.tempCompressedPhoto) {
          var storageUrl = await uploadPhotoToStorage(window.tempCompressedPhoto);
          if (storageUrl) foto = storageUrl;
          else foto = window.tempCompressedPhoto;
          window.tempCompressedPhoto = null;
        }
        
        var currentStok = parseInt((document.getElementById('stokSaatIni') || {}).textContent) || 0;
        var perubahan = parseInt((document.getElementById('perubahanStok') || {}).value) || 0;
        
        var data = { 
          barcode: currentBarcode, 
          nama: (document.getElementById('prodNama') || {}).value ? document.getElementById('prodNama').value.trim() : '', 
          kategori: (document.getElementById('prodKategori') || {}).value ? document.getElementById('prodKategori').value.trim() : '', 
          keterangan: (document.getElementById('prodKeterangan') || {}).value ? document.getElementById('prodKeterangan').value.trim() : '', 
          lokasi: (document.getElementById('prodLokasi') || {}).value ? document.getElementById('prodLokasi').value.trim() : '',
          harga_beli: parseFloat((document.getElementById('prodHargaBeli') || {}).value) || 0, 
          harga_jual: parseFloat((document.getElementById('prodHargaJual') || {}).value) || 0, 
          diskon_persen: parseFloat((document.getElementById('prodDiskonPersen') || {}).value) || 0, 
          diskon_min_qty: parseInt((document.getElementById('prodDiskonMinQty') || {}).value) || 0, 
          min_stok: parseInt((document.getElementById('prodMinStok') || {}).value) || 0, 
          stok: currentStok + perubahan, 
          foto: foto 
        };
        
        try { 
          await upsertProduct(data); 
          updateLocalProduct(data); 
          alert('✅ Disimpan'); 
          tutupFormProduk(); 
          refreshProductList(); 
        } catch (e) { 
          console.error('Save error:', e);
          alert('❌ Gagal: ' + e.message); 
        }
      };
    }
    
    if (btnBatal) {
      btnBatal.onclick = function() { tutupFormProduk(); };
    }
    
    if (btnHapus) {
      btnHapus.onclick = async function() { 
        if (confirm('Hapus?')) { 
          await deleteProduct(currentBarcode); 
          hapusProdukDariDaftar(currentBarcode); 
          alert('Dihapus'); 
          tutupFormProduk(); 
        } 
      };
    }
  }
}

function tutupFormProduk() {
  var productForm = document.getElementById('productForm');
  if (productForm) productForm.style.display = 'none';
  
  var barcodeInput = document.getElementById('prodBarcode');
  if (barcodeInput) { barcodeInput.value = ''; barcodeInput.focus(); }
  
  currentBarcode = null;
  
  var fotoContainer = document.getElementById('fotoPreviewContainer');
  if (fotoContainer) fotoContainer.style.display = 'none';
  
  var fileInput = document.getElementById('prodFotoFile');
  var camInput = document.getElementById('prodFotoCamera');
  if (fileInput) fileInput.value = '';
  if (camInput) camInput.value = '';
  
  window.tempCompressedPhoto = null;
  fotoDihapus = false;
  
  ['prodNama','prodKategori','prodKeterangan','prodLokasi','prodHargaBeli','prodHargaJual','prodDiskonPersen','prodDiskonMinQty','prodMinStok','perubahanStok'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { el.readOnly = false; el.disabled = false; }
  });
  
  var btnSimpan = document.getElementById('btnSimpanProduk');
  var btnBatal = document.getElementById('btnBatalProduk');
  var btnHapus = document.getElementById('btnHapusProduk');
  var btnHapusFoto = document.getElementById('btnHapusFoto');
  
  if (btnSimpan) btnSimpan.style.display = 'inline-block';
  if (btnBatal) btnBatal.style.display = 'inline-block';
  if (btnHapus) btnHapus.style.display = 'none';
  if (btnHapusFoto) btnHapusFoto.style.display = 'block';
}

function hitungStokAkhir() { 
  var stokEl = document.getElementById('stokSaatIni');
  var perubahanEl = document.getElementById('perubahanStok');
  var stokAkhirEl = document.getElementById('stokAkhir');
  if (!stokEl || !perubahanEl || !stokAkhirEl) return;
  var a = parseInt(stokEl.textContent) || 0;
  var b = parseInt(perubahanEl.value) || 0;
  stokAkhirEl.textContent = a + b; 
}

async function editProdukDariDaftar(b) { 
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'gudang')) return; 
  var barcodeInput = document.getElementById('prodBarcode');
  if (barcodeInput) barcodeInput.value = b; 
  cariAtauTambahProduk(); 
}

function generateBarcode() { 
  var now = new Date(); 
  var barcode = now.getFullYear().toString().slice(-2) + 
    ('0' + (now.getMonth()+1)).slice(-2) + 
    ('0' + now.getDate()).slice(-2) + 
    ('0' + now.getHours()).slice(-2) + 
    ('0' + now.getMinutes()).slice(-2) + 
    ('0' + now.getSeconds()).slice(-2); 
  var barcodeInput = document.getElementById('prodBarcode');
  if (barcodeInput) barcodeInput.value = barcode; 
  cariAtauTambahProduk(); 
}

// ===================== CAMERA SCANNER =====================
var cameraScannerActiveInv = false;
var cameraCodeReaderInv = null;
var cameraStreamInv = null;
var lastScannedBarcodeInv = '';
var currentZoomInv = 1;

function playBeepInv() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = ctx.createOscillator(); 
    var gain = ctx.createGain();
    osc.connect(gain); 
    gain.connect(ctx.destination);
    osc.frequency.value = 800; 
    osc.type = 'square';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime); 
    osc.stop(ctx.currentTime + 0.15);
  } catch(e) {}
}

async function startCameraScannerInv() {
  try {
    if (cameraCodeReaderInv) { cameraCodeReaderInv.reset(); cameraCodeReaderInv = null; }
    if (cameraStreamInv) { cameraStreamInv.getTracks().forEach(function(t){t.stop();}); cameraStreamInv = null; }
    
    var container = document.getElementById('cameraScannerContainerInv');
    if (!container) return;
    
    container.style.display = 'block';
    container.style.cssText = 'margin-top:8px;position:relative;width:100%;max-width:300px;aspect-ratio:1/1;border-radius:12px;overflow:hidden;background:#000;margin-left:auto;margin-right:auto;';
    container.innerHTML = '<video id="cameraScannerVideoInv" autoplay playsinline style="width:100%;height:100%;object-fit:cover;"></video><button class="btn btn-sm btn-danger" onclick="stopCameraScannerInv()" style="position:absolute;top:8px;right:8px;z-index:3;">✕ Stop</button>';
    
    cameraStreamInv = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1920 } }
    });
    
    var video = document.getElementById('cameraScannerVideoInv');
    video.srcObject = cameraStreamInv;
    video.play();
    
    cameraCodeReaderInv = new ZXing.BrowserMultiFormatReader();
    cameraScannerActiveInv = false;
    
    cameraCodeReaderInv.decodeFromVideoDevice(null, video, function(result) {
      if (result && !cameraScannerActiveInv) {
        var text = result.getText();
        if (text && text.length > 3 && text !== lastScannedBarcodeInv) {
          lastScannedBarcodeInv = text;
          playBeepInv();
          var barcodeInput = document.getElementById('prodBarcode');
          if (barcodeInput) barcodeInput.value = text;
          if (typeof cariAtauTambahProduk === 'function') cariAtauTambahProduk();
          cameraScannerActiveInv = true;
          setTimeout(function() { stopCameraScannerInv(); }, 1000);
        }
      }
    });
  } catch(e) {
    console.error('Camera error:', e);
    alert('Gagal mengakses kamera: ' + e.message);
    var container = document.getElementById('cameraScannerContainerInv');
    if (container) container.style.display = 'none';
  }
}

function stopCameraScannerInv() {
  if (cameraCodeReaderInv) { cameraCodeReaderInv.reset(); cameraCodeReaderInv = null; }
  if (cameraStreamInv) { cameraStreamInv.getTracks().forEach(function(t){t.stop();}); cameraStreamInv = null; }
  var container = document.getElementById('cameraScannerContainerInv');
  if (container) { container.style.display = 'none'; container.innerHTML = ''; }
  lastScannedBarcodeInv = '';
  cameraScannerActiveInv = false;
}

function activateBluetoothScannerInv() {
  var input = document.getElementById('prodBarcode');
  if (input) { input.focus(); input.placeholder = 'Bluetooth scanner siap...'; }
}

function clearBarcodeField() {
  var input = document.getElementById('prodBarcode');
  if (input) { input.value = ''; input.focus(); }
}

// ===================== LABEL PRINT =====================
function hitungJumlahCetak() { 
  var qtyInput = document.getElementById('labelQty');
  var colsInput = document.getElementById('labelCols');
  var printCountInput = document.getElementById('labelPrintCount');
  if (!qtyInput || !colsInput || !printCountInput) return;
  var q = parseInt(qtyInput.value) || 0;
  var c = parseInt(colsInput.value) || 2;
  printCountInput.value = (q > 0 && c > 0) ? Math.ceil(q / c) : 0; 
}

async function bukaLabelDialog(barcode) {
  currentLabelBarcode = barcode;
  var modal = document.getElementById('labelPrintModal');
  if (modal) modal.style.display = 'flex';
}

function simpanLabelSettings() {
  var presetNameInput = document.getElementById('presetName');
  var n = presetNameInput ? presetNameInput.value.trim() : ''; 
  if (!n) { alert('Beri nama template!'); return; }
  var s = { 
    widthMM: (document.getElementById('labelWidthMM') || {}).value || '33',
    heightMM: (document.getElementById('labelHeightMM') || {}).value || '15',
    gapMM: (document.getElementById('labelGapMM') || {}).value || '2',
    cols: (document.getElementById('labelCols') || {}).value || '2',
    qty: (document.getElementById('labelQty') || {}).value || '10',
    model: (document.getElementById('labelPrinterModel') || {}).value || 'AD240'
  };
  var p = {};
  var sv = localStorage.getItem('labelPresets');
  if (sv) { try { p = JSON.parse(sv); } catch(e) {} }
  p[n] = s;
  localStorage.setItem('labelPresets', JSON.stringify(p));
  if (presetNameInput) presetNameInput.value = '';
  alert('Template "' + n + '" disimpan!');
}

function refreshPresetList() {
  var sel = document.getElementById('presetList');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Pilih template --</option>';
  var sv = localStorage.getItem('labelPresets');
  if (sv) {
    try {
      var p = JSON.parse(sv);
      Object.keys(p).sort().forEach(function(n) {
        var o = document.createElement('option');
        o.value = n;
        o.textContent = n;
        sel.appendChild(o);
      });
    } catch(e) {}
  }
}

function muatLabelPreset() {
  var sel = document.getElementById('presetList');
  var n = sel ? sel.value : '';
  if (!n) { alert('Pilih template!'); return; }
  var sv = localStorage.getItem('labelPresets');
  if (!sv) return;
  try {
    var p = JSON.parse(sv), s = p[n];
    if (!s) return;
    var setVal = function(id, val) { var el = document.getElementById(id); if (el) el.value = val; };
    setVal('labelWidthMM', s.widthMM || '33');
    setVal('labelHeightMM', s.heightMM || '15');
    setVal('labelGapMM', s.gapMM || '2');
    setVal('labelCols', s.cols || '2');
    setVal('labelQty', s.qty || '10');
    setVal('labelPrinterModel', s.model || 'AD240');
    hitungJumlahCetak();
    alert('Template "' + n + '" dimuat!');
  } catch(e) {}
}

function hapusLabelPreset() {
  var sel = document.getElementById('presetList');
  var n = sel ? sel.value : '';
  if (!n) return;
  if (!confirm('Hapus template?')) return;
  var sv = localStorage.getItem('labelPresets');
  if (!sv) return;
  try {
    var p = JSON.parse(sv);
    delete p[n];
    localStorage.setItem('labelPresets', JSON.stringify(p));
    refreshPresetList();
    alert('Template dihapus!');
  } catch(e) {}
}

function resetLabelSettings() {
  var setVal = function(id, val) { var el = document.getElementById(id); if (el) el.value = val; };
  setVal('labelWidthMM', '33');
  setVal('labelHeightMM', '15');
  setVal('labelGapMM', '2');
  setVal('labelCols', '2');
  setVal('labelQty', '10');
  setVal('labelPrinterModel', 'AD240');
  hitungJumlahCetak();
  alert('Pengaturan label direset!');
}

function updateLabelDialogStatus() {
  var c = (typeof labelDevice !== 'undefined' && labelDevice);
  var led = document.getElementById('labelStatusLed');
  var txt = document.getElementById('labelStatusText');
  if (led) led.className = 'led ' + (c ? 'led-green' : 'led-red');
  if (txt) txt.textContent = c ? 'Label printer terhubung' : 'Label printer tidak terhubung';
}

async function cetakLabelPDF() {
  alert('PDF label akan dicetak untuk barcode: ' + currentLabelBarcode);
}

async function cetakLabelDariDialog() {
  alert('Cetak label untuk barcode: ' + currentLabelBarcode);
}

async function cetakLabelQR(barcode) { 
  bukaLabelDialog(barcode); 
}