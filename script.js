// ================= 核心状态数据 =================
let state = {
  profile: { name: '我', avatar: '' },
  dreams: [], // 梦角数组
  dreams: [], 
  cards: [],  // 字卡数组
  categories: [{ id: 'default', name: '默认' }],
  chatSessions: {}, // 聊天记录 { dreamId: [ {from, text, time} ] },
  currentChatId: null, // 当前正在聊天的梦角ID
  currentEditDreamId: null // 当前正在编辑的梦角ID
};

// 初始化 IndexedDB 存储（使用 localforage）
localforage.config({ name: 'MyNewApp' });

// 读取保存的数据
async function loadState() {
  try {
    const saved = await localforage.getItem('myAppState');
    if (saved) {
      state = Object.assign(state, saved);
    }
  } catch (e) {
    console.log('读取数据失败', e);
  }
    if (state.profile && !state.profile.status) state.profile.status = '在线';
  if (state.dreams) {
    state.dreams.forEach(d => { if (!d.status) d.status = '在线'; });
  }
    if (state.dreams) {
    state.dreams.forEach(d => { 
      if (!d.statuses) d.statuses = []; 
      if (!d.currentStatus) d.currentStatus = '在线'; 
    });
  }
      renderAll();
    
    // 👇 加上这三行补丁，确保大退重进后数据加载完毕再涂抹壁纸
    setTimeout(() => { try { applyBeautifySettings(); } catch(e) {} }, 500);
    setTimeout(() => { try { applyBeautifySettings(); } catch(e) {} }, 1500);
    setTimeout(() => { try { applyBeautifySettings(); } catch(e) {} }, 3000);
  
  // ===== 新增：自动进入聊天逻辑 =====
  if (state.currentChatId && state.dreams.some(d => d.id === state.currentChatId)) {
    // 有上次聊天的梦角，直接进那个
    openChat(state.currentChatId);
  } else if (state.dreams.length > 0) {
    // 有梦角，但没记录，进第一个
    openChat(state.dreams[0].id);
  } else {
    // 连梦角都没有，直接跳去通讯录让你加
    navigateTo('pageContacts');
  }
}

// 保存数据
function saveState() {
  localforage.setItem('myAppState', JSON.parse(JSON.stringify(state)));
}

// 顶部导航栏交互
const dreamAvatarBtn = document.getElementById('dreamAvatarBtn');
const dreamDropdown = document.getElementById('dreamDropdown');
const extendMenuBtn = document.getElementById('extendMenuBtn');
const extendedMenu = document.getElementById('extendedMenu');
const arrowIcon = document.getElementById('arrowIcon');

dreamAvatarBtn.addEventListener('click', function(e) {
  e.stopPropagation(); 
  if (state.dreams.length === 0) {
    dreamDropdown.classList.remove('show');
    showToast('暂无梦角，请前往通讯录添加');
    return;
  }
  
  dreamDropdown.innerHTML = '';
  state.dreams.forEach(dream => {
    const item = document.createElement('div');
    item.className = 'dream-item';
    item.onclick = function() { openChat(dream.id); };
    item.innerHTML = `
      <div class="avatar-circle" style="${dream.avatar ? `background-image:url(${dream.avatar});background-size:cover;background-position:center;` : ''}">${dream.avatar ? '' : dream.name.charAt(0)}</div>
      <div style="display: flex; align-items: baseline; gap: 6px; flex: 1; min-width: 0;">
        <div class="name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60px;">${dream.name}</div>
        <div class="status" style="font-size: 10px; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${dream.currentStatus || '在线'}</div>
      </div>
    `;
    dreamDropdown.appendChild(item);
  });
  dreamDropdown.classList.toggle('show');
  extendedMenu.classList.remove('show');
  arrowIcon.classList.remove('open');
});

extendMenuBtn.addEventListener('click', function(e) {
  e.stopPropagation();
  extendedMenu.classList.toggle('show');
  arrowIcon.classList.toggle('open');
  dreamDropdown.classList.remove('show');
});

document.addEventListener('click', function() {
  dreamDropdown.classList.remove('show');
  extendedMenu.classList.remove('show');
  arrowIcon.classList.remove('open');
});
dreamDropdown.addEventListener('click', e => e.stopPropagation());
extendedMenu.addEventListener('click', e => e.stopPropagation());

// ================= 页面路由 =================
function navigateTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');

    if (pageId === 'pageCalendar') {
    renderCalendar();
  }

    if (pageId === 'pageMailbox') {
    switchMailTab('inbox'); // 默认打开收件箱
  }
  
  // 隐藏底部栏，只有聊天页显示
  const bottomBar = document.getElementById('bottomBar');
  if (pageId === 'pageChat') {
    bottomBar.style.display = 'flex';
  } else {
    bottomBar.style.display = 'none';
  }

  // 切换页面时执行对应渲染
  if (pageId === 'pageContacts') renderContacts();
    if (pageId === 'pageSettings') {
    if (state.settings && state.settings.pushEnabled) {
      document.getElementById('pushToggle').classList.add('on');
    } else {
      document.getElementById('pushToggle').classList.remove('on');
    }
  }
  if (pageId === 'pageChatSetting') initChatSettingPage();
  if (pageId === 'pageUserProfile') renderUserProfile();
  if (pageId === 'pageWordCards') renderCards();
  if (pageId === 'pageStickers') renderStickers();
  if (pageId === 'pageChat') renderChatMessages();
  if (pageId === 'pageFavorites') renderFavoritesPage();
  if (pageId === 'pageAvatar') renderAvatarLib();
  if (pageId === 'pageBeautify') initBeautifyPage();
  if (pageId === 'pageChatSettings') initChatSettingsPage();
  if (pageId === 'pageScrapbook') { renderDiaryCover(); renderDiaryList(); }
}

// ================= 渲染全局 =================
function renderAll() {
  // ===== 修复顶部用户头像 =====
  const uName = state.profile.name || '我';
  const uStatus = state.profile.status || '在线';
  document.getElementById('topUserName').textContent = uStatus;
  
  const uAvatar = document.getElementById('topUserAvatar');
  if (state.profile.avatar) {
    uAvatar.innerHTML = `<img src="${state.profile.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" onerror="this.parentNode.innerHTML='${uName.charAt(0)}'">`;
    uAvatar.style.background = 'none';
  } else {
    uAvatar.innerHTML = uName.charAt(0);
    uAvatar.style.background = '#ffe0e8';
    uAvatar.style.color = '#d6336c';
  }

  // ===== 修复顶部梦角头像 =====
  if (state.currentChatId) {
    const d = state.dreams.find(x => x.id === state.currentChatId);
    if (d) {
      document.getElementById('topDreamName').textContent = d.currentStatus || d.status || '在线';
      const dAvatar = document.getElementById('topDreamAvatar');
      
      if (d.avatar) {
        dAvatar.innerHTML = `<img src="${d.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" onerror="this.parentNode.innerHTML='${d.name.charAt(0)}'">`;
        dAvatar.style.background = 'none';
      } else {
        dAvatar.innerHTML = d.name.charAt(0);
        dAvatar.style.background = '#e1ebf5';
        dAvatar.style.color = '#007aff';
      }
    }
  }
}

// ================= 1. 用户信息功能 =================
function renderUserProfile() {
  document.getElementById('userNameInput').value = state.profile.name;
  const img = document.getElementById('userAvatarPreview');
  if (state.profile.avatar) img.src = state.profile.avatar;
  document.getElementById('userStatusInput').value = state.profile.status || '在线';
}

function handleUserAvatar(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    state.profile.avatar = ev.target.result;
    document.getElementById('userAvatarPreview').src = ev.target.result;
    saveState();
    renderAll();
  };
  reader.readAsDataURL(file);
}

function saveUserProfile() {
  state.profile.name = document.getElementById('userNameInput').value.trim() || '我';
  state.profile.status = document.getElementById('userStatusInput').value.trim() || '在线';
  saveState();
  renderAll();
  showToast('个人信息已保存');
  goBack();
}

// ================= 2. 通讯录功能 =================
function renderContacts() {
  const list = document.getElementById('contactList');
  if (!list) return;
  
  if (!state.dreams || state.dreams.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:#999;padding-top:50px;">空空如也，点右上角 + 添加梦角</div>';
    return;
  }
  
  let html = '';
  state.dreams.forEach(d => {
    // 强行把样式写死在标签里，谁也拦不住它显示
    html += `
      <div onclick="openEditDreamRole('${d.id}')" style="display:flex; align-items:center; padding:14px 16px; background:#fff; border-radius:12px; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.04); border:1px solid #e5e5ea; cursor:pointer; box-sizing:border-box; width:100%;">
        <img src="${d.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2750%27 height=%2750%27 viewBox=%270 0 50 50%27%3E%3Ccircle cx=%2725%27 cy=%2725%27 r=%2725%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2725%27 y=%2730%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2720%27%3E💜%3C/text%3E%3C/svg%3E'}" style="width:50px;height:50px;border-radius:50%;object-fit:cover;margin-right:14px;flex-shrink:0;border:2px solid #e5e5ea;">
        <div style="flex:1; min-width:0;">
          <div style="font-size:16px; font-weight:600; color:#1d1d1f; margin-bottom:4px;">${d.name || '未命名'}</div>
          <div style="font-size:12px; color:#86868b;">${d.currentStatus || '在线'}</div>
        </div>
        <div style="color:#007aff; font-size:14px; padding:10px; font-weight:600;" onclick="event.stopPropagation();openChat('${d.id}')">去聊天 ›</div>
      </div>
    `;
  });
  
  list.innerHTML = html;
}

function openEditDreamRole(id = null) {
  state.currentEditDreamId = id;
  const d = id ? state.dreams.find(x => x.id === id) : null;
  
  document.getElementById('editDreamTitle').textContent = id ? '编辑梦角' : '新增梦角';
  document.getElementById('dreamNameInput').value = d ? d.name : '';
    window._dreamStatusCollapsed = true;
  window._tempStatuses = d && d.statuses ? d.statuses.slice() : [];
  if (!d && !d.statuses) window._tempStatuses = []; // 兜底新建
  renderDreamStatusList();
  document.getElementById('dreamAvatarPreview').src = d && d.avatar ? d.avatar : 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2780%27 height=%2780%27 viewBox=%270 0 80 80%27%3E%3Ccircle cx=%2740%27 cy=%2740%27 r=%2740%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2740%27 y=%2744%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2728%27%3E💜%3C/text%3E%3C/svg%3E';
  document.getElementById('deleteDreamBtn').style.display = id ? 'block' : 'none';
  
  navigateTo('pageEditDreamRole');
}

function handleDreamAvatar(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { document.getElementById('dreamAvatarPreview').src = ev.target.result; };
  reader.readAsDataURL(file);
}

function saveDreamRole() {
  const name = document.getElementById('dreamNameInput').value.trim();
  const avatar = document.getElementById('dreamAvatarPreview').src;
  if (!name) return showToast('请输入名字');
  
  if (state.currentEditDreamId) {
    const d = state.dreams.find(x => x.id === state.currentEditDreamId);
    if (d) { 
      d.name = name; 
      d.avatar = avatar; 
      d.statuses = window._tempStatuses || [];
      if (!d.currentStatus && d.statuses.length > 0) d.currentStatus = d.statuses[0];
    }
  } else {
    state.dreams.push({ 
      id: 'd_' + Date.now(), 
      name, 
      avatar, 
      statuses: window._tempStatuses || [],
      currentStatus: (window._tempStatuses && window._tempStatuses.length > 0) ? window._tempStatuses[0] : '在线',
      balance: 100 
    }); 
  }
  saveState();
  renderContacts();
  renderAll();
  showToast('保存成功');
  navigateTo('pageContacts');
}

function deleteDreamRole() {
  if (!confirm('确定删除该梦角及所有聊天记录吗？')) return;
  state.dreams = state.dreams.filter(x => x.id !== state.currentEditDreamId);
  delete state.chatSessions[state.currentEditDreamId];
  if (state.currentChatId === state.currentEditDreamId) state.currentChatId = null;
  saveState();
  renderContacts();
  renderAll();
  navigateTo('pageContacts');
}

// ================= 3. 聊天功能 =================
function openChat(id) {
  state.currentChatId = id;
  saveState(); // 记住当前聊天对象
  
  dreamDropdown.classList.remove('show');
  navigateTo('pageChat');
  
  // 这个函数会自动把名字和图片头像渲染到顶部
  renderAll(); 
}

function renderChatMessages() {
  const container = document.getElementById('chatMessageContainer');
  const msgs = state.chatSessions[state.currentChatId] || [];
  if (msgs.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#999;font-size:13px;margin-top:50px;">开始聊天吧</div>';
    return;
  }

  const dream = state.dreams.find(x => x.id === state.currentChatId);
  const dreamName = dream ? dream.name : '梦';
  const dreamAvatar = dream && dream.avatar ? dream.avatar : `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23ffe0e8'/%3E%3Ctext x='20' y='25' text-anchor='middle' fill='%23d6336c' font-size='16'%3E${dreamName.charAt(0)}%3C/text%3E%3C/svg%3E`;
  const userName = state.profile.name || '我';
  const userAvatar = state.profile.avatar ? state.profile.avatar : `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23e8e8ed'/%3E%3Ctext x='20' y='25' text-anchor='middle' fill='%2386868b' font-size='16'%3E${userName.charAt(0)}%3C/text%3E%3C/svg%3E`;

  const bSet = state.settings || {};
  const uBg = bSet.globalBubbleUser || '#007aff';
  const dBg = bSet.globalBubbleDream || '#ffffff';
  const fColor = bSet.globalFontColor || '#1d1d1f';
  const hasCustomCSS = bSet.globalChatCSS && bSet.globalChatCSS.trim().length > 0;
  const subColor = bSet.globalSubTextColor || '#b0b0b0';

  let bubbleClass = '';
  if (bSet.globalBubbleStyle === 'glass') bubbleClass = 'bubble-glass';
  if (bSet.globalBubbleStyle === 'handdrawn') bubbleClass = 'bubble-handdrawn';

  container.innerHTML = msgs.map((m, i) => {
    if (m.from === 'system') return `<div data-msg-index="${i}" style="text-align:center; margin:12px 0; font-size:12px; color:${subColor};">${m.text}</div>`;
    
    if (m.type === 'poke') {
      const pokeName = m.senderName || (m.from === 'user' ? '我' : dreamName);
      return `<div data-msg-index="${i}" style="text-align:center; margin:12px 0; font-size:12px; color:${subColor};"><span style="font-weight:600;">${pokeName}</span> ${m.text}</div>`;
    }

    if (m.type === 'gomoku_invite') {
      const matchNow = state.gomokuAiMatches.find(x => x.id === m.matchId);
      const isEnded = !matchNow || !matchNow.active;
      return `<div data-msg-index="${i}" style="display:flex;justify-content:flex-start;margin-bottom:12px;">
        <div style="width:240px;background:linear-gradient(135deg,#f5f5f7,#e8e8ed);border-radius:12px;padding:16px;box-shadow:0 4px 14px rgba(0,0,0,0.08);border:1px solid rgba(255,255,255,0.7);">
          <div style="font-size:14px;font-weight:600;color:#1d1d1f;margin-bottom:10px;">对局邀请</div>
          <div style="font-size:14px;color:#333;line-height:1.5;margin-bottom:12px;">「${m.p1Name}」和「${m.p2Name}」正在五子棋对弈！</div>
          ${isEnded ? '<div style="text-align:center;font-size:12px;color:#888;padding-top:10px;border-top:1px solid rgba(0,0,0,0.05);">对局已结束</div>' 
                    : `<button onclick="enterSpectateMode('${m.matchId}')" style="width:100%;padding:8px;border:none;background:#007aff;color:#fff;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600;">去观战</button>`}
        </div>
      </div>`;
    }

    if (m.type === 'gomoku_result') {
      const p1Col = m.p1Color === 1 ? '黑棋' : '白棋';
      const p2Col = m.p2Color === 1 ? '黑棋' : '白棋';
      return `<div data-msg-index="${i}" style="display:flex;justify-content:flex-start;margin-bottom:12px;">
        <div style="width:240px;background:#fff;border-radius:12px;padding:14px 16px;box-shadow:0 4px 14px rgba(0,0,0,0.08);border:1px solid rgba(0,0,0,0.05);">
          <div style="font-size:14px;font-weight:600;color:#1d1d1f;margin-bottom:10px;">五子棋战报</div>
          <div style="font-size:13px;color:#333;margin-bottom:4px;">${m.p1Name}（${p1Col}） vs ${m.p2Name}（${p2Col}）</div>
          <div style="font-size:12px;color:#007aff;font-weight:600;margin-bottom:8px;">胜者：${m.winnerName}</div>
        </div>
      </div>`;
    }

    const isUser = m.from === 'user';
    const avatar = isUser ? userAvatar : dreamAvatar;
    const isSticker = m.type === 'sticker';
    const date = new Date(m.time || Date.now());
    const timeStr = String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
    
    let statusHtml = '';
    if (isUser) {
      const statusText = m.status === 'read' ? '已读' : '未读';
      statusHtml = `<span style="font-size:9px; color:${subColor}; display:block; text-align:right; margin-top:4px;">${statusText} &nbsp; ${timeStr}</span>`;
    } else {
      statusHtml = `<span style="font-size:9px; color:${subColor}; display:block; margin-top:4px; text-align:left;">${timeStr}</span>`;
    }

    let bubbleContent = m.text;
    if (isSticker) {
      bubbleContent = `<img src="${m.stickerData}" style="max-width:120px; max-height:120px; border-radius:8px; object-fit:contain; display:block;">`;
    } else if (m.type === 'image') {
      bubbleContent = `<img src="${m.imageData}" style="max-width:150px; max-height:200px; border-radius:6px; object-fit:contain; display:block;">`;
    } else if (m.type === 'text') {
      let textClass = '';
      if (m.cut === 'end') textClass = 'text-fade-right';
      if (m.cut === 'start') textClass = 'text-fade-left';
      
      let emotionHtml = '';
      if (m.emotion && state.settings.emotionEnabled !== false) {
        emotionHtml = `<div style="margin-top:6px; padding-top:6px; border-top:1px solid rgba(0,0,0,0.06); display:flex; align-items:center; gap:6px; font-size:11px; color:rgba(0,0,0,0.5);">
          <span style="border:1px solid rgba(0,0,0,0.2); padding:0 4px; border-radius:4px; font-size:10px;">情绪</span>
          <span style="font-weight:600;">${m.emotion}</span>
        </div>`;
      }
      bubbleContent = `<div class="${textClass}">${m.text}</div>${emotionHtml}`;
    }

    const sideClass = isUser ? 'bubble-user' : 'bubble-dream';
    let bubbleStyle = 'padding: 10px 14px; font-size: 14px; line-height: 1.4; display: inline-block; text-align: left; max-width: 100%; box-sizing: border-box; word-break: break-word;';
    
    if (isSticker) {
      bubbleStyle = 'padding: 0; background: transparent;';
    } else if (m.type === 'image') {
      bubbleStyle += `border-radius: 12px; padding: 4px;`;
      if (!hasCustomCSS) bubbleStyle += `background: ${isUser ? uBg : dBg};`;
    } else if (!hasCustomCSS) {
      bubbleStyle += `border-radius: 16px; background: ${isUser ? uBg : dBg}; color: ${fColor};`;
      if (!isUser) bubbleStyle += `box-shadow: 0 1px 3px rgba(0,0,0,0.05);`;
    }

    let quoteHtml = '';
    if (m.quote) {
      quoteHtml = `<div style="font-size: 12px; padding: 6px 8px; margin-bottom: 8px; background: rgba(255,255,255,0.6); color: #333; border-left: 3px solid #007aff; border-radius: 4px; word-break: break-all; text-align: left; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">${m.quote.senderName || ''}：${m.quote.text || ''}</div>`;
    }

    // 👇 加上这个大括号闭合，之前就是这里没闭合导致整个 JS 瘫痪
    if (!bubbleContent || (typeof bubbleContent === 'string' && bubbleContent.trim() === '')) {
       return ''; 
    }

    return `
      <div data-msg-index="${i}" style="display: flex; margin-bottom: 16px; justify-content: ${isUser ? 'flex-end' : 'flex-start'}; align-items: flex-start; gap: 10px; width: 100%;">
        ${!isUser ? `<img src="${avatar}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">` : ''}
        <div style="max-width: 75%; text-align: ${isUser ? 'right' : 'left'};">
          <div class="${isSticker ? '' : 'chat-bubble ' + sideClass + ' ' + bubbleClass}" style="${bubbleStyle}">
            ${quoteHtml}
            <span>${bubbleContent}</span>
          </div>
          <div style="display: block;">
            ${statusHtml}
          </div>
        </div>
        ${isUser ? `<img src="${avatar}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">` : ''}
      </div>
    `;
  }).join(''); // 👈 这里的闭合也修好了
  
  container.scrollTop = container.scrollHeight;
  attachLongPress();
}

function sendChatMsg() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text || !state.currentChatId) return;
  
  if (!state.chatSessions[state.currentChatId]) state.chatSessions[state.currentChatId] = [];
  
  if (window._replyTimers) {
    window._replyTimers.forEach(clearTimeout);
    window._replyTimers = [];
  }
  isDreamReplying = false;

  let newMsg = { from: 'user', type: 'text', text: text, time: Date.now(), status: 'unread' };
  if (window.quoteData) { newMsg.quote = window.quoteData; clearQuote(); }

  state.chatSessions[state.currentChatId].push(newMsg);
  input.value = '';
  saveState();
  renderChatMessages();
  triggerDreamReply();
}

function triggerDreamReply() {
  if (!state.currentChatId) return;

  if (isDreamReplying) {
    if (Date.now() - (window._lastReplyStartTime || 0) > 10000) {
      isDreamReplying = false;
    } else {
      return; 
    }
  }
  
  isDreamReplying = true;
  window._lastReplyStartTime = Date.now();

  const s = state.settings || {};
  const typingEl = document.getElementById('typingIndicator');
  const typingNameEl = document.getElementById('typingName');
  const chatIdAtSend = state.currentChatId;
  const dream = state.dreams.find(x => x.id === chatIdAtSend);
  const dreamName = dream ? dream.name : '梦';

  const msgs = state.chatSessions[chatIdAtSend] || [];
  let hasUnread = false;
  msgs.forEach(m => { if (m.from === 'user' && m.status === 'unread') { m.status = 'read'; hasUnread = true; } });
  if (hasUnread) { saveState(); renderChatMessages(); }

  const minS = s.replyMinSec != null ? s.replyMinSec : 3;
  const maxS = s.replyMaxSec != null ? s.replyMaxSec : 7;
  const replyCount = 1 + Math.floor(Math.random() * 3);

  function sendNextMessage(index) {
    if (state.currentChatId !== chatIdAtSend) {
      isDreamReplying = false;
      return;
    }

    if (typingNameEl) typingNameEl.textContent = dreamName;
    if (typingEl) typingEl.style.display = 'flex';

    const typingTimer = setTimeout(() => {
      if (typingEl) typingEl.style.display = 'none';
      const delayMs = (minS + Math.random() * (maxS - minS)) * 1000;
      
      const waitTimer = setTimeout(() => {
        if (state.currentChatId !== chatIdAtSend) return;
        generateAndSendMessage(chatIdAtSend, index === 0);
        if (index + 1 < replyCount) {
          const nextTimer = setTimeout(() => { sendNextMessage(index + 1); }, 1000 + Math.random() * 1500);
          window._replyTimers.push(nextTimer);
        } else {
          isDreamReplying = false;
        }
      }, delayMs);
      window._replyTimers.push(waitTimer);
    }, 1500); 
    window._replyTimers.push(typingTimer);
  }
  sendNextMessage(0);
}

function generateAndSendMessage(chatId, isFirst) {
  const s = state.settings || {};
  const msgs = state.chatSessions[chatId] || [];
  const userMsgs = msgs.filter(m => m.from === 'user').slice(-5);

  const usableCards = state.cards.filter(c => (c.dreamId || 'all') === 'all' || c.dreamId === chatId).filter(c => {
    if (!c.text || typeof c.text !== 'string') return false;
    const trimmed = c.text.trim();
    if (trimmed.length === 0) return false;
    if (/[\u200B-\u200D\uFEFF\uFFFD\u25A0]/.test(trimmed)) return false;
    return true;
  });

  let allStickers = [];
  state.stickerGroups.forEach(g => { if (g.items) allStickers = allStickers.concat(g.items); });

  const canSendSticker = allStickers.length > 0;
  const canSendCard = usableCards.length > 0;

  let sendType = 'text';
  if (canSendSticker && canSendCard) sendType = Math.random() < 0.4 ? 'sticker' : 'text';
  else if (canSendSticker) sendType = 'sticker';
  else if (canSendCard) sendType = 'text';

  let newMsg = { from: 'dream', time: Date.now() };

  if (sendType === 'sticker') {
    newMsg.type = 'sticker';
    newMsg.stickerData = allStickers[Math.floor(Math.random() * allStickers.length)];
  } else {
    newMsg.type = 'text';
    if (canSendCard && s.cardJoinEnabled) {
      const minN = Math.max(1, Math.min(7, s.cardJoinMin || 1));
      const maxN = Math.max(minN, Math.min(7, s.cardJoinMax || 3));
      let count = minN + Math.floor(Math.random() * (maxN - minN + 1));
      let shuffled = [...usableCards].sort(() => Math.random() - 0.5);
      let picked = shuffled.slice(0, Math.min(count, shuffled.length));
      newMsg.text = picked.map(c => c.text).join('，');
    } else {
      newMsg.text = canSendCard ? usableCards[Math.floor(Math.random() * usableCards.length)].text : '……';
    }

    if (s.cutEnabled !== false && newMsg.text.length > 1 && Math.random() < 0.5) {
      const cutIndex = Math.floor(newMsg.text.length * (0.4 + Math.random() * 0.2));
      if (Math.random() < 0.5) { newMsg.text = newMsg.text.slice(0, cutIndex).trim(); newMsg.cut = 'end'; } 
      else { newMsg.text = newMsg.text.slice(cutIndex).trim(); newMsg.cut = 'start'; }
    }

    if (s.emotionEnabled !== false) {
      const emotions = ['开心', '激动', '伤心', '平静', '害羞', '期待', '疲惫', '温柔', '傲娇', '疑惑', '无奈'];
      newMsg.emotion = emotions[Math.floor(Math.random() * emotions.length)];
    }
  }

  if (isFirst && s.dreamQuoteEnabled !== false && userMsgs.length > 0 && Math.random() < 0.15) {
    const picked = userMsgs[Math.floor(Math.random() * userMsgs.length)];
    newMsg.quote = { text: picked.type === 'text' ? picked.text : '[图片/表情]', senderName: state.profile.name || '我', msgId: -1 };
  }

  msgs.push(newMsg);
  saveState();
  
  if (document.getElementById('pageChat').classList.contains('active') && state.currentChatId === chatId) {
    renderChatMessages();
  }

  if (s.pushEnabled && Notification.permission === 'granted') {
    if (!document.hasFocus() || state.currentChatId !== chatId) {
      new Notification(state.dreams.find(x=>x.id===chatId).name, { body: newMsg.type === 'text' ? newMsg.text : '[表情/图片]' });
    }
  }
}

