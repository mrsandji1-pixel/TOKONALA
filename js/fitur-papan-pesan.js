// ===================== FITUR PAPAN PESAN - FINAL =====================
var currentBoardTab = 'umum';
var currentBoardPage = 1;
var boardPageSize = 20;
var unreadMessageCount = 0;

// ===================== LOAD FUNCTIONS =====================
async function loadBoardPosts(kategori) {
  var q = supabaseClient.from('board_posts')
    .select('*')
    .eq('is_deleted', false)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });
  
  if (kategori && kategori !== 'semua') {
    q = q.eq('kategori', kategori);
  }
  
  var r = await q;
  return r.data || [];
}

async function loadUserMessages(username) {
  if (!username) return [];
  var r = await supabaseClient.from('user_messages')
    .select('*')
    .eq('to_user', username)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });
  return r.data || [];
}

async function loadSentMessages(username) {
  if (!username) return [];
  var r = await supabaseClient.from('user_messages')
    .select('*')
    .eq('from_user', username)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });
  return r.data || [];
}

async function countUnreadMessages(username) {
  if (!username) return 0;
  var r = await supabaseClient.from('user_messages')
    .select('id')
    .eq('to_user', username)
    .eq('is_read', false)
    .eq('is_deleted', false);
  return (r.data || []).length;
}

// ===================== MAIN MODAL =====================
async function setupModal_papanpesan(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '<p>Memuat...</p>';
  
  // Load data awal
  var unread = await countUnreadMessages(currentUser.username);
  unreadMessageCount = unread;
  
  var html = '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">' +
    '<button class="btn btn-sm" onclick="bukaBoardTab(\'umum\')" id="boardTabUmum" style="background:#00897b;color:white;">📢 Pengumuman</button>' +
    '<button class="btn btn-sm" onclick="bukaBoardTab(\'pesan\')" id="boardTabPesan" style="background:#e0e0e0;color:#333;">✉️ Pesan Saya' + (unread > 0 ? ' <span style="background:#e53935;color:white;border-radius:50%;padding:2px 6px;font-size:10px;">' + unread + '</span>' : '') + '</button>' +
    '<button class="btn btn-sm" onclick="bukaBoardTab(\'terkirim\')" id="boardTabTerkirim" style="background:#e0e0e0;color:#333;">📤 Terkirim</button>' +
    '</div>';
  
  html += '<div id="boardContent"></div>';
  container.innerHTML = html;
  
  // Load tab default
  bukaBoardTab('umum');
}

async function bukaBoardTab(tab) {
  currentBoardTab = tab;
  
  // Update button styles
  var tabs = ['umum', 'pesan', 'terkirim'];
  tabs.forEach(function(t) {
    var btn = document.getElementById('boardTab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) {
      if (t === tab) {
        btn.style.background = '#00897b';
        btn.style.color = 'white';
      } else {
        btn.style.background = '#e0e0e0';
        btn.style.color = '#333';
      }
    }
  });
  
  var content = document.getElementById('boardContent');
  if (!content) return;
  
  content.innerHTML = '<p>Memuat...</p>';
  
  if (tab === 'umum') {
    await renderBoardUmum(content);
  } else if (tab === 'pesan') {
    await renderPesanSaya(content);
  } else if (tab === 'terkirim') {
    await renderTerkirim(content);
  }
}

// ===================== TAB: PENGUMUMAN =====================
async function renderBoardUmum(content) {
  var posts = await loadBoardPosts('semua');
  
  var html = '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">';
  html += '<button class="btn btn-sm" onclick="formTambahPost()" style="background:#00897b;color:white;">➕ Buat Pengumuman</button>';
  html += '<select id="boardFilter" onchange="filterBoardPosts()" style="padding:6px;border-radius:6px;border:1px solid #ddd;font-size:12px;">';
  html += '<option value="semua">Semua Kategori</option>';
  html += '<option value="umum">📌 Umum</option>';
  html += '<option value="aturan">📋 Aturan Baru</option>';
  html += '<option value="update">🔄 Update</option>';
  html += '<option value="request">📦 Request Barang</option>';
  html += '</select>';
  html += '</div>';
  
  if (!posts.length) {
    html += '<p style="text-align:center;color:#999;padding:20px;">Belum ada pengumuman</p>';
    content.innerHTML = html;
    return;
  }
  
  html += '<div id="boardPostsList">';
  posts.forEach(function(p) {
    html += renderPostCard(p);
  });
  html += '</div>';
  
  content.innerHTML = html;
}

