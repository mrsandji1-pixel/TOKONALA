// ===================== TRANSAKSI.JS =====================
var cart = [];
var searchTimer = null;
var appSettings = {};
var isAdmin = false;
var totalDiskonValue = 0;
var bayarValue = 0;
var cachedSettings = null;
var currentPesananNo = null;
var currentVoucherData = null;
var isOnline = navigator.onLine;
var taxSettings = [];

// Event listener untuk online/offline
window.addEventListener('online', function() { isOnline = true; });
window.addEventListener('offline', function() { isOnline = false; });

// ===================== FUNGSI PEMBANTU =====================

// Fungsi untuk menghitung harga grosir
function calculateGrosirPrice(product, qty) {
    var hn = product.hargaAsli || product.harga_jual || 0;
    var dp = product.diskon_persen || 0;
    var mq = product.diskon_min_qty || 0;
    if (dp > 0 && mq > 0 && qty >= mq) {
        return hn - Math.round((dp / 100) * hn);
    }
    return hn;
}

// Fungsi untuk load tax settings
async function loadTaxSettings() {
    try {
        var settings = await getSettings();
        if (settings && settings.tax_config) {
            taxSettings = settings.tax_config;
        } else {
            taxSettings = [];
        }
    } catch(e) {
        console.error('loadTaxSettings error:', e);
        taxSettings = [];
    }
}

function getTaxList(subtotal) {
    var result = [];
    if (!taxSettings || taxSettings.length === 0) return result;
    
    taxSettings.forEach(function(tax) {
        if (tax.aktif !== false) {
            var jumlah = Math.round(subtotal * (tax.persen / 100));
            result.push({
                nama: tax.nama || 'Tax',
                persen: tax.persen || 0,
                jumlah: jumlah
            });
        }
    });
    
    return result;
}

function hitungTax(subtotal) {
    var taxList = getTaxList(subtotal);
    var totalTax = 0;
    taxList.forEach(function(t) {
        totalTax += t.jumlah;
    });
    return totalTax;
}

// Fungsi untuk get settings dengan cache
async function getSettingsWithCache() {
    if (cachedSettings) return cachedSettings;
    try {
        var settings = await getSettings();
        cachedSettings = settings;
        return settings;
    } catch(e) {
        console.error('getSettingsWithCache error:', e);
        return {};
    }
}

// Fungsi untuk diskon settings (placeholder)
function isDiskonItemActive() { return true; }
function isDiskonTotalActive() { return true; }
function isSimpanPesananActive() { return true; }
function isPesananTersimpanActive() { return true; }

// ===================== SETUP TRANSAKSI =====================
async function setupTransaksi() {
    try {
        console.log('setupTransaksi started');
        
        var role = currentUser ? currentUser.role : 'kasir';
        isAdmin = (role === 'admin');

        // Load settings
        if (typeof loadDiscountSettings === 'function') {
            await loadDiscountSettings();
        }
        if (typeof loadPesananSettings === 'function') {
            await loadPesananSettings();
        }
        if (typeof loadTaxSettings === 'function') {
            await loadTaxSettings();
        }
        if (typeof loadPaymentSettings === 'function') {
            await loadPaymentSettings();
        }

        // Load app settings
        try {
            appSettings = await getSettings();
            cachedSettings = appSettings;
        } catch (e) {
            appSettings = {};
        }

        // Setup scan input
        var scanInput = document.getElementById('scanInputTrans');
        if (scanInput) {
            scanInput.onkeydown = function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    var b = e.target.value.trim();
                    if (b) {
                        e.target.value = '';
                        tambahProdukDariScan(b);
                    }
                }
            };
        }

        // Setup search input
        var searchInput = document.getElementById('searchProduct');
        if (searchInput) {
            console.log('Search input found, attaching event listeners');
            searchInput.oninput = function() { 
                searchProductFn(this.value); 
            };
            searchInput.onfocus = function() { 
                searchProductFn(this.value); 
            };
            // Ensure input is enabled
            searchInput.disabled = false;
            searchInput.readOnly = false;
            searchInput.style.pointerEvents = 'auto';
        } else {
            console.warn('searchProduct input not found');
        }

        // Reset cart
        totalDiskonValue = 0;
        currentVoucherData = null;
        
        // Render cart
        renderCart();
        renderPesananButtons();
        
        // Render payment buttons
        setTimeout(function() {
            renderPaymentButtons();
        }, 1000);
        
        console.log('setupTransaksi completed');
        
    } catch(e) {
        console.error('setupTransaksi error:', e);
    }
}

function renderPaymentButtons() {
    var container = document.getElementById('paymentButtonsContainer');
    if (!container) return;
    
    var html = '';
    
    if (typeof paymentSettings !== 'undefined' && paymentSettings.methods) {
        paymentSettings.methods.forEach(function(m) {
            if (m.aktif) {
                var btnId = m.nama.replace(/[^a-zA-Z0-9]/g, '');
                html += '<button class="btn btn-tunai" onclick="bukaPopup' + btnId + '()">' + m.nama + '</button>';
            }
        });
    } else {
        html += '<button class="btn btn-tunai" onclick="bukaPopupTUNAI()">TUNAI</button>';
    }
    
    container.innerHTML = html;
}