// ================= 4. 完整版字卡功能 =================
let currentCardOwner = 'all'; // 默认显示通用字卡

function switchCardOwner(val) {
  currentCardOwner = val;
  renderCards();
}

function renderCards() {
  var container = document.getElementById('wordCardsContainer');
  var ownerSelect = document.getElementById('cardOwnerSelect');
  if (!container) return;

  if (ownerSelect) {
    var html = '<option value="all">通用（所有梦角）</option>';
    state.dreams.forEach(function(d) {
      html += '<option value="' + d.id + '">' + d.name + ' 专属</option>';
    });
    ownerSelect.innerHTML = html;
    ownerSelect.value = currentCardOwner;
  }

  var filteredCards = state.cards.filter(function(c) {
    return (c.dreamId || 'all') === currentCardOwner;
  });
  var filteredCats = state.categories.filter(function(c) {
    return (c.dreamId || 'all') === currentCardOwner;
  });

  var searchTerm = (document.getElementById('cardSearchInput').value || '').trim();
  var bodyHtml = '';

  if (searchTerm) {
    var matched = filteredCards.filter(function(c) {
      return c.text && c.text.indexOf(searchTerm) > -1;
    });
    if (matched.length === 0) {
      bodyHtml = '<div class="card-empty">没有找到包含「' + searchTerm + '」的字卡</div>';
    } else {
      bodyHtml = '<div class="card-count">找到 ' + matched.length + ' 条</div><div class="card-list">';
      matched.forEach(function(c) { bodyHtml += renderSingleCardHtml(c); });
      bodyHtml += '</div>';
    }
  } else {
    var groupsHtml = '';
    filteredCats.forEach(function(cat) {
      var cards = filteredCards.filter(function(c) { return c.cat === cat.id; });
      var catBlocked = cat.blocked || false;
      var collapsed = cat.collapsed || false; // 取折叠状态

      var cardsHtml = '';
      if (cards.length === 0) {
        cardsHtml = '<div class="card-empty-inline">暂无字卡</div>';
      } else {
        cardsHtml = '<div class="card-list">';
        cards.forEach(function(c) { cardsHtml += renderSingleCardHtml(c); });
        cardsHtml += '</div>';
      }

      groupsHtml += '<div class="category-group' + (catBlocked ? ' blocked' : '') + '">';
      // 注意这里的 onclick 和 pointer-events
      groupsHtml += '<div class="category-header" onclick="toggleCategory(\'' + cat.id + '\')" style="cursor:pointer;">';
      groupsHtml += '<span class="cat-name">' + cat.name + '（' + cards.length + '）</span>';
      groupsHtml += '<div class="cat-actions">';
      groupsHtml += '<span class="cat-action" onclick="event.stopPropagation();toggleBlockCategory(\'' + cat.id + '\')" title="屏蔽本组">' + (catBlocked ? '🔇' : '🔊') + '</span>';
      groupsHtml += '<span class="cat-action" onclick="event.stopPropagation();deleteCategory(\'' + cat.id + '\')" title="删除本组">🗑</span>';
      groupsHtml += '<span class="cat-toggle' + (collapsed ? ' collapsed' : '') + '" style="pointer-events:none;">▼</span>'; // 防止箭头拦截点击
      groupsHtml += '</div></div>';
      groupsHtml += '<div class="category-body' + (collapsed ? ' hidden' : '') + '">' + cardsHtml + '</div></div>';
    });

    if (filteredCats.length === 0) {
      groupsHtml = '<div class="card-empty">还没有分类，请点击上方「+ 分类」</div>';
    }
    bodyHtml = groupsHtml;
  }

  container.innerHTML = bodyHtml;
}

function renderSingleCardHtml(c) {
  var blocked = c.blocked || false;
  var html = '<div class="card-item' + (blocked ? ' blocked' : '') + '">';
  html += '<div class="card-item-text">' + (c.text || '') + '</div>';
  html += '<div class="card-item-actions">';
  html += '<span onclick="toggleBlockCard(\'' + c.id + '\')" title="' + (blocked ? '取消屏蔽' : '屏蔽') + '">' + (blocked ? '🔇' : '🔊') + '</span>';
  html += '<span onclick="editCard(\'' + c.id + '\')" title="编辑">✎</span>';
  html += '<span onclick="deleteCard(\'' + c.id + '\')" title="删除">🗑️</span>';
  html += '</div></div>';
  return html;
}

function onCardSearch(val) {
  renderCards();
}

function toggleCategory(catId) {
  const cat = state.categories.find(c => c.id === catId);
  if (cat) {
    cat.collapsed = !cat.collapsed;
    saveState();
    renderCards();
  }
}

function addCategory() {
  const name = prompt('输入分类名称：');
  if (!name || name.trim() === '') return;
  const id = 'cat_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
  state.categories.push({ id, name: name.trim(), collapsed: false, dreamId: currentCardOwner || 'all' });
  saveState();
  renderCards();
  showToast('分类已添加');
}

function deleteCategory(catId) {
  if (!confirm('删除此分类及其所有字卡？此操作不可恢复！')) return;
  state.cards = state.cards.filter(c => c.cat !== catId);
  state.categories = state.categories.filter(c => c.id !== catId);
  if (state.categories.length === 0) {
    state.categories.push({ id: 'default', name: '默认', collapsed: false });
  }
  saveState();
  renderCards();
  showToast('分类已删除');
}

function toggleBlockCategory(catId) {
  var cat = state.categories.find(x => x.id === catId);
  if (!cat) return;
  cat.blocked = !cat.blocked;
  saveState();
  renderCards();
  showToast(cat.blocked ? '已屏蔽此分组' : '已启用此分组');
}

function toggleBlockCard(cardId) {
  var c = state.cards.find(x => x.id === cardId);
  if (!c) return;
  c.blocked = !c.blocked;
  saveState();
  renderCards();
  showToast(c.blocked ? '已屏蔽' : '已启用');
}

function editCard(cardId) {
  var card = state.cards.find(x => x.id === cardId);
  if (!card) return;
  var newText = prompt('编辑字卡内容：', card.text);
  if (newText !== null && newText.trim() !== '') {
    card.text = newText.trim();
    saveState();
    renderCards();
    showToast('字卡已更新');
  }
}

function deleteCard(cardId) {
  state.cards = state.cards.filter(c => c.id !== cardId);
  saveState();
  renderCards();
}

function dedupeCards() {
  var seen = {};
  var dupes = [];
  state.cards.forEach(function(c) {
    if ((c.dreamId || 'all') !== currentCardOwner) return;
    var key = (c.text || '').trim();
    if (!key) return;
    if (seen[key] !== undefined) dupes.push(c.id);
    else seen[key] = c.id;
  });

  if (dupes.length === 0) return alert('当前归属下没有发现重复的字卡 ✓');
  if (!confirm('在当前归属下发现 ' + dupes.length + ' 条重复字卡，是否删除？\n\n（不会影响其他梦角的字卡）')) return;
  
  state.cards = state.cards.filter(function(c) { return dupes.indexOf(c.id) === -1; });
  saveState();
  renderCards();
  showToast('已删除 ' + dupes.length + ' 条重复字卡');
}

// 弹窗逻辑
window._addCardTab = 'single';

function openAddCardModal() {
  var sel = document.getElementById('addCardCatSelect');
  if (!sel) return;
  
  var filteredCats = state.categories.filter(c => (c.dreamId || 'all') === currentCardOwner);
  if (filteredCats.length === 0) {
    var newCatId = 'cat_' + Date.now();
    state.categories.push({ id: newCatId, name: '默认', collapsed: false, dreamId: currentCardOwner });
    saveState();
    filteredCats = state.categories.filter(c => c.id === newCatId);
  }

  sel.innerHTML = filteredCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  document.getElementById('addCardTextInput').value = '';
  document.getElementById('addCardBatchInput').value = '';
  switchAddCardTab('single');
  document.getElementById('addCardModal').style.display = 'flex';
}

function switchAddCardTab(tab) {
  window._addCardTab = tab;
  var single = document.getElementById('addCardTabSingle');
  var batch = document.getElementById('addCardTabBatch');
  var textInp = document.getElementById('addCardTextInput');
  var batchInp = document.getElementById('addCardBatchInput');
  if (tab === 'single') {
    single.style.background = '#007aff'; single.style.color = '#fff';
    batch.style.background = '#f0f0f5'; batch.style.color = '#555';
    textInp.style.display = 'block'; batchInp.style.display = 'none';
    textInp.focus();
  } else {
    batch.style.background = '#007aff'; batch.style.color = '#fff';
    single.style.background = '#f0f0f5'; single.style.color = '#555';
    textInp.style.display = 'none'; batchInp.style.display = 'block';
    batchInp.focus();
  }
}

function closeAddCardModal() {
  document.getElementById('addCardModal').style.display = 'none';
}

function confirmAddCard() {
  var catId = document.getElementById('addCardCatSelect').value;
  var tab = window._addCardTab || 'single';

  if (tab === 'single') {
    var text = (document.getElementById('addCardTextInput').value || '').trim();
    if (!text) { showToast('请输入字卡内容'); return; }
    var exists = state.cards.some(c => (c.dreamId || 'all') === currentCardOwner && (c.text || '').trim() === text);
    if (exists) { showToast('该字卡在当前归属下已存在'); return; }
    state.cards.push({ id: 'card_' + Date.now(), text: text, cat: catId, dreamId: currentCardOwner });
    saveState(); renderCards(); closeAddCardModal(); showToast('已添加');
  } else {
    var raw = document.getElementById('addCardBatchInput').value || '';
    var lines = raw.split('\n').map(s => s.trim()).filter(s => s);
    if (lines.length === 0) { showToast('请输入字卡'); return; }
    var existing = {}; state.cards.forEach(c => { if ((c.dreamId || 'all') === currentCardOwner) existing[(c.text || '').trim()] = true; });
    var added = 0, skipped = 0;
    lines.forEach(line => {
      if (existing[line]) { skipped++; return; }
      state.cards.push({ id: 'card_' + Date.now() + Math.random().toString(36).slice(2,6), text: line, cat: catId, dreamId: currentCardOwner });
      existing[line] = true; added++;
    });
    saveState(); renderCards(); closeAddCardModal();
    showToast(skipped > 0 ? `已添加 ${added} 条，跳过 ${skipped} 条重复` : `已添加 ${added} 条`);
  }
}

// 导入导出逻辑 (简略版，原版太长，保证能用)
function exportCards() {
  var groups = state.categories.filter(cat => (cat.dreamId || 'all') === currentCardOwner).map(cat => {
    var items = state.cards.filter(c => c.cat === cat.id && (c.dreamId || 'all') === currentCardOwner).map(c => c.text);
    return { name: cat.name, items: items };
  });
  var data = { customReplyGroups: groups, exportAt: new Date().toISOString() };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `字卡_${currentCardOwner === 'all' ? '通用' : '专属'}.json`;
  a.click();
  showToast('已导出');
}

function handleImportCards(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var data = JSON.parse(ev.target.result);
      var groups = data.customReplyGroups || [];
      if(!groups.length) return showToast('没有找到有效字卡数据');
      
      var defaultCat = state.categories.find(c => (c.dreamId||'all') === currentCardOwner);
      if(!defaultCat) {
        defaultCat = { id: 'cat_'+Date.now(), name:'默认', dreamId: currentCardOwner };
        state.categories.push(defaultCat);
      }

      var added = 0;
      groups.forEach(g => {
        var targetCat = state.categories.find(c => c.name === g.name && (c.dreamId||'all') === currentCardOwner);
        if(!targetCat) {
          targetCat = { id: 'cat_'+Date.now()+Math.random(), name: g.name, dreamId: currentCardOwner };
          state.categories.push(targetCat);
        }
        g.items.forEach(txt => {
          if(txt && !state.cards.some(c => c.text === txt && (c.dreamId||'all') === currentCardOwner)) {
            state.cards.push({ id: 'card_'+Date.now()+Math.random(), text: txt, cat: targetCat.id, dreamId: currentCardOwner });
            added++;
          }
        });
      });
      saveState(); renderCards();
      showToast(`成功导入 ${added} 张字卡`);
    } catch(err) { showToast('解析失败，请确认是有效 JSON'); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ================= 5. 完整版表情包（原版一比一复刻） =================
function renderStickers() {
  const container = document.getElementById('stickerContainer');
  if (!container) return;
  
  var html = '';

  state.stickerGroups.forEach(function(g, idx) {
    // 给老数据补齐缺失的 ID
    if (!g.id) { g.id = 'sg_' + Date.now() + '_' + idx; saveState(); }
    
    var count = (g.items || []).length;
    var collapsed = g.collapsed || false;

    html += '<div class="sticker-group-card" style="background:var(--card);border-radius:14px;padding:14px 16px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
    
    // 左侧：折叠区域
    html += '<div onclick="toggleStickerGroupCollapse(\'' + g.id + '\')" style="flex:1;display:flex;align-items:center;gap:6px;cursor:pointer;padding:4px 0;">';
    html += '<span style="font-size:12px;color:var(--gray);transition:transform 0.2s;display:inline-block;' + (collapsed ? 'transform:rotate(-90deg);' : '') + '">▼</span>';
    html += '<span style="font-size:15px;font-weight:600;color:var(--text);">' + g.name + '（' + count + '）</span>';
    html += '</div>';
    
    // 右侧：操作按钮
    html += '<div style="display:flex;gap:2px;align-items:center;">';
    html += '<span onclick="renameStickerGroup(\'' + g.id + '\')" style="cursor:pointer;font-size:14px;padding:6px;">✎</span>';
    html += '<span onclick="moveStickerGroup(\'' + g.id + '\',-1)" style="cursor:pointer;font-size:14px;padding:6px;">↑</span>';
    html += '<span onclick="moveStickerGroup(\'' + g.id + '\',1)" style="cursor:pointer;font-size:14px;padding:6px;">↓</span>';
    html += '<span onclick="deleteStickerGroup(\'' + g.id + '\')" style="cursor:pointer;font-size:14px;padding:6px;">🗑</span>';
    html += '</div>';
    html += '</div>';

    if (!collapsed) {
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;margin-bottom:10px;">';
      (g.items || []).forEach(function(item, itemIdx) {
        html += '<div style="position:relative;width:60px;height:60px;flex-shrink:0;">';
        html += '<img src="' + item + '" style="width:60px;height:60px;max-width:60px;max-height:60px;border-radius:8px;object-fit:contain;display:block;background:#f0f0f5;">';
        html += '<span onclick="deleteStickerFromGroup(\'' + g.id + '\',' + itemIdx + ')" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--red);color:#fff;font-size:14px;text-align:center;line-height:20px;cursor:pointer;z-index:10;">×</span>';
        html += '</div>';
      });
      html += '</div>';

      // 添加按钮，直接调用 triggerAddSticker
      html += '<button onclick="triggerAddSticker(\'' + g.id + '\')" style="padding:8px 14px;border:1px dashed var(--border);border-radius:10px;background:transparent;color:var(--blue);font-size:13px;cursor:pointer;">+ 添加表情包（最多 20 个）</button>';
    }

    html += '</div>';
  });

  if (state.stickerGroups.length === 0) {
    html = '<div style="text-align:center;color:var(--gray);padding:40px;">还没有分组，点右上角 + 新建</div>';
  }

  container.innerHTML = html;
}

// ===== 以下是所有配套函数，直接贴在下面 =====

function triggerAddSticker(groupId) {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = function(e) {
    var files = e.target.files;
    if (!files || files.length === 0) return;
    
    var g = state.stickerGroups.find(function(x) { return x.id === groupId; });
    if (!g) return;
    
    var totalFiles = Math.min(files.length, 20);
    showToast('正在处理 ' + totalFiles + ' 张图片...');
    
    var promises = [];
    for (var i = 0; i < totalFiles; i++) {
      promises.push(compressSticker(files[i]));
    }
    
    Promise.all(promises).then(function(results) {
      g.items = (g.items || []).concat(results);
      saveState();
      renderStickers();
      showToast('成功添加 ' + results.length + ' 个表情包');
    });
  };
  input.click();
}

function addStickerGroup() {
  var name = prompt('新分组名称：');
  if (!name || !name.trim()) return;
  var id = 'sg_' + Date.now();
  state.stickerGroups.push({ id: id, name: name.trim(), items: [], collapsed: false });
  saveState();
  renderStickers();
  showToast('分组已添加');
}

function toggleStickerGroupCollapse(groupId) {
  var g = state.stickerGroups.find(function(x) { return x.id === groupId; });
  if (!g) return;
  g.collapsed = !g.collapsed;
  saveState();
  renderStickers();
}

function renameStickerGroup(groupId) {
  var g = state.stickerGroups.find(function(x) { return x.id === groupId; });
  if (!g) return;
  var name = prompt('修改分组名称：', g.name);
  if (name === null) return;
  if (!name.trim()) return;
  g.name = name.trim();
  saveState();
  renderStickers();
  showToast('已修改');
}

function moveStickerGroup(groupId, dir) {
  var idx = state.stickerGroups.findIndex(function(x) { return x.id === groupId; });
  if (idx < 0) return;
  var target = idx + dir;
  if (target < 0 || target >= state.stickerGroups.length) return;
  var tmp = state.stickerGroups[idx];
  state.stickerGroups[idx] = state.stickerGroups[target];
  state.stickerGroups[target] = tmp;
  saveState();
  renderStickers();
}

function deleteStickerGroup(groupId) {
  var g = state.stickerGroups.find(function(x) { return x.id === groupId; });
  if (!g) return;
  if (!confirm('确定删除「' + g.name + '」分组吗？\n\n组内 ' + (g.items || []).length + ' 个表情包会一起删除，不可恢复！')) return;
  state.stickerGroups = state.stickerGroups.filter(function(x) { return x.id !== groupId; });
  if (state.stickerGroups.length === 0) {
    state.stickerGroups.push({ id: 'default', name: '默认', items: [], collapsed: false });
  }
  saveState();
  renderStickers();
  showToast('分组已删除');
}

function deleteStickerFromGroup(groupId, itemIdx) {
  var g = state.stickerGroups.find(function(x) { return x.id === groupId; });
  if (!g) return;
  g.items.splice(itemIdx, 1);
  saveState();
  renderStickers();
  showToast('已删除');
}

// 图片压缩函数
function compressSticker(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var MAX_SIZE = 400;
        var width = img.width, height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
        }
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = function() { reject(new Error('图片加载失败')); };
      img.src = ev.target.result;
    };
    reader.onerror = function() { reject(new Error('读取失败')); };
    reader.readAsDataURL(file);
  });
}

// ================= Toast 提示 =================
function showToast(msg) {
  const toastEl = document.getElementById('toast');
  if (!toastEl) return console.log(msg);
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  if(window._toastTimer) clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2000);
}

// ================= 底部面板统一管理 =================
function closeAllBottomPanels() {
  const actionPanel = document.getElementById('actionMenuPanel');
  const stickerPanel = document.getElementById('chatStickerPanel');
  const pokePanel = document.getElementById('pokePanel');
  
  if (actionPanel) actionPanel.style.display = 'none';
  if (stickerPanel) stickerPanel.style.display = 'none';
  if (pokePanel) pokePanel.style.display = 'none';
}

function toggleActionMenu() {
  const actionPanel = document.getElementById('actionMenuPanel');
  if (!actionPanel) return;
  
  const isCurrentlyOpen = actionPanel.style.display === 'block';
  
  closeAllBottomPanels(); // 先把所有的面板全部关掉
  
  // 如果刚才它是关着的，现在就打开它；如果刚才开着，现在就保持关闭
  if (!isCurrentlyOpen) {
    actionPanel.style.display = 'block';
  }
}

function openChatStickerPanel() {
  closeAllBottomPanels(); // 关闭其他面板
  const panel = document.getElementById('chatStickerPanel');
  if (panel) panel.style.display = 'flex';
  
  if (state.stickerGroups.length > 0) {
    currentChatStickerGroupId = state.stickerGroups[0].id;
  }
  renderChatStickerPanel();
}

function openPokePanel() {
  closeAllBottomPanels(); // 关闭其他面板
  const panel = document.getElementById('pokePanel');
  if (panel) panel.style.display = 'block';
  renderPokes();
}

// 切换页面时自动收起所有面板
const originalNavigateTo = navigateTo;
navigateTo = function(pageId) {
  closeAllBottomPanels();
  originalNavigateTo(pageId);
};

// ================= 聊天页表情包面板逻辑 =================
let currentChatStickerGroupId = null;
let isChatStickerEditing = false;

function openChatStickerPanel() {
  // 1. 强制隐藏九宫格面板
  const actionPanel = document.getElementById('actionMenuPanel');
  if (actionPanel) actionPanel.style.display = 'none';
  
  // 2. 显示表情包面板
  const panel = document.getElementById('chatStickerPanel');
  panel.style.display = 'flex';
  
  // 3. 默认选中第一个分组
  if (state.stickerGroups.length > 0) {
    currentChatStickerGroupId = state.stickerGroups[0].id;
  }
  
  renderChatStickerPanel();
}

function closeChatStickerPanel() {
  document.getElementById('chatStickerPanel').style.display = 'none';
  isChatStickerEditing = false; // 关闭时重置编辑状态
  updateChatStickerEditBtn();
}

function toggleChatStickerEditMode() {
  isChatStickerEditing = !isChatStickerEditing;
  updateChatStickerEditBtn();
  renderChatStickerPanel();
}

function updateChatStickerEditBtn() {
  const btn = document.getElementById('chatStickerEditBtn');
  if (!btn) return;
  if (isChatStickerEditing) {
    btn.textContent = '完成';
    btn.style.color = 'var(--red)';
  } else {
    btn.textContent = '编辑';
    btn.style.color = 'var(--blue)';
  }
}

function renderChatStickerPanel() {
  const tabsEl = document.getElementById('chatStickerTabs');
  const gridEl = document.getElementById('chatStickerGrid');
  if (!tabsEl || !gridEl) return;

  // 1. 渲染顶部分组 Tab
  let tabsHtml = '';
  state.stickerGroups.forEach(g => {
    const isActive = g.id === currentChatStickerGroupId;
    // 使用原版一样的样式风格
    tabsHtml += `<span onclick="switchChatStickerGroup('${g.id}')" style="flex-shrink:0; padding:6px 14px; border-radius:16px; font-size:13px; cursor:pointer; background:${isActive ? 'var(--blue)' : '#fff'}; color:${isActive ? '#fff' : '#333'}; white-space:nowrap; box-shadow:0 1px 4px rgba(0,0,0,0.05);">${g.name}</span>`;
  });
  tabsEl.innerHTML = tabsHtml;

  // 2. 渲染下方表情网格
  const currentGroup = state.stickerGroups.find(g => g.id === currentChatStickerGroupId);
  if (!currentGroup) {
    gridEl.innerHTML = '<div style="width:100%; text-align:center; color:#999; font-size:13px; padding-top:40px;">暂无分组</div>';
    return;
  }

  if (!currentGroup.items || currentGroup.items.length === 0) {
    gridEl.innerHTML = '<div style="width:100%; text-align:center; color:#999; font-size:13px; padding-top:40px;">这个分组还没有表情包<br><span style="font-size:11px;">去主屏幕的「表情包」图标里添加</span></div>';
    return;
  }

  gridEl.innerHTML = currentGroup.items.map((item, index) => {
    if (isChatStickerEditing) {
      // 编辑模式：带删除红叉
      return `<div style="position:relative; width:60px; height:60px; flex-shrink:0;">
        <img src="${item}" style="width:100%; height:100%; object-fit:contain; opacity:0.5; border-radius:6px;">
        <span onclick="deleteChatSticker('${currentGroup.id}', ${index})" style="position:absolute; top:-6px; right:-6px; width:20px; height:20px; border-radius:50%; background:var(--red); color:#fff; font-size:14px; text-align:center; line-height:20px; cursor:pointer; z-index:10;">×</span>
      </div>`;
    } else {
      // 正常模式：点击发送
      return `<div style="width:60px; height:60px; flex-shrink:0; cursor:pointer;" onclick="sendStickerToChat('${item}')">
        <img src="${item}" style="width:100%; height:100%; object-fit:contain; border-radius:6px;">
      </div>`;
    }
  }).join('');
}

function switchChatStickerGroup(groupId) {
  currentChatStickerGroupId = groupId;
  isChatStickerEditing = false;
  updateChatStickerEditBtn();
  renderChatStickerPanel();
}

function deleteChatSticker(groupId, index) {
  if (!confirm('确定要删除这个表情吗？')) return;
  const g = state.stickerGroups.find(x => x.id === groupId);
  if (g && g.items) {
    g.items.splice(index, 1);
    saveState();
    renderChatStickerPanel();
  }
}

function sendStickerToChat(stickerData) {
  if (!state.currentChatId) return;
  if (!state.chatSessions[state.currentChatId]) state.chatSessions[state.currentChatId] = [];
  
  // 加 status
  state.chatSessions[state.currentChatId].push({ 
    from: 'user', type: 'sticker', stickerData: stickerData, time: Date.now(), status: 'unread'
  });
  saveState();
  renderChatMessages();
  closeChatStickerPanel();

  triggerDreamReply();
}

// ================= 全新连发回复引擎 =================
window._replyTimers = []; // 存放所有定时器，方便打断
let isDreamReplying = false;

