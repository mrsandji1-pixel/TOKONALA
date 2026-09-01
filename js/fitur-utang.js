// ===================== FITUR UTANG =====================
async function setupUtang() {
  await muatDaftarUtang();
}

async function muatDaftarUtang() {
  var container = document.getElementById('utangContent');
  if (!container) return;
  
  var r = await supabaseClient.from('customer_debts').select('*').eq('status', 'active').order('created_at', { ascending: false });
  var debts = r.data || [];
  
  var html = '<button class="btn" onclick="formTambahUtang()">➕ Tambah Utang</button>';
  
  if (!debts.length) {
    html += '<p>Tidak ada utang aktif</p>';
    container.innerHTML = html;
    return;
  }
  
  html += '<table class="user-table"><thead><tr><th>Customer</th><th>Total Utang</th><th>Sudah Bayar</th><th>Sisa</th><th>Aksi</th></tr></thead><tbody>';
  
  debts.forEach(function(d) {
    var sisa = (d.amount || 0) - (d.paid || 0);
    html += '<tr><td>' + d.customer_name + '</td><td>Rp ' + (d.amount||0).toLocaleString('id') + '</td><td>Rp ' + (d.paid||0).toLocaleString('id') + '</td><td><b>Rp ' + sisa.toLocaleString('id') + '</b></td>';
    html += '<td><button class="btn-sm" onclick="formBayarUtang(' + d.id + ')">💰 Bayar</button> ';
    html += '<button class="btn-sm btn-danger" onclick="hapusUtang(' + d.id + ')">🗑</button></td></tr>';
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function formTambahUtang() {
  var nama = prompt('Nama customer:');
  if (!nama) return;
  var jumlah = prompt('Jumlah utang (Rp):');
  if (!jumlah) return;
  
  supabaseClient.from('customer_debts').insert({
    customer_name: nama,
    amount: parseFloat(jumlah) || 0,
    paid: 0,
    status: 'active'
  }).then(function() {
    alert('✅ Utang ditambahkan');
    muatDaftarUtang();
  });
}

function formBayarUtang(id) {
  var jumlah = prompt('Jumlah pembayaran (Rp):');
  if (!jumlah) return;
  
  supabaseClient.from('customer_debts').select('*').eq('id', id).single().then(function(r) {
    var debt = r.data;
    var newPaid = (debt.paid || 0) + (parseFloat(jumlah) || 0);
    var status = newPaid >= (debt.amount || 0) ? 'paid' : 'active';
    
    supabaseClient.from('customer_debts').update({
      paid: newPaid,
      status: status
    }).eq('id', id).then(function() {
      supabaseClient.from('debt_payments').insert({
        debt_id: id,
        amount: parseFloat(jumlah) || 0,
        created_by: currentUser.username
      }).then(function() {
        alert('✅ Pembayaran dicatat');
        muatDaftarUtang();
      });
    });
  });
}

async function hapusUtang(id) {
  if (!confirm('Hapus utang ini?')) return;
  await supabaseClient.from('customer_debts').delete().eq('id', id);
  muatDaftarUtang();
}