function renderPesananButtons() {
    var showSimpanPesanan = typeof isSimpanPesananActive === 'function' ? isSimpanPesananActive() : true;
    var showPesananTersimpan = typeof isPesananTersimpanActive === 'function' ? isPesananTersimpanActive() : true;
    
    var container = document.getElementById('pesananButtonsContainer');
    if (!container) return;
    
    var html = '';
    if (showSimpanPesanan) {
        html += '<button class="btn" onclick="simpanPesanan()" style="background:#ff9800;">💾 Simpan Pesanan</button>';
    }
    if (showPesananTersimpan) {
        html += '<button class="btn" onclick="tampilkanPesananTersimpan()">📋 Pesanan Tersimpan</button>';
    }
    container.innerHTML = html;
}

function updateBayarDisplay() {
    var d = document.getElementById('bayarDisplay');
    if (d) d.textContent = bayarValue.toLocaleString('id');
    hitungKembalian();
}

// ===================== POPUP PEMBAYARAN =====================
function bukaPopupTUNAI() {
    var modal = document.createElement('div');
    modal.id = 'popupTunaiModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    
    var totalEl = document.getElementById('totalCart');
    var total = totalEl ? parseInt(totalEl.textContent.replace(/\D/g, '')) || 0 : 0;
    
    var html = '<div style="background:#fff;padding:20px;border-radius:12px;width:360px;text-align:center;max-width:95%;">';
    html += '<h3>💰 Pembayaran TUNAI</h3>';
    html += '<div style="font-size:14px;color:#666;margin-bottom:12px;">Total: Rp ' + total.toLocaleString('id') + '</div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">';
    [100000,50000,20000,10000,5000,2000,1000,500,200].forEach(function(n) { 
        html += '<button class="btn btn-sm" onclick="tambahNominalPopup(' + n + ')" style="padding:10px;border:1px solid #ddd;border-radius:6px;background:#f5f5f5;cursor:pointer;">Rp ' + n.toLocaleString('id') + '</button>'; 
    });
    html += '</div>';
    html += '<input type="number" id="inputBayarPopup" value="' + bayarValue + '" style="width:100%;padding:12px;font-size:18px;text-align:right;border:2px solid #009688;border-radius:8px;" onfocus="this.select()">';
    html += '<div style="margin-top:12px;display:flex;gap:8px;">';
    html += '<button class="btn-sm" onclick="simpanTunai()" style="flex:1;background:#009688;color:white;padding:12px;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">✅ Simpan</button>';
    html += '<button class="btn-sm btn-danger" onclick="document.getElementById(\'popupTunaiModal\').remove()" style="flex:1;padding:12px;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">Batal</button>';
    html += '</div></div>';
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
    setTimeout(function() { 
        var input = document.getElementById('inputBayarPopup');
        if (input) {
            input.focus();
            input.select();
        }
    }, 200);
}

function bukaPopupQRIS() {
    var modal = document.createElement('div');
    modal.id = 'qrisPopupModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    
    var totalEl = document.getElementById('totalCart');
    var total = totalEl ? parseInt(totalEl.textContent.replace(/\D/g, '')) || 0 : 0;
    
    var html = '<div style="background:#fff;padding:20px;border-radius:12px;width:320px;text-align:center;max-width:95%;">';
    html += '<h3>📱 QRIS</h3>';
    html += '<p style="font-size:18px;font-weight:bold;">Rp ' + total.toLocaleString('id') + '</p>';
    html += '<div id="qrisCode" style="margin:12px 0;display:flex;justify-content:center;"></div>';
    html += '<button class="btn" onclick="konfirmasiQRIS()" style="background:#009688;color:white;width:100%;padding:12px;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">✅ Konfirmasi Pembayaran</button>';
    html += '<button class="btn btn-danger" onclick="document.getElementById(\'qrisPopupModal\').remove()" style="width:100%;margin-top:8px;padding:12px;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">Batal</button>';
    html += '</div>';
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
    
    setTimeout(function() {
        var container = document.getElementById('qrisCode');
        if (typeof QRCode !== 'undefined') {
            new QRCode(container, { text: 'amount=' + total, width: 180, height: 180 });
        } else {
            container.innerHTML = 'QRIS: Rp ' + total.toLocaleString('id');
        }
    }, 100);
}

function konfirmasiQRIS() {
    var totalEl = document.getElementById('totalCart');
    var total = totalEl ? parseInt(totalEl.textContent.replace(/\D/g, '')) || 0 : 0;
    bayarValue = total;
    updateBayarDisplay();
    var modal = document.getElementById('qrisPopupModal');
    if (modal) modal.remove();
    bayarDanCetak();
}

function simpanTunai() {
    var input = document.getElementById('inputBayarPopup');
    if (input) {
        bayarValue = parseInt(input.value) || 0;
    }
    updateBayarDisplay();
    var modal = document.getElementById('popupTunaiModal');
    if (modal) modal.remove();
}

function tambahNominalPopup(n) { 
    var input = document.getElementById('inputBayarPopup'); 
    if (input) {
        var current = parseInt(input.value) || 0;
        input.value = current + n;
        input.focus();
        input.select();
    }
}