function triggerDreamReply() {
  if (!state.currentChatId) return;

  if (isDreamReplying) {
    window._replyTimers.forEach(clearTimeout);
    window._replyTimers = [];
    isDreamReplying = false;
    const typingEl = document.getElementById('typingIndicator');
    if (typingEl) typingEl.style.display = 'none';
  }

  isDreamReplying = true;

  const s = state.settings || {};
  const typingEl = document.getElementById('typingIndicator');
  const typingNameEl = document.getElementById('typingName');
  const chatIdAtSend = state.currentChatId;
  const dream = state.dreams.find(x => x.id === chatIdAtSend);
  const dreamName = dream ? dream.name : '梦';

  const msgs = state.chatSessions[chatIdAtSend] || [];
  let hasUnread = false;
  msgs.forEach(m => { if (m.from === 'user' && m.status === 'unread') { m.status = 'read'; hasUnread = true; } });
  if (hasUnread) { saveState(); renderChatMessages(); }

  const minS = s.replyMinSec != null ? s.replyMinSec : 3;
  const maxS = s.replyMaxSec != null ? s.replyMaxSec : 7;
  const replyCount = 1 + Math.floor(Math.random() * 3);

  function sendNextMessage(index) {
    if (state.currentChatId !== chatIdAtSend) {
      isDreamReplying = false;
      return;
    }

    if (typingNameEl) typingNameEl.textContent = dreamName;
    if (typingEl) typingEl.style.display = 'flex';

    const typingTimer = setTimeout(() => {
      if (typingEl) typingEl.style.display = 'none';

      const delayMs = (minS + Math.random() * (maxS - minS)) * 1000;
      
      const waitTimer = setTimeout(() => {
        if (state.currentChatId !== chatIdAtSend) return;

        generateAndSendMessage(chatIdAtSend, index === 0);

        if (index + 1 < replyCount) {
          const nextTimer = setTimeout(() => {
            sendNextMessage(index + 1);
          }, 1000 + Math.random() * 1500);
          window._replyTimers.push(nextTimer);
        } else {
          isDreamReplying = false;
        }
      }, delayMs);
      window._replyTimers.push(waitTimer);
    }, 1500); 
    
    window._replyTimers.push(typingTimer);
  }

  sendNextMessage(0);
}

function generateAndSendMessage(chatId, isFirst) {
  const s = state.settings || {};
  const msgs = state.chatSessions[chatId] || [];
  const userMsgs = msgs.filter(m => m.from === 'user').slice(-5);

  const usableCards = state.cards.filter(c => 
    (c.dreamId || 'all') === 'all' || c.dreamId === chatId
  ).filter(c => {
    if (!c.text || typeof c.text !== 'string') return false;
    const trimmed = c.text.trim();
    if (trimmed.length === 0) return false;
    if (/[\u200B-\u200D\uFEFF\uFFFD\u25A0]/.test(trimmed)) return false;
    return true;
  });

  let allStickers = [];
  state.stickerGroups.forEach(g => { if (g.items) allStickers = allStickers.concat(g.items); });

  const canSendSticker = allStickers.length > 0;
  const canSendCard = usableCards.length > 0;

  let sendType = 'text';
  if (canSendSticker && canSendCard) sendType = Math.random() < 0.4 ? 'sticker' : 'text';
  else if (canSendSticker) sendType = 'sticker';
  else if (canSendCard) sendType = 'text';

  let newMsg = { from: 'dream', time: Date.now() };

  if (sendType === 'sticker') {
    newMsg.type = 'sticker';
    newMsg.stickerData = allStickers[Math.floor(Math.random() * allStickers.length)];
  } else {
    newMsg.type = 'text';
    if (canSendCard && s.cardJoinEnabled) {
      const minN = Math.max(1, Math.min(7, s.cardJoinMin || 1));
      const maxN = Math.max(minN, Math.min(7, s.cardJoinMax || 3));
      let count = minN + Math.floor(Math.random() * (maxN - minN + 1));
      let shuffled = [...usableCards].sort(() => Math.random() - 0.5);
      let picked = shuffled.slice(0, Math.min(count, shuffled.length));
      newMsg.text = picked.map(c => c.text).join('，');
    } else {
      newMsg.text = canSendCard ? usableCards[Math.floor(Math.random() * usableCards.length)].text : '……';
    }

    if (s.cutEnabled !== false && newMsg.text.length > 1 && Math.random() < 0.5) {
      const cutIndex = Math.floor(newMsg.text.length * (0.4 + Math.random() * 0.2));
      if (Math.random() < 0.5) { newMsg.text = newMsg.text.slice(0, cutIndex).trim(); newMsg.cut = 'end'; } 
      else { newMsg.text = newMsg.text.slice(cutIndex).trim(); newMsg.cut = 'start'; }
    }

    if (s.emotionEnabled !== false) {
      const emotions = ['开心', '激动', '伤心', '平静', '害羞', '期待', '疲惫', '温柔', '傲娇', '疑惑', '无奈'];
      newMsg.emotion = emotions[Math.floor(Math.random() * emotions.length)];
    }
  }

  if (isFirst && s.dreamQuoteEnabled !== false && userMsgs.length > 0 && Math.random() < 0.15) {
    const picked = userMsgs[Math.floor(Math.random() * userMsgs.length)];
    newMsg.quote = { text: picked.type === 'text' ? picked.text : '[图片/表情]', senderName: state.profile.name || '我', msgId: -1 };
  }

  msgs.push(newMsg);
  saveState();
  
  if (document.getElementById('pageChat').classList.contains('active') && state.currentChatId === chatId) {
    renderChatMessages();
  }

  if (s.pushEnabled && Notification.permission === 'granted') {
    if (!document.hasFocus() || state.currentChatId !== chatId) {
      new Notification(dreamName, { body: newMsg.type === 'text' ? newMsg.text : '[表情/图片]' });
    }
  }
}

// ================= 拍一拍功能 =================
// 初始化词条（如果没数据的话）
if (!state.pokes) {
  state.pokes = ["拍了拍对方", "戳了戳脸颊", "摸了摸头"];
}

function openPokePanel() {
  // 隐藏其他面板
  document.getElementById('actionMenuPanel').style.display = 'none';
  document.getElementById('chatStickerPanel').style.display = 'none';
  // 显示拍一拍
  const panel = document.getElementById('pokePanel');
  panel.style.display = 'block';
  renderPokes();
}

function renderPokes() {
  const container = document.getElementById('pokeListContainer');
  if (!container) return;
  
  if (state.pokes.length === 0) {
    container.innerHTML = '<div style="font-size:12px; color:#999; text-align:center; padding:20px;">暂无词条，点上方添加</div>';
    return;
  }

  container.innerHTML = state.pokes.map((text, index) => `
    <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; padding:10px 12px; border-radius:10px; box-shadow:0 1px 4px rgba(0,0,0,0.02);">
      <span style="font-size:14px; color:#333; cursor:pointer; flex:1;" onclick="sendPoke('${text.replace(/'/g, "\\'")}')">${text}</span>
      <span style="font-size:16px; color:var(--red); cursor:pointer; padding:0 6px;" onclick="deletePoke(${index})">×</span>
    </div>
  `).join('');
}

function addPokeText() {
  const input = prompt('输入拍一拍内容（支持批量添加，用换行或逗号隔开）：');
  if (!input || !input.trim()) return;
  
  // 支持多种符号分割
  const lines = input.split(/[\n,，;；]/).map(s => s.trim()).filter(s => s);
  if (lines.length === 0) return;
  
  let added = 0;
  lines.forEach(line => {
    if (state.pokes.indexOf(line) === -1) {
      state.pokes.push(line);
      added++;
    }
  });
  
  if (added > 0) {
    saveState();
    renderPokes();
    showToast('已添加 ' + added + ' 条拍一拍');
  } else {
    showToast('词条已存在');
  }
}

function deletePoke(index) {
  state.pokes.splice(index, 1);
  saveState();
  renderPokes();
  showToast('已删除');
}

function sendPoke(text) {
  if (!state.currentChatId) return;
  const senderName = state.profile.name || '我';
  
  if (!state.chatSessions[state.currentChatId]) state.chatSessions[state.currentChatId] = [];
  
  // 存入聊天记录，类型标记为 poke
  state.chatSessions[state.currentChatId].push({
    from: 'user',
    type: 'poke',
    text: text,
    senderName: senderName,
    time: Date.now()
  });
  
  document.getElementById('pokePanel').style.display = 'none';
  saveState();
  renderChatMessages();
  
  // 触发梦角回复
  triggerDreamReply();
}

// ================= 图片发送功能 =================
function triggerSendImage() {
  closeAllBottomPanels(); // 关闭底部面板
  
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        // 压缩图片
        var canvas = document.createElement('canvas');
        var MAX_WIDTH = 600;
        var width = img.width;
        var height = img.height;
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        var compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        
        // 存入聊天记录
        if (!state.currentChatId) return;
        if (!state.chatSessions[state.currentChatId]) state.chatSessions[state.currentChatId] = [];
        
        state.chatSessions[state.currentChatId].push({ 
          from: 'user', 
          type: 'image', 
          imageData: compressedDataUrl, 
          time: Date.now(), 
          status: 'unread' 
        });
        
        saveState();
        renderChatMessages();
        triggerDreamReply(); // 触发梦角回复
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

// ================= 消息统计功能 =================
function openStats() {
  closeAllBottomPanels();
  
  const content = document.getElementById('statsContent');
  const msgs = state.chatSessions[state.currentChatId] || [];
  
  if (msgs.length === 0) {
    content.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">还没有消息</div>';
    document.getElementById('statsPanel').style.display = 'block';
    document.getElementById('statsMask').style.display = 'block';
    return;
  }

  let userCount = 0, dreamCount = 0;
  let textCount = {};
  
  // 遍历聊天记录，统计条数和高频词
  msgs.forEach(m => {
    if (m.type === 'poke') return; // 排除拍一拍
    if (m.from === 'user') userCount++;
    else if (m.from === 'dream') dreamCount++;
    
    // 只统计纯文字
    if (m.type === 'text') {
      const t = m.text;
      if (t && typeof t === 'string' && t.trim()) {
        textCount[t] = (textCount[t] || 0) + 1;
      }
    }
  });

  const dream = state.dreams.find(x => x.id === state.currentChatId);
  const dreamName = dream ? dream.name : '梦角';

  let html = '';
  
  // 渲染顶部双方消息数
  html += '<div style="display:flex;gap:10px;margin-bottom:16px;">';
  html += '<div style="flex:1;text-align:center;padding:14px;background:#f8f8fa;border-radius:12px;">';
  html += '<div style="font-size:22px;font-weight:600;color:#333;">' + userCount + '</div>';
  html += '<div style="font-size:12px;color:#888;margin-top:4px;">我发的</div>';
  html += '</div>';
  html += '<div style="flex:1;text-align:center;padding:14px;background:#f8f8fa;border-radius:12px;">';
  html += '<div style="font-size:22px;font-weight:600;color:#333;">' + dreamCount + '</div>';
  html += '<div style="font-size:12px;color:#888;margin-top:4px;">' + dreamName + ' 发的</div>';
  html += '</div>';
  html += '</div>';

  // 排序并提取前5名高频句子
  const topArr = Object.keys(textCount).map(k => {
    return { text: k, count: textCount[k] };
  }).sort((a, b) => b.count - a.count).slice(0, 5);

  if (topArr.length > 0) {
    html += '<div style="font-size:13px;color:#999;margin-bottom:10px;">说得最多的前 5 句</div>';
    topArr.forEach((item, i) => {
      html += '<div style="display:flex;align-items:center;padding:8px 12px;background:#f8f8fa;border-radius:10px;margin-bottom:6px;">';
      html += '<span style="font-size:12px;color:#999;margin-right:10px;min-width:16px;">' + (i+1) + '</span>';
      html += '<span style="flex:1;font-size:13px;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + item.text + '</span>';
      html += '<span style="font-size:12px;color:#888;margin-left:8px;">×' + item.count + '</span>';
      html += '</div>';
    });
  }

  content.innerHTML = html;
  document.getElementById('statsMask').style.display = 'flex'; // 用 flex 来完美居中
}

function closeStats() {
  document.getElementById('statsPanel').style.display = 'none';
  document.getElementById('statsMask').style.display = 'none';
}

// ================= 状态检测功能 =================
function getStatusData(dreamId) {
  if (!state.settings) state.settings = {};
  if (!state.settings.statusData) state.settings.statusData = {};
  
  // 如果这个梦角还没有状态数据，初始化默认词库
  if (!state.settings.statusData[dreamId]) {
    state.settings.statusData[dreamId] = {
      moodValues: ['开心', '平静', '想你', '有点累', '满足', '幸福'],
      doingValues: ['正在看书', '正在发呆', '正在想你', '正在工作', '正在休息', '正在散步'],
      cooldownUntil: 0,
      lastResult: null
    };
  }
  return state.settings.statusData[dreamId];
}

function openStatusCheck() {
  closeAllBottomPanels();
  if (!state.currentChatId) return;
  
  const dream = state.dreams.find(d => d.id === state.currentChatId);
  if (!dream) return;

  const data = getStatusData(state.currentChatId);
  const now = Date.now();

  // 检查是否在 5 分钟冷却期内
  if (data.cooldownUntil > now && data.lastResult) {
    renderStatusPanel(dream, data.lastResult, true);
    return;
  }

  // 生成随机状态
  const moodVal = 30 + Math.floor(Math.random() * 70);
  const energyVal = 20 + Math.floor(Math.random() * 80);
  const moodText = data.moodValues[Math.floor(Math.random() * data.moodValues.length)] || '……';
  const doingText = data.doingValues[Math.floor(Math.random() * data.doingValues.length)] || '……';

  // 记录冷却时间 (5分钟) 和结果
  data.cooldownUntil = Date.now() + 5 * 60 * 1000;
  data.lastResult = { moodVal, energyVal, moodText, doingText };
  saveState();

  renderStatusPanel(dream, data.lastResult, false);
  document.getElementById('statusMask').style.display = 'flex';
}

function closeStatusCheck() {
  document.getElementById('statusMask').style.display = 'none';
}

function renderStatusPanel(dream, result, isCooldown) {
  const avatar = dream.avatar || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'%3E%3Ccircle cx='22' cy='22' r='22' fill='%23ffe0e8'/%3E%3Ctext x='22' y='26' text-anchor='middle' fill='%23d6336c' font-size='20'%3E💜%3C/text%3E%3C/svg%3E`;
  
  let html = '';
  html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">';
  html += `<img src="${avatar}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;">`;
  html += `<span style="font-size:16px;font-weight:600;color:var(--text);">${dream.name}</span>`;
  html += '</div>';

  html += '<div style="margin-bottom:14px;">';
  html += '<div style="font-size:12px;color:${subColor};margin-bottom:4px;">💗 心情值</div>';
  html += `<div style="width:100%;height:10px;background:#f0f0f5;border-radius:5px;overflow:hidden;position:relative;"><div style="height:100%;width:${result.moodVal}%;background:linear-gradient(90deg,#ffb6c1,#ff6b9d);border-radius:5px;transition:width 0.6s;"></div></div>`;
  html += `<div style="font-size:12px;font-weight:600;color:#333;text-align:right;margin-top:4px;">${result.moodVal}%</div>`;
  html += '</div>';

  html += '<div style="margin-bottom:16px;">';
  html += '<div style="font-size:12px;color:${subColor};margin-bottom:4px;">⚡ 能量值</div>';
  html += `<div style="width:100%;height:10px;background:#f0f0f5;border-radius:5px;overflow:hidden;position:relative;"><div style="height:100%;width:${result.energyVal}%;background:linear-gradient(90deg,#a8e6cf,#34c759);border-radius:5px;transition:width 0.6s;"></div></div>`;
  html += `<div style="font-size:12px;font-weight:600;color:#333;text-align:right;margin-top:4px;">${result.energyVal}%</div>`;
  html += '</div>';

  html += `<div style="background:#f8f8fa;border-radius:14px;padding:16px;text-align:center;margin-bottom:14px;">
    <div style="font-size:16px;font-weight:600;color:#1d1d1f;margin-bottom:4px;">${result.moodText}</div>
    <div style="font-size:11px;color:#bbb;margin-top:10px;">正在做什么</div>
    <div style="font-size:13px;color:${subColor};margin-top:4px;line-height:1.5;">${result.doingText}</div>
  </div>`;

  if (isCooldown) {
    html += `<div style="text-align:center;font-size:12px;color:#ff9500;margin-bottom:10px;">状态还在冷却中，稍后再试吧</div>`;
  }

  html += `<button onclick="openStatusEdit('${dream.id}')" style="width:100%;padding:10px;border-radius:12px;border:1px solid #e5e5ea;background:#fff;color:#333;font-size:14px;cursor:pointer;margin-bottom:8px;">编辑词库</button>`;

  document.getElementById('statusContent').innerHTML = html;
}

function openStatusEdit(dreamId) {
  const data = getStatusData(dreamId);
  const dream = state.dreams.find(d => d.id === dreamId);
  if (!dream) return;

  let html = '';
  html += '<div style="font-size:13px;font-weight:600;margin-bottom:8px;">心情文字</div>';
  data.moodValues.forEach((v, i) => {
    html += `<div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">
      <input type="text" value="${v.replace(/"/g, '&quot;')}" onchange="updateStatusMood('${dreamId}',${i},this.value)" style="flex:1;padding:8px 12px;border:1px solid #e5e5ea;border-radius:8px;font-size:13px;outline:none;">
      <span onclick="deleteStatusMood('${dreamId}',${i})" style="width:28px;height:28px;border-radius:50%;background:#ffe0e0;color:#ff3b30;display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;flex-shrink:0;">×</span>
    </div>`;
  });
  html += `<button onclick="addStatusMood('${dreamId}')" style="width:100%;padding:8px;border:1px dashed #e5e5ea;border-radius:8px;background:transparent;color:#007aff;font-size:13px;cursor:pointer;margin-bottom:16px;">+ 添加心情</button>`;

  html += '<div style="font-size:13px;font-weight:600;margin-bottom:8px;">正在做什么</div>';
  data.doingValues.forEach((v, i) => {
    html += `<div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">
      <input type="text" value="${v.replace(/"/g, '&quot;')}" onchange="updateStatusDoing('${dreamId}',${i},this.value)" style="flex:1;padding:8px 12px;border:1px solid #e5e5ea;border-radius:8px;font-size:13px;outline:none;">
      <span onclick="deleteStatusDoing('${dreamId}',${i})" style="width:28px;height:28px;border-radius:50%;background:#ffe0e0;color:#ff3b30;display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;flex-shrink:0;">×</span>
    </div>`;
  });
  html += `<button onclick="addStatusDoing('${dreamId}')" style="width:100%;padding:8px;border:1px dashed #e5e5ea;border-radius:8px;background:transparent;color:#007aff;font-size:13px;cursor:pointer;margin-bottom:16px;">+ 添加状态</button>`;

  html += `<button onclick="openStatusCheck()" style="width:100%;padding:12px;border-radius:12px;border:none;background:#007aff;color:#fff;font-size:15px;font-weight:600;cursor:pointer;">完成</button>`;

  document.getElementById('statusContent').innerHTML = html;
}

function updateStatusMood(dreamId, idx, val) {
  const data = getStatusData(dreamId);
  if (idx >= 0 && idx < data.moodValues.length) { data.moodValues[idx] = val; saveState(); }
}
function deleteStatusMood(dreamId, idx) {
  const data = getStatusData(dreamId);
  data.moodValues.splice(idx, 1);
  if (data.moodValues.length === 0) data.moodValues.push('……');
  saveState();
  openStatusEdit(dreamId);
}
function addStatusMood(dreamId) {
  const data = getStatusData(dreamId);
  data.moodValues.push('新心情');
  saveState();
  openStatusEdit(dreamId);
}

function updateStatusDoing(dreamId, idx, val) {
  const data = getStatusData(dreamId);
  if (idx >= 0 && idx < data.doingValues.length) { data.doingValues[idx] = val; saveState(); }
}
function deleteStatusDoing(dreamId, idx) {
  const data = getStatusData(dreamId);
  data.doingValues.splice(idx, 1);
  if (data.doingValues.length === 0) data.doingValues.push('……');
  saveState();
  openStatusEdit(dreamId);
}
function addStatusDoing(dreamId) {
  const data = getStatusData(dreamId);
  data.doingValues.push('正在做什么');
  saveState();
  openStatusEdit(dreamId);
}

// ================= 通话核心逻辑 =================
let callState = 'idle'; // idle, dialing, ringing, connected, minimized
let callTimerInterval = null;
let callStartTime = 0;

function openCallPanel() {
  closeAllBottomPanels();
  if (!state.currentChatId) return;
  if (callState !== 'idle') return showToast('正在通话中');
  
  const dream = state.dreams.find(d => d.id === state.currentChatId);
  if (!dream) return;

  startDial(dream);
}

function startDial(dream) {
  callState = 'dialing';
  document.getElementById('callOverlay').style.display = 'flex';
  document.getElementById('callMini').style.display = 'none';
  
  // 设置头像和名字
  const avatar = dream.avatar || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Ccircle cx='40' cy='40' r='40' fill='%23ffe0e8'/%3E%3Ctext x='40' y='44' text-anchor='middle' fill='%23d6336c' font-size='28'%3E💜%3C/text%3E%3C/svg%3E`;
  document.getElementById('callAvatar').src = avatar;
  document.getElementById('callName').textContent = dream.name;
  document.getElementById('callStatus').textContent = '正在呼叫…';
  document.getElementById('callTimer').style.display = 'none';
  document.getElementById('callTimer').textContent = '00:00:00';
  
  // 按钮变成“取消”
  document.getElementById('callButtons').innerHTML = `
    <button onclick="hangupCall()" style="width:64px; height:64px; border-radius:50%; border:none; background:#eb5545; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; cursor:pointer;">
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(135deg);"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>
    </button>
  `;

  // 模拟对方接听 (2-4秒后)
  setTimeout(() => {
    if (callState === 'dialing') {
      // 90% 概率接听，10% 概率拒绝
      if (Math.random() < 0.9) {
        callState = 'connected';
        callStartTime = Date.now();
        document.getElementById('callStatus').textContent = '通话中';
        document.getElementById('callTimer').style.display = 'block';
        
        // 计时器
        if (callTimerInterval) clearInterval(callTimerInterval);
        callTimerInterval = setInterval(updateCallTimer, 1000);

        // 按钮变成“挂断”和“最小化”
        document.getElementById('callButtons').innerHTML = `
          <button onclick="minimizeCall()" style="width:64px; height:64px; border-radius:50%; border:none; background:rgba(0,0,0,0.05); display:flex; align-items:center; justify-content:center; cursor:pointer;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button onclick="hangupCall()" style="width:64px; height:64px; border-radius:50%; border:none; background:#eb5545; display:flex; align-items:center; justify-content:center; cursor:pointer; animation: pulse 2s infinite;">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(135deg);"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>
          </button>
        `;
      } else {
        // 拒绝接听
        showToast('对方已拒绝');
        endCall('对方已拒绝');
      }
    }
  }, 2000 + Math.random() * 2000);
}

function updateCallTimer() {
  if (callState !== 'connected' && callState !== 'minimized') return;
  const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
  const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  const timeStr = `${h}:${m}:${s}`;
  
  const timerEl = document.getElementById('callTimer');
  if (timerEl) timerEl.textContent = timeStr;
  
  const miniTimeEl = document.getElementById('miniTime');
  if (miniTimeEl) miniTimeEl.textContent = `${m}:${s}`;
}

function minimizeCall() {
  if (callState !== 'connected') return;
  callState = 'minimized';
  document.getElementById('callOverlay').style.display = 'none';
  const mini = document.getElementById('callMini');
  mini.style.display = 'flex';
  document.getElementById('miniAvatar').src = document.getElementById('callAvatar').src;
}

function expandCall() {
  if (callState !== 'minimized') return;
  callState = 'connected';
  document.getElementById('callMini').style.display = 'none';
  document.getElementById('callOverlay').style.display = 'flex';
}

function hangupCall() {
  if (callState === 'idle') return;
  endCall('已挂断');
}

function endCall(reason) {
  let sysMsg = '';
  if (callState === 'dialing') {
    sysMsg = '通话已取消';
  } else {
    const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
    const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    sysMsg = `通话结束，时长 ${m}:${s}`;
  }
  writeCallSystemMsg(sysMsg);
  endCallCore();
}

// ================= 梦角主动来电逻辑 =================
let incomingCallTimer = null;

function triggerIncomingCall() {
  if (callState !== 'idle') return; // 正在通话中，不被打扰
  if (!state.dreams || state.dreams.length === 0) return;

  // 随机挑一个梦角打给你（优先当前聊天的，否则随机）
  let dream = null;
  if (state.currentChatId) {
    dream = state.dreams.find(d => d.id === state.currentChatId);
  }
  if (!dream) {
    dream = state.dreams[Math.floor(Math.random() * state.dreams.length)];
  }

  callState = 'ringing'; // 响铃状态
  const overlay = document.getElementById('callOverlay');
  overlay.style.display = 'flex';
  document.getElementById('callMini').style.display = 'none';

  const avatar = dream.avatar || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Ccircle cx='40' cy='40' r='40' fill='%23ffe0e8'/%3E%3Ctext x='40' y='44' text-anchor='middle' fill='%23d6336c' font-size='28'%3E💜%3C/text%3E%3C/svg%3E`;
  
  document.getElementById('callAvatar').src = avatar;
  document.getElementById('callName').textContent = dream.name;
  document.getElementById('callStatus').textContent = '来电中…';
  document.getElementById('callTimer').style.display = 'none';

  // 渲染拒绝/接听按钮
  document.getElementById('callButtons').innerHTML = `
    <button onclick="rejectCall()" style="width:64px; height:64px; border-radius:50%; border:none; background:#eb5545; display:flex; align-items:center; justify-content:center; cursor:pointer;">
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(135deg);"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>
    </button>
    <button onclick="answerCall('${dream.id}')" style="width:64px; height:64px; border-radius:50%; border:none; background:#07c160; display:flex; align-items:center; justify-content:center; cursor:pointer; animation: pulse 2s infinite;">
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>
    </button>
  `;

  // 如果 15 秒不接，自动变成未接来电
  if (incomingCallTimer) clearTimeout(incomingCallTimer);
  incomingCallTimer = setTimeout(() => {
    if (callState === 'ringing') {
      showToast('未接来电 - ' + dream.name);
      writeCallSystemMsg('未接来电');
      endCallCore();
    }
  }, 15000);
}

function answerCall(dreamId) {
  if (incomingCallTimer) clearTimeout(incomingCallTimer);
  callState = 'connected';
  callStartTime = Date.now();
  
  document.getElementById('callStatus').textContent = '通话中';
  document.getElementById('callTimer').style.display = 'block';
  document.getElementById('callTimer').textContent = '00:00:00';

  if (callTimerInterval) clearInterval(callTimerInterval);
  callTimerInterval = setInterval(updateCallTimer, 1000);

  // 切换为接听后的按钮
  document.getElementById('callButtons').innerHTML = `
    <button onclick="minimizeCall()" style="width:64px; height:64px; border-radius:50%; border:none; background:rgba(0,0,0,0.05); display:flex; align-items:center; justify-content:center; cursor:pointer;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>
    <button onclick="hangupCall()" style="width:64px; height:64px; border-radius:50%; border:none; background:#eb5545; display:flex; align-items:center; justify-content:center; cursor:pointer;">
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(135deg);"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>
    </button>
  `;
}

function rejectCall() {
  if (incomingCallTimer) clearTimeout(incomingCallTimer);
  writeCallSystemMsg('已拒绝');
  endCallCore();
  showToast('已拒绝来电');
}

function writeCallSystemMsg(text) {
  if (state.currentChatId) {
    if (!state.chatSessions[state.currentChatId]) state.chatSessions[state.currentChatId] = [];
    state.chatSessions[state.currentChatId].push({ from: 'system', type: 'text', text: text, time: Date.now() });
    saveState();
    if (document.getElementById('pageChat').classList.contains('active')) {
      renderChatMessages();
    }
  }
}

function endCallCore() {
  document.getElementById('callOverlay').style.display = 'none';
  document.getElementById('callMini').style.display = 'none';
  if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null; }
  callState = 'idle';
  callStartTime = 0;
}