function renderPostCard(p) {
  var kategoriIcon = {
    'umum': '📌',
    'aturan': '📋',
    'update': '🔄',
    'request': '📦'
  };
  
  var prioritasColor = {
    'normal': '#666',
    'penting': '#ff9800',
    'urgent': '#e53935'
  };
  
  var pinnedStyle = p.is_pinned ? 'border-left:4px solid #ff9800;' : 'border-left:4px solid #e0e0e0;';
  var pinIcon = p.is_pinned ? '📌 ' : '';
  var priorityBadge = p.prioritas !== 'normal' ? ' <span style="background:' + prioritasColor[p.prioritas] + ';color:white;padding:2px 6px;border-radius:4px;font-size:10px;">' + p.prioritas.toUpperCase() + '</span>' : '';
  
  var html = '<div style="background:#fff;border-radius:8px;padding:12px;margin-bottom:8px;' + pinnedStyle + 'box-shadow:0 1px 3px rgba(0,0,0,0.08);">';
  html += '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px;">';
  html += '<div style="flex:1;">';
  html += '<div style="font-weight:bold;font-size:14px;margin-bottom:4px;">' + pinIcon + kategoriIcon[p.kategori] + ' ' + escapeHtml(p.judul) + priorityBadge + '</div>';
  html += '<div style="font-size:11px;color:#999;">oleh <b>' + escapeHtml(p.created_by) + '</b> • ' + formatTanggal(p.created_at) + '</div>';
  html += '</div>';
  
  // Action buttons
  if (currentUser.role === 'admin' || currentUser.username === p.created_by) {
    html += '<div style="display:flex;gap:4px;">';
    if (currentUser.role === 'admin') {
      html += '<button class="btn-sm" onclick="togglePin(' + p.id + ',' + !p.is_pinned + ')" title="' + (p.is_pinned ? 'Unpin' : 'Pin') + '">' + (p.is_pinned ? '📌' : '📍') + '</button>';
    }
    html += '<button class="btn-sm" onclick="formEditPost(' + p.id + ')" title="Edit">✏️</button>';
    html += '<button class="btn-sm btn-danger" onclick="hapusPost(' + p.id + ')" title="Hapus">🗑</button>';
    html += '</div>';
  }
  html += '</div>';
  html += '<div style="font-size:13px;color:#333;line-height:1.5;white-space:pre-wrap;">' + escapeHtml(p.isi) + '</div>';
  
  if (p.updated_at && p.updated_by) {
    html += '<div style="font-size:10px;color:#999;margin-top:8px;font-style:italic;">Diedit oleh ' + escapeHtml(p.updated_by) + ' pada ' + formatTanggal(p.updated_at) + '</div>';
  }
  
  html += '</div>';
  return html;
}

async function filterBoardPosts() {
  var filter = document.getElementById('boardFilter').value;
  var posts = await loadBoardPosts(filter);
  var listEl = document.getElementById('boardPostsList');
  if (!listEl) return;
  
  if (!posts.length) {
    listEl.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">Tidak ada pengumuman di kategori ini</p>';
    return;
  }
  
  var html = '';
  posts.forEach(function(p) {
    html += renderPostCard(p);
  });
  listEl.innerHTML = html;
}