// ===================== SEARCH PRODUCT =====================
function searchProductFn(query) {
    clearTimeout(searchTimer);
    var div = document.getElementById('searchResults');
    if (!div) {
        console.warn('searchResults div not found');
        return;
    }
    
    if (!query || query.length < 1) {
        div.style.display = 'none';
        div.innerHTML = '';
        return;
    }
    
    searchTimer = setTimeout(async function() {
        try {
            var q = query.trim();
            if (q.length < 1) {
                div.style.display = 'none';
                return;
            }
            
            var { data, error } = await supabaseClient
                .from('products')
                .select('*')
                .or('nama.ilike.%' + q + '%,barcode.ilike.%' + q + '%,kategori.ilike.%' + q + '%')
                .order('nama')
                .limit(15);
            
            if (error) {
                console.error('Search error:', error);
                div.innerHTML = '<div class="search-item" style="color:#e53935;padding:12px;">Error: ' + error.message + '</div>';
                div.style.display = 'block';
                return;
            }
            
            if (!data || data.length === 0) {
                div.innerHTML = '<div class="search-item" style="color:#78909c;padding:12px;">Tidak ditemukan</div>';
                div.style.display = 'block';
                return;
            }
            
            var html = '';
            for (var i = 0; i < data.length; i++) {
                var p = data[i];
                var fotoHtml = p.foto ? 
                    '<img src="' + p.foto + '" class="search-item-img" onerror="this.style.display=\'none\'" style="width:40px;height:40px;border-radius:6px;object-fit:cover;background:#f0f0f0;flex-shrink:0;">' : 
                    '<span style="font-size:24px;flex-shrink:0;">📦</span>';
                
                var diskonHtml = '';
                if (p.diskon_persen > 0 && p.diskon_min_qty > 0) {
                    diskonHtml = ' <span style="color:#e53935;font-size:10px;font-weight:bold;">🔥 Grosir ' + p.diskon_persen + '% min ' + p.diskon_min_qty + 'pcs</span>';
                }
                
                var stokClass = (p.stok || 0) <= (p.min_stok || 0) ? 'color:#e53935;' : 'color:#666;';
                
                html += '<div class="search-item" data-barcode="' + p.barcode + '" style="cursor:pointer;padding:10px 12px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:10px;transition:background 0.15s;">';
                html += fotoHtml;
                html += '<div style="flex:1;min-width:0;">';
                html += '<strong style="display:block;font-size:14px;color:#263238;">' + (p.nama || 'No Name') + '</strong>';
                html += '<small style="' + stokClass + 'font-size:12px;display:block;">' + p.barcode + ' | Stok: ' + (p.stok || 0) + ' | Rp ' + (p.harga_jual || 0).toLocaleString('id') + diskonHtml + '</small>';
                html += '</div>';
                html += '<button class="btn btn-sm" style="background:#00897b;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;flex-shrink:0;">+</button>';
                html += '</div>';
            }
            
            div.innerHTML = html;
            div.style.display = 'block';
            
            // Event listener for each item
            var items = div.querySelectorAll('.search-item[data-barcode]');
            for (var j = 0; j < items.length; j++) {
                (function(item) {
                    item.onclick = function(e) {
                        e.preventDefault();
                        var barcode = this.dataset.barcode;
                        if (barcode) {
                            console.log('Selected product:', barcode);
                            div.style.display = 'none';
                            var input = document.getElementById('searchProduct');
                            if (input) input.value = '';
                            tambahProdukKeCart(barcode);
                        }
                    };
                    // Also handle click on the button inside
                    var btn = item.querySelector('.btn');
                    if (btn) {
                        btn.onclick = function(e) {
                            e.stopPropagation();
                            var parent = this.closest('.search-item');
                            if (parent) {
                                var barcode = parent.dataset.barcode;
                                if (barcode) {
                                    div.style.display = 'none';
                                    var input = document.getElementById('searchProduct');
                                    if (input) input.value = '';
                                    tambahProdukKeCart(barcode);
                                }
                            }
                        };
                    }
                    // Hover effect
                    item.onmouseenter = function() {
                        this.style.background = '#e0f2f1';
                    };
                    item.onmouseleave = function() {
                        this.style.background = 'white';
                    };
                })(items[j]);
            }
            
        } catch(e) {
            console.error('Search error:', e);
            div.innerHTML = '<div class="search-item" style="color:#e53935;padding:12px;">Error: ' + e.message + '</div>';
            div.style.display = 'block';
        }
    }, 300);
}

// Close search on outside click
document.addEventListener('click', function(e) {
    var input = document.getElementById('searchProduct');
    var results = document.getElementById('searchResults');
    if (input && results && e.target !== input && e.target !== results && !results.contains(e.target)) {
        results.style.display = 'none';
    }
});

// ===================== TAMBAH PRODUK =====================
async function tambahProdukDariScan(barcode) {
    if (!barcode) return;
    
    var clean = barcode.replace(/[^a-zA-Z0-9\-_]/g, '');
    if (!clean) return;
    
    console.log('Adding product by barcode:', clean);
    
    try {
        // Gunakan fungsi dari supabase-config.js
        var product = await getProductByBarcode(clean);
        
        // Jika tidak ditemukan, coba cari dengan LIKE
        if (!product) {
            var { data, error } = await supabaseClient
                .from('products')
                .select('*')
                .or('barcode.ilike.%' + clean + '%,nama.ilike.%' + clean + '%')
                .limit(1);
            
            if (error) throw error;
            if (data && data.length > 0) {
                product = data[0];
            }
        }
        
        if (!product) {
            alert('Produk tidak ditemukan');
            return;
        }
        
        if (product.stok <= 0) {
            alert('Stok habis');
            return;
        }
        
        // Cek apakah sudah ada di cart
        var existing = cart.find(function(i) {
            return i.barcode === product.barcode;
        });
        
        if (existing) {
            if (existing.qty < product.stok) {
                existing.qty++;
                existing.harga = calculateGrosirPrice(product, existing.qty);
                existing.isGrosir = existing.harga < existing.hargaAsli;
                existing.diskon = 0;
            } else {
                alert('Stok tidak cukup');
                return;
            }
        } else {
            var hg = calculateGrosirPrice(product, 1);
            cart.push({
                barcode: product.barcode,
                nama: product.nama,
                harga: hg,
                hargaAsli: product.harga_jual || 0,
                qty: 1,
                stok: product.stok,
                diskon: 0,
                isGrosir: hg < (product.harga_jual || 0)
            });
        }
        
        renderCart();
        console.log('Product added, cart length:', cart.length);
        
    } catch(e) {
        console.error('tambahProdukDariScan error:', e);
        alert('Error: ' + e.message);
    }
}