// 定时器：每 45 秒随机检测一次是否来电
setInterval(() => {
  if (callState === 'idle' && Math.random() < 0.01) { // 1% 概率触发
    triggerIncomingCall();
  }
}, 45000);

// ================= 红包功能核心逻辑 =================
function openRedPacketPanel() {
  closeAllBottomPanels();
  if (!state.currentChatId) return;
  document.getElementById('rpAmount').value = '';
  document.getElementById('rpMessage').value = '';
  document.getElementById('redPacketPanel').style.display = 'flex';
}

function closeRedPacketPanel() {
  document.getElementById('redPacketPanel').style.display = 'none';
}

function closeRedPacketDetail() {
  document.getElementById('redPacketDetail').style.display = 'none';
}

function sendRedPacket() {
  let amount = parseFloat(document.getElementById('rpAmount').value);
  if (isNaN(amount) || amount <= 0) return showToast('请输入有效金额');
  amount = Math.floor(amount * 100) / 100;
  
  let msg = document.getElementById('rpMessage').value.trim() || '大吉大利，恭喜发财';
  
  const packet = {
    from: 'user',
    type: 'redpacket',
    packetId: 'rp_' + Date.now(),
    totalAmount: amount,
    message: msg,
    claimed: [],
    refunded: false,
    time: Date.now()
  };
  
  if (!state.chatSessions[state.currentChatId]) state.chatSessions[state.currentChatId] = [];
  state.chatSessions[state.currentChatId].push(packet);
  saveState();
  renderChatMessages();
  closeRedPacketPanel();

  // 梦角有 85% 概率领取，15% 概率退回
  const chatId = state.currentChatId;
  setTimeout(() => {
    if (Math.random() < 0.85) {
      claimRedPacket(packet.packetId, chatId);
    } else {
      refundRedPacket(packet.packetId, chatId);
    }
  }, 2000 + Math.random() * 3000);
}

function claimRedPacket(packetId, chatId) {
  const msgs = state.chatSessions[chatId] || [];
  const packet = msgs.find(m => m.packetId === packetId);
  if (!packet || packet.refunded || packet.claimed.length > 0) return;

  const dream = state.dreams.find(d => d.id === chatId);
  if (!dream) return;

  // 梦角领取
  packet.claimed.push({ userId: chatId, name: dream.name, amount: packet.totalAmount, time: Date.now() });
  
  // 钱进小金库
  if (!dream.balance) dream.balance = 0;
  dream.balance = Math.floor((dream.balance + packet.totalAmount) * 100) / 100;

  msgs.push({ from: 'system', type: 'text', text: '「' + dream.name + '」领取了你的红包', time: Date.now() });
  saveState();
  
  if (state.currentChatId === chatId && document.getElementById('pageChat').classList.contains('active')) {
    renderChatMessages();
  }
}

function refundRedPacket(packetId, chatId) {
  const msgs = state.chatSessions[chatId] || [];
  const packet = msgs.find(m => m.packetId === packetId);
  if (!packet || packet.refunded) return;
  
  const dream = state.dreams.find(d => d.id === chatId);
  packet.refunded = true;
  
  msgs.push({ from: 'system', type: 'text', text: '「' + dream.name + '」退回了红包', time: Date.now() });
  saveState();
  
  if (state.currentChatId === chatId && document.getElementById('pageChat').classList.contains('active')) {
    renderChatMessages();
  }
}

function openRedPacketDetail(packetId) {
  if (!state.currentChatId) return;
  const msgs = state.chatSessions[state.currentChatId] || [];
  const packet = msgs.find(m => m.packetId === packetId);
  if (!packet) return;

  document.getElementById('rpdSender').textContent = '来自 ' + (state.profile.name || '我') + ' 的红包';
  document.getElementById('rpdAmount').textContent = packet.totalAmount.toFixed(2);
  document.getElementById('rpdMessage').textContent = packet.message;

  let html = '';
  if (packet.refunded) {
    html += '<div style="text-align:center;color:${subColor};font-size:13px;padding:20px 0;">已退回</div>';
  } else if (packet.claimed.length === 0) {
    html += '<div style="text-align:center;color:${subColor};font-size:13px;padding:20px 0;">等待对方领取...</div>';
  } else {
    html += '<div style="font-size:12px;color:${subColor};margin-bottom:10px;">已领取</div>';
    packet.claimed.forEach(c => {
      html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f5;">
        <span style="font-size:14px;color:#1d1d1f;">${c.name}</span>
        <span style="font-size:14px;font-weight:600;color:#fa5151;">${c.amount.toFixed(2)}</span>
      </div>`;
    });
  }
  document.getElementById('rpdClaimList').innerHTML = html;
  document.getElementById('redPacketDetail').style.display = 'flex';
}

// ================= 送礼功能 =================
const DEFAULT_GIFTS = [
  { name: '蛋糕', price: 5 },
  { name: '花', price: 10 },
  { name: '奶茶', price: 15 }
];

let giftEditMode = false;

function getGiftItems() {
  if (!state.giftItems || state.giftItems.length === 0) {
    state.giftItems = JSON.parse(JSON.stringify(DEFAULT_GIFTS));
    saveState();
  }
  return state.giftItems;
}

function openGiftPanel() {
  closeAllBottomPanels();
  if (!state.currentChatId) return;
  
  giftEditMode = false;
  updateGiftEditBtn();
  renderGiftList();
  document.getElementById('giftPanel').style.display = 'flex';
}

function closeGiftPanel() {
  document.getElementById('giftPanel').style.display = 'none';
}

function toggleGiftEditMode() {
  giftEditMode = !giftEditMode;
  updateGiftEditBtn();
  renderGiftList();
}

function updateGiftEditBtn() {
  const btn = document.getElementById('giftEditBtn');
  if (!btn) return;
  btn.textContent = giftEditMode ? '完成' : '编辑';
  btn.style.background = giftEditMode ? '#ff3b30' : '#fff';
  btn.style.color = giftEditMode ? '#fff' : '#007aff';
}

function renderGiftList() {
  const container = document.getElementById('giftListContainer');
  const items = getGiftItems();
  let html = '';

  if (giftEditMode) {
    items.forEach((g, i) => {
      html += `<div style="display:flex; align-items:center; gap:8px; padding:8px 0; border-bottom:1px solid #f0f0f5;">
        <input type="text" value="${g.name}" onchange="updateGiftName(${i}, this.value)" style="flex:2; padding:6px 10px; border:1px solid #e5e5ea; border-radius:8px; font-size:13px; outline:none; box-sizing:border-box;">
        <input type="number" value="${g.price}" step="0.01" min="0.01" onchange="updateGiftPrice(${i}, this.value)" style="flex:1; width:70px; padding:6px 10px; border:1px solid #e5e5ea; border-radius:8px; font-size:13px; outline:none; box-sizing:border-box;">
        <span onclick="deleteGiftItem(${i})" style="color:#ff3b30; cursor:pointer; font-size:16px; padding:0 4px;">×</span>
      </div>`;
    });
    html += `<button onclick="addGiftItem()" style="width:100%; margin-top:10px; padding:9px; border:1px dashed #e5e5ea; background:transparent; border-radius:10px; color:#007aff; font-size:13px; cursor:pointer;">+ 添加礼品</button>`;
  } else {
    if (items.length === 0) {
      html = '<div style="text-align:center; color:${subColor}; padding:30px 0; font-size:13px;">还没有礼品，点右上角「编辑」添加</div>';
    } else {
      items.forEach((g, i) => {
        html += `<div onclick="sendGift(${i})" style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; margin-bottom:8px; background:#f8f8fa; border-radius:12px; cursor:pointer;">
          <span style="font-size:14px; color:#1d1d1f;">${g.name}</span>
          <span style="font-size:13px; color:#fa5151; font-weight:600;">${g.price.toFixed(2)} 元</span>
        </div>`;
      });
    }
  }
  container.innerHTML = html;
}

function addGiftItem() {
  getGiftItems().push({ name: '新礼物', price: 1 });
  saveState();
  renderGiftList();
}

function updateGiftName(i, val) {
  state.giftItems[i].name = val.trim() || '未命名';
  saveState();
}

function updateGiftPrice(i, val) {
  let p = parseFloat(val) || 0;
  if (p < 0.01) p = 0.01;
  state.giftItems[i].price = Math.floor(p * 100) / 100;
  saveState();
}

function deleteGiftItem(i) {
  state.giftItems.splice(i, 1);
  saveState();
  renderGiftList();
}

function sendGift(index) {
  const gift = getGiftItems()[index];
  if (!gift) return;
  
  const countStr = prompt(`送几份「${gift.name}」？`, '1');
  if (countStr === null) return;
  const count = parseInt(countStr) || 0;
  if (count < 1) return showToast('请输入有效份数');

  const totalPrice = Math.floor(gift.price * count * 100) / 100;
  const packetId = 'gf_' + Date.now();

  const packet = {
    from: 'user',
    type: 'gift',
    packetId: packetId,
    giftName: gift.name,
    unitPrice: gift.price,
    count: count,
    totalPrice: totalPrice,
    claimed: [],
    refunded: false,
    time: Date.now()
  };

  if (!state.chatSessions[state.currentChatId]) state.chatSessions[state.currentChatId] = [];
  state.chatSessions[state.currentChatId].push(packet);
  saveState();
  renderChatMessages();
  closeGiftPanel();

  // 梦角决定领不领 (80%概率领取)
  const chatId = state.currentChatId;
  setTimeout(() => {
    const dream = state.dreams.find(d => d.id === chatId);
    if (!dream) return;
    
    if (Math.random() < 0.8) {
      packet.claimed.push({ userId: chatId, name: dream.name, time: Date.now() });
      state.chatSessions[chatId].push({ from: 'system', type: 'text', text: '「' + dream.name + '」领取了礼物', time: Date.now() });
    } else {
      packet.refunded = true;
      packet.refundReason = '梦角拒绝';
      state.chatSessions[chatId].push({ from: 'system', type: 'text', text: '「' + dream.name + '」拒绝了礼物', time: Date.now() });
    }
    saveState();
    
    if (state.currentChatId === chatId && document.getElementById('pageChat').classList.contains('active')) {
      renderChatMessages();
    }
  }, 2000 + Math.random() * 3000);
}

function openGiftDetail(packetId) {
  if (!state.currentChatId) return;
  const msgs = state.chatSessions[state.currentChatId] || [];
  const m = msgs.find(x => x.packetId === packetId);
  if (!m) return;

  document.getElementById('gdSender').textContent = '来自 ' + (state.profile.name || '我') + ' 的礼物';
  document.getElementById('gdName').textContent = m.giftName + ' ×' + m.count;
  document.getElementById('gdPrice').textContent = m.totalPrice.toFixed(2) + ' 元';

  let html = '';
  if (m.claimed.length === 0) {
    html += '<div style="text-align:center;color:${subColor};font-size:13px;padding:10px 0;">等待对方领取...</div>';
  } else {
    html += '<div style="font-size:12px;color:${subColor};margin-bottom:8px;">已领取</div>';
    m.claimed.forEach(c => {
      html += `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#1d1d1f;">
        <span>${c.name}</span>
        <span style="color:#fa5151;font-weight:600;">${m.totalPrice.toFixed(2)} 元</span>
      </div>`;
    });
  }
  if (m.refunded) {
    html += `<div style="margin-top:10px;text-align:center;font-size:12px;color:${subColor};">已退回（${m.refundReason || '梦角拒绝'}）</div>`;
  }
  document.getElementById('gdActionArea').innerHTML = html;
  document.getElementById('giftDetail').style.display = 'flex';
}

function closeGiftDetail() {
  document.getElementById('giftDetail').style.display = 'none';
}

// ================= 抉择功能 =================
function openChoicePanel() {
  closeAllBottomPanels();
  if (!state.currentChatId) return;

  document.getElementById('choiceQuestionInput').value = '';
  document.getElementById('choiceOptionsContainer').innerHTML = '';
  addChoiceOption();
  addChoiceOption();

  document.getElementById('choiceModal').style.display = 'flex';
  setTimeout(() => {
    document.getElementById('choiceQuestionInput').focus();
  }, 100);
}

function closeChoiceModal() {
  document.getElementById('choiceModal').style.display = 'none';
}

function addChoiceOption() {
  const container = document.getElementById('choiceOptionsContainer');
  const count = container.querySelectorAll('.choice-opt-row').length;
  if (count >= 10) return showToast('最多 10 个选项');

  const row = document.createElement('div');
  row.className = 'choice-opt-row';
  row.style.cssText = 'display:flex; gap:8px; align-items:center;';
  row.innerHTML = `<input type="text" placeholder="选项 ${count + 1}" style="flex:1; padding:8px 12px; border:1px solid #e5e5ea; border-radius:10px; font-size:14px; outline:none;">
    <span class="choice-opt-del" style="color:#ff3b30; cursor:pointer; font-size:18px; padding:0 4px;">×</span>`;
  
  container.appendChild(row);

  row.querySelector('.choice-opt-del').onclick = function() {
    if (container.querySelectorAll('.choice-opt-row').length <= 2) {
      return showToast('至少保留 2 个选项');
    }
    row.remove();
  };
  
  row.querySelector('input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addChoiceOption();
    }
  });
}

function sendChoice() {
  const question = document.getElementById('choiceQuestionInput').value.trim();
  if (!question) return showToast('请输入问题');

  const rows = document.querySelectorAll('#choiceOptionsContainer .choice-opt-row');
  const options = [];
  rows.forEach(r => {
    const v = r.querySelector('input').value.trim();
    if (v) options.push(v);
  });

  if (options.length < 2) return showToast('至少 2 个选项');

  if (!state.currentChatId) return;

  const packetId = 'ch_' + Date.now();
  const packet = {
    from: 'user',
    type: 'choice',
    packetId: packetId,
    question: question,
    options: options,
    answer: null,
    time: Date.now()
  };

  if (!state.chatSessions[state.currentChatId]) state.chatSessions[state.currentChatId] = [];
  state.chatSessions[state.currentChatId].push(packet);
  saveState();
  renderChatMessages();
  closeChoiceModal();

  // 梦角延迟 3-7 秒后回答
  const chatId = state.currentChatId;
  const delay = 3000 + Math.random() * 4000;

  setTimeout(() => {
    choiceDreamAnswer(packetId, chatId);
  }, delay);
}

function choiceDreamAnswer(packetId, chatId) {
  const msgs = state.chatSessions[chatId] || [];
  const packet = msgs.find(m => m.packetId === packetId);
  if (!packet || packet.answer) return;

  const dream = state.dreams.find(d => d.id === chatId);
  if (!dream) return;

  // 随机挑一个选项
  const pick = packet.options[Math.floor(Math.random() * packet.options.length)];
  packet.answer = pick;
  packet.answererName = dream.name;

  // 在聊天里加一条梦角的回复消息
  msgs.push({
    from: 'dream',
    type: 'text',
    text: pick,
    time: Date.now()
  });
  saveState();

  if (state.currentChatId === chatId && document.getElementById('pageChat').classList.contains('active')) {
    renderChatMessages();
  }
}

// ================= 智能返回功能 =================
function goBack() {
  // 如果有正在聊天的梦角，就回聊天界面
  if (state.currentChatId && state.dreams.some(d => d.id === state.currentChatId)) {
    navigateTo('pageChat');
  } 
  // 如果没聊天记录但有梦角，就进第一个梦角的聊天
  else if (state.dreams.length > 0) {
    openChat(state.dreams[0].id);
  } 
  // 如果连梦角都没有，就回通讯录
  else {
    navigateTo('pageContacts');
  }
}

// ================= 长按消息逻辑 =================
let pressTimer = null;
let pressTarget = null;
let pressStartX = 0;
let pressStartY = 0;

function attachLongPress() {
  const container = document.getElementById('chatMessageContainer');
  if (!container) return;

  function findMsgEl(el) {
    while (el && el !== container) {
      if (el.dataset && el.dataset.msgIndex !== undefined) return el;
      el = el.parentNode;
    }
    return null;
  }

  function onStart(e) {
    const el = findMsgEl(e.target);
    if (!el) return;
    const t = e.touches ? e.touches[0] : e;
    pressStartX = t.clientX;
    pressStartY = t.clientY;
    pressTarget = el;

    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      if (!pressTarget) return;
      const idx = parseInt(pressTarget.dataset.msgIndex);
      showMsgMenu(idx, pressTarget);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 500); // 500ms 触发长按
  }

  function onMove(e) {
    if (!pressTarget) return;
    const t = e.touches ? e.touches[0] : e;
    if (Math.abs(t.clientX - pressStartX) > 10 || Math.abs(t.clientY - pressStartY) > 10) {
      clearTimeout(pressTimer);
      pressTarget = null;
    }
  }

  function onEnd() {
    clearTimeout(pressTimer);
    pressTarget = null;
  }

  // 解除旧绑定，防止重复绑定
  container.onmousedown = onStart;
  container.ontouchstart = onStart;
  container.onmousemove = onMove;
  container.ontouchmove = onMove;
  container.onmouseup = onEnd;
  container.ontouchend = onEnd;
}

function showMsgMenu(index, el) {
  const m = state.chatSessions[state.currentChatId]?.[index];
  if (!m || m.from === 'system' || m.type === 'poke') return;

  const menu = document.getElementById('msgMenu');
  const mask = document.getElementById('msgMenuMask');

  let items = [];
  if (m.from === 'user') items.push({ label: '撤回', action: 'recall' });
  items.push({ label: '引用', action: 'quote' });
  items.push({ label: '收藏', action: 'favorite' });
  items.push({ label: '删除', action: 'delete' });

  menu.innerHTML = items.map(item => 
    `<button onclick="handleMsgAction('${item.action}','${index}')">${item.label}</button>`
  ).join('');

  // 计算位置
  menu.style.display = 'flex';
  menu.style.visibility = 'hidden';
  const menuW = menu.offsetWidth;
  const menuH = menu.offsetHeight;
  
  const bubbleEl = el.querySelector('.chat-bubble') || el;
  const rect = bubbleEl.getBoundingClientRect();
  
  // 相对于手机外壳定位
  const phoneRect = document.querySelector('.phone-container').getBoundingClientRect();
  let left = rect.left - phoneRect.left;
  let top = rect.top - phoneRect.top - menuH - 10;

  // 边界处理
  if (left < 10) left = 10;
  if (left + menuW > phoneRect.width - 10) left = phoneRect.width - menuW - 10;
  if (top < 10) top = rect.bottom - phoneRect.top + 10;

  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
  menu.style.visibility = 'visible';

  mask.style.display = 'block';
  mask.onclick = hideMsgMenu;
}

function hideMsgMenu() {
  document.getElementById('msgMenu').style.display = 'none';
  document.getElementById('msgMenuMask').style.display = 'none';
}

function handleMsgAction(action, index) {
  const msgs = state.chatSessions[state.currentChatId];
  if (!msgs || !msgs[index]) return;
  const m = msgs[index];
  hideMsgMenu();

  if (action === 'recall') {
    if (m.from !== 'user') return;
    msgs[index] = { from: 'system', type: 'text', text: '「' + (state.profile.name || '我') + '」撤回了一条消息', time: Date.now() };
    saveState();
    renderChatMessages();
    showToast('已撤回');
  } 
  else if (action === 'quote') {
    const senderName = m.from === 'user' ? (state.profile.name || '我') : (state.dreams.find(d => d.id === state.currentChatId)?.name || '梦角');
    const quoteText = m.type === 'text' ? m.text : (m.type === 'sticker' || m.type === 'image' ? '[图片/表情]' : '卡片消息');
    
    window.quoteData = { text: quoteText, senderName: senderName, msgId: index };
    document.getElementById('quotePreview').style.display = 'block';
    document.getElementById('quoteText').textContent = senderName + '：' + quoteText;
    document.getElementById('chatInput').focus();
  }
  else if (action === 'favorite') {
    if (!state.favorites) state.favorites = [];
    const senderName = m.from === 'user' ? (state.profile.name || '我') : (state.dreams.find(d => d.id === state.currentChatId)?.name || '梦角');
    state.favorites.push({
      id: 'fav_' + Date.now(),
      text: m.type === 'text' ? m.text : '[卡片/图片]',
      senderName: senderName,
      time: m.time || Date.now()
    });
    saveState();
    showToast('已收藏');
  }
  else if (action === 'delete') {
    msgs.splice(index, 1);
    saveState();
    renderChatMessages();
    showToast('已删除');
  }
}

function clearQuote() {
  window.quoteData = null;
  document.getElementById('quotePreview').style.display = 'none';
}

// ================= 收藏页面逻辑 =================
function renderFavoritesPage() {
  const container = document.getElementById('favoritesPageList');
  if (!container) return;

  if (!state.favorites || state.favorites.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:${subColor}; padding:60px 20px; font-size:14px;">还没有收藏任何消息<br><span style="font-size:12px; margin-top:8px; display:block;">在聊天里长按消息即可收藏</span></div>';
    return;
  }

  // 按时间倒序
  const sorted = state.favorites.slice().sort((a, b) => b.time - a.time);

  container.innerHTML = sorted.map(fav => {
    const t = new Date(fav.time);
    const dateStr = `${t.getMonth() + 1}月${t.getDate()}日 ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
    
    // 显示是谁收藏的
    const byWhom = fav.favBy ? `由 ${fav.favBy} 收藏` : '我收藏的';
    
    // 提取聊天对象名称
    const chatName = fav.favBy === '我' || !fav.favBy 
      ? '与梦角的聊天' 
      : '梦角收藏了你的消息';

    return `
      <div style="background:#fff; border-radius:12px; padding:16px; border:1px solid #e5e5ea; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <span style="font-size:14px; font-weight:600; color:#1d1d1f;">${fav.senderName}</span>
          <span style="font-size:11px; color:#b0b0b5;">${dateStr}</span>
        </div>
        <div style="font-size:15px; color:#333; line-height:1.5; word-break:break-word; margin-bottom:14px; padding-left:10px; border-left:3px solid #007aff;">
          ${fav.text}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f0f0f5; padding-top:10px;">
          <span style="font-size:11px; color:${subColor};">${byWhom}</span>
          <span onclick="deleteFavorite('${fav.id}')" style="font-size:12px; color:#ff3b30; cursor:pointer; padding:4px 10px; background:rgba(255,59,48,0.08); border-radius:8px;">删除</span>
        </div>
      </div>
    `;
  }).join('');
}

function deleteFavorite(id) {
  if (!confirm('确定删除这条收藏吗？')) return;
  state.favorites = state.favorites.filter(f => f.id !== id);
  saveState();
  renderFavoritesPage(); // 重新渲染当前页面
  showToast('已删除');
}

// ================= 头像库逻辑 =================
let isAvatarEditMode = false;
let avatarSelectedIndices = [];

// 图片压缩
function compressAvatarImg(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 300;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } }
        else { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject('图片加载失败');
      img.src = ev.target.result;
    };
    reader.onerror = () => reject('读取失败');
    reader.readAsDataURL(file);
  });
}

function renderAvatarLib() {
  if (!state.avatarLibrary) state.avatarLibrary = [];
  const grid = document.getElementById('avatarLibGrid');
  const editBtn = document.getElementById('avatarEditBtn');
  const editBar = document.getElementById('avatarEditBar');
  if (!grid) return;

  // 更新状态 UI
  editBtn.textContent = isAvatarEditMode ? '完成' : '编辑';
  editBtn.style.color = isAvatarEditMode ? 'var(--red)' : 'var(--blue)';
  editBar.style.display = isAvatarEditMode ? 'flex' : 'none';

  if (state.avatarLibrary.length === 0) {
    grid.innerHTML = '<div class="avatar-lib-empty">还没有头像<br>点右上角 + 导入一批图片吧</div>';
    return;
  }

  grid.innerHTML = state.avatarLibrary.map((img, i) => {
    const selected = avatarSelectedIndices.includes(i);
    return `
      <div class="avatar-lib-item ${selected ? 'selected' : ''}" onclick="avatarItemClick(${i})">
        <img src="${img}">
        ${isAvatarEditMode ? `<div class="avatar-lib-check ${selected ? 'checked' : ''}">${selected ? '✓' : ''}</div>` : ''}
      </div>
    `;
  }).join('');
}

