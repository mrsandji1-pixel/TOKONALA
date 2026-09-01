// ===================== FITUR MULTI USER =====================
async function setupMultiUser() {
  await muatDaftarMultiUser();
}

async function muatDaftarMultiUser() {
  var container = document.getElementById('multiUserContent');
  if (!container) return;
  
  var r = await supabaseClient.from('users').select('*').order('username');
  var users = r.data || [];
  
  var html = '<button class="btn" onclick="formTambahMultiUser()">➕ Tambah User</button>';
  
  if (!users.length) {
    html += '<p>Belum ada user</p>';
    container.innerHTML = html;
    return;
  }
  
  html += '<table class="user-table"><thead><tr><th>Username</th><th>Role</th><th>Login Terakhir</th><th>Status</th><th>Aksi</th></tr></thead><tbody>';
  
  users.forEach(function(u) {
    var lastLogin = u.last_login ? new Date(u.last_login).toLocaleDateString('id-ID') : '-';
    html += '<tr><td>' + u.username + '</td><td>' + u.role + '</td><td>' + lastLogin + '</td>';
    html += '<td>' + (u.last_login ? '✅ Aktif' : '❌ Belum login') + '</td>';
    html += '<td>';
    if (u.username !== 'admin') {
      html += '<button class="btn-sm btn-danger" onclick="hapusMultiUser(\'' + u.username + '\')">🗑</button>';
    }
    html += '</td></tr>';
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function formTambahMultiUser() {
  var modal = document.createElement('div');
  modal.id = 'multiUserModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  
  modal.innerHTML = '<div style="background:#fff;padding:20px;border-radius:12px;width:320px;text-align:center;">' +
    '<h3>➕ Tambah User</h3>' +
    '<input type="text" id="multiUserUsername" placeholder="Username" style="width:100%;padding:10px;margin-bottom:8px;box-sizing:border-box;border:1px solid #ddd;border-radius:6px;">' +
    '<input type="password" id="multiUserPassword" placeholder="Password" style="width:100%;padding:10px;margin-bottom:8px;box-sizing:border-box;border:1px solid #ddd;border-radius:6px;">' +
    '<select id="multiUserRole" style="width:100%;padding:10px;margin-bottom:8px;border:1px solid #ddd;border-radius:6px;">' +
    '<option value="kasir">Kasir</option>' +
    '<option value="staff">Staff</option>' +
    '<option value="gudang">Gudang</option>' +
    '<option value="admin">Admin</option>' +
    '</select>' +
    '<div style="display:flex;gap:8px;">' +
    '<button class="btn" onclick="simpanMultiUser()" style="flex:1;background:#009688;color:white;">Simpan</button>' +
    '<button class="btn btn-danger" onclick="document.getElementById(\'multiUserModal\').remove()">Batal</button>' +
    '</div></div>';
  
  document.body.appendChild(modal);
}

async function simpanMultiUser() {
  var username = document.getElementById('multiUserUsername').value.trim();
  var password = document.getElementById('multiUserPassword').value;
  var role = document.getElementById('multiUserRole').value;
  
  if (!username || !password) {
    alert('Isi username dan password');
    return;
  }
  
  var passwordHash = await hashPassword(password);
  
  var result = await supabaseClient.from('users').upsert({
    username: username,
    password_hash: passwordHash,
    role: role
  }, { onConflict: 'username' });
  
  if (result.error) {
    alert('❌ Gagal: ' + result.error.message);
    return;
  }
  
  var modal = document.getElementById('multiUserModal');
  if (modal) modal.remove();
  
  alert('✅ User ditambahkan');
  muatDaftarMultiUser();
}

async function hapusMultiUser(username) {
  if (username === 'admin') {
    alert('Admin tidak bisa dihapus');
    return;
  }
  if (!confirm('Hapus user ' + username + '?')) return;
  
  await supabaseClient.from('users').delete().eq('username', username);
  muatDaftarMultiUser();
}