function tambahProdukKeCart(barcode) {
    tambahProdukDariScan(barcode);
}

// ===================== RENDER CART =====================
function renderCart() {
    var tbody = document.querySelector('#cartTable tbody');
    if (!tbody) {
        console.warn('Cart table tbody not found');
        return;
    }
    
    tbody.innerHTML = '';
    var subtotalItemNetto = 0;
    
    var showDiskonItem = typeof isDiskonItemActive === 'function' ? isDiskonItemActive() : true;
    var showDiskonTotal = typeof isDiskonTotalActive === 'function' ? isDiskonTotalActive() : true;
    
    if (cart.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#90a4ae;padding:20px;">Keranjang kosong</td></tr>';
        updateTotalDisplay(0);
        return;
    }
    
    cart.forEach(function(item, idx) {
        var sub = item.harga * item.qty;
        var diskon = item.diskon || 0;
        subtotalItemNetto += sub - diskon;
        
        var row = tbody.insertRow();
        
        var html = '<td style="vertical-align:middle;padding:10px 8px;">' + item.nama + '</td>';
        html += '<td style="vertical-align:middle;padding:10px 8px;">' + (item.isGrosir ? '<small style="color:#e53935;font-weight:bold;">GROSIR</small><br>' : '') + 'Rp' + item.harga.toLocaleString('id') + '</td>';
        html += '<td style="vertical-align:middle;padding:10px 8px;">';
        html += '<div class="qty-control" style="display:flex;align-items:center;gap:4px;">';
        html += '<button onclick="changeQty(' + idx + ',-1)" style="width:32px;height:32px;font-size:18px;background:#e8ecf0;border:1.5px solid #cfd8dc;border-radius:6px;cursor:pointer;font-weight:600;color:#455a64;display:flex;align-items:center;justify-content:center;user-select:none;">-</button>';
        html += '<input type="number" min="1" value="' + item.qty + '" onchange="updateQty(' + idx + ',this.value)" style="width:55px;text-align:center;font-size:16px;padding:4px;border:1.5px solid #e0e4e8;border-radius:6px;height:32px;background:white;">';
        html += '<button onclick="changeQty(' + idx + ',1)" style="width:32px;height:32px;font-size:18px;background:#e8ecf0;border:1.5px solid #cfd8dc;border-radius:6px;cursor:pointer;font-weight:600;color:#455a64;display:flex;align-items:center;justify-content:center;user-select:none;">+</button>';
        html += '</div>';
        html += '</td>';
        html += '<td style="vertical-align:middle;padding:10px 8px;">Rp' + sub.toLocaleString('id') + (diskon > 0 ? '<br><small style="color:#e53935;">-Rp' + diskon.toLocaleString('id') + '</small>' : '') + '</td>';
        html += '<td style="vertical-align:middle;padding:10px 8px;white-space:nowrap;">';
        if (isAdmin && showDiskonItem) {
            html += '<button class="btn-sm" onclick="editDiskonItem(' + idx + ')" style="padding:4px 8px;font-size:12px;margin-right:4px;background:#ff9800;color:white;border:none;border-radius:4px;cursor:pointer;">💰</button>';
        }
        html += '<button class="btn-sm" onclick="lihatDetailProduk(\'' + item.barcode + '\')" style="padding:4px 8px;font-size:12px;margin-right:4px;background:#2196f3;color:white;border:none;border-radius:4px;cursor:pointer;">ℹ️</button>';
        html += '<button class="btn-sm btn-danger" onclick="hapusCartItem(' + idx + ')" style="padding:4px 8px;font-size:12px;background:#e53935;color:white;border:none;border-radius:4px;cursor:pointer;">✕</button>';
        html += '</td>';
        
        row.innerHTML = html;
    });
    
    // Update total
    updateTotalDisplay(subtotalItemNetto);
}

function updateTotalDisplay(subtotalItemNetto) {
    var diskonContainer = document.getElementById('diskonContainer');
    if (!diskonContainer) return;
    
    var totalSetelahDiskon = subtotalItemNetto - totalDiskonValue;
    
    var html = '<div style="text-align:right;font-size:14px;padding:8px 0;">';
    html += '<div><strong>SUBTOTAL: Rp' + subtotalItemNetto.toLocaleString('id') + '</strong></div>';
    
    if (totalDiskonValue > 0) {
        html += '<div style="color:#e53935;">Diskon: -Rp' + totalDiskonValue.toLocaleString('id') + '</div>';
    }
    
    var totalTax = 0;
    if (typeof taxSettings !== 'undefined' && taxSettings.length > 0) {
        var taxList = getTaxList(totalSetelahDiskon);
        taxList.forEach(function(t) {
            html += '<div style="font-size:12px;color:#666;">' + t.nama + ': Rp' + Math.abs(t.jumlah).toLocaleString('id') + '</div>';
            totalTax += t.jumlah;
        });
    }
    
    var totalFinal = totalSetelahDiskon + totalTax;
    
    html += '<div style="font-size:18px;font-weight:bold;margin-top:8px;padding-top:8px;border-top:2px solid #e0e4e8;">TOTAL: Rp<span id="totalCart" style="color:#00695c;">' + totalFinal.toLocaleString('id') + '</span></div>';
    
    var showDiskonTotal = typeof isDiskonTotalActive === 'function' ? isDiskonTotalActive() : true;
    if (isAdmin && showDiskonTotal) {
        html += '<button class="btn-sm" style="background:#ff9800;color:white;border:none;padding:6px 12px;border-radius:6px;margin-top:4px;cursor:pointer;" onclick="bukaPopupDiskonTotal()">💰 Diskon Total</button>';
    }
    html += '</div>';
    
    diskonContainer.innerHTML = html;
    hitungKembalian();
}