// ===================== FORM POST =====================
function formTambahPost() {
  var modal = document.createElement('div');
  modal.id = 'postModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
  
  var html = '<div style="background:#fff;padding:20px;border-radius:12px;width:95%;max-width:500px;max-height:90vh;overflow-y:auto;">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
  html += '<h3 style="margin:0;">📢 Buat Pengumuman</h3>';
  html += '<button class="btn btn-danger btn-sm" onclick="document.getElementById(\'postModal\').remove()">✕</button>';
  html += '</div>';
  
  html += '<div class="form-group"><label>Kategori</label><select id="postKategori">';
  html += '<option value="umum">📌 Umum</option>';
  html += '<option value="aturan">📋 Aturan Baru</option>';
  html += '<option value="update">🔄 Update</option>';
  html += '<option value="request">📦 Request Barang</option>';
  html += '</select></div>';
  
  html += '<div class="form-group"><label>Prioritas</label><select id="postPrioritas">';
  html += '<option value="normal">Normal</option>';
  html += '<option value="penting">⚠️ Penting</option>';
  html += '<option value="urgent">🔴 Urgent</option>';
  html += '</select></div>';
  
  html += '<div class="form-group"><label>Judul</label><input type="text" id="postJudul" placeholder="Judul pengumuman..." maxlength="100"></div>';
  html += '<div class="form-group"><label>Isi</label><textarea id="postIsi" rows="6" placeholder="Isi pengumuman..." maxlength="2000"></textarea></div>';
  
  html += '<div style="display:flex;gap:8px;margin-top:12px;">';
  html += '<button class="btn" onclick="simpanPost()" style="flex:1;background:#00897b;color:white;">💾 Posting</button>';
  html += '<button class="btn btn-danger" onclick="document.getElementById(\'postModal\').remove()">Batal</button>';
  html += '</div>';
  html += '</div>';
  
  modal.innerHTML = html;
  document.body.appendChild(modal);
}

async function simpanPost() {
  var kategori = document.getElementById('postKategori').value;
  var prioritas = document.getElementById('postPrioritas').value;
  var judul = document.getElementById('postJudul').value.trim();
  var isi = document.getElementById('postIsi').value.trim();
  
  if (!judul) { alert('Isi judul!'); return; }
  if (!isi) { alert('Isi pengumuman!'); return; }
  
  try {
    var result = await supabaseClient.from('board_posts').insert({
      judul: judul,
      isi: isi,
      kategori: kategori,
      prioritas: prioritas,
      created_by: currentUser.username
    });
    
    if (result.error) throw result.error;
    
    var modal = document.getElementById('postModal');
    if (modal) modal.remove();
    
    alert('✅ Pengumuman diposting!');
    bukaBoardTab('umum');
  } catch(e) {
    alert('❌ Gagal: ' + e.message);
  }
}

async function formEditPost(id) {
  var r = await supabaseClient.from('board_posts').select('*').eq('id', id).single();
  var post = r.data;
  if (!post) { alert('Postingan tidak ditemukan'); return; }
  
  var modal = document.createElement('div');
  modal.id = 'postModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
  
  var html = '<div style="background:#fff;padding:20px;border-radius:12px;width:95%;max-width:500px;max-height:90vh;overflow-y:auto;">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
  html += '<h3 style="margin:0;">✏️ Edit Pengumuman</h3>';
  html += '<button class="btn btn-danger btn-sm" onclick="document.getElementById(\'postModal\').remove()">✕</button>';
  html += '</div>';
  
  html += '<input type="hidden" id="postId" value="' + post.id + '">';
  
  html += '<div class="form-group"><label>Kategori</label><select id="postKategori">';
  ['umum', 'aturan', 'update', 'request'].forEach(function(k) {
    html += '<option value="' + k + '"' + (post.kategori === k ? ' selected' : '') + '>' + k + '</option>';
  });
  html += '</select></div>';
  
  html += '<div class="form-group"><label>Prioritas</label><select id="postPrioritas">';
  ['normal', 'penting', 'urgent'].forEach(function(p) {
    html += '<option value="' + p + '"' + (post.prioritas === p ? ' selected' : '') + '>' + p + '</option>';
  });
  html += '</select></div>';
  
  html += '<div class="form-group"><label>Judul</label><input type="text" id="postJudul" value="' + escapeHtml(post.judul) + '" maxlength="100"></div>';
  html += '<div class="form-group"><label>Isi</label><textarea id="postIsi" rows="6" maxlength="2000">' + escapeHtml(post.isi) + '</textarea></div>';
  
  html += '<div style="display:flex;gap:8px;margin-top:12px;">';
  html += '<button class="btn" onclick="updatePost()" style="flex:1;background:#00897b;color:white;">💾 Update</button>';
  html += '<button class="btn btn-danger" onclick="document.getElementById(\'postModal\').remove()">Batal</button>';
  html += '</div>';
  html += '</div>';
  
  modal.innerHTML = html;
  document.body.appendChild(modal);
}