function avatarItemClick(i) {
  if (isAvatarEditMode) {
    const pos = avatarSelectedIndices.indexOf(i);
    if (pos > -1) avatarSelectedIndices.splice(pos, 1);
    else avatarSelectedIndices.push(i);
    renderAvatarLib();
  } else {
    // 非编辑模式下，点击图片可做大图预览（可选功能，这里先留空）
    showToast('长按/点击右上角编辑管理头像');
  }
}

function toggleAvatarEdit() {
  isAvatarEditMode = !isAvatarEditMode;
  if (!isAvatarEditMode) avatarSelectedIndices = [];
  renderAvatarLib();
}

function avatarCancelEdit() {
  isAvatarEditMode = false;
  avatarSelectedIndices = [];
  renderAvatarLib();
}

function avatarSelectAll() {
  if (avatarSelectedIndices.length === state.avatarLibrary.length) {
    avatarSelectedIndices = [];
  } else {
    avatarSelectedIndices = state.avatarLibrary.map((_, i) => i);
  }
  renderAvatarLib();
}

function avatarDeleteSelected() {
  if (avatarSelectedIndices.length === 0) return showToast('请先选择头像');
  if (!confirm(`确定删除选中的 ${avatarSelectedIndices.length} 张头像吗？`)) return;

  // 从大到小删，防止索引错乱
  const sorted = [...avatarSelectedIndices].sort((a, b) => b - a);
  sorted.forEach(i => state.avatarLibrary.splice(i, 1));
  
  avatarSelectedIndices = [];
  saveState();
  renderAvatarLib();
  showToast('已删除');
}

function openAvatarImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = e => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    showToast(`正在处理 ${files.length} 张图片...`);
    const promises = [];
    for (let i = 0; i < files.length; i++) {
      promises.push(compressAvatarImg(files[i]));
    }
    
    Promise.all(promises).then(results => {
      if (!state.avatarLibrary) state.avatarLibrary = [];
      results.forEach(r => {
        if (r) state.avatarLibrary.push(r);
      });
      saveState();
      renderAvatarLib();
      showToast(`成功导入 ${results.length} 张头像`);
    }).catch(err => {
      showToast('部分图片导入失败');
    });
  };
  input.click();
}

// ================= 梦角主动换头像系统 =================
function checkAvatarRandomChange() {
  if (!state.avatarLibrary || state.avatarLibrary.length === 0) return;
  if (!state.dreams || state.dreams.length === 0) return;

  const now = Date.now();
  const last = state.lastAvatarScan || 0;
  const THREE_HOURS = 3 * 60 * 60 * 1000;
  if (now - last < THREE_HOURS) return;

  state.lastAvatarScan = now;
  saveState();

  if (Math.random() > 0.30) return;

  const dreamA = state.dreams[Math.floor(Math.random() * state.dreams.length)];
  const newImg = state.avatarLibrary[Math.floor(Math.random() * state.avatarLibrary.length)];

  const roll = Math.random();

  if (state.dreams.length >= 2) {
    if (roll < 0.33) {
      dreamA.avatar = newImg;
      // 悄悄在聊天记录里留小字
      addAvatarSystemMsg(dreamA.id, `「${dreamA.name}」为自己更换了头像`);
    } else if (roll < 0.66) {
      state.profile.avatar = newImg;
      addAvatarSystemMsg(dreamA.id, `「${dreamA.name}」为${state.profile.name || '你'}更换了头像`);
      try { renderDiaryCover(); } catch(e) {}
      try { loadProfileForm(); } catch(e) {}
    } else {
      const otherDreams = state.dreams.filter(d => d.id !== dreamA.id);
      const dreamB = otherDreams[Math.floor(Math.random() * otherDreams.length)];
      dreamB.avatar = newImg;
      
      // 两人聊天记录里都留小字
      addAvatarSystemMsg(dreamA.id, `「${dreamA.name}」为「${dreamB.name}」更换了头像`);
      addAvatarSystemMsg(dreamB.id, `「${dreamA.name}」为「${dreamB.name}」更换了头像`);
    }
  } else {
    if (roll < 0.5) {
      dreamA.avatar = newImg;
      addAvatarSystemMsg(dreamA.id, `「${dreamA.name}」为自己更换了头像`);
    } else {
      state.profile.avatar = newImg;
      addAvatarSystemMsg(dreamA.id, `「${dreamA.name}」为${state.profile.name || '你'}更换了头像`);
      try { renderDiaryCover(); } catch(e) {}
      try { loadProfileForm(); } catch(e) {}
    }
  }

  saveState();
  renderAll(); 
  if (state.currentChatId) renderChatMessages(); 
  renderContacts(); 
}

function addAvatarSystemMsg(chatId, text) {
  if (!state.chatSessions[chatId]) state.chatSessions[chatId] = [];
  
  // 插入系统小字
  state.chatSessions[chatId].push({ from: 'system', type: 'text', text: text, time: Date.now() });
  saveState();
  
  // 如果你刚好在这个聊天里，就刷新屏幕，让你看到那行小字
  if (state.currentChatId === chatId && document.getElementById('pageChat').classList.contains('active')) {
    renderChatMessages();
  }
}

setInterval(checkAvatarRandomChange, 10 * 60 * 1000);
setTimeout(checkAvatarRandomChange, 5000);

// ================= 美化核心逻辑 =================
function initBeautifyPage() {
  if (!state.settings) state.settings = {};
  const s = state.settings;

  // 基础字段
  document.getElementById('globalFontSize').value = s.fontSize || 14;
  document.getElementById('fontSizeLabel').textContent = s.fontSize || 14;
  document.getElementById('globalBubbleStyle').value = s.globalBubbleStyle || 'default';
  
  // 颜色字段（加上了严格的空值判断，防止导入数据引发崩溃）
  document.getElementById('globalSubTextColor').value = s.globalSubTextColor || '#b0b0b0';
  document.getElementById('sendBtnColor').value = s.sendBtnColor || '#007aff';
  document.getElementById('iconColor').value = s.iconColor || '#666666';
  
  if (s.globalBubbleUser) document.getElementById('globalBubbleUserColor').value = s.globalBubbleUser;
  if (s.globalBubbleDream) document.getElementById('globalBubbleDreamColor').value = s.globalBubbleDream;
  if (s.globalFontColor) document.getElementById('globalFontColor').value = s.globalFontColor;
  
  // 透明度
  const topOp = s.topBarOpacity !== undefined ? s.topBarOpacity : 100;
  document.getElementById('topBarOpacity').value = topOp;
  document.getElementById('topBarOpacityLabel').textContent = topOp;
  const botOp = s.bottomBarOpacity !== undefined ? s.bottomBarOpacity : 100;
  document.getElementById('bottomBarOpacity').value = botOp;
  document.getElementById('bottomBarOpacityLabel').textContent = botOp;
  
  // 自定义CSS
  document.getElementById('globalChatCSS').value = s.globalChatCSS || '';
}

function saveBeautifySettings() {
  if (!state.settings) state.settings = {};
  
  // 读取所有值
  state.settings.fontSize = parseInt(document.getElementById('globalFontSize').value);
  state.settings.globalBubbleStyle = document.getElementById('globalBubbleStyle').value;
  state.settings.globalSubTextColor = document.getElementById('globalSubTextColor').value;
  state.settings.sendBtnColor = document.getElementById('sendBtnColor').value;
  state.settings.iconColor = document.getElementById('iconColor').value;
  state.settings.globalBubbleUser = document.getElementById('globalBubbleUserColor').value;
  state.settings.globalBubbleDream = document.getElementById('globalBubbleDreamColor').value;
  state.settings.globalFontColor = document.getElementById('globalFontColor').value;
  state.settings.globalChatCSS = document.getElementById('globalChatCSS').value;
  state.settings.topBarOpacity = parseInt(document.getElementById('topBarOpacity').value);
  state.settings.bottomBarOpacity = parseInt(document.getElementById('bottomBarOpacity').value);
  
  saveState();
  applyBeautifySettings();
  renderChatMessages();
  showToast('美化设置已保存');
}

function resetBeautifySettings() {
  if (!state.settings) return;
  state.settings.fontSize = 14;
  state.settings.globalBubbleStyle = 'default';
  state.settings.globalBubbleUser = null;
  state.settings.globalBubbleDream = null;
  state.settings.globalFontColor = null;
  state.settings.globalChatCSS = null;
  state.settings.globalWallpaper = null;
  
  saveState();
  initBeautifyPage();
  applyBeautifySettings();
  renderChatMessages();
  showToast('已恢复默认');
}

// 壁纸控制
function handleGlobalWallpaper(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    if (!state.settings) state.settings = {};
    state.settings.globalWallpaper = ev.target.result;
    saveState();
    applyBeautifySettings();
    showToast('全局壁纸已更新');
  };
  reader.readAsDataURL(file);
}

function resetGlobalWallpaper() {
  if (!state.settings) state.settings = {};
  state.settings.globalWallpaper = null;
  saveState();
  applyBeautifySettings();
  showToast('已清除壁纸');
}

// 颜色清除
function resetGlobalBubbleUser() { state.settings.globalBubbleUser = null; saveState(); initBeautifyPage(); renderChatMessages(); }
function resetGlobalBubbleDream() { state.settings.globalBubbleDream = null; saveState(); initBeautifyPage(); renderChatMessages(); }
function resetGlobalFontColor() { state.settings.globalFontColor = null; saveState(); initBeautifyPage(); renderChatMessages(); }
function resetGlobalChatCSS() { 
  if (!state.settings) return;
  state.settings.globalChatCSS = null; 
  document.getElementById('globalChatCSS').value = ''; // 👈 核心修复：清空输入框里的字
  saveState(); 
  initBeautifyPage(); 
  applyBeautifySettings(); 
  renderChatMessages(); 
  showToast('已清除全局 CSS');
}

// 应用全局样式（字体大小、壁纸、全局CSS）
function applyBeautifySettings() {
  if (!state.settings) return;
  
    // 1. 全局字体大小（安全版）
  const size = state.settings.fontSize || 14;
  document.body.style.fontSize = size + 'px'; 

  // 2. 聊天背景壁纸
  const chatPage = document.getElementById('pageChat');
  const msgContainer = document.getElementById('chatMessageContainer');
  
  if (chatPage && msgContainer) {
    if (state.settings.globalWallpaper) {
      chatPage.style.backgroundImage = `url(${state.settings.globalWallpaper})`;
      chatPage.style.backgroundSize = 'cover';
      chatPage.style.backgroundPosition = 'center';
      // 👇 核心修复：必须把消息容器的背景设为透明，否则壁纸被挡住
      msgContainer.style.background = 'transparent'; 
    } else {
      chatPage.style.backgroundImage = '';
      chatPage.style.background = '#ededed';
      msgContainer.style.background = '#ededed'; // 恢复默认灰底
    }
  }

  // 3. 全局自定义 CSS 注入
  let styleTag = document.getElementById('customBeautifyCSS');
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'customBeautifyCSS';
    document.head.appendChild(styleTag);
  }
  // 👇 核心修复：让你的 CSS 拥有最高优先级
  styleTag.innerHTML = state.settings.globalChatCSS || '';

    // 👇 强行覆盖系统小字颜色（防锁死）
  let sysStyle = document.getElementById('globalSysStyle');
  if (!sysStyle) {
    sysStyle = document.createElement('style');
    sysStyle.id = 'globalSysStyle';
    document.head.appendChild(sysStyle);
  }
  const targetSubColor = state.settings.globalSubTextColor || '#b0b0b0';
  sysStyle.innerHTML = `
    .sys-sub-text, .sys-time-text { color: ${targetSubColor} !important; }
  `;

    // 发送按钮颜色
  const sendBtn = document.querySelector('.btn-send');
  if (sendBtn) sendBtn.style.background = state.settings.sendBtnColor || '#007aff';

  // 顶部图标颜色
  const icons = document.querySelectorAll('.nav-icon');
  icons.forEach(icon => { icon.style.color = state.settings.iconColor || '#666'; });

  // 顶部、底部半透明
  const topBar = document.querySelector('.top-bar');
  if (topBar) {
    const topOp = state.settings.topBarOpacity !== undefined ? state.settings.topBarOpacity : 100;
    topBar.style.background = `rgba(255, 255, 255, ${topOp / 100})`;
  }
  const bottomBar = document.getElementById('bottomBar');
  if (bottomBar) {
    const botOp = state.settings.bottomBarOpacity !== undefined ? state.settings.bottomBarOpacity : 100;
    bottomBar.style.background = `rgba(255, 255, 255, ${botOp / 100})`;
  }

  // 强制覆盖系统小字的颜色（防导入数据锁死）
  let sysColorStyle = document.getElementById('sysColorForce');
  if (!sysColorStyle) {
    sysColorStyle = document.createElement('style');
    sysColorStyle.id = 'sysColorForce';
    document.head.appendChild(sysColorStyle);
  }
  sysColorStyle.innerHTML = `.sys-sub-text, .sys-time-text { color: ${state.settings.globalSubTextColor || '#b0b0b0'} !important; }`;

}

// 启动时应用一次
setTimeout(applyBeautifySettings, 500); 

// ================= 梦角状态池逻辑 =================
window._tempStatuses = [];
window._dreamStatusCollapsed = true;

function toggleDreamStatusCollapse() {
  window._dreamStatusCollapsed = !window._dreamStatusCollapsed;
  const body = document.getElementById('dreamStatusBody');
  const arrow = document.getElementById('dreamStatusArrow');
  if (body) body.style.display = window._dreamStatusCollapsed ? 'none' : 'block';
  if (arrow) arrow.style.transform = window._dreamStatusCollapsed ? '' : 'rotate(180deg)';
}

function renderDreamStatusList() {
  const list = document.getElementById('dreamStatusList');
  const cntEl = document.getElementById('dreamStatusCount');
  if (!list) return;
  
  if (cntEl) cntEl.textContent = window._tempStatuses.length;

  const body = document.getElementById('dreamStatusBody');
  const arrow = document.getElementById('dreamStatusArrow');
  if (body) body.style.display = window._dreamStatusCollapsed ? 'none' : 'block';
  if (arrow) arrow.style.transform = window._dreamStatusCollapsed ? '' : 'rotate(180deg)';

  if (window._tempStatuses.length === 0) {
    list.innerHTML = '<div style="font-size:12px;color:var(--gray);padding:6px 0;">还没有状态，添加一条试试</div>';
    return;
  }
  
  // 查找当前梦角正在用的状态
  let currentS = '';
  if (state.currentEditDreamId) {
    const d = state.dreams.find(x => x.id === state.currentEditDreamId);
    if (d && d.currentStatus) currentS = d.currentStatus;
  }

  list.innerHTML = window._tempStatuses.map((s, i) => {
    const isCurrent = (currentS === s);
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:${isCurrent ? 'rgba(0,122,255,0.08)' : 'rgba(0,0,0,0.03)'};border-radius:10px;">
      <span style="font-size:13px;color:var(--text);">${s} ${isCurrent ? '<span style="color:var(--blue);font-size:11px;">(当前)</span>' : ''}</span>
      <span onclick="deleteDreamStatus(${i})" style="color:var(--red);cursor:pointer;font-size:16px;padding:0 4px;">×</span>
    </div>`;
  }).join('');
}

function addDreamStatus() {
  const input = document.getElementById('newStatusInput');
  const val = (input.value || '').trim();
  if (!val) return;
  if (window._tempStatuses.includes(val)) return showToast('该状态已存在');
  window._tempStatuses.push(val);
  input.value = '';
  renderDreamStatusList();
}

function batchAddDreamStatus() {
  const raw = prompt('批量添加状态，每行一个：');
  if (!raw) return;
  const lines = raw.split('\n').map(s => s.trim()).filter(s => s);
  if (lines.length === 0) return;
  let added = 0;
  lines.forEach(l => {
    if (!window._tempStatuses.includes(l)) {
      window._tempStatuses.push(l);
      added++;
    }
  });
  renderDreamStatusList();
  showToast(`已添加 ${added} 条`);
}

function deleteDreamStatus(i) {
  window._tempStatuses.splice(i, 1);
  renderDreamStatusList();
}

// ================= 定时随机切换状态 =================
function tickDreamStatus() {
  if (!state.dreams || state.dreams.length === 0) return;
  const now = Date.now();
  let changed = false;

  state.dreams.forEach(function(d) {
    if (!d.statuses || d.statuses.length === 0) return;
    
    // 如果当前没有状态，或者超过 1 小时没换，就有 50% 概率换一个
    if (!d.currentStatus) {
      d.currentStatus = d.statuses[Math.floor(Math.random() * d.statuses.length)];
      changed = true;
    }
    
    const last = d.statusUpdateAt || 0;
    if (now - last > 60 * 60 * 1000) {
      d.statusUpdateAt = now;
      if (Math.random() < 0.5) {
        d.currentStatus = d.statuses[Math.floor(Math.random() * d.statuses.length)];
        changed = true;
      }
    }
  });

  if (changed) {
    saveState();
    renderAll();
    if (state.currentChatId) renderChatMessages();
  }
}
// 每 5 分钟检查一次状态
setInterval(tickDreamStatus, 5 * 60 * 1000);

function resetGlobalSubTextColor() { state.settings.globalSubTextColor = null; saveState(); initBeautifyPage(); renderChatMessages(); }
function resetSendBtnColor() { state.settings.sendBtnColor = null; saveState(); initBeautifyPage(); applyBeautifySettings(); }
function resetIconColor() { state.settings.iconColor = null; saveState(); initBeautifyPage(); applyBeautifySettings(); }

// ================= 设置页与聊天设置 =================
function toggleChatSetting(key) {
  if (!state.settings) state.settings = {};
  state.settings[key] = !state.settings[key];
  saveState();
  initChatSettingPage();
}

function saveNumSetting(key, val) {
  if (!state.settings) state.settings = {};
  let v = parseInt(val) || 0;
  if (key === 'replyMinSec' && v < 0) v = 0;
  if (key === 'replyMaxSec' && v < v) v = 1;
  if (key === 'cardJoinMin' && v < 1) v = 1;
  if (key === 'cardJoinMax' && v < 1) v = 1;
  
  if (key === 'autoMessageMin') {
    state.settings.autoMessageDelay = v * 60000; 
  } else {
    state.settings[key] = v;
  }
  saveState();
}

function initChatSettingPage() {
  if (!state.settings) state.settings = {};
  const s = state.settings;
  
  // 设置 Toggle 状态
  document.getElementById('emotionToggle').classList.toggle('on', s.emotionEnabled !== false);
  document.getElementById('cutToggle').classList.toggle('on', s.cutEnabled !== false);
  document.getElementById('cardJoinToggle').classList.toggle('on', !!s.cardJoinEnabled);
  document.getElementById('dreamQuoteToggle').classList.toggle('on', s.dreamQuoteEnabled !== false);

  // 填入数字
  if (document.getElementById('replyMinSec')) document.getElementById('replyMinSec').value = s.replyMinSec != null ? s.replyMinSec : 3;
  if (document.getElementById('replyMaxSec')) document.getElementById('replyMaxSec').value = s.replyMaxSec != null ? s.replyMaxSec : 7;
  if (document.getElementById('autoMessageMin')) document.getElementById('autoMessageMin').value = s.autoMessageDelay ? Math.round(s.autoMessageDelay / 60000) : 0;
  if (document.getElementById('cardJoinMin')) document.getElementById('cardJoinMin').value = s.cardJoinMin || 1;
  if (document.getElementById('cardJoinMax')) document.getElementById('cardJoinMax').value = s.cardJoinMax || 3;
}

// ================= 推送与备份功能 =================
function togglePush() {
  if (!state.settings) state.settings = {};
  state.settings.pushEnabled = !state.settings.pushEnabled;
  document.getElementById('pushToggle').classList.toggle('on', state.settings.pushEnabled);
  saveState();

  if (state.settings.pushEnabled) {
    if (!("Notification" in window)) return showToast('不支持通知');
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') showToast('推送已开启');
      else {
        state.settings.pushEnabled = false;
        document.getElementById('pushToggle').classList.remove('on');
        saveState();
      }
    });
  } else {
    showToast('推送已关闭');
  }
}

function backupData() {
  const data = JSON.stringify(state);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '四叶草_备份_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  showToast('数据已备份');
}

function restoreData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      Object.assign(state, data);
      saveState();
      showToast('恢复成功，即将刷新');
      setTimeout(() => location.reload(), 1000);
    } catch(err) {
      showToast('文件格式错误');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function clearAllData() {
  if (!confirm('确定要清除所有数据吗？不可撤销！')) return;
  localforage.clear().then(() => {
    localStorage.clear();
    location.reload();
  });
}

// ================= 主动找我定时器 =================
// ================= 跨梦角主动发消息与通知 =================
function checkAutoMessage() {
  // 1. 检查是否有开启主动找我（设置里）
  if (!state.settings || !state.settings.autoMessageDelay) return;
  var threshold = parseInt(state.settings.autoMessageDelay);
  if (!threshold || threshold <= 0) return;
  
  if (!state.dreams || state.dreams.length === 0) return;
  if (!state.lastActivityAt) state.lastActivityAt = {};

  var now = Date.now();
  
  // 2. 找出所有达到触发条件的梦角（包括你当前正在聊的那个）
  var candidates = [];
  state.dreams.forEach(function(d) {
    var lastAt = state.lastActivityAt[d.id] || 0;
    if (now - lastAt >= threshold) candidates.push(d);
  });
  
  if (candidates.length === 0) return;

  // 3. 15% 的概率触发（每 30 秒检查一次，防止刷屏）
  if (Math.random() > 0.15) return;

  // 4. 随机抽一个寂寞的梦角
  var picked = candidates[Math.floor(Math.random() * candidates.length)];
  
  // 5. 挑一句字卡
  var usableCards = getUsableCards(picked.id);
  var text = usableCards.length > 0 ? usableCards[Math.floor(Math.random() * usableCards.length)].text : '你在忙吗？';
  
  // 6. 把消息存入他的聊天记录
  if (!state.chatSessions[picked.id]) state.chatSessions[picked.id] = [];
  state.chatSessions[picked.id].push({
    from: 'dream',
    type: 'text',
    text: text,
    time: now,
    status: 'unread'
  });
  
  state.lastActivityAt[picked.id] = now;
  saveState();

  // 7. 如果当前就在和他聊天，直接刷新画面
  if (state.currentChatId === picked.id && document.getElementById('pageChat').classList.contains('active')) {
    loadChatMessages();
    renderChatMessages();
  }

  // 8. 刷新左侧红点和顶部下拉列表
  try { renderChatList(); } catch(e){}
  try { renderAll(); } catch(e){}

  // 9. 🚨 核心：如果是别人发消息（或者你不在聊天界面），弹通知！
  var isViewingThisChat = (document.getElementById('pageChat').classList.contains('active') && state.currentChatId === picked.id);
  if (!isViewingThisChat) {
    sendNotification(picked.name, text);
  }
}

// 封装系统通知，万无一失
function sendNotification(title, body) {
  if (!state.settings || !state.settings.pushEnabled) return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    var n = new Notification(title, {
      body: body,
      tag: 'dream-msg-' + Date.now(), // 避免通知被覆盖
      requireInteraction: false
    });
    setTimeout(n.close.bind(n), 5000); // 5秒后自动消失
  } catch (e) {
    console.log('通知弹窗失败', e);
  }
}

// 启动定时器（每 30 秒检查一次）
setInterval(checkAutoMessage, 30 * 1000);

// ================= 单聊专属设置逻辑 =================
function initChatSettingsPage() {
  if (!state.currentChatId) return;
  
  if (!state.mutedChats) state.mutedChats = [];
  const isMuted = state.mutedChats.includes(state.currentChatId);
  document.getElementById('muteTogglePrivate').classList.toggle('on', isMuted);

  if (!state.chatSettingsMap) state.chatSettingsMap = {};
  const cs = state.chatSettingsMap[state.currentChatId] || {};
  document.getElementById('readNoReplyTogglePrivate').classList.toggle('on', !!cs.readNoReply);

  if (!state.chatCustomStyles) state.chatCustomStyles = {};
  document.getElementById('chatSpecificCSS').value = state.chatCustomStyles[state.currentChatId] || '';
}

function toggleMuteCurrentChat() {
  if (!state.mutedChats) state.mutedChats = [];
  const idx = state.mutedChats.indexOf(state.currentChatId);
  const toggle = document.getElementById('muteTogglePrivate');
  
  if (idx > -1) {
    state.mutedChats.splice(idx, 1);
    toggle.classList.remove('on');
    showToast('已取消免打扰');
  } else {
    state.mutedChats.push(state.currentChatId);
    toggle.classList.add('on');
    showToast('已开启免打扰');
  }
  saveState();
}

function toggleReadNoReply() {
  if (!state.chatSettingsMap) state.chatSettingsMap = {};
  if (!state.chatSettingsMap[state.currentChatId]) state.chatSettingsMap[state.currentChatId] = {};
  const cs = state.chatSettingsMap[state.currentChatId];
  
  cs.readNoReply = !cs.readNoReply;
  document.getElementById('readNoReplyTogglePrivate').classList.toggle('on', cs.readNoReply);
  saveState();
  showToast(cs.readNoReply ? '已开启已读不回' : '已关闭已读不回');
}

function saveChatSettings() {
  if (!state.chatCustomStyles) state.chatCustomStyles = {};
  state.chatCustomStyles[state.currentChatId] = document.getElementById('chatSpecificCSS').value;
  saveState();
  showToast('聊天设置已保存');
  renderChatMessages();
  navigateTo('pageChat');
}

function confirmClearChat() {
  if (!confirm('确定要清空和TA的聊天记录吗？此操作不可恢复！')) return;
  state.chatSessions[state.currentChatId] = [];
  saveState();
  showToast('聊天记录已清空');
  renderChatMessages();
  navigateTo('pageChat');
}

// ================= 信箱系统 =================
let currentMailTab = 'inbox';

function genDeliverTime() {
  // 10 ~ 48 小时随机
  const h = 10 + Math.random() * 38;
  return Date.now() + h * 3600 * 1000;
}

function switchMailTab(tab) {
  currentMailTab = tab;
  const inbox = document.getElementById('mailTabInbox');
  const outbox = document.getElementById('mailTabOutbox');
  
  if (tab === 'inbox') {
    inbox.style.color = 'var(--blue)'; inbox.style.borderBottom = '2px solid var(--blue)';
    outbox.style.color = 'var(--gray)'; outbox.style.borderBottom = '2px solid transparent';
  } else {
    outbox.style.color = 'var(--blue)'; outbox.style.borderBottom = '2px solid var(--blue)';
    inbox.style.color = 'var(--gray)'; inbox.style.borderBottom = '2px solid transparent';
  }
  renderMailList();
}

function renderMailList() {
  const list = document.getElementById('mailList');
  if (!list) return;
  if (!state.mails) state.mails = [];

  const filtered = state.mails.filter(m => {
    if (currentMailTab === 'inbox') return m.from !== 'user';
    else return m.from === 'user';
  }).sort((a, b) => b.sentAt - a.sentAt);

  if (filtered.length === 0) {
    list.innerHTML = `<div style="text-align:center; color:#999; padding:50px 20px; font-size:14px;">${currentMailTab === 'inbox' ? '还没有收到信' : '还没有寄出过信'}</div>`;
    return;
  }

  list.innerHTML = filtered.map(m => {
    const t = new Date(m.sentAt);
    const timeStr = `${t.getMonth()+1}/${t.getDate()} ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
    
    let statusHtml = '';
    if (m.from === 'user') {
      if (m.delivered) {
        statusHtml = '<span style="font-size:11px; color:var(--green);">已送达</span>';
      } else {
        const left = Math.max(0, m.deliverAt - Date.now());
        const hLeft = Math.floor(left / 3600000);
        const mLeft = Math.floor((left % 3600000) / 60000);
        statusHtml = `<span style="font-size:11px; color:var(--gray);">运送中 · 剩 ${hLeft}h${mLeft}m</span>`;
      }
    } else if (!m.read) {
      statusHtml = '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#ff3b30; margin-right:6px;"></span>';
    }

    let whoText = m.from === 'user' ? `寄给 ${m.toName}` : `来自 ${m.fromName}`;
    if (m.isAutoLetter) {
      whoText += ' <span style="font-size:10px; color:#ff9500; background:rgba(255,149,0,0.1); padding:1px 4px; border-radius:4px; margin-left:4px; font-weight:400;">主动来信</span>';
    }
    const preview = (m.content || '').replace(/\n/g, ' ').slice(0, 30);

    return `
      <div onclick="openLetterDetail('${m.id}')" style="padding:14px 16px; border-bottom:1px solid var(--border); background:#fff; cursor:pointer;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-size:14px; font-weight:600; color:#1d1d1f;">${statusHtml}${whoText}</span>
          <span style="font-size:11px; color:#b0b0b5;">${timeStr}</span>
        </div>
        <div style="font-size:13px; color:#86868b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${preview}</div>
      </div>
    `;
  }).join('');
}