// ===================== QUANTITY FUNCTIONS =====================
function changeQty(i, d) {
    if (!cart[i]) return;
    
    var q = cart[i].qty + d;
    if (q < 1) q = 1;
    if (q > cart[i].stok) q = cart[i].stok;
    
    cart[i].qty = q;
    
    // Update harga jika grosir
    getProductByBarcode(cart[i].barcode).then(function(p) {
        if (p) {
            cart[i].harga = calculateGrosirPrice(p, q);
            cart[i].isGrosir = cart[i].harga < cart[i].hargaAsli;
            cart[i].diskon = 0;
        }
        renderCart();
    }).catch(function(e) {
        console.error('Error updating quantity:', e);
        renderCart();
    });
}

function updateQty(i, q) {
    if (!cart[i]) return;
    
    q = parseInt(q) || 1;
    if (q < 1) q = 1;
    if (q > cart[i].stok) q = cart[i].stok;
    
    cart[i].qty = q;
    
    getProductByBarcode(cart[i].barcode).then(function(p) {
        if (p) {
            cart[i].harga = calculateGrosirPrice(p, q);
            cart[i].isGrosir = cart[i].harga < cart[i].hargaAsli;
            cart[i].diskon = 0;
        }
        renderCart();
    }).catch(function(e) {
        console.error('Error updating quantity:', e);
        renderCart();
    });
}

function hapusCartItem(i) {
    if (!cart[i]) return;
    cart.splice(i, 1);
    renderCart();
}

function editDiskonItem(index) {
    var item = cart[index];
    if (!item) return;
    
    var d = prompt('Diskon untuk ' + item.nama + ':', item.diskon || '0');
    if (d === null) return;
    
    var nilai = 0;
    if (d.indexOf('%') > -1) {
        var persen = parseFloat(d);
        if (!isNaN(persen) && persen > 0) {
            nilai = Math.round((persen / 100) * item.harga * item.qty);
        }
    } else {
        nilai = parseInt(d) || 0;
    }
    
    item.diskon = Math.max(0, Math.min(nilai, item.harga * item.qty));
    renderCart();
}

function bukaPopupDiskonTotal() {
    var modal = document.createElement('div');
    modal.id = 'popupDiskonModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    
    var html = '<div style="background:#fff;padding:24px;border-radius:12px;width:320px;text-align:center;max-width:95%;">';
    html += '<h3 style="margin-bottom:12px;">💰 Diskon Total</h3>';
    html += '<input type="text" id="inputDiskonPopup" placeholder="Contoh: 10% atau 5000" style="width:100%;padding:12px;font-size:16px;border:2px solid #e0e4e8;border-radius:8px;text-align:center;">';
    html += '<div style="margin-top:12px;display:flex;gap:8px;">';
    html += '<button class="btn-sm" onclick="simpanDiskonTotal()" style="flex:1;background:#009688;color:white;padding:12px;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">Simpan</button>';
    html += '<button class="btn-sm btn-danger" onclick="document.getElementById(\'popupDiskonModal\').remove()" style="flex:1;padding:12px;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">Batal</button>';
    html += '</div></div>';
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
    setTimeout(function() {
        var input = document.getElementById('inputDiskonPopup');
        if (input) input.focus();
    }, 200);
}

function simpanDiskonTotal() {
    var input = document.getElementById('inputDiskonPopup');
    if (!input) return;
    
    var val = input.value.trim();
    var nilai = 0;
    
    // Hitung subtotal
    var subtotal = cart.reduce(function(s, i) { 
        return s + (i.harga * i.qty) - (i.diskon || 0); 
    }, 0);
    
    if (val.indexOf('%') > -1) {
        var persen = parseFloat(val);
        if (!isNaN(persen) && persen > 0) {
            nilai = Math.round((persen / 100) * subtotal);
        }
    } else {
        nilai = parseInt(val) || 0;
    }
    
    totalDiskonValue = Math.min(nilai, subtotal);
    document.getElementById('popupDiskonModal').remove();
    renderCart();
}

function hitungKembalian() { 
    var totalEl = document.getElementById('totalCart');
    var t = 0;
    if (totalEl) {
        t = parseInt(totalEl.textContent.replace(/\D/g, '')) || 0;
    }
    var kembalianEl = document.getElementById('kembalianDisplay');
    if (kembalianEl) {
        kembalianEl.textContent = Math.max(0, bayarValue - t).toLocaleString('id');
    }
}