async function updatePost() {
  var id = document.getElementById('postId').value;
  var kategori = document.getElementById('postKategori').value;
  var prioritas = document.getElementById('postPrioritas').value;
  var judul = document.getElementById('postJudul').value.trim();
  var isi = document.getElementById('postIsi').value.trim();
  
  if (!judul || !isi) { alert('Isi judul dan isi!'); return; }
  
  try {
    await supabaseClient.from('board_posts').update({
      judul: judul,
      isi: isi,
      kategori: kategori,
      prioritas: prioritas,
      updated_at: new Date().toISOString(),
      updated_by: currentUser.username
    }).eq('id', id);
    
    var modal = document.getElementById('postModal');
    if (modal) modal.remove();
    
    alert('✅ Pengumuman diupdate!');
    bukaBoardTab('umum');
  } catch(e) {
    alert('❌ Gagal: ' + e.message);
  }
}

async function hapusPost(id) {
  if (!confirm('Hapus pengumuman ini?')) return;
  try {
    await supabaseClient.from('board_posts').update({ is_deleted: true }).eq('id', id);
    alert('✅ Dihapus');
    bukaBoardTab('umum');
  } catch(e) {
    alert('❌ Gagal: ' + e.message);
  }
}

async function togglePin(id, pinStatus) {
  try {
    await supabaseClient.from('board_posts').update({ is_pinned: pinStatus }).eq('id', id);
    bukaBoardTab('umum');
  } catch(e) {
    alert('❌ Gagal: ' + e.message);
  }
}

// ===================== TAB: PESAN SAYA =====================
async function renderPesanSaya(content) {
  var messages = await loadUserMessages(currentUser.username);
  
  var unread = messages.filter(function(m) { return !m.is_read; }).length;
  
  var html = '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center;">';
  html += '<button class="btn btn-sm" onclick="formKirimPesan()" style="background:#00897b;color:white;">✉️ Kirim Pesan</button>';
  if (unread > 0) {
    html += '<span style="background:#e53935;color:white;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:bold;">' + unread + ' belum dibaca</span>';
  }
  html += '</div>';
  
  if (!messages.length) {
    html += '<p style="text-align:center;color:#999;padding:20px;">Belum ada pesan</p>';
    content.innerHTML = html;
    return;
  }
  
  html += '<div id="pesanList">';
  messages.forEach(function(m) {
    html += renderPesanCard(m, 'inbox');
  });
  html += '</div>';
  
  content.innerHTML = html;
}