function openWriteLetter() {
  if (!state.dreams || state.dreams.length === 0) return showToast('还没有梦角，无法写信');
  
  const sel = document.getElementById('letterTarget');
  sel.innerHTML = state.dreams.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  document.getElementById('letterContent').value = '';
  navigateTo('pageWriteLetter');
}

function sendLetter() {
  const targetId = document.getElementById('letterTarget').value;
  const content = document.getElementById('letterContent').value.trim();
  if (!content) return showToast('信件内容不能为空');
  
  const target = state.dreams.find(d => d.id === targetId);
  if (!target) return;
  if (!state.mails) state.mails = [];

  state.mails.push({
    id: 'mail_' + Date.now(),
    from: 'user',
    fromId: 'user',
    fromName: state.profile.name || '我',
    toId: targetId,
    toName: target.name,
    content: content,
    sentAt: Date.now(),
    deliverAt: genDeliverTime(), // 10-48小时
    delivered: false,
    isReply: false
  });
  saveState();
  showToast('信件已寄出，正在路上...');
  navigateTo('pageMailbox');
  switchMailTab('outbox');
}

function openLetterDetail(id) {
  const m = state.mails.find(x => x.id === id);
  if (!m) return;

  // 标记已读
  if (m.from !== 'user' && !m.read) {
    m.read = true;
    saveState();
    renderMailList();
  }

  const t = new Date(m.sentAt);
  const timeStr = `${t.getFullYear()}年${t.getMonth()+1}月${t.getDate()}日 ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
  
  document.getElementById('letterDetailTitle').textContent = m.from === 'user' ? `寄给 ${m.toName}` : `来自 ${m.fromName}`;
  
  let html = '<div style="padding:20px;">';
  html += `<div style="font-size:12px; color:#86868b; margin-bottom:20px; text-align:center;">${timeStr}</div>`;
  html += `<div style="background:#fff; border-radius:14px; padding:20px; box-shadow:0 2px 12px rgba(0,0,0,0.05); line-height:1.8; font-size:15px; color:#1d1d1f; white-space:pre-wrap; word-break:break-word;">${m.content}</div>`;
  
  if (m.from === 'user' && !m.delivered) {
    html += '<div style="text-align:center; margin-top:20px; font-size:13px; color:#86868b;">信件还在路上，请耐心等待...</div>';
  }
  html += '</div>';
  
  document.getElementById('letterDetailContent').innerHTML = html;
  navigateTo('pageLetterDetail');
}

// ================= 信件定时检查与 AI 回复 =================
function checkMailDelivery() {
  if (!state.mails || state.mails.length === 0) return;
  const now = Date.now();
  let changed = false;

  state.mails.forEach(m => {
    // 检查用户发出的信
    if (m.from === 'user' && !m.delivered && now >= m.deliverAt) {
      m.delivered = true;
      changed = true;
      // 触发梦角回信
      setTimeout(() => aiReplyLetter(m.id), 3000 + Math.random() * 5000);
    }
  });

  if (changed) {
    saveState();
    if (document.getElementById('pageMailbox').classList.contains('active')) {
      renderMailList();
    }
  }
}

function aiReplyLetter(letterId) {
  const original = state.mails.find(x => x.id === letterId);
  if (!original) return;
  const dream = state.dreams.find(d => d.id === original.toId);
  if (!dream || !state.cards) return;

  // 从字卡库抽 8-15 句
  const count = 8 + Math.floor(Math.random() * 8);
  const usableCards = state.cards.filter(c => (c.dreamId || 'all') === 'all' || c.dreamId === dream.id);
  if (usableCards.length === 0) return;

  const shuffled = [...usableCards].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, Math.min(count, shuffled.length));
  const content = picked.map(c => c.text).join('\n');

  state.mails.push({
    id: 'mail_' + Date.now(),
    from: 'dream',
    fromId: dream.id,
    fromName: dream.name,
    toId: 'user',
    toName: state.profile.name || '我',
    content: content,
    sentAt: Date.now(),
    deliverAt: Date.now(),
    delivered: true,
    read: false,
    isReply: true
  });
  saveState();
  
  if (document.getElementById('pageMailbox').classList.contains('active')) {
    renderMailList();
  }
  // 系统弹窗提示
  if (state.settings && state.settings.pushEnabled && Notification.permission === 'granted') {
    new Notification(dream.name, { body: '给你回信了，快去信箱看看吧' });
  }
}

// 启动时检查，并且每分钟检查一次
setTimeout(checkMailDelivery, 2000);
setInterval(checkMailDelivery, 60 * 1000);

// ================= 梦角主动写信彩蛋 =================
function checkAutoLetter() {
  if (!state.dreams || state.dreams.length === 0) return;
  if (!state.cards || state.cards.length === 0) return;
  if (!state.mails) state.mails = [];

  // 2% 概率触发
  if (Math.random() > 0.02) return;

  const dream = state.dreams[Math.floor(Math.random() * state.dreams.length)];

  const count = 8 + Math.floor(Math.random() * 8);
  const usableCards = state.cards.filter(c => (c.dreamId || 'all') === 'all' || c.dreamId === dream.id);
  if (usableCards.length === 0) return;
  
  const shuffled = [...usableCards].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, Math.min(count, shuffled.length));
  const content = picked.map(c => c.text).join('\n');

  state.mails.push({
    id: 'mail_' + Date.now(),
    from: 'dream',
    fromId: dream.id,
    fromName: dream.name,
    fromAvatar: dream.avatar || '',
    toId: 'user',
    toName: state.profile.name || '我',
    content: content,
    sentAt: Date.now(),
    deliverAt: Date.now(),
    delivered: true,
    read: false,
    isReply: false,
    isAutoLetter: true
  });

  // 👇 新增：在聊天界面插入系统小字提示 👇
  if (!state.chatSessions[dream.id]) state.chatSessions[dream.id] = [];
  state.chatSessions[dream.id].push({
    from: 'system',
    type: 'text',
    text: `「${dream.name}」给你写了一封信`,
    time: Date.now()
  });

  saveState();

  // 实时刷新聊天界面（如果你刚好在这个梦角的聊天里）
  if (state.currentChatId === dream.id && document.getElementById('pageChat').classList.contains('active')) {
    renderChatMessages();
  }

  // 实时刷新信箱列表
  if (document.getElementById('pageMailbox').classList.contains('active')) {
    renderMailList();
  }

  // 弹出系统通知
  if (state.settings && state.settings.pushEnabled && Notification.permission === 'granted') {
    new Notification(dream.name, { body: '给你写了一封主动来信' });
  }
}

setInterval(checkAutoLetter, 5 * 60 * 1000);
setTimeout(checkAutoLetter, 10000);

// ================= 日历核心逻辑 =================
let currentCalDate = new Date();
let currentCalMonth = new Date();
let currentCalMode = 'lunar'; // lunar(农历) 或 minimal(极简)
let currentDetailSchId = null;

function toggleCalendarModeMenu() {
  const menu = document.getElementById('calendarModeMenu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function setCalendarMode(mode) {
  currentCalMode = mode;
  const modeText = document.getElementById('calendarModeText');
  const items = document.querySelectorAll('.cal-mode-item');
  
  if (mode === 'lunar') {
    modeText.textContent = '农历模式';
    items[0].style.color = '#333'; items[0].style.fontWeight = '400';
    items[1].style.color = '#b0b0b5'; items[1].style.fontWeight = '600';
  } else {
    modeText.textContent = '极简模式';
    items[0].style.color = '#b0b0b5'; items[0].style.fontWeight = '600';
    items[1].style.color = '#333'; items[1].style.fontWeight = '400';
  }
  
  toggleCalendarModeMenu();
  renderCalendar();
}

function renderCalendar() {
  if (!state.schedules) state.schedules = [];
  const year = currentCalMonth.getFullYear();
  const month = currentCalMonth.getMonth();
  
  document.getElementById('calYear').textContent = year;
  document.getElementById('calMonth').textContent = String(month + 1).padStart(2, '0');

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  let html = '';
  for (let i = 0; i < firstDay; i++) html += '<div></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const isToday = dateObj.toDateString() === today.toDateString();
    const isSelected = dateObj.toDateString() === currentCalDate.toDateString();
    
    // 极简模式下，农历留空
    let lunarText = '';
    if (currentCalMode === 'lunar') {
      try {
        const lunarStr = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { day: 'numeric' }).format(dateObj);
        lunarText = lunarStr === '初一' ? new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'short' }).format(dateObj) : lunarStr;
      } catch (e) {}
    }

    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const hasSch = state.schedules.some(s => s.startStr.startsWith(dateStr));

    html += `<div class="cal-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" onclick="selectCalDate(${year}, ${month}, ${d})">
      <div class="cal-date">${d}</div>
      <div class="cal-lunar">${lunarText}</div>
      ${hasSch ? '<div class="cal-dot"></div>' : ''}
    </div>`;
  }

  document.getElementById('calendarGrid').innerHTML = html;
  renderScheduleList();
}

function changeMonth(offset) {
  currentCalMonth.setMonth(currentCalMonth.getMonth() + offset);
  renderCalendar();
}

function selectCalDate(y, m, d) {
  currentCalDate = new Date(y, m, d);
  renderCalendar();
}

function renderScheduleList() {
  const list = document.getElementById('calendarScheduleList');
  const title = document.getElementById('scheduleDateTitle');
  const dateStr = `${currentCalDate.getFullYear()}-${String(currentCalDate.getMonth()+1).padStart(2,'0')}-${String(currentCalDate.getDate()).padStart(2,'0')}`;
  title.textContent = `${currentCalDate.getMonth()+1}月${currentCalDate.getDate()}日 日程`;
  
  const daySchedules = state.schedules.filter(s => s.startStr.startsWith(dateStr)).sort((a,b) => a.startTime - b.startTime);
  
  if (daySchedules.length === 0) {
    list.innerHTML = '<div style="text-align:center; color:#999; font-size:13px; padding:20px 0;">暂无日程</div>';
    return;
  }

  list.innerHTML = daySchedules.map(s => {
    const timeStr = s.startStr.split(' ')[1];
    // 梦角添加的日程会有特殊标记
    const dreamTag = s.isDreamAdd ? `<div style="font-size:11px; color:#007aff; margin-top:4px;">「${s.addedByName}」添加</div>` : '';
    return `<div class="sch-item" onclick="openScheduleDetail('${s.id}')" style="cursor:pointer;">
      <div class="sch-dot" style="background:${s.isDreamAdd ? '#ff9500' : 'var(--blue)'};"></div>
      <div class="sch-content">
        <div class="sch-title">${s.name}</div>
        <div class="sch-time">${timeStr} ${s.remindWay === 'dream' ? '· 梦角提醒' : ''}</div>
        ${dreamTag}
      </div>
    </div>`;
  }).join('');
}

// --- 日程详情与编辑 ---
function openScheduleDetail(id) {
  const s = state.schedules.find(x => x.id === id);
  if (!s) return;
  currentDetailSchId = id;

  document.getElementById('schDetailTitle').textContent = s.name;
  document.getElementById('schDetailDate').textContent = s.startStr.split(' ')[0];
  document.getElementById('schDetailTime').textContent = s.startStr.split(' ')[1];

  const dreamTag = document.getElementById('schDetailDreamTag');
  if (s.isDreamAdd) {
    dreamTag.style.display = 'block';
    dreamTag.textContent = `由「${s.addedByName}」添加`;
  } else {
    dreamTag.style.display = 'none';
  }

  let wayStr = '通知提醒';
  if (s.remindWay === 'dream') {
    const d = state.dreams.find(dr => dr.id === s.dreamId);
    wayStr = `梦角提醒 (${d ? d.name : '未知'})`;
  }
  document.getElementById('schDetailRemindWay').textContent = wayStr;

  // 倒计时
  let diff = s.startTime - Date.now();
  let cdText = '';
  if (diff > 0) {
    let mins = Math.floor(diff / 60000);
    cdText = mins < 60 ? `${mins}分钟后开始` : `${Math.floor(mins/60)}小时后开始`;
  } else cdText = '已开始或结束';
  document.getElementById('schDetailCountdown').textContent = cdText;

  navigateTo('pageScheduleDetail');
}

function openEditSchedule() {
  const s = state.schedules.find(x => x.id === currentDetailSchId);
  if (!s) return;
  
  document.getElementById('addSchTitle').textContent = '编辑日程';
  document.getElementById('schName').value = s.name;
  document.getElementById('schStartTime').value = s.startStr.replace(' ', 'T');
  document.getElementById('schRemindWay').value = s.remindWay;
  
  if (s.remindWay === 'dream') {
    document.getElementById('schDreamSelectGroup').style.display = 'block';
    document.getElementById('schDreamId').value = s.dreamId;
  } else {
    document.getElementById('schDreamSelectGroup').style.display = 'none';
  }
  
  navigateTo('pageAddSchedule');
}

function openAddSchedule() {
  const now = new Date();
  const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0,16);
  document.getElementById('schName').value = '';
  document.getElementById('schStartTime').value = localIso;
  document.getElementById('schRemindWay').value = 'notify';
  document.getElementById('schDreamSelectGroup').style.display = 'none';
  document.getElementById('addSchTitle').textContent = '新建日程';
  currentDetailSchId = null; // 清空正在编辑的ID

  const dreamSel = document.getElementById('schDreamId');
  dreamSel.innerHTML = (state.dreams || []).map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  
  navigateTo('pageAddSchedule');
}

document.addEventListener('change', function(e) {
  if (e.target.id === 'schRemindWay') {
    document.getElementById('schDreamSelectGroup').style.display = e.target.value === 'dream' ? 'block' : 'none';
  }
});

function saveNewSchedule() {
  const name = document.getElementById('schName').value.trim();
  const start = document.getElementById('schStartTime').value;
  const way = document.getElementById('schRemindWay').value;
  const dreamId = document.getElementById('schDreamId').value;
  
  if (!name || !start) return showToast('请填写完整');
  const startTime = new Date(start).getTime();

  if (!state.schedules) state.schedules = [];

  if (currentDetailSchId) {
    // 编辑模式
    const s = state.schedules.find(x => x.id === currentDetailSchId);
    if (s) {
      s.name = name; s.startStr = start.replace('T', ' '); s.startTime = startTime;
      s.remindWay = way; s.dreamId = way === 'dream' ? dreamId : '';
      s.reminded = false; // 重置提醒状态
    }
  } else {
    // 新建模式
    state.schedules.push({
      id: 'sch_' + Date.now(), name, startStr: start.replace('T', ' '), startTime,
      remindWay: way, dreamId: way === 'dream' ? dreamId : '', reminded: false
    });
  }
  
  saveState();
  showToast('保存成功');
  navigateTo('pageCalendar');
  currentCalDate = new Date(startTime);
  currentCalMonth = new Date(startTime);
  renderCalendar();
}

function deleteScheduleFromDetail() {
  if (!confirm('确定删除该日程吗？')) return;
  state.schedules = state.schedules.filter(s => s.id !== currentDetailSchId);
  saveState();
  showToast('已删除');
  navigateTo('pageCalendar');
  renderCalendar();
}

// ================= 日程定时提醒 =================
setInterval(() => {
  if (!state.schedules || state.schedules.length === 0) return;
  const now = Date.now();
  let changed = false;
  state.schedules.forEach(s => {
    if (s.reminded) return;
    if (now >= s.startTime - 5 * 60 * 1000 && now < s.startTime) {
      s.reminded = true;
      changed = true;
      
      if (s.remindWay === 'notify') {
        if (state.settings.pushEnabled && Notification.permission === 'granted') {
          new Notification('日程提醒', { body: `「${s.name}」5分钟后开始` });
        }
      } else if (s.remindWay === 'dream' && s.dreamId) {
        const dream = state.dreams.find(d => d.id === s.dreamId);
        if (dream) {
          if (!state.chatSessions[dream.id]) state.chatSessions[dream.id] = [];
          state.chatSessions[dream.id].push({ from: 'system', type: 'text', text: `「${dream.name}」提醒你：日程「${s.name}」即将开始`, time: Date.now() });
          if (state.currentChatId === dream.id) renderChatMessages();
          if (state.settings.pushEnabled && Notification.permission === 'granted') {
            new Notification(dream.name, { body: `提醒你：「${s.name}」5分钟后开始` });
          }
        }
      }
    }
  });
  if (changed) saveState();
}, 10000);


// ================= 梦角主动添加日程 =================
function checkAutoDreamSchedule() {
  if (!state.dreams || state.dreams.length === 0) return;
  if (!state.cards || state.cards.length === 0) return;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  state.dreams.forEach(dream => {
    // 每天最多加一条，30% 概率
    if (dream.lastScheduleDate === todayStr) return;
    if (Math.random() > 0.3) return;

    const usableCards = state.cards.filter(c => (c.dreamId || 'all') === 'all' || c.dreamId === dream.id);
    if (usableCards.length === 0) return;

    // 随机抽 1-3 张字卡拼成名字
    const getRandomText = () => {
      const count = 1 + Math.floor(Math.random() * 3);
      return [...usableCards].sort(() => Math.random() - 0.5).slice(0, count).map(c => c.text).join('，');
    };

    // 限制在接下来的 7 天内
    const randomDays = Math.floor(Math.random() * 7) + 1;
    const randomHour = 9 + Math.floor(Math.random() * 12); // 9点到21点
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + randomDays);
    startDate.setHours(randomHour, 0, 0, 0);

    const pad = n => n < 10 ? '0' + n : n;
    const startStr = `${startDate.getFullYear()}-${pad(startDate.getMonth()+1)}-${pad(startDate.getDate())} ${pad(startDate.getHours())}:00`;

    state.schedules.push({
      id: 'sch_dream_' + Date.now(),
      name: getRandomText(),
      startStr,
      startTime: startDate.getTime(),
      remindWay: 'none',
      dreamId: dream.id,
      isDreamAdd: true,
      addedByName: dream.name,
      reminded: true // 梦角加的不用系统提醒
    });

    dream.lastScheduleDate = todayStr;

    // 发一条聊天小字提示
    if (!state.chatSessions[dream.id]) state.chatSessions[dream.id] = [];
    state.chatSessions[dream.id].push({
      from: 'system',
      type: 'text',
      text: `「${dream.name}」添加了一条新日程：${state.schedules[state.schedules.length-1].name}`,
      time: Date.now()
    });

    if (state.currentChatId === dream.id) renderChatMessages();
  });

  saveState();
  renderCalendar();
}

setInterval(checkAutoDreamSchedule, 6 * 60 * 60 * 1000); // 每6小时检查一次
setTimeout(checkAutoDreamSchedule, 5000); // 启动5秒后查一次

// ================= 五子棋系统核心 =================
let gomoku = {
  board: Array(15).fill(0).map(() => Array(15).fill(0)),
  active: false, dreamId: null, userColor: 1, aiColor: 2, currentTurn: 1, isUserTurn: true,
  userUndoLeft: 3, aiUndoLeft: 3, moveHistory: [], chats: [],
  mode: 'pvp', spectateMatchId: null, startTime: null
};

if (!state.gomokuHistory) state.gomokuHistory = [];
if (!state.gomokuAiMatches) state.gomokuAiMatches = [];

function openGomokuGame() {
  navigateTo('pageGomoku');
  resetGomokuGame();
}

function resetGomokuGame() {
  gomoku.active = false;
  gomoku.board = Array(15).fill(0).map(() => Array(15).fill(0));
  gomoku.moveHistory = [];
  gomoku.chats = [];
  gomoku.userUndoLeft = 3;
  gomoku.aiUndoLeft = 3;
  gomoku.mode = 'pvp';
  gomoku.spectateMatchId = null;
  
  if (Math.random() < 0.5) { gomoku.userColor = 1; gomoku.aiColor = 2; }
  else { gomoku.userColor = 2; gomoku.aiColor = 1; }

  if (!gomoku.dreamId && state.dreams && state.dreams.length > 0) {
    gomoku.dreamId = state.dreams[0].id;
  }

  updateGomokuUI();
  setTimeout(drawGomokuBoard, 50);
  renderGomokuChats();
}

function exitGomoku() {
  // 如果游戏还在进行中，直接退出算作认输，存个档
  if (gomoku.active && gomoku.startTime) {
    saveGomokuHistory('dream', 'resign');
  }
  gomoku.chats = []; 
  gomoku.active = false;
  gomoku.mode = 'pvp';
  gomoku.spectateMatchId = null;
  navigateTo('pageGame');
}

function updateGomokuUI() {
  var sideBtns = document.getElementById('gomokuSideBtns');
  var turnEl = document.getElementById('gomokuTurnIndicator');
  var overlay = document.getElementById('gomokuStartOverlay');
  var dreamSelector = document.getElementById('gomokuDreamSelector');

  if (gomoku.mode === 'spectate') {
    if (sideBtns) sideBtns.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    if (dreamSelector) dreamSelector.style.display = 'none'; 
    
    var match = state.gomokuAiMatches.find(m => m.id === gomoku.spectateMatchId);
    if (match) {
      var p1ColStr = match.p1Color === 1 ? '⚫黑' : '⚪白';
      var p2ColStr = match.p2Color === 1 ? '⚫黑' : '⚪白';
      document.getElementById('gomokuDreamAvatar').src = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27 viewBox=%270 0 40 40%27%3E%3Ccircle cx=%2720%27 cy=%2720%27 r=%2720%27 fill=%27%23eee%27/%3E%3C/svg%3E';
      document.getElementById('gomokuDreamName').textContent = match.p1Name + '(' + p1ColStr + ') vs ' + match.p2Name + '(' + p2ColStr + ')';
      document.getElementById('gomokuDreamStatus').textContent = '对局观战中';
      
      document.getElementById('gomokuUserColor').innerHTML = `${match.p1Name}：${match.p1Color === 1 ? '⚫ 黑棋' : '⚪ 白棋'} &nbsp; | &nbsp; ${match.p2Name}：${match.p2Color === 1 ? '⚫ 黑棋' : '⚪ 白棋'}`;
      
      if (match.active) {
        var currentPlayerName = gomoku.currentTurn === 1 ? (match.p1Color === 1 ? match.p1Name : match.p2Name) : (match.p2Color === 1 ? match.p2Name : match.p1Name);
        turnEl.textContent = currentPlayerName + ' 思考中...';
        turnEl.style.color = '#ff9500';
        turnEl.style.background = 'rgba(255,149,0,0.1)';
      } else {
        turnEl.textContent = '对局已结束';
        turnEl.style.color = '#86868b';
        turnEl.style.background = '#f0f0f5';
      }
    }
    return; 
  }

  // PVP 模式
  if (sideBtns) sideBtns.style.display = 'flex';
  if (dreamSelector) dreamSelector.style.display = 'flex'; 
  if (!gomoku.dreamId) return;
  var d = state.dreams.find(x => x.id === gomoku.dreamId);
  if (!d) return;

  document.getElementById('gomokuDreamAvatar').src = d.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27 viewBox=%270 0 40 40%27%3E%3Ccircle cx=%2720%27 cy=%2720%27 r=%2720%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2720%27 y=%2725%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2716%27%3E💜%3C/text%3E%3C/svg%3E';
  document.getElementById('gomokuDreamName').textContent = d.name;
  document.getElementById('gomokuDreamStatus').textContent = d.currentStatus || '在线';
  
  var colorDot = gomoku.userColor === 1 ? '⚫' : '⚪';
  document.getElementById('gomokuUserColor').innerHTML = `我：${colorDot} ${gomoku.userColor === 1 ? '黑棋' : '白棋'} &nbsp; | &nbsp; ${d.name}：${gomoku.aiColor === 1 ? '⚫' : '⚪'} ${gomoku.aiColor === 1 ? '黑棋' : '白棋'}`;
  document.getElementById('gomokuUndoCount').textContent = gomoku.userUndoLeft;

  if (overlay) {
    overlay.style.display = gomoku.active ? 'none' : 'flex';
    document.getElementById('gomokuStartBtn').textContent = gomoku.moveHistory.length > 0 ? '再来一局' : '开始游戏';
  }

  if (!gomoku.active) {
    turnEl.textContent = gomoku.moveHistory.length === 0 ? '未开始' : '游戏结束';
    turnEl.style.color = '#86868b';
    turnEl.style.background = '#f0f0f5';
  } else {
    if (gomoku.isUserTurn) {
      turnEl.textContent = '你的回合'; turnEl.style.color = 'var(--blue)'; turnEl.style.background = 'rgba(0,122,255,0.1)';
    } else {
      turnEl.textContent = d.name + ' 思考中...'; turnEl.style.color = '#ff9500'; turnEl.style.background = 'rgba(255,149,0,0.1)';
    }
  }
}

function startGomokuMatch() {
  if (!gomoku.dreamId) return showToast('请先选择梦角');
  
  if (state.gomokuAiMatches && state.gomokuAiMatches.some(m => m.active && (m.p1Id === gomoku.dreamId || m.p2Id === gomoku.dreamId))) {
    return showToast('该梦角正在与其他梦角对弈中');
  }

  gomoku.board = Array(15).fill(0).map(() => Array(15).fill(0));
  gomoku.moveHistory = [];
  gomoku.userUndoLeft = 3; gomoku.aiUndoLeft = 3;
  gomoku.startTime = Date.now(); 
  
  if (Math.random() < 0.5) { gomoku.userColor = 1; gomoku.aiColor = 2; }
  else { gomoku.userColor = 2; gomoku.aiColor = 1; }

  gomoku.active = true;
  gomoku.currentTurn = 1;
  gomoku.isUserTurn = (gomoku.userColor === 1);
  
  updateGomokuUI();
  drawGomokuBoard();
  addGomokuChat('system', `游戏开始！你执${gomoku.userColor === 1 ? '黑' : '白'}，${getDreamName(gomoku.dreamId)}执${gomoku.aiColor === 1 ? '黑' : '白'}。`);
  
  if (!gomoku.isUserTurn) setTimeout(aiGomokuMove, 800);
}

function drawGomokuBoard() {
  var canvas = document.getElementById('gomokuCanvas');
  if (!canvas) return;
  var rect = canvas.getBoundingClientRect();
  if (rect.width === 0) return; 

  var dpr = window.devicePixelRatio || 1;
  var w = rect.width;
  canvas.width = w * dpr; canvas.height = w * dpr;

  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, w);
  ctx.fillStyle = '#e6c280';
  ctx.fillRect(0, 0, w, w);

  var pad = 15, cs = (w - pad * 2) / 14; 
  ctx.strokeStyle = '#8b6b40'; ctx.lineWidth = 1;

  for (var i = 0; i < 15; i++) {
    ctx.beginPath(); ctx.moveTo(pad, pad + i * cs); ctx.lineTo(pad + 14 * cs, pad + i * cs); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad + i * cs, pad); ctx.lineTo(pad + i * cs, pad + 14 * cs); ctx.stroke();
  }

  var stars = [[3,3], [11,3], [3,11], [11,11], [7,7]];
  ctx.fillStyle = '#8b6b40';
  stars.forEach(function(s) {
    ctx.beginPath(); ctx.arc(pad + s[0] * cs, pad + s[1] * cs, 3, 0, Math.PI * 2); ctx.fill();
  });

  for (var y = 0; y < 15; y++) {
    for (var x = 0; x < 15; x++) {
      if (gomoku.board[y][x] !== 0) {
        drawChessPiece(ctx, x, y, gomoku.board[y][x], cs, pad);
      }
    }
  }
}

function drawChessPiece(ctx, x, y, color, cs, pad) {
  var cx = pad + x * cs, cy = pad + y * cs, r = cs * 0.42;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  if (color === 1) { 
    ctx.fillStyle = '#333'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx - r*0.3, cy - r*0.3, r*0.2, 0, Math.PI*2); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();
  } else { 
    ctx.fillStyle = '#f8f8f8'; ctx.fill(); ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - r*0.3, cy - r*0.3, r*0.2, 0, Math.PI*2); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill();
  }
}

document.getElementById('gomokuClickLayer').addEventListener('click', function(e) {
  if (gomoku.mode === 'spectate' || !gomoku.active || !gomoku.isUserTurn) return;
  var canvas = document.getElementById('gomokuCanvas');
  var rect = canvas.getBoundingClientRect();
  var w = rect.width, pad = 15, cs = (w - pad * 2) / 14;
  var gx = Math.round((e.clientX - rect.left - pad) / cs);
  var gy = Math.round((e.clientY - rect.top - pad) / cs);
  
  if (gx >= 0 && gx < 15 && gy >= 0 && gy < 15 && gomoku.board[gy][gx] === 0) {
    makeGomokuMove(gx, gy, gomoku.userColor, true);
  }
});

function checkGomokuWin(x, y, color) {
  var dirs = [[1,0], [0,1], [1,1], [1,-1]];
  for (var i = 0; i < dirs.length; i++) {
    var count = 1;
    for (var j = 1; j < 5; j++) { var nx = x + dirs[i][0] * j, ny = y + dirs[i][1] * j; if (nx >= 0 && nx < 15 && ny >= 0 && ny < 15 && gomoku.board[ny][nx] === color) count++; else break; }
    for (var j = 1; j < 5; j++) { var nx = x - dirs[i][0] * j, ny = y - dirs[i][1] * j; if (nx >= 0 && nx < 15 && ny >= 0 && ny < 15 && gomoku.board[ny][nx] === color) count++; else break; }
    if (count >= 5) return true;
  }
  return false;
}

function makeGomokuMove(x, y, color, isUser) {
  gomoku.board[y][x] = color;
  gomoku.moveHistory.push({x: x, y: y, color: color});
  drawGomokuBoard();

  if (checkGomokuWin(x, y, color)) {
    gomoku.active = false; updateGomokuUI();
    if (color === gomoku.userColor) { addGomokuChat('system', `🎉 你赢了！`); saveGomokuHistory('user', 'five'); }
    else { addGomokuChat('system', `💀 ${getDreamName(gomoku.dreamId)} 赢了！`); saveGomokuHistory('dream', 'five'); }
    return;
  }

  if (gomoku.moveHistory.length >= 225) {
    gomoku.active = false; updateGomokuUI();
    addGomokuChat('system', `平局！棋盘满了。`);
    saveGomokuHistory('draw', 'full');
    return;
  }

  gomoku.currentTurn = color === 1 ? 2 : 1;
  gomoku.isUserTurn = (gomoku.currentTurn === gomoku.userColor);
  updateGomokuUI();

  if (!gomoku.isUserTurn && gomoku.active) setTimeout(aiGomokuMove, 800 + Math.random() * 500);
}

function userUndo() {
  if (!gomoku.active) return showToast('游戏未开始');
  if (gomoku.userUndoLeft <= 0) return showToast('悔棋次数用完了');
  if (gomoku.moveHistory.length < 2) return showToast('还没下几步呢');

  var lastMove1 = gomoku.moveHistory.pop(); gomoku.board[lastMove1.y][lastMove1.x] = 0;
  var lastMove2 = gomoku.moveHistory.pop(); gomoku.board[lastMove2.y][lastMove2.x] = 0;

  gomoku.userUndoLeft--; gomoku.isUserTurn = true; gomoku.currentTurn = gomoku.userColor;
  updateGomokuUI(); drawGomokuBoard(); showToast('悔棋成功');
}

function userResign() {
  if (!gomoku.active) return;
  if (!confirm('确定要认输吗？')) return;
  gomoku.active = false; updateGomokuUI();
  addGomokuChat('system', `你认输了，${getDreamName(gomoku.dreamId)} 获得胜利。`);
  saveGomokuHistory('dream', 'resign');
}

function aiGomokuMove(isUndoAction) {
  if (!gomoku.active || gomoku.isUserTurn) return;
  if (Math.random() < 0.01) {
    gomoku.active = false; updateGomokuUI();
    addGomokuChat('system', `${getDreamName(gomoku.dreamId)} 认输了！你赢了！`);
    saveGomokuHistory('user', 'resign'); return;
  }

  if (!isUndoAction && Math.random() < 0.05 && gomoku.aiUndoLeft > 0 && gomoku.moveHistory.length >= 3) {
    var lastMove1 = gomoku.moveHistory.pop(); gomoku.board[lastMove1.y][lastMove1.x] = 0;
    var lastMove2 = gomoku.moveHistory.pop(); gomoku.board[lastMove2.y][lastMove2.x] = 0;
    gomoku.aiUndoLeft--; updateGomokuUI(); drawGomokuBoard();
    addGomokuChat('dream', `哎呀，下错了，我悔个棋~`);
    window._gomokuForbiddenMove = { x: lastMove1.x, y: lastMove1.y };
    setTimeout(function() { aiGomokuMove(true); }, 1000); return;
  }

  var maxMyScore = -1, maxEnemyScore = -1, bestMyMoves = [], bestEnemyMoves = [];

  for (var y = 0; y < 15; y++) {
    for (var x = 0; x < 15; x++) {
      if (gomoku.board[y][x] === 0) {
        if (isUndoAction && window._gomokuForbiddenMove && x === window._gomokuForbiddenMove.x && y === window._gomokuForbiddenMove.y) continue;
        var myScore = evaluateGomokuPoint(x, y, gomoku.aiColor);
        var enemyScore = evaluateGomokuPoint(x, y, gomoku.userColor);
        if (myScore > maxMyScore) { maxMyScore = myScore; bestMyMoves = [{x, y}]; } else if (myScore === maxMyScore) bestMyMoves.push({x, y});
        if (enemyScore > maxEnemyScore) { maxEnemyScore = enemyScore; bestEnemyMoves = [{x, y}]; } else if (enemyScore === maxEnemyScore) bestEnemyMoves.push({x, y});
      }
    }
  }

  var move = null;
  if (maxMyScore >= 10000000) move = bestMyMoves[Math.floor(Math.random() * bestMyMoves.length)];
  else if (maxEnemyScore >= 10000000) move = bestEnemyMoves[Math.floor(Math.random() * bestEnemyMoves.length)];
  else if (maxMyScore >= 1000000) move = bestMyMoves[Math.floor(Math.random() * bestMyMoves.length)];
  else if (maxEnemyScore >= 1000000) move = bestEnemyMoves[Math.floor(Math.random() * bestEnemyMoves.length)];
  else {
    var bestScore = -1, bestMoves = [];
    for (var y = 0; y < 15; y++) {
      for (var x = 0; x < 15; x++) {
        if (gomoku.board[y][x] === 0) {
          if (isUndoAction && window._gomokuForbiddenMove && x === window._gomokuForbiddenMove.x && y === window._gomokuForbiddenMove.y) continue;
          var score = evaluateGomokuPoint(x, y, gomoku.aiColor) + evaluateGomokuPoint(x, y, gomoku.userColor) * 0.9 + Math.random() * 0.1;
          if (score > bestScore) { bestScore = score; bestMoves = [{x, y}]; } else if (score === bestScore) bestMoves.push({x, y});
        }
      }
    }
    if (bestMoves.length > 0) move = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    else { window._gomokuForbiddenMove = null; aiGomokuMove(true); return; }
  }

  if (move) {
    window._gomokuForbiddenMove = null;
    makeGomokuMove(move.x, move.y, gomoku.aiColor, false);
  }
}

function evaluateGomokuPoint(x, y, color) {
  var score = 0, dirs = [[1,0], [0,1], [1,1], [1,-1]];
  for (var i = 0; i < 4; i++) {
    var count = 1, block1 = 0, block2 = 0;
    for (var j = 1; j < 5; j++) { var nx = x + dirs[i][0] * j, ny = y + dirs[i][1] * j; if (nx < 0 || nx >= 15 || ny < 0 || ny >= 15) { block1 = 1; break; } if (gomoku.board[ny][nx] === color) count++; else if (gomoku.board[ny][nx] === 0) break; else { block1 = 1; break; } }
    for (var j = 1; j < 5; j++) { var nx = x - dirs[i][0] * j, ny = y - dirs[i][1] * j; if (nx < 0 || nx >= 15 || ny < 0 || ny >= 15) { block2 = 1; break; } if (gomoku.board[ny][nx] === color) count++; else if (gomoku.board[ny][nx] === 0) break; else { block2 = 1; break; } }
    var blocks = block1 + block2;
    if (count >= 5) score += 10000000; 
    else if (count === 4) { if (blocks === 0) score += 1000000; else if (blocks === 1) score += 100000; }
    else if (count === 3) { if (blocks === 0) score += 8000; else if (blocks === 1) score += 1000; }
    else if (count === 2) { if (blocks === 0) score += 500; else if (blocks === 1) score += 100; }
    else if (count === 1) { if (blocks === 0) score += 10; }
  }
  return score;
}

function addGomokuChat(sender, text, senderId) { gomoku.chats.push({sender, text, senderId}); renderGomokuChats(); }

function renderGomokuChats() {
  var list = document.getElementById('gomokuChatList');
  if (!list) return;
  if (gomoku.chats.length === 0) {
    list.innerHTML = '<div style="text-align:center;font-size:12px;color:#bbb;margin-top:20px;">这里可以聊天，退出后自动清空</div>';
    return;
  }
  var userAvatar = state.profile.avatar || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='16' fill='%23e8e8ed'/%3E%3Ctext x='16' y='20' text-anchor='middle' fill='%2386868b' font-size='12'%3E👤%3C/text%3E%3C/svg%3E`;
  var defaultDreamAv = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='16' fill='%23ffe0e8'/%3E%3Ctext x='16' y='20' text-anchor='middle' fill='%23d6336c' font-size='12'%3E💜%3C/text%3E%3C/svg%3E`;

  list.innerHTML = gomoku.chats.map(function(c) {
    if (c.sender === 'system') return `<div style="text-align:center;font-size:11px;color:#999;margin:4px 0;">${c.text}</div>`;
    var isUser = c.sender === 'user';
    var avatar = userAvatar;
    if (!isUser) {
      if (gomoku.mode === 'spectate' && c.senderId) { var sd = state.dreams.find(x => x.id === c.senderId); avatar = sd && sd.avatar ? sd.avatar : defaultDreamAv; } 
      else { var d = state.dreams.find(x => x.id === gomoku.dreamId); avatar = d && d.avatar ? d.avatar : defaultDreamAv; }
    }
    return `<div style="display:flex; justify-content:${isUser ? 'flex-end' : 'flex-start'}; align-items:flex-start; gap:8px; margin-bottom:8px;">
        ${!isUser ? `<img src="${avatar}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0;">` : ''}
        <div style="max-width:70%; display:flex; flex-direction:column; align-items:${isUser ? 'flex-end' : 'flex-start'};">
          <div class="gomoku-chat-msg ${isUser ? 'user' : 'dream'}">${escapeHtml(c.text)}</div>
        </div>
        ${isUser ? `<img src="${avatar}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0;">` : ''}
      </div>`;
  }).join('');
  list.scrollTop = list.scrollHeight;
}

function sendGomokuChat() {
  if (!gomoku.dreamId && gomoku.mode !== 'spectate') return showToast('请先选择梦角');
  var input = document.getElementById('gomokuChatInput');
  var text = input.value.trim();
  if (!text) return;
  addGomokuChat('user', text); input.value = '';
  
  setTimeout(function() {
    var reply = '嗯嗯，专心下棋吧~', replySenderId = null, targetDreamId = null;
    if (gomoku.mode === 'spectate') {
      var match = state.gomokuAiMatches.find(m => m.id === gomoku.spectateMatchId);
      if (match) { if (Math.random() < 0.5) targetDreamId = match.p1Id; else targetDreamId = match.p2Id; replySenderId = targetDreamId; }
    } else targetDreamId = gomoku.dreamId;

    if (!targetDreamId) return;
    var usableCards = state.cards.filter(c => (c.dreamId || 'all') === 'all' || c.dreamId === targetDreamId);
    if (usableCards.length > 0) reply = usableCards[Math.floor(Math.random() * usableCards.length)].text;
    else { var gameReplies = ['该你啦！', '别发呆哦', '这局我要赢', '哎呀，好险', '嘿嘿，看招！']; reply = gameReplies[Math.floor(Math.random() * gameReplies.length)]; }
    addGomokuChat('dream', reply, replySenderId);
  }, 1000 + Math.random() * 1500);
}

function toggleGomokuDreamPicker(e) {
  if (e) e.stopPropagation();
  if (gomoku.active) return showToast('对局中不能换人哦');
  var dd = document.getElementById('gomokuDreamDropdown');
  var list = document.getElementById('gomokuDreamDropdownList');
  if (dd.style.display === 'none' || dd.style.display === '') {
    list.innerHTML = state.dreams.map(function(d) {
      var isActive = d.id === gomoku.dreamId;
      var avatarSrc = d.avatar || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Ccircle cx='18' cy='18' r='18' fill='%23dff0ff'/%3E%3Ctext x='18' y='23' text-anchor='middle' fill='%23007aff' font-size='14'%3E💜%3C/text%3E%3C/svg%3E`;
      return `<div onclick="selectGomokuDream('${d.id}', event)" style="display:flex; align-items:center; padding:12px; border-bottom:1px solid #e5e5ea; cursor:pointer; ${isActive ? 'background:#f5f5f7;' : ''}">
        <img src="${avatarSrc}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; margin-right:10px;">
        <div style="flex:1;"><div style="font-size:14px; font-weight:600; color:#1d1d1f;">${d.name}</div></div>
        ${isActive ? '<span style="color:var(--blue);">✓</span>' : ''}
      </div>`;
    }).join('');
    dd.style.display = 'block';
  }
}