// ===================== BAYAR DAN CETAK =====================
async function bayarDanCetak() {
    var role = currentUser ? currentUser.role : '';
    if (role !== 'admin' && role !== 'kasir') { 
        alert('Tidak ada akses'); 
        return; 
    }
    if (!cart.length) { 
        alert('Keranjang kosong'); 
        return; 
    }
    
    var cust = document.getElementById('custName').value.trim();
    
    var subtotal1 = cart.reduce(function(s, i) { 
        return s + (i.harga * i.qty) - (i.diskon || 0); 
    }, 0);
    var grandTotal = subtotal1 - totalDiskonValue;
    
    await loadTaxSettings();
    var taxJumlah = typeof hitungTax === 'function' ? hitungTax(grandTotal) : 0;
    var totalFinal = grandTotal + taxJumlah;
    
    if (bayarValue < totalFinal) { 
        alert('Pembayaran kurang\nTotal: Rp ' + totalFinal.toLocaleString('id')); 
        return; 
    }
    
    var kembali = bayarValue - totalFinal;
    var now = new Date();
    var no = 'INV-' + now.toISOString().slice(0,10).replace(/-/g,'') + '-' + now.toTimeString().slice(0,8).replace(/:/g,'');
    
    try {
        // Update stok
        for (var j = 0; j < cart.length; j++) {
            var pr = await supabaseClient.from('products').select('stok').eq('barcode', cart[j].barcode).single();
            if (pr.data) {
                await supabaseClient.from('products').update({ 
                    stok: Math.max(0, pr.data.stok - cart[j].qty) 
                }).eq('barcode', cart[j].barcode);
            }
        }
        
        // Insert transaksi
        var trxData = {
            no_invoice: no, 
            tanggal: now.toISOString(), 
            customer: cust,
            items: cart.map(function(i) { 
                return { 
                    barcode: i.barcode, 
                    nama: i.nama, 
                    harga: i.harga, 
                    qty: i.qty, 
                    diskon: i.diskon || 0 
                }; 
            }),
            total: totalFinal, 
            bayar: bayarValue, 
            kembali: kembali,
            totalDiskon: totalDiskonValue,
            voucher_kode: currentVoucherData ? currentVoucherData.kode : null,
            tax_jumlah: taxJumlah,
            created_by: currentUser.username
        };
        
        if (typeof isOnline !== 'undefined' && isOnline) {
            await insertTransaction(trxData);
        } else if (typeof isOnline !== 'undefined' && !isOnline) {
            await queueOfflineTransaction(trxData);
        } else {
            await insertTransaction(trxData);
        }
        
        if (currentVoucherData) {
            await markVoucherUsed(currentVoucherData.kode, no);
        }
        
        var generatedVoucher = await generateVoucherKode(no, subtotal1);
        var toko = appSettings;
        var lk = parseInt(toko.kertas_lebar) || 80;
        var taxList = typeof getTaxList === 'function' ? getTaxList(grandTotal) : [];
        
        // Generate PDF struk
        var doc = new window.jspdf.jsPDF({ unit: 'mm', format: [lk, 120 + cart.length * 8 + taxList.length * 5] });
        var y = 8;
        
        doc.setFontSize(9);
        doc.text(toko.nama || 'TOKO', lk / 2, y, { align: 'center' });
        y += 5;
        
        if (toko.alamat) {
            doc.setFontSize(7);
            var alamatLines = doc.splitTextToSize(toko.alamat, lk - 6);
            alamatLines.forEach(function(line) {
                doc.text(line, lk / 2, y, { align: 'center' });
                y += 4;
            });
        }
        y += 2;
        
        doc.setFontSize(7);
        doc.text('No: ' + no, 3, y); y += 4;
        doc.text('Tanggal: ' + now.toLocaleString('id-ID'), 3, y); y += 4;
        doc.text('Customer: ' + (cust || '-'), 3, y); y += 6;
        doc.line(3, y, lk - 3, y); y += 4;
        
        doc.text('Item', 3, y);
        doc.text('Qty', lk * 0.4, y, { align: 'center' });
        doc.text('Harga', lk * 0.65, y, { align: 'right' });
        doc.text('Subtotal', lk - 3, y, { align: 'right' });
        y += 4;
        
        cart.forEach(function(i) {
            var sub = i.harga * i.qty;
            var netto = sub - (i.diskon || 0);
            var namaLines = doc.splitTextToSize(i.nama, lk * 0.35);
            
            namaLines.forEach(function(line, lineIndex) {
                if (lineIndex === 0) {
                    doc.text(line, 3, y);
                    doc.text(i.qty.toString(), lk * 0.4, y, { align: 'center' });
                    doc.text('Rp' + i.harga.toLocaleString('id'), lk * 0.65, y, { align: 'right' });
                    doc.text('Rp' + netto.toLocaleString('id'), lk - 3, y, { align: 'right' });
                } else {
                    doc.text(line, 3, y);
                }
                y += 4;
            });
            
            if (i.diskon > 0) {
                doc.setFontSize(6);
                doc.text('  Diskon: -Rp' + i.diskon.toLocaleString('id'), 5, y);
                doc.setFontSize(7);
                y += 4;
            }
        });
        
        doc.line(3, y, lk - 3, y); y += 4;
        
        doc.text('Subtotal:', 3, y);
        doc.text('Rp' + subtotal1.toLocaleString('id'), lk - 3, y, { align: 'right' });
        y += 5;
        
        if (totalDiskonValue > 0) {
            doc.text('Diskon:', 3, y);
            doc.text('-Rp' + totalDiskonValue.toLocaleString('id'), lk - 3, y, { align: 'right' });
            y += 5;
        }
        
        taxList.forEach(function(t) {
            doc.text(t.nama + ':', 3, y);
            doc.text('Rp' + Math.abs(t.jumlah).toLocaleString('id'), lk - 3, y, { align: 'right' });
            y += 5;
        });
        
        doc.setFontSize(9);
        doc.text('TOTAL:', 3, y);
        doc.text('Rp' + totalFinal.toLocaleString('id'), lk - 3, y, { align: 'right' });
        y += 6;
        
        doc.setFontSize(8);
        doc.text('Bayar:', 3, y);
        doc.text('Rp' + bayarValue.toLocaleString('id'), lk - 3, y, { align: 'right' });
        y += 5;
        
        doc.text('Kembali:', 3, y);
        doc.text('Rp' + kembali.toLocaleString('id'), lk - 3, y, { align: 'right' });
        y += 5;
        
        if (generatedVoucher) {
            y += 3;
            doc.setFontSize(7);
            doc.text('🎟️ SELAMAT!', lk / 2, y, { align: 'center' }); y += 4;
            doc.text('Voucher: ' + generatedVoucher.kode, lk / 2, y, { align: 'center' }); y += 4;
        }
        
        if (toko.footer) {
            y += 3;
            doc.setFontSize(7);
            var footerLines = doc.splitTextToSize(toko.footer, lk - 6);
            footerLines.forEach(function(line) {
                doc.text(line, lk / 2, y, { align: 'center' });
                y += 4;
            });
        }
        
        var pdfBlob = doc.output('blob');
        try { 
            await uploadInvoicePDF(no, pdfBlob); 
        } catch(e) {}
        window.open(URL.createObjectURL(pdfBlob), '_blank');
        
        tampilkanPopupShare(no, totalFinal);
        
        // Reset
        currentVoucherData = null;
        cart = []; 
        totalDiskonValue = 0; 
        bayarValue = 0;
        updateBayarDisplay(); 
        renderCart();
        document.getElementById('custName').value = '';
        
    } catch(e) { 
        alert('Gagal: ' + e.message); 
    }
}