function renderPesanCard(m, mode) {
  var priorityColor = {
    'normal': '#666',
    'penting': '#ff9800',
    'urgent': '#e53935'
  };
  
  var unreadStyle = (!m.is_read && mode === 'inbox') ? 'background:#fff8e1;border-left:4px solid #ff9800;' : 'background:#fff;border-left:4px solid #e0e0e0;';
  var unreadDot = (!m.is_read && mode === 'inbox') ? '🔴 ' : '';
  var priorityBadge = m.priority !== 'normal' ? ' <span style="background:' + priorityColor[m.priority] + ';color:white;padding:2px 6px;border-radius:4px;font-size:10px;">' + m.priority.toUpperCase() + '</span>' : '';
  
  var html = '<div style="border-radius:8px;padding:12px;margin-bottom:8px;' + unreadStyle + 'box-shadow:0 1px 3px rgba(0,0,0,0.08);cursor:pointer;" onclick="bukaPesan(' + m.id + ',\'' + mode + '\')">';
  html += '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px;">';
  html += '<div style="flex:1;">';
  html += '<div style="font-weight:bold;font-size:14px;margin-bottom:4px;">' + unreadDot + escapeHtml(m.subject) + priorityBadge + '</div>';
  
  if (mode === 'inbox') {
    html += '<div style="font-size:11px;color:#666;">Dari: <b>' + escapeHtml(m.from_user) + '</b> • ' + formatTanggal(m.created_at) + '</div>';
  } else {
    html += '<div style="font-size:11px;color:#666;">Ke: <b>' + escapeHtml(m.to_user) + '</b> • ' + formatTanggal(m.created_at) + '</div>';
  }
  
  html += '</div>';
  html += '<button class="btn-sm btn-danger" onclick="event.stopPropagation();hapusPesan(' + m.id + ',\'' + mode + '\')" title="Hapus">🗑</button>';
  html += '</div>';
  html += '<div style="font-size:12px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(m.isi.substring(0, 100)) + (m.isi.length > 100 ? '...' : '') + '</div>';
  html += '</div>';
  return html;
}

async function bukaPesan(id, mode) {
  var r = await supabaseClient.from('user_messages').select('*').eq('id', id).single();
  var msg = r.data;
  if (!msg) return;
  
  // Mark as read (jika inbox)
  if (mode === 'inbox' && !msg.is_read) {
    await supabaseClient.from('user_messages').update({
      is_read: true,
      read_at: new Date().toISOString()
    }).eq('id', id);
    
    // Update badge
    if (typeof updateUnreadBadge === 'function') {
      setTimeout(updateUnreadBadge, 500);
    }
  }
  
  var modal = document.createElement('div');
  modal.id = 'readPesanModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10001;';
  
  var html = '<div style="background:#fff;padding:20px;border-radius:12px;width:95%;max-width:500px;max-height:90vh;overflow-y:auto;">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
  html += '<h3 style="margin:0;">✉️ ' + escapeHtml(msg.subject) + '</h3>';
  html += '<button class="btn btn-danger btn-sm" onclick="document.getElementById(\'readPesanModal\').remove()">✕</button>';
  html += '</div>';
  
  html += '<div style="font-size:12px;color:#666;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #e0e0e0;">';
  html += 'Dari: <b>' + escapeHtml(msg.from_user) + '</b><br>';
  html += 'Ke: <b>' + escapeHtml(msg.to_user) + '</b><br>';
  html += 'Tanggal: ' + formatTanggal(msg.created_at);
  if (msg.is_read && msg.read_at) {
    html += '<br>Dibaca: ' + formatTanggal(msg.read_at);
  }
  html += '</div>';
  
  html += '<div style="font-size:14px;color:#333;line-height:1.6;white-space:pre-wrap;">' + escapeHtml(msg.isi) + '</div>';
  
  html += '<div style="margin-top:16px;display:flex;gap:8px;">';
  if (mode === 'inbox') {
    html += '<button class="btn" onclick="formReplyPesan(\'' + escapeHtml(msg.from_user) + '\',\'' + escapeHtml(msg.subject) + '\')" style="flex:1;background:#00897b;color:white;">↩️ Balas</button>';
  }
  html += '<button class="btn btn-danger" onclick="document.getElementById(\'readPesanModal\').remove()">Tutup</button>';
  html += '</div>';
  
  html += '</div>';
  modal.innerHTML = html;
  document.body.appendChild(modal);
  
  // Refresh list setelah mark as read
  if (mode === 'inbox') {
    setTimeout(function() {
      if (currentBoardTab === 'pesan') bukaBoardTab('pesan');
    }, 500);
  }
}