function selectGomokuDream(id, e) { if (e) e.stopPropagation(); gomoku.dreamId = id; document.getElementById('gomokuDreamDropdown').style.display = 'none'; resetGomokuGame(); }

document.addEventListener('click', function(e) {
  var dd = document.getElementById('gomokuDreamDropdown');
  var sel = document.getElementById('gomokuDreamSelector');
  if (dd && dd.style.display === 'block' && sel && !sel.contains(e.target) && !dd.contains(e.target)) dd.style.display = 'none';
});

// ===== 五子棋历史记录 =====
function saveGomokuHistory(winner, reason) {
  // 如果没有开局时间，说明没开始下，不记录
  if (!gomoku.startTime) return;
  
  var dream = state.dreams.find(x => x.id === gomoku.dreamId);
  
  // 确保历史数组存在
  if (!state.gomokuHistory) state.gomokuHistory = [];
  
  state.gomokuHistory.push({
    id: 'gh_' + Date.now() + Math.random().toString(36).slice(2, 6),
    startTime: gomoku.startTime, 
    endTime: Date.now(),
    duration: Math.floor((Date.now() - gomoku.startTime) / 1000),
    dreamId: gomoku.dreamId, 
    dreamName: dream ? dream.name : '未知', 
    dreamAvatar: dream ? dream.avatar : '',
    userColor: gomoku.userColor, 
    winner: winner, 
    reason: reason
  });
  
  saveState(); 
  gomoku.startTime = null; 
}

function openGomokuHistory() { renderGomokuHistoryList(); navigateTo('pageGomokuHistory'); }

function renderGomokuHistoryList() {
  var container = document.getElementById('gomokuHistoryList');
  if (!container) return;
  if (!state.gomokuHistory || state.gomokuHistory.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:#999; padding:40px; font-size:14px;">还没有对弈记录哦</div>';
    return;
  }
  
  var sorted = state.gomokuHistory.slice().sort((a, b) => b.endTime - a.endTime);
  
  container.innerHTML = sorted.map(function(r) {
    var t = new Date(r.startTime), 
        timeStr = `${t.getMonth()+1}月${t.getDate()}日 ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
    var durationStr = r.duration > 60 ? `${Math.floor(r.duration/60)}分${r.duration%60}秒` : `${r.duration}秒`;
    
    // 判断是不是梦角对局
    var isAiMatch = (r.userColor === 0 || r.winner === 'ai'); 
    
    var titleStr = '', resultStr = '', resultColor = '', colorInfoStr = '';

    if (isAiMatch) {
      // 👇 兜底修复：如果名字是 undefined，就从原字符串里切，或者给默认值
      var p1Name = r.p1Name || (r.dreamName ? r.dreamName.split(' vs ')[0] : '梦角');
      var p2Name = r.p2Name || (r.dreamName ? r.dreamName.split(' vs ')[1] : '梦角');
      var p1Color = r.p1Color === 1 ? '黑' : (r.p1Color === 2 ? '白' : '黑');
      var p2Color = r.p2Color === 1 ? '黑' : (r.p2Color === 2 ? '白' : '白');

      titleStr = `${p1Name} vs ${p2Name}的对局`;
      if (r.winner === 'draw') {
        resultStr = '平局';
        resultColor = '#86868b';
      } else {
        resultStr = `${r.winnerName || '梦角'} 获胜`;
        resultColor = '#007aff'; 
      }
      colorInfoStr = `${p1Name}执${p1Color}，${p2Name}执${p2Color}`;
    } else {
      titleStr = `和 ${r.dreamName || '梦角'} 的对局`;
      if (r.winner === 'user') { 
        resultStr = r.reason === 'resign' ? '对方认输，你赢了' : '你赢了'; 
        resultColor = '#34c759'; 
      } else if (r.winner === 'dream') { 
        resultStr = r.reason === 'resign' ? '你认输了' : (r.dreamName || '梦角') + ' 赢了'; 
        resultColor = '#ff3b30'; 
      } else { 
        resultStr = '平局'; 
        resultColor = '#86868b'; 
      }
      colorInfoStr = `我执${r.userColor === 1 ? '黑' : '白'}，${r.dreamName || '梦角'}执${r.userColor === 1 ? '白' : '黑'}`;
    }

    // 👇 去掉了左侧头像，直接把文字撑满整个卡片，跟你的图1一模一样
    return `<div style="display:flex; flex-direction:column; gap:8px; padding:16px; background:#fff; border-radius:12px; margin-bottom:10px; border:1px solid #e5e5ea;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:15px; font-weight:600; color:#1d1d1f;">${titleStr}</span>
        <span style="font-size:13px; color:${resultColor}; font-weight:600;">${resultStr}</span>
      </div>
      <div style="font-size:12px; color:#86868b; display:flex; gap:12px;">
        <span>🕒 ${timeStr}</span>
        <span>⏱️ 耗时 ${durationStr}</span>
      </div>
      <div style="font-size:12px; color:#999;">
        ${colorInfoStr}
      </div>
    </div>`;
  }).join('');
}

// ===== 观战与 AI 后台对弈 =====
window._spectateSelectedIds = [];
function startSpectateMatch() {
  if (!state.dreams || state.dreams.length < 2) return showToast('至少需要两个梦角');
  var activeMatch = state.gomokuAiMatches.find(m => m.active);
  if (activeMatch) {
    if (confirm('当前有正在进行的梦角对局，是否直接进入观战？')) { enterSpectateMode(activeMatch.id); return; }
  }
  window._spectateSelectedIds = [];
  renderSpectateDreamPicker();
  document.getElementById('spectateDreamPickerModal').style.display = 'flex';
}

function renderSpectateDreamPicker() {
  var list = document.getElementById('spectateDreamPickerList');
  var btn = document.getElementById('spectateStartBtn');
  if (!list || !btn) return;
  list.innerHTML = state.dreams.map(function(d) {
    var isSelected = window._spectateSelectedIds.indexOf(d.id) > -1;
    var avatarSrc = d.avatar || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Ccircle cx='18' cy='18' r='18' fill='%23dff0ff'/%3E%3Ctext x='18' y='23' text-anchor='middle' fill='%23007aff' font-size='14'%3E💜%3C/text%3E%3C/svg%3E`;
    return `<div onclick="toggleSpectateDream('${d.id}')" style="display:flex; align-items:center; padding:12px; border-radius:12px; border:1px solid ${isSelected ? 'var(--blue)' : '#e5e5ea'}; background:${isSelected ? 'rgba(0,122,255,0.05)' : 'transparent'}; cursor:pointer; transition:all 0.2s;">
      <img src="${avatarSrc}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; margin-right:12px;">
      <span style="flex:1; font-size:15px; font-weight:${isSelected ? '600' : '400'}; color:#1d1d1f;">${d.name}</span>
      <div style="width:20px; height:20px; border-radius:50%; border:2px solid ${isSelected ? 'var(--blue)' : '#ccc'}; display:flex; justify-content:center; align-items:center; background:${isSelected ? 'var(--blue)' : 'transparent'};">
        ${isSelected ? '<span style="color:#fff; font-size:12px;">✓</span>' : ''}
      </div>
    </div>`;
  }).join('');
  if (window._spectateSelectedIds.length === 2) { btn.disabled = false; btn.style.opacity = '1'; }
  else { btn.disabled = true; btn.style.opacity = '0.5'; }
}

function toggleSpectateDream(id) {
  var idx = window._spectateSelectedIds.indexOf(id);
  if (idx > -1) window._spectateSelectedIds.splice(idx, 1);
  else { if (window._spectateSelectedIds.length >= 2) window._spectateSelectedIds.shift(); window._spectateSelectedIds.push(id); }
  renderSpectateDreamPicker();
}

function closeSpectateDreamPicker() { document.getElementById('spectateDreamPickerModal').style.display = 'none'; }

function confirmSpectateMatch() {
  if (window._spectateSelectedIds.length !== 2) return;
  var d1 = state.dreams.find(x => x.id === window._spectateSelectedIds[0]);
  var d2 = state.dreams.find(x => x.id === window._spectateSelectedIds[1]);
  if (!d1 || !d2) return showToast('梦角不存在');
  if (d1.id === d2.id) return showToast('不能选择同一个人');
  var isBusy = state.gomokuAiMatches && state.gomokuAiMatches.some(m => m.active && (m.p1Id === d1.id || m.p2Id === d1.id || m.p1Id === d2.id || m.p2Id === d2.id));
  if (isBusy) return showToast('其中一名梦角正在其他对局中');
  closeSpectateDreamPicker();
  createGomokuAiMatch(d1, d2, null);
}