function lihatDetailProduk(barcode) {
    (async function() { 
        var p = await getProductByBarcode(barcode); 
        if(!p) return; 
        alert(p.nama + '\nStok: ' + p.stok + '\nHarga: Rp' + (p.harga_jual||0).toLocaleString('id') + '\nLokasi: ' + (p.lokasi||'-')); 
    })(); 
}

// ===================== PESANAN =====================
async function simpanPesanan() {
    if (!cart.length) { 
        alert('Keranjang kosong'); 
        return; 
    }
    var cust = document.getElementById('custName').value.trim();
    var now = new Date();
    var no = 'PSN-' + now.toISOString().slice(0,10).replace(/-/g,'') + '-' + now.toTimeString().slice(0,8).replace(/:/g,'');
    var subtotal = cart.reduce(function(s, i) { 
        return s + (i.harga * i.qty) - (i.diskon || 0); 
    }, 0);
    await supabaseClient.from('saved_orders').insert({
        no_pesanan: no, 
        customer: cust,
        items: cart.map(function(i) { 
            return { 
                barcode: i.barcode, 
                nama: i.nama, 
                harga: i.harga, 
                qty: i.qty, 
                diskon: i.diskon || 0 
            }; 
        }),
        total: subtotal - totalDiskonValue, 
        total_diskon: totalDiskonValue,
        status: 'pending', 
        created_by: currentUser.username
    });
    alert('Pesanan disimpan: ' + no);
    cart = []; 
    totalDiskonValue = 0; 
    bayarValue = 0;
    updateBayarDisplay(); 
    renderCart();
    document.getElementById('custName').value = '';
}

async function tampilkanPesananTersimpan() {
    var r = await supabaseClient.from('saved_orders').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    var orders = r.data || [];
    var listEl = document.getElementById('pesananList');
    if (!orders.length) { 
        listEl.innerHTML = '<p style="text-align:center;color:#90a4ae;padding:20px;">Tidak ada pesanan</p>'; 
    } else {
        var html = '';
        orders.forEach(function(o) {
            html += '<div style="border:1px solid #e0e4e8;border-radius:8px;padding:12px;margin-bottom:8px;background:white;">';
            html += '<strong>' + o.no_pesanan + '</strong> | Rp' + (o.total||0).toLocaleString('id');
            html += ' | Customer: ' + (o.customer || '-');
            html += '<br><button class="btn btn-sm" onclick="muatPesanan(\'' + o.no_pesanan + '\')" style="margin-top:4px;">📥 Muat</button>';
            html += ' <button class="btn btn-sm btn-danger" onclick="hapusPesanan(\'' + o.no_pesanan + '\')">🗑 Hapus</button>';
            html += '</div>';
        });
        listEl.innerHTML = html;
    }
    document.getElementById('pesananModal').style.display = 'flex';
}

async function muatPesanan(noPesanan) {
    var r = await supabaseClient.from('saved_orders').select('*').eq('no_pesanan', noPesanan).single();
    if (!r.data) { 
        alert('Tidak ditemukan'); 
        return; 
    }
    var order = r.data;
    cart = [];
    order.items.forEach(function(i) {
        cart.push({ 
            barcode: i.barcode, 
            nama: i.nama, 
            harga: i.harga, 
            hargaAsli: i.harga, 
            qty: i.qty, 
            stok: 999, 
            diskon: i.diskon || 0, 
            isGrosir: false 
        });
    });
    totalDiskonValue = order.total_diskon || 0;
    if (order.customer) document.getElementById('custName').value = order.customer;
    currentPesananNo = noPesanan;
    renderCart();
    document.getElementById('pesananModal').style.display = 'none';
    alert('Pesanan dimuat: ' + noPesanan);
}

async function hapusPesanan(noPesanan) {
    if (!confirm('Hapus pesanan ini?')) return;
    await supabaseClient.from('saved_orders').delete().eq('no_pesanan', noPesanan);
    tampilkanPesananTersimpan();
}