// ===================== TAB: TERKIRIM =====================
async function renderTerkirim(content) {
  var messages = await loadSentMessages(currentUser.username);
  
  var html = '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">';
  html += '<button class="btn btn-sm" onclick="formKirimPesan()" style="background:#00897b;color:white;">✉️ Kirim Pesan</button>';
  html += '</div>';
  
  if (!messages.length) {
    html += '<p style="text-align:center;color:#999;padding:20px;">Belum ada pesan terkirim</p>';
    content.innerHTML = html;
    return;
  }
  
  html += '<div id="terkirimList">';
  messages.forEach(function(m) {
    html += renderPesanCard(m, 'sent');
  });
  html += '</div>';
  
  content.innerHTML = html;
}

// ===================== FORM KIRIM PESAN =====================
async function formKirimPesan() {
  // Load daftar user
  var r = await supabaseClient.from('users').select('username, role');
  var users = (r.data || []).filter(function(u) {
    return u.username !== currentUser.username;
  });
  
  var modal = document.createElement('div');
  modal.id = 'kirimPesanModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10001;';
  
  var html = '<div style="background:#fff;padding:20px;border-radius:12px;width:95%;max-width:500px;max-height:90vh;overflow-y:auto;">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
  html += '<h3 style="margin:0;">✉️ Kirim Pesan</h3>';
  html += '<button class="btn btn-danger btn-sm" onclick="document.getElementById(\'kirimPesanModal\').remove()">✕</button>';
  html += '</div>';
  
  html += '<div class="form-group"><label>Ke</label><select id="pesanTo">';
  html += '<option value="">-- Pilih User --</option>';
  users.forEach(function(u) {
    html += '<option value="' + escapeHtml(u.username) + '">' + escapeHtml(u.username) + ' (' + u.role + ')</option>';
  });
  html += '</select></div>';
  
  html += '<div class="form-group"><label>Prioritas</label><select id="pesanPriority">';
  html += '<option value="normal">Normal</option>';
  html += '<option value="penting">⚠️ Penting</option>';
  html += '<option value="urgent">🔴 Urgent</option>';
  html += '</select></div>';
  
  html += '<div class="form-group"><label>Subjek</label><input type="text" id="pesanSubject" placeholder="Subjek pesan..." maxlength="100"></div>';
  html += '<div class="form-group"><label>Isi Pesan</label><textarea id="pesanIsi" rows="6" placeholder="Tulis pesan..." maxlength="2000"></textarea></div>';
  
  html += '<div style="display:flex;gap:8px;margin-top:12px;">';
  html += '<button class="btn" onclick="simpanPesan()" style="flex:1;background:#00897b;color:white;">📤 Kirim</button>';
  html += '<button class="btn btn-danger" onclick="document.getElementById(\'kirimPesanModal\').remove()">Batal</button>';
  html += '</div>';
  html += '</div>';
  
  modal.innerHTML = html;
  document.body.appendChild(modal);
}

function formReplyPesan(toUser, subject) {
  var readModal = document.getElementById('readPesanModal');
  if (readModal) readModal.remove();
  
  formKirimPesan().then(function() {
    var toEl = document.getElementById('pesanTo');
    var subjEl = document.getElementById('pesanSubject');
    if (toEl) toEl.value = toUser;
    if (subjEl) subjEl.value = 'Re: ' + subject;
  });
}