function createGomokuAiMatch(d1, d2, triggerChatId) {
  var matchId = 'aimatch_' + Date.now();
  var match = {
    id: matchId, p1Id: d1.id, p1Name: d1.name, p1Color: Math.random() < 0.5 ? 1 : 2,
    p2Id: d2.id, p2Name: d2.name, p2Color: 0,
    board: Array(15).fill(0).map(() => Array(15).fill(0)),
    moves: [], active: true, startTime: Date.now(),
    triggerChatId: triggerChatId, turnColor: 1, p1UndoLeft: 3, p2UndoLeft: 3
  };
  match.p2Color = match.p1Color === 1 ? 2 : 1;
  state.gomokuAiMatches.push(match); saveState();
  if (!triggerChatId) enterSpectateMode(matchId);
  runAiMatchEngine(matchId);
}

function enterSpectateMode(matchId) {
  var match = state.gomokuAiMatches.find(m => m.id === matchId);
  if (!match) return showToast('对局已结束或不存在');
  
  gomoku.mode = 'spectate'; 
  gomoku.spectateMatchId = matchId;
  gomoku.board = match.board; 
  gomoku.currentTurn = match.turnColor;
  
  navigateTo('pageGomoku'); 
  updateGomokuUI();
  setTimeout(drawGomokuBoard, 50); 
  renderGomokuChats();

  // 👇 核心修复：如果你重新进入，且对局还没结束，手动重新启动思考引擎！
  if (match.active) {
    // 清理可能卡死的旧定时器
    if (window._aiMatchTimers[matchId]) {
      clearTimeout(window._aiMatchTimers[matchId]);
      delete window._aiMatchTimers[matchId];
    }
    // 重新启动
    setTimeout(() => {
      if (state.gomokuAiMatches.some(m => m.id === matchId && m.active)) {
        runAiMatchEngine(matchId);
      }
    }, 1000);
  }
}

function endGomokuAiMatch(match, winnerId) {
  match.active = false; match.endTime = Date.now(); match.winner = winnerId;
  match.duration = Math.floor((match.endTime - match.startTime) / 1000); saveState();
  var winnerName = winnerId === 'draw' ? '平局' : (winnerId === match.p1Id ? match.p1Name : match.p2Name);
  
  if (!state.gomokuHistory) state.gomokuHistory = [];
  
  state.gomokuHistory.push({
    id: match.id, 
    startTime: match.startTime, 
    endTime: match.endTime, 
    duration: match.duration,
    dreamName: match.p1Name + ' vs ' + match.p2Name, 
    userColor: 0, // 0 代表这是梦角对局
    winner: winnerId === 'draw' ? 'draw' : 'ai', 
    winnerName: winnerName, 
    reason: 'five',
    p1Name: match.p1Name,
    p2Name: match.p2Name,
    p1Color: match.p1Color,
    p2Color: match.p2Color
  });
  
  saveState();
  if (gomoku.mode === 'spectate' && gomoku.spectateMatchId === match.id) { 
    gomoku.board = match.board; 
    drawGomokuBoard(); 
    updateGomokuUI(); 
    showToast('对局结束：' + winnerName + ' 获胜'); 
  }
}

function checkGomokuWinBoard(board, x, y, color) {
  var dirs = [[1,0], [0,1], [1,1], [1,-1]];
  for (var i = 0; i < 4; i++) {
    var count = 1;
    for (var j = 1; j < 5; j++) { var nx = x + dirs[i][0] * j, ny = y + dirs[i][1] * j; if (nx >= 0 && nx < 15 && ny >= 0 && ny < 15 && board[ny][nx] === color) count++; else break; }
    for (var j = 1; j < 5; j++) { var nx = x - dirs[i][0] * j, ny = y - dirs[i][1] * j; if (nx >= 0 && nx < 15 && ny >= 0 && ny < 15 && board[ny][nx] === color) count++; else break; }
    if (count >= 5) return true;
  }
  return false;
}

// ================= 补齐防注入工具函数 =================
function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 修复聊天发送与渲染
function renderGomokuChats() {
  var list = document.getElementById('gomokuChatList');
  if (!list) return;
  if (gomoku.chats.length === 0) {
    list.innerHTML = '<div style="text-align:center;font-size:12px;color:#bbb;margin-top:20px;">这里可以聊天，退出后自动清空</div>';
    return;
  }
  var userAvatar = state.profile.avatar || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='16' fill='%23e8e8ed'/%3E%3Ctext x='16' y='20' text-anchor='middle' fill='%2386868b' font-size='12'%3E👤%3C/text%3E%3C/svg%3E`;
  var defaultDreamAv = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='16' fill='%23ffe0e8'/%3E%3Ctext x='16' y='20' text-anchor='middle' fill='%23d6336c' font-size='12'%3E💜%3C/text%3E%3C/svg%3E`;

  list.innerHTML = gomoku.chats.map(function(c) {
    if (c.sender === 'system') return `<div style="text-align:center;font-size:11px;color:#999;margin:4px 0;">${c.text}</div>`;
    var isUser = c.sender === 'user';
    var avatar = userAvatar;
    if (!isUser) {
      if (gomoku.mode === 'spectate' && c.senderId) { 
        var sd = state.dreams.find(x => x.id === c.senderId); 
        avatar = sd && sd.avatar ? sd.avatar : defaultDreamAv; 
      } else { 
        var d = state.dreams.find(x => x.id === gomoku.dreamId); 
        avatar = d && d.avatar ? d.avatar : defaultDreamAv; 
      }
    }
    return `<div style="display:flex; justify-content:${isUser ? 'flex-end' : 'flex-start'}; align-items:flex-start; gap:8px; margin-bottom:8px;">
        ${!isUser ? `<img src="${avatar}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0;">` : ''}
        <div style="max-width:70%; display:flex; flex-direction:column; align-items:${isUser ? 'flex-end' : 'flex-start'};">
          <!-- 移除了可能导致报错的 escapeHtml 依赖，直接显示文字 -->
          <div class="gomoku-chat-msg ${isUser ? 'user' : 'dream'}">${c.text || ''}</div>
        </div>
        ${isUser ? `<img src="${avatar}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0;">` : ''}
      </div>`;
  }).join('');
  list.scrollTop = list.scrollHeight;
}

// ================= 朋友圈核心逻辑 =================
if (!state.diaries) state.diaries = [];
window._diaryImages = []; // 临时存放待发布的图片

function renderDiaryCover() {
  if (!state.settings) state.settings = {};
  const cover = document.getElementById('diaryCover');
  if (cover) {
    if (state.settings.diaryCover) {
      cover.style.background = `url("${state.settings.diaryCover}") center/cover no-repeat`;
    } else {
      cover.style.background = 'linear-gradient(135deg, #a8c8e0, #7ec8e3)';
    }
  }
  document.getElementById('diaryCoverName').textContent = state.profile.name || '我';
  document.getElementById('diaryCoverStatus').textContent = state.profile.status || '';
  document.getElementById('diaryCoverAvatar').src = state.profile.avatar || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='76' height='76' viewBox='0 0 76 76'%3E%3Crect width='76' height='76' rx='12' fill='%23e8e8ed'/%3E%3Ctext x='38' y='44' text-anchor='middle' fill='%2386868b' font-size='28'%3E👤%3C/text%3E%3C/svg%3E`;
}

function changeDiaryCover() {
  document.getElementById('diaryCoverInput').click();
}

function handleDiaryCover(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    if (!state.settings) state.settings = {};
    state.settings.diaryCover = ev.target.result;
    saveState();
    renderDiaryCover();
    showToast('封面已更新');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function renderDiaryList() {
  const container = document.getElementById('diaryList');
  if (!container) return;
  if (state.diaries.length === 0) {
    container.innerHTML = '<div style="padding:60px 20px;text-align:center;color:#86868b;font-size:14px;">还没有朋友圈，点右上角 ✎ 写下第一篇吧</div>';
    return;
  }

  const sorted = state.diaries.slice().sort((a, b) => b.time - a.time);

  container.innerHTML = sorted.map(d => {
    const t = new Date(d.time);
    const timeStr = `${t.getMonth()+1}月${t.getDate()}日 ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
    
    let realAvatar = state.profile.avatar || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'%3E%3Ccircle cx='22' cy='22' r='22' fill='%23e8e8ed'/%3E%3Ctext x='22' y='27' text-anchor='middle' fill='%2386868b' font-size='18'%3E👤%3C/text%3E%3C/svg%3E`;
    if (d.authorId !== 'user') {
      const dreamObj = state.dreams.find(x => x.id === d.authorId);
      if (dreamObj && dreamObj.avatar) realAvatar = dreamObj.avatar;
      else realAvatar = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'%3E%3Ccircle cx='22' cy='22' r='22' fill='%23ffe0e8'/%3E%3Ctext x='22' y='27' text-anchor='middle' fill='%23d6336c' font-size='18'%3E💜%3C/text%3E%3C/svg%3E`;
    }

    let imagesHtml = '';
    if (d.images && d.images.length > 0) {
      if (d.images.length === 1) {
        imagesHtml = `<img src="${d.images[0]}" style="max-width:70%;max-height:200px;border-radius:8px;margin-top:8px;object-fit:cover;">`;
      } else {
        imagesHtml = '<div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:4px;margin-top:8px;max-width:75%;">';
        d.images.forEach(img => { imagesHtml += `<img src="${img}" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:4px;">`; });
        imagesHtml += '</div>';
      }
    }

    if (!d.likes) d.likes = [];
    const isLiked = d.likes.includes('user');
    const likeNames = d.likes.map(id => id === 'user' ? (state.profile.name || '我') : (state.dreams.find(x => x.id === id)?.name || '梦角'));

    let commentsHtml = '';
    if (d.comments && d.comments.length > 0) {
      commentsHtml = '<div style="margin-top:8px;border-top:1px solid #f0f0f5;padding-top:8px;">';
      d.comments.forEach(c => {
        const clickAttr = c.authorId !== 'user' ? `onclick="replyDiaryComment('${d.id}', '${c.id}')" style="cursor:pointer;"` : '';
        commentsHtml += `<div style="display:flex;gap:6px;margin-bottom:6px;" ${clickAttr}>
          <div style="flex:1;font-size:13px;line-height:1.5;word-break:break-word;">
            <span style="font-weight:600;color:#576b95;">${c.authorName}</span>
            ${c.replyToName ? `<span style="color:var(--gray);"> 回复 </span><span style="font-weight:600;color:#576b95;">${c.replyToName}</span>` : ''}
            <span style="color:var(--text);margin-left:4px;">：${escapeHtml(c.text)}</span>
          </div>
        </div>`;
      });
      commentsHtml += '</div>';
    }

    return `<div class="diary-item">
      <img class="diary-item-avatar" src="${realAvatar}">
      <div class="diary-item-body">
        <div class="diary-item-name">${d.authorName}</div>
        <div class="diary-item-content">${escapeHtml(d.text)}</div>
        ${imagesHtml}
        <div class="diary-item-tags"><span>🌤 ${d.weather}</span><span>💭 ${d.mood}</span></div>
        <div class="diary-item-foot">
          <span class="diary-item-time">${timeStr}</span>
          ${d.authorId === 'user' ? `<span class="diary-item-del" onclick="deleteDiary('${d.id}')">删除</span>` : ''}
        </div>
        <div style="display:flex;justify-content:flex-start;align-items:center;margin-top:6px;gap:12px;">
          <span onclick="toggleLikeDiary('${d.id}')" style="font-size:13px;color:${isLiked ? '#d6336c' : '#576b95'};cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
            ${isLiked ? '❤️ 取消' : '🤍 赞'}
          </span>
          <span onclick="openDiaryComment('${d.id}')" style="font-size:13px;color:#576b95;cursor:pointer;">💬 评论</span>
        </div>
        ${likeNames.length > 0 ? `<div style="background:#f7f7f7;padding:6px 10px;border-radius:6px;font-size:12px;color:#576b95;margin-top:8px;"><span style="color:#d6336c;margin-right:4px;">❤️</span> ${likeNames.join('，')}</div>` : ''}
        ${commentsHtml}
      </div>
    </div>`;
  }).join('');
}

function openWriteDiary() {
  window._diaryImages = [];
  document.getElementById('diaryText').value = '';
  renderDiaryImagePreviews();
  renderDiaryTags(); // 👈 初始化心情和天气标签
  navigateTo('pageWriteDiary');
}

function handleDiaryImageSelect(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  if (window._diaryImages.length + files.length > 9) return showToast('最多只能选 9 张');
  
  const promises = Array.from(files).map(file => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 800; let w = img.width, h = img.height;
        if (w > MAX) { h *= MAX / w; w = MAX; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }));

  Promise.all(promises).then(results => {
    results.forEach(base64 => { if (window._diaryImages.length < 9) window._diaryImages.push(base64); });
    renderDiaryImagePreviews();
  });
  e.target.value = '';
}

function renderDiaryImagePreviews() {
  const area = document.getElementById('diaryImagePreviewArea');
  if (!area) return;
  area.innerHTML = window._diaryImages.map((img, idx) => `
    <div style="position:relative; width:70px; height:70px; border-radius:8px; overflow:hidden;">
      <img src="${img}" style="width:100%;height:100%;object-fit:cover;">
      <span onclick="removeDiaryImage(${idx})" style="position:absolute; top:2px; right:2px; background:rgba(0,0,0,0.6); color:#fff; width:18px; height:18px; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:12px; cursor:pointer;">×</span>
    </div>
  `).join('');
  if (window._diaryImages.length < 9) {
    area.innerHTML += `<div onclick="document.getElementById('diaryImageInput').click()" style="width:70px; height:70px; background:#fff; border:1px dashed var(--border); border-radius:8px; display:flex; justify-content:center; align-items:center; font-size:24px; color:var(--gray); cursor:pointer;">+</div>`;
  }
}

function removeDiaryImage(idx) {
  window._diaryImages.splice(idx, 1);
  renderDiaryImagePreviews();
}

function saveUserDiary() {
  const text = document.getElementById('diaryText').value.trim();
  if (!text && window._diaryImages.length === 0) return showToast('写点什么或加张图吧');
  
  if (!state.diaries) state.diaries = [];
  state.diaries.push({
    id: 'diary_' + Date.now(),
    authorId: 'user',
    authorName: state.profile.name || '我',
    authorAvatar: state.profile.avatar || '',
    text: text,
    images: window._diaryImages.slice(),
    likes: [],
    mood: pickedMood,       // 👈 使用选中的心情
    weather: pickedWeather, // 👈 使用选中的天气
    time: Date.now(),
    comments: []
  });
  saveState();
  showToast('发布成功');
  navigateTo('pageScrapbook');
  renderDiaryList();
}

function toggleLikeDiary(diaryId) {
  const d = state.diaries.find(x => x.id === diaryId);
  if (!d) return;
  if (!d.likes) d.likes = [];
  
  const idx = d.likes.indexOf('user');
  if (idx > -1) d.likes.splice(idx, 1);
  else {
    d.likes.push('user');
    triggerAiLike(diaryId); // 触发梦角点赞
  }
  saveState();
  renderDiaryList();
}

function triggerAiLike(diaryId) {
  if (!state.dreams || state.dreams.length === 0) return;
  const dream = state.dreams[Math.floor(Math.random() * state.dreams.length)];
  setTimeout(() => {
    const d = state.diaries.find(x => x.id === diaryId);
    if (d && d.likes && !d.likes.includes(dream.id)) {
      d.likes.push(dream.id);
      saveState();
      if (document.getElementById('pageScrapbook').classList.contains('active')) renderDiaryList();
    }
  }, 1500 + Math.random() * 2000);
}

function openDiaryComment(diaryId) {
  const text = prompt('写下你的评论：');
  if (!text || !text.trim()) return;
  const d = state.diaries.find(x => x.id === diaryId);
  if (!d) return;
  if (!d.comments) d.comments = [];
  
  d.comments.push({
    id: 'cmt_' + Date.now(),
    authorId: 'user',
    authorName: state.profile.name || '我',
    text: text.trim(),
    time: Date.now()
  });
  saveState();
  renderDiaryList();
  showToast('评论已发布');

  // 触发AI回复
  setTimeout(() => triggerAiComment(diaryId), 2000 + Math.random() * 3000);
}

function replyDiaryComment(diaryId, commentId) {
  const d = state.diaries.find(x => x.id === diaryId);
  if (!d || !d.comments) return;
  const target = d.comments.find(c => c.id === commentId);
  if (!target) return;

  const text = prompt(`回复 ${target.authorName}：`);
  if (!text || !text.trim()) return;

  d.comments.push({
    id: 'cmt_' + Date.now() + Math.random().toString(36).slice(2,6),
    authorId: 'user',
    authorName: state.profile.name || '我',
    text: text.trim(),
    time: Date.now(),
    replyToName: target.authorName
  });
  saveState();
  renderDiaryList();
  showToast('回复成功');
}

function triggerAiComment(diaryId) {
  const d = state.diaries.find(x => x.id === diaryId);
  if (!d) return;
  if (!state.dreams || state.dreams.length === 0) return;
  if (!state.cards || state.cards.length === 0) return;

  const dream = state.dreams[Math.floor(Math.random() * state.dreams.length)];
  if (!d.comments) d.comments = [];
  
  const usableCards = state.cards.filter(c => (c.dreamId || 'all') === 'all' || c.dreamId === dream.id);
  const text = usableCards.length > 0 ? usableCards[Math.floor(Math.random() * usableCards.length)].text : '……';

  d.comments.push({
    id: 'cmt_' + Date.now() + Math.random().toString(36).slice(2,6),
    authorId: dream.id,
    authorName: dream.name,
    text: text,
    time: Date.now()
  });
  saveState();
  if (document.getElementById('pageScrapbook').classList.contains('active')) renderDiaryList();
}

function deleteDiary(id) {
  if (!confirm('确定删除这篇朋友圈吗？')) return;
  state.diaries = state.diaries.filter(d => d.id !== id);
  saveState();
  renderDiaryList();
}

// ================= 梦角自动发朋友圈 =================
function checkAutoDiary() {
  if (!state.dreams || state.dreams.length === 0) return;
  if (!state.diaries) state.diaries = [];

  state.dreams.forEach(dream => {
    // 6小时内最多发一次
    const lastPost = state.diaries.filter(d => d.authorId === dream.id).sort((a,b) => b.time - a.time)[0];
    if (lastPost && Date.now() - lastPost.time < 6 * 60 * 60 * 1000) return;
    if (Math.random() > 0.3) return; // 30% 概率发

    const usableCards = state.cards.filter(c => (c.dreamId || 'all') === 'all' || c.dreamId === dream.id);
    if (usableCards.length === 0) return;
    
    const count = 2 + Math.floor(Math.random() * 4);
    const text = [...usableCards].sort(() => Math.random() - 0.5).slice(0, count).map(c => c.text).join('\n');

    state.diaries.push({
      id: 'diary_' + Date.now() + Math.random().toString(36).slice(2,6),
      authorId: dream.id,
      authorName: dream.name,
      text: text,
      images: [],
      likes: [], mood: '开心', weather: '晴朗',
      time: Date.now(),
      comments: []
    });
    saveState();
    if (document.getElementById('pageScrapbook').classList.contains('active')) renderDiaryList();
  });
}

setInterval(checkAutoDiary, 10 * 60 * 1000); // 每10分钟检查一次
setTimeout(checkAutoDiary, 5000); // 启动5秒后查一次

// ================= 心情与天气标签 =================
const WEATHERS = ['晴朗', '多云', '阴天', '小雨', '中雨', '大雨', '暴雨', '小雪', '中雪', '大雪', '暴雪', '雾霾', '大风', '冰雹', '彩虹'];
const MOODS = ['开心', '难过', '生气', '平静', '冷静', '无聊', '焦虑', '兴奋', '害羞', '期待', '疲惫', '感动', '心慌', '幸福', '孤单'];

let pickedMood = '开心';
let pickedWeather = '晴朗';

function renderDiaryTags() {
  const moodBox = document.getElementById('moodTags');
  const weatherBox = document.getElementById('weatherTags');
  
  if (moodBox) {
    moodBox.innerHTML = MOODS.map(m => {
      const isActive = m === pickedMood;
      return `<span onclick="pickMood('${m}')" style="flex-shrink:0;font-size:13px;padding:6px 14px;border-radius:16px;cursor:pointer;background:${isActive ? 'var(--blue)' : '#fff'};color:${isActive ? '#fff' : '#1d1d1f'};border:1px solid var(--border);transition:all 0.15s;">${m}</span>`;
    }).join('');
  }
  
  if (weatherBox) {
    weatherBox.innerHTML = WEATHERS.map(w => {
      const isActive = w === pickedWeather;
      return `<span onclick="pickWeather('${w}')" style="flex-shrink:0;font-size:13px;padding:6px 14px;border-radius:16px;cursor:pointer;background:${isActive ? 'var(--blue)' : '#fff'};color:${isActive ? '#fff' : '#1d1d1f'};border:1px solid var(--border);transition:all 0.15s;">${w}</span>`;
    }).join('');
  }
}

function pickMood(m) {
  pickedMood = m;
  renderDiaryTags();
}

function pickWeather(w) {
  pickedWeather = w;
  renderDiaryTags();
}

// ================= 梦角主动评论朋友圈 =================
function checkAutoCommentOnDiary() {
  if (!state.diaries || state.diaries.length === 0) return;
  if (!state.dreams || state.dreams.length === 0) return;
  if (!state.cards || state.cards.length === 0) return;

  // 只有 15% 概率触发，避免刷屏
  if (Math.random() > 0.15) return;

  // 找最近5条朋友圈
  const recent = state.diaries.slice().sort((a, b) => b.time - a.time).slice(0, 5);
  const diary = recent[Math.floor(Math.random() * recent.length)];
  const dream = state.dreams[Math.floor(Math.random() * state.dreams.length)];

  // 如果这个梦角已经评论过了，就不评了
  if (diary.comments && diary.comments.some(c => c.authorId === dream.id)) return;

  const usableCards = state.cards.filter(c => (c.dreamId || 'all') === 'all' || c.dreamId === dream.id);
  if (usableCards.length === 0) return;
  const text = usableCards[Math.floor(Math.random() * usableCards.length)].text;

  if (!diary.comments) diary.comments = [];
  diary.comments.push({
    id: 'cmt_' + Date.now(),
    authorId: dream.id,
    authorName: dream.name,
    text: text,
    time: Date.now()
  });
  saveState();
  
  if (document.getElementById('pageScrapbook').classList.contains('active')) {
    renderDiaryList();
  }
}
setInterval(checkAutoCommentOnDiary, 10 * 60 * 1000); // 每10分钟检查一次

// ================= 梦角自动发起对局与战报 =================
function startRandomAiMatch() {
  if (!state.dreams || state.dreams.length < 2) return;
  if (state.gomokuAiMatches && state.gomokuAiMatches.some(m => m.active)) return; // 已有对局在进行
  if (Math.random() > 0.05) return; // 每分钟 5% 触发率，差不多 20 分钟一场

  const d1 = state.dreams[Math.floor(Math.random() * state.dreams.length)];
  const d2 = state.dreams.filter(d => d.id !== d1.id)[Math.floor(Math.random() * (state.dreams.length - 1))];

  createGomokuAiMatch(d1, d2, d1.id);
}

// 修改 createGomokuAiMatch（发送邀请卡片）
function createGomokuAiMatch(d1, d2, triggerChatId) {
  if (!state.gomokuAiMatches) state.gomokuAiMatches = [];
  var matchId = 'aimatch_' + Date.now();
  var match = {
    id: matchId, p1Id: d1.id, p1Name: d1.name, p1Color: Math.random() < 0.5 ? 1 : 2,
    p2Id: d2.id, p2Name: d2.name, p2Color: 0,
    board: Array(15).fill(0).map(() => Array(15).fill(0)),
    moves: [], active: true, startTime: Date.now(),
    triggerChatId: triggerChatId, turnColor: 1, p1UndoLeft: 3, p2UndoLeft: 3
  };
  match.p2Color = match.p1Color === 1 ? 2 : 1;
  state.gomokuAiMatches.push(match); saveState();
  
  if (!triggerChatId) {
    enterSpectateMode(matchId);
  } else {
    // 👇 发邀请卡片到聊天界面
    if (!state.chatSessions[triggerChatId]) state.chatSessions[triggerChatId] = [];
    state.chatSessions[triggerChatId].push({
      from: 'dream', senderId: d1.id, type: 'gomoku_invite', matchId: matchId,
      p1Name: d1.name, p2Name: d2.name, time: Date.now()
    });
    saveState();
    if (state.currentChatId === triggerChatId) renderChatMessages();
  }
  
  runAiMatchEngine(matchId);
}

// 修改 endGomokuAiMatch（发送战报卡片）
function endGomokuAiMatch(match, winnerId) {
  match.active = false; match.endTime = Date.now(); match.winner = winnerId;
  match.duration = Math.floor((match.endTime - match.startTime) / 1000); saveState();
  var winnerName = winnerId === 'draw' ? '平局' : (winnerId === match.p1Id ? match.p1Name : match.p2Name);
  
  if (!state.gomokuHistory) state.gomokuHistory = [];
  state.gomokuHistory.push({
    id: match.id, startTime: match.startTime, endTime: match.endTime, duration: match.duration,
    dreamName: match.p1Name + ' vs ' + match.p2Name, userColor: 0,
    winner: winnerId === 'draw' ? 'draw' : 'ai', winnerName: winnerName, reason: 'five',
    p1Name: match.p1Name, p2Name: match.p2Name, p1Color: match.p1Color, p2Color: match.p2Color
  });
  saveState();

  // 👇 发战报卡片到聊天界面
  if (match.triggerChatId) {
    if (!state.chatSessions[match.triggerChatId]) state.chatSessions[match.triggerChatId] = [];
    state.chatSessions[match.triggerChatId].push({
      from: 'dream', senderId: match.p1Id, type: 'gomoku_result', matchId: match.id,
      p1Name: match.p1Name, p2Name: match.p2Name, p1Color: match.p1Color, p2Color: match.p2Color,
      winnerName: winnerName, time: Date.now()
    });
    saveState();
    if (state.currentChatId === match.triggerChatId) renderChatMessages();
  }

  if (gomoku.mode === 'spectate' && gomoku.spectateMatchId === match.id) {
    gomoku.board = match.board; drawGomokuBoard(); updateGomokuUI(); showToast('对局结束：' + winnerName + ' 获胜');
  }
}

// 开启定时器
setInterval(startRandomAiMatch, 60 * 1000);

// 启动（确保在最后调用）
loadState();