// ===================== VOUCHER =====================
function bukaPopupVoucher() {
    var modal = document.createElement('div');
    modal.id = 'popupVoucherModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    
    var html = '<div style="background:#fff;padding:24px;border-radius:12px;width:340px;max-width:95%;">';
    html += '<h3 style="margin-bottom:12px;">🎟️ Voucher</h3>';
    html += '<input type="text" id="inputVoucherPopup" placeholder="Masukkan kode voucher..." style="width:100%;padding:12px;font-size:16px;border:2px solid #e0e4e8;border-radius:8px;">';
    html += '<div style="margin-top:12px;display:flex;gap:8px;">';
    html += '<button class="btn-sm" onclick="applyVoucher()" style="flex:1;background:#8e24aa;color:white;padding:12px;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">✅ Apply</button>';
    html += '<button class="btn-sm btn-danger" onclick="document.getElementById(\'popupVoucherModal\').remove()" style="flex:1;padding:12px;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">Batal</button>';
    html += '</div></div>';
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
    setTimeout(function() {
        var input = document.getElementById('inputVoucherPopup');
        if (input) input.focus();
    }, 200);
}

async function applyVoucher() {
    var input = document.getElementById('inputVoucherPopup');
    if (!input) return;
    
    var kode = input.value.trim();
    if (!kode) {
        alert('Masukkan kode voucher');
        return;
    }
    
    try {
        var { data, error } = await supabaseClient
            .from('voucher_codes')
            .select('*, vouchers(*)')
            .eq('kode', kode)
            .eq('status', 'aktif')
            .single();
        
        if (error || !data) {
            alert('Voucher tidak valid atau sudah digunakan');
            return;
        }
        
        var voucher = data.vouchers;
        if (!voucher) {
            alert('Voucher tidak valid');
            return;
        }
        
        // Cek tanggal
        var now = new Date();
        var startDate = voucher.tanggal_mulai ? new Date(voucher.tanggal_mulai) : null;
        var endDate = voucher.tanggal_akhir ? new Date(voucher.tanggal_akhir) : null;
        
        if (startDate && now < startDate) {
            alert('Voucher belum aktif');
            return;
        }
        if (endDate && now > endDate) {
            alert('Voucher sudah kadaluarsa');
            return;
        }
        
        // Cek minimal belanja
        var totalEl = document.getElementById('totalCart');
        var total = totalEl ? parseInt(totalEl.textContent.replace(/\D/g, '')) || 0 : 0;
        
        if (voucher.min_belanja > 0 && total < voucher.min_belanja) {
            alert('Minimal belanja Rp ' + voucher.min_belanja.toLocaleString('id'));
            return;
        }
        
        // Apply voucher
        var diskon = 0;
        if (voucher.tipe === 'persen') {
            diskon = Math.round(total * (voucher.nilai / 100));
            if (voucher.maks_potongan > 0 && diskon > voucher.maks_potongan) {
                diskon = voucher.maks_potongan;
            }
        } else {
            diskon = voucher.nilai;
        }
        
        totalDiskonValue += diskon;
        currentVoucherData = { kode: kode, diskon: diskon };
        
        alert('✅ Voucher berhasil! Diskon: Rp ' + diskon.toLocaleString('id'));
        document.getElementById('popupVoucherModal').remove();
        renderCart();
        
    } catch(e) {
        alert('Error: ' + e.message);
    }
}

// ===================== HELPER FUNCTIONS =====================
function tampilkanPopupShare(noInvoice, total) {
    // Tampilkan notifikasi
    var notification = document.createElement('div');
    notification.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#4CAF50;color:white;padding:15px 20px;border-radius:8px;z-index:9999;box-shadow:0 4px 8px rgba(0,0,0,0.2);max-width:90%;';
    notification.innerHTML = '✅ Transaksi berhasil!<br>Invoice: ' + noInvoice + '<br>Total: Rp ' + total.toLocaleString('id');
    document.body.appendChild(notification);
    setTimeout(function() { 
        if (notification.parentNode) notification.remove(); 
    }, 5000);
}

async function markVoucherUsed(kode, noInvoice) {
    try {
        var { data, error } = await supabaseClient
            .from('voucher_codes')
            .update({ 
                status: 'used', 
                used_at: new Date().toISOString(),
                used_invoice: noInvoice
            })
            .eq('kode', kode);
        
        if (error) throw error;
        return data;
    } catch(e) {
        console.error('markVoucherUsed error:', e);
        return null;
    }
}

async function generateVoucherKode(noInvoice, total) {
    try {
        if (total < 500000) return null;
        
        var now = new Date();
        var kode = 'VOUCHER-' + now.toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        
        var { data, error } = await supabaseClient
            .from('vouchers')
            .select('*')
            .eq('status', 'aktif')
            .gte('tanggal_akhir', now.toISOString().slice(0,10))
            .limit(1);
        
        if (error || !data || data.length === 0) return null;
        
        var voucher = data[0];
        
        var { data: codeData, error: codeError } = await supabaseClient
            .from('voucher_codes')
            .insert([{
                voucher_id: voucher.id,
                kode: kode,
                no_invoice_terbit: noInvoice,
                status: 'aktif',
                created_at: now.toISOString()
            }]);
        
        if (codeError) throw codeError;
        
        return { kode: kode, voucher: voucher };
    } catch(e) {
        console.error('generateVoucherKode error:', e);
        return null;
    }
}

function invalidateSettingsCache() { 
    cachedSettings = null; 
}

// ===================== INISIALISASI =====================
// Auto focus scan input setelah login
document.addEventListener('DOMContentLoaded', function() {
    var scanInput = document.getElementById('scanInputTrans');
    if (scanInput) {
        setTimeout(function() {
            scanInput.focus();
        }, 1000);
    }
});