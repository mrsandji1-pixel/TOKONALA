// ===================== FITUR VOUCHER =====================
var currentVoucherData = null;

async function setupVoucher() {
  await muatDaftarVoucher();
}

async function muatDaftarVoucher() {
  var container = document.getElementById('voucherContent');
  if (!container) return;
  
  var r = await supabaseClient.from('vouchers').select('*').order('created_at', { ascending: false });
  var vouchers = r.data || [];
  
  var html = '<button class="btn" onclick="formTambahVoucher()">➕ Buat Voucher</button>';
  
  if (!vouchers.length) {
    html += '<p>Belum ada voucher</p>';
    container.innerHTML = html;
    return;
  }
  
  html += '<table class="user-table"><thead><tr><th>Nama</th><th>Tipe</th><th>Nilai</th><th>Min Belanja</th><th>Berlaku</th><th>Aksi</th></tr></thead><tbody>';
  vouchers.forEach(function(v) {
    var nilai = v.tipe === 'persen' ? v.nilai + '%' : 'Rp ' + v.nilai.toLocaleString('id');
    html += '<tr><td><b>' + v.nama + '</b></td><td>' + v.tipe + '</td><td>' + nilai + '</td>';
    html += '<td>Rp ' + (v.min_belanja||0).toLocaleString('id') + '</td>';
    html += '<td>' + (v.tanggal_mulai || '-') + ' s/d ' + (v.tanggal_akhir || '-') + '</td>';
    html += '<td><button class="btn-sm btn-danger" onclick="hapusVoucher(' + v.id + ')">🗑</button></td></tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

function bukaPopupVoucher() {
  var modal = document.createElement('div');
  modal.id = 'voucherPopupModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
  
  var html = '<div style="background:#fff;padding:20px;border-radius:12px;width:320px;text-align:center;">';
  html += '<h3>🎟️ Kode Voucher</h3>';
  html += '<p style="font-size:12px;color:#666;">Scan atau masukkan kode voucher</p>';
  html += '<input type="text" id="voucherCodeInput" placeholder="Masukkan kode voucher" style="width:100%;padding:12px;font-size:16px;text-align:center;border:2px solid #8e24aa;border-radius:8px;margin-bottom:12px;box-sizing:border-box;">';
  html += '<div style="display:flex;gap:8px;">';
  html += '<button class="btn" onclick="terapkanVoucherDariPopup()" style="flex:1;background:#8e24aa;color:white;">✅ Terapkan</button>';
  html += '<button class="btn btn-danger" onclick="document.getElementById(\'voucherPopupModal\').remove()">Batal</button>';
  html += '</div></div>';
  
  modal.innerHTML = html;
  document.body.appendChild(modal);
  
  setTimeout(function() { document.getElementById('voucherCodeInput').focus(); }, 200);
}

async function terapkanVoucherDariPopup() {
  var kode = document.getElementById('voucherCodeInput').value.trim();
  if (!kode) return;
  
  document.getElementById('voucherPopupModal').remove();
  await applyVoucher(kode);
}

function formTambahVoucher() {
  var modal = document.createElement('div');
  modal.id = 'voucherModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
  
  modal.innerHTML = '<div style="background:#fff;padding:20px;border-radius:12px;width:340px;max-height:90vh;overflow-y:auto;">' +
    '<h3>➕ Buat Voucher</h3>' +
    '<label>Nama Event</label><input type="text" id="voucherNama" placeholder="cth: Promo Lebaran" style="width:100%;padding:10px;margin-bottom:8px;box-sizing:border-box;border:1px solid #ddd;border-radius:6px;">' +
    '<label>Tipe</label><select id="voucherTipe" style="width:100%;padding:10px;margin-bottom:8px;border:1px solid #ddd;border-radius:6px;">' +
    '<option value="persen">Persen (%)</option>' +
    '<option value="nominal">Rupiah (Rp)</option>' +
    '</select>' +
    '<label>Nilai</label><input type="number" id="voucherNilai" placeholder="10" style="width:100%;padding:10px;margin-bottom:8px;box-sizing:border-box;border:1px solid #ddd;border-radius:6px;">' +
    '<label>Minimum Belanja (Rp)</label><input type="number" id="voucherMinBelanja" value="0" style="width:100%;padding:10px;margin-bottom:8px;box-sizing:border-box;border:1px solid #ddd;border-radius:6px;">' +
    '<label>Maksimum Potongan (Rp, 0 = unlimited)</label><input type="number" id="voucherMaksPotongan" value="0" style="width:100%;padding:10px;margin-bottom:8px;box-sizing:border-box;border:1px solid #ddd;border-radius:6px;">' +
    '<label>Tanggal Mulai</label><input type="date" id="voucherTglMulai" style="width:100%;padding:10px;margin-bottom:8px;box-sizing:border-box;border:1px solid #ddd;border-radius:6px;">' +
    '<label>Tanggal Akhir</label><input type="date" id="voucherTglAkhir" style="width:100%;padding:10px;margin-bottom:8px;box-sizing:border-box;border:1px solid #ddd;border-radius:6px;">' +
    '<div style="display:flex;gap:8px;">' +
    '<button class="btn" onclick="simpanVoucher()" style="flex:1;background:#009688;color:white;">Simpan</button>' +
    '<button class="btn btn-danger" onclick="document.getElementById(\'voucherModal\').remove()">Batal</button>' +
    '</div></div>';
  
  document.body.appendChild(modal);
}

async function simpanVoucher() {
  var nama = document.getElementById('voucherNama').value.trim();
  var tipe = document.getElementById('voucherTipe').value;
  var nilai = parseFloat(document.getElementById('voucherNilai').value) || 0;
  var minBelanja = parseFloat(document.getElementById('voucherMinBelanja').value) || 0;
  var maksPotongan = parseFloat(document.getElementById('voucherMaksPotongan').value) || 0;
  var tglMulai = document.getElementById('voucherTglMulai').value || null;
  var tglAkhir = document.getElementById('voucherTglAkhir').value || null;
  
  console.log('Saving voucher:', { nama, tipe, nilai, minBelanja, maksPotongan, tglMulai, tglAkhir });
  
  if (!nama) {
    alert('❌ Isi nama voucher');
    return;
  }
  if (nilai <= 0) {
    alert('❌ Isi nilai voucher');
    return;
  }
  
  var result = await supabaseClient.from('vouchers').insert({
    nama: nama,
    tipe: tipe,
    nilai: nilai,
    min_belanja: minBelanja,
    maks_potongan: maksPotongan,
    tanggal_mulai: tglMulai,
    tanggal_akhir: tglAkhir,
    status: 'aktif'
  });
  
  console.log('Insert result:', result.error ? result.error.message : 'OK');
  
  if (result.error) {
    alert('❌ Gagal: ' + result.error.message);
    return;
  }
  
  var modal = document.getElementById('voucherModal');
  if (modal) modal.remove();
  alert('✅ Voucher dibuat');
  
  if (typeof setupVoucherModal === 'function') {
    var fiturModal = document.getElementById('fiturModal');
    if (fiturModal) {
      setupVoucherModal('fiturContent_voucher');
    }
  }
}

async function hapusVoucher(id) {
  if (!confirm('Hapus voucher?')) return;
  await supabaseClient.from('voucher_codes').delete().eq('voucher_id', id);
  await supabaseClient.from('vouchers').delete().eq('id', id);
  
  if (typeof setupVoucherModal === 'function') {
    var fiturModal = document.getElementById('fiturModal');
    if (fiturModal) {
      setupVoucherModal('fiturContent_voucher');
    }
  }
}

async function setupVoucherModal(containerId) {
  var container = document.getElementById(containerId);
  container.innerHTML = '<p>Memuat...</p>';
  
  var r = await supabaseClient.from('vouchers').select('*').order('created_at', { ascending: false });
  var vouchers = r.data || [];
  
  var html = '<button class="btn btn-sm" onclick="formTambahVoucher()">➕ Buat Voucher</button>';
  
  if (!vouchers.length) {
    html += '<p>Belum ada voucher</p>';
    container.innerHTML = html;
    return;
  }
  
  html += '<table class="user-table"><thead><tr><th>Nama</th><th>Tipe</th><th>Nilai</th><th>Min Belanja</th><th>Berlaku</th><th>Aksi</th></tr></thead><tbody>';
  vouchers.forEach(function(v) {
    var nilai = v.tipe === 'persen' ? v.nilai + '%' : 'Rp ' + v.nilai.toLocaleString('id');
    html += '<tr><td><b>' + v.nama + '</b></td><td>' + v.tipe + '</td><td>' + nilai + '</td>';
    html += '<td>Rp ' + (v.min_belanja||0).toLocaleString('id') + '</td>';
    html += '<td>' + (v.tanggal_mulai || '-') + ' s/d ' + (v.tanggal_akhir || '-') + '</td>';
    html += '<td><button class="btn-sm btn-danger" onclick="hapusVoucher(' + v.id + ')">🗑</button></td></tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

async function generateVoucherKode(invoiceNo, subtotal) {
  var today = new Date().toISOString().slice(0, 10);
  
  var r = await supabaseClient.from('vouchers')
    .select('*')
    .eq('status', 'aktif')
    .lte('tanggal_mulai', today)
    .gte('tanggal_akhir', today);
  
  var activeCampaigns = r.data || [];
  
  for (var i = 0; i < activeCampaigns.length; i++) {
    var campaign = activeCampaigns[i];
    
    if (subtotal >= (campaign.min_belanja || 0)) {
      var kode = 'VCH-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      
      await supabaseClient.from('voucher_codes').insert({
        voucher_id: campaign.id,
        kode: kode,
        no_invoice_terbit: invoiceNo,
        status: 'aktif'
      });
      
      return { campaign: campaign, kode: kode };
    }
  }
  
  return null;
}

async function applyVoucher(kode) {
  if (!kode) return;
  
  kode = kode.toUpperCase().trim();
  
  var r = await supabaseClient.from('voucher_codes')
    .select('*, vouchers(*)')
    .eq('kode', kode)
    .eq('status', 'aktif')
    .single();
  
  if (!r.data) {
    alert('❌ Voucher tidak ditemukan atau sudah digunakan');
    return;
  }
  
  var voucherCode = r.data;
  var campaign = voucherCode.vouchers;
  
  var today = new Date().toISOString().slice(0, 10);
  if (campaign.tanggal_mulai && today < campaign.tanggal_mulai) {
    alert('❌ Voucher belum berlaku');
    return;
  }
  if (campaign.tanggal_akhir && today > campaign.tanggal_akhir) {
    alert('❌ Voucher sudah expired');
    return;
  }
  
  var subtotal = 0;
  cart.forEach(function(item) { subtotal += (item.harga * item.qty) - (item.diskon || 0); });
  
  if (subtotal < (campaign.min_belanja || 0)) {
    alert('❌ Min belanja: Rp ' + (campaign.min_belanja||0).toLocaleString('id'));
    return;
  }
  
  var potongan = hitungVoucher(campaign, subtotal);
  
  currentVoucherData = {
    kode: voucherCode.kode,
    nama: campaign.nama,
    potongan: potongan
  };
  
  totalDiskonValue += potongan;
  
  var vc = document.getElementById('voucherContainer');
  if (vc) {
    vc.innerHTML = '<div style="background:#e8f5e9;padding:8px;border-radius:6px;margin-bottom:8px;">✅ Voucher: ' + voucherCode.kode + ' - Rp ' + potongan.toLocaleString('id') + '</div>';
  }
  
  alert('✅ Voucher diterapkan\nPotongan: Rp ' + potongan.toLocaleString('id'));
  renderCart();
}

async function markVoucherUsed(kode, invoiceNo) {
  await supabaseClient.from('voucher_codes').update({
    status: 'digunakan',
    used_at: new Date().toISOString(),
    used_invoice: invoiceNo
  }).eq('kode', kode);
}

function hitungVoucher(voucher, subtotal) {
  var potongan = 0;
  if (voucher.tipe === 'persen') {
    potongan = Math.round((voucher.nilai / 100) * subtotal);
  } else {
    potongan = voucher.nilai;
  }
  if (voucher.maks_potongan > 0 && potongan > voucher.maks_potongan) {
    potongan = voucher.maks_potongan;
  }
  return Math.min(potongan, subtotal);
}