async function simpanPesan() {
  var to = document.getElementById('pesanTo').value;
  var subject = document.getElementById('pesanSubject').value.trim();
  var isi = document.getElementById('pesanIsi').value.trim();
  var priority = document.getElementById('pesanPriority').value;
  
  if (!to) { alert('Pilih penerima!'); return; }
  if (!subject) { alert('Isi subjek!'); return; }
  if (!isi) { alert('Isi pesan!'); return; }
  
  try {
    var result = await supabaseClient.from('user_messages').insert({
      from_user: currentUser.username,
      to_user: to,
      subject: subject,
      isi: isi,
      priority: priority
    });
    
    if (result.error) throw result.error;
    
    var modal = document.getElementById('kirimPesanModal');
    if (modal) modal.remove();
    
    alert('✅ Pesan terkirim ke ' + to);
    bukaBoardTab('terkirim');
  } catch(e) {
    alert('❌ Gagal: ' + e.message);
  }
}

async function hapusPesan(id, mode) {
  if (!confirm('Hapus pesan ini?')) return;
  try {
    await supabaseClient.from('user_messages').update({ is_deleted: true }).eq('id', id);
    alert('✅ Dihapus');
    if (mode === 'inbox') bukaBoardTab('pesan');
    else bukaBoardTab('terkirim');
  } catch(e) {
    alert('❌ Gagal: ' + e.message);
  }
}

// ===================== HELPERS =====================
function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTanggal(dateStr) {
  if (!dateStr) return '-';
  var d = new Date(dateStr);
  var now = new Date();
  var diffMs = now - d;
  var diffMin = Math.floor(diffMs / 60000);
  var diffHour = Math.floor(diffMs / 3600000);
  var diffDay = Math.floor(diffMs / 86400000);
  
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return diffMin + ' menit lalu';
  if (diffHour < 24) return diffHour + ' jam lalu';
  if (diffDay < 7) return diffDay + ' hari lalu';
  
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ===================== TOMBOL PAPAN PESAN CEPAT =====================
function bukaPapanPesanCepat() {
  var modal = document.createElement('div');
  modal.id = 'papanPesanCepatModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  
  modal.innerHTML = '<div style="background:#fff;padding:20px;border-radius:12px;width:95%;max-width:700px;max-height:90vh;overflow-y:auto;display:flex;flex-direction:column;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
    '<h3 style="margin:0;">📢 Papan Pesan</h3>' +
    '<button class="btn btn-danger btn-sm" onclick="document.getElementById(\'papanPesanCepatModal\').remove()">✕ Tutup</button>' +
    '</div>' +
    '<div id="papanPesanCepatContent" style="flex:1;overflow-y:auto;"></div>' +
    '</div>';
  
  document.body.appendChild(modal);
  
  setupModal_papanpesan('papanPesanCepatContent');
}

// ===================== VISIBILITY TOMBOL PAPAN PESAN =====================
function updatePapanPesanButtonVisibility() {
  var btn = document.getElementById('btnPapanPesan');
  if (!btn) return;
  
  // Cek apakah fitur papanpesan aktif
  var isActive = typeof activeFeatures !== 'undefined' && activeFeatures && activeFeatures.papanpesan;
  
  if (currentUser && isActive) {
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    updateUnreadBadge();
  } else {
    btn.style.display = 'none';
  }
}

// ===================== BADGE NOTIFIKASI =====================
async function updateUnreadBadge() {
  if (!currentUser || !currentUser.username) return;
  
  var btn = document.getElementById('btnPapanPesan');
  if (!btn) return;
  
  // Cek apakah fitur papanpesan aktif
  var isActive = typeof activeFeatures !== 'undefined' && activeFeatures && activeFeatures.papanpesan;
  if (!isActive) {
    btn.style.display = 'none';
    return;
  }
  
  btn.style.display = 'inline-flex';
  btn.style.alignItems = 'center';
  btn.style.justifyContent = 'center';
  
  try {
    var unread = await countUnreadMessages(currentUser.username);
    var badge = document.getElementById('unreadBadge');
    if (badge) {
      if (unread > 0) {
        badge.textContent = unread > 99 ? '99+' : unread;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch(e) {
    console.error('Badge update error:', e);
  }
}

// Auto-update badge setiap 30 detik
setInterval(function() {
  if (currentUser && currentUser.username) {
    updateUnreadBadge();
  }
}, 30000);