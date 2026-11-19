// story.js — حكاية عم منصور وريما
// يُحمَّل بعد السكربت الرئيسي في index.html مباشرة.

// ===== بيانات الحكاية: أضف ذكرى جديدة بسطر واحد =====
const STORY = {
    1: {
        toyImg: 'train.png',
        memImg: 'memory-train.png',
        title: 'ذكرى من الماضي',
        text: 'صنع عم منصور هذا القطار لطفل صغير منذ سنوات طويلة... واليوم عادت إليه ذكرى جميلة.',
        line: 'لقد أعاد القطار ذكرى جميلة إلى قلب عم منصور ❤️'
    }
    // مثال:
    // 5: { toyImg: 'ship.png', memImg: 'memory-ship.png', title: '...', text: '...', line: '...' }
};

// ===== حفظ الذكريات التي شوهدت =====
const MEMORY_KEY = 'toymaker_memories';
let pendingMemoryLevel = null;
const badToyImgs = new Set();

function getSeenMemories() {
    try { return JSON.parse(localStorage.getItem(MEMORY_KEY) || '[]'); }
    catch (e) { return []; }
}

function markMemorySeen(lvl) {
    const seen = getSeenMemories();
    if (!seen.includes(lvl)) {
        seen.push(lvl);
        try { localStorage.setItem(MEMORY_KEY, JSON.stringify(seen)); } catch (e) {}
    }
}

function fillMemoryCard(story) {
    const img = document.getElementById('memory-image');
    if (img.getAttribute('src') !== story.memImg) {
        img.style.display = '';
        img.onerror = () => { img.style.display = 'none'; };
        img.src = story.memImg;
    }
    document.getElementById('memory-title').textContent = story.title;
    document.getElementById('memory-text').textContent = story.text;
}

// ===== معاينة اللعبة المصغّرة من جدول الحكاية =====
window.updateToyPreview = function (pct) {
    const preview = document.getElementById('toy-preview');
    const story = STORY[gameLogic.levelNum];

    if (story && story.toyImg && !badToyImgs.has(story.toyImg)) {
        let image = document.getElementById('toy-image');
        if (!image) {
            image = document.createElement('img');
            image.id = 'toy-image';
            preview.replaceChildren(image);
        }
        if (image.getAttribute('src') !== story.toyImg) image.src = story.toyImg;
        image.alt = gameLogic.toyName;
        image.onerror = () => {
            badToyImgs.add(story.toyImg);
            preview.textContent = extractToyEmoji(gameLogic.toyName);
        };
        image.style.filter = `grayscale(${100 - pct}%) opacity(${0.35 + (pct / 100) * 0.65})`;
    } else {
        preview.textContent = extractToyEmoji(gameLogic.toyName);
    }
    preview.style.boxShadow = pct === 100 ? '0 0 14px #2ecc71' : 'none';
};

// ===== شاشة الفوز: الذكرى تظهر أول مرة فقط =====
WorkshopScene.prototype.checkGameEnd = function () {
    const overlay = document.getElementById('overlay');
    const msg = document.getElementById('overlay-msg');
    const starsEl = document.getElementById('overlay-stars');
    const subEl = document.getElementById('overlay-sub');
    const btn = document.getElementById('overlay-btn');
    const memoryCard = document.getElementById('memory-card');

    if (gameLogic.status === 'win') {
        const lvl = gameLogic.levelNum;
        const story = STORY[lvl];
        msg.textContent = `🎉 اكتمل ${gameLogic.toyName}`;
        msg.style.color = '#f1c40f';
        const earned = gameLogic.lastEarnedStars || 1;
        starsEl.textContent = '⭐'.repeat(earned) + '☆'.repeat(3 - earned);

        const showMemory = !!story && (pendingMemoryLevel === lvl || !getSeenMemories().includes(lvl));
        if (showMemory) {
            pendingMemoryLevel = lvl;
            fillMemoryCard(story);
            memoryCard.style.display = 'block';
            subEl.textContent = story.line;
        } else {
            memoryCard.style.display = 'none';
            subEl.textContent = `أكملته في ${gameLogic.movesCount} حركة`;
        }
        btn.textContent = 'المستوى التالي ➡️';
        btn.onclick = uiNextLevel;

        setTimeout(() => {
            if (gameLogic.status === 'win') {
                gameLogic.saveWinProgress();
                if (pendingMemoryLevel === lvl) markMemorySeen(lvl);
                overlay.style.display = 'flex';
            }
        }, 550);

        if (!this.winTriggered) {
            this.winTriggered = true;
            sfx.win();
            this.playWinParticles();
        }
    } else if (gameLogic.status === 'lose') {
        memoryCard.style.display = 'none';
        msg.textContent = '❌ لا توجد حركات!';
        msg.style.color = '#e74c3c';
        starsEl.textContent = '';
        subEl.textContent = 'جرّب التراجع أو إعادة المستوى';
        btn.textContent = 'إعادة المستوى 🔄';
        btn.onclick = uiRestart;
        overlay.style.display = 'flex';
    }
};

// تصفير حالة الذكرى المعلّقة عند الانتقال/الإعادة
['uiRestart', 'uiNextLevel', 'selectLevelFromMap'].forEach(name => {
    const original = window[name];
    window[name] = function (...args) {
        pendingMemoryLevel = null;
        return original.apply(this, args);
    };
});

// ===== ألبوم الذكريات =====
function openAlbum() {
    sfx.select();
    const seen = getSeenMemories();
    const list = document.getElementById('album-list');
    list.innerHTML = '';

    Object.keys(STORY).map(Number).sort((a, b) => a - b).forEach(lvl => {
        const s = STORY[lvl];
        const item = document.createElement('div');
        if (seen.includes(lvl)) {
            item.className = 'album-item';
            item.innerHTML =
                `<img src="${s.memImg}" alt="" onerror="this.style.display='none'">` +
                `<div class="album-title">${s.title} · المستوى ${lvl}</div><p>${s.text}</p>`;
        } else {
            item.className = 'album-item locked';
            item.innerHTML =
                `<div class="album-lock">🔒</div><div class="album-title">ذكرى مخفية</div>` +
                `<p>أكمل المستوى ${lvl} لتكشفها</p>`;
        }
        list.appendChild(item);
    });
    document.getElementById('album-modal').style.display = 'flex';
}

function closeAlbum() {
    sfx.select();
    document.getElementById('album-modal').style.display = 'none';
}

(function setupAlbum() {
    const style = document.createElement('style');
    style.textContent = `
        #game-container canvas { max-width: none; max-height: none; object-fit: fill; }
        #album-modal {
            position: fixed; inset: 0; background: rgba(18, 11, 7, 0.97);
            display: none; flex-direction: column; align-items: center;
            padding: 16px 14px; z-index: 55; overflow-y: auto;
        }
        #album-list { width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: 14px; padding-bottom: 24px; }
        .album-item {
            background: linear-gradient(145deg, #56351f, #29190f);
            border: 2px solid #bd874b; border-radius: 16px; padding: 10px; text-align: center;
        }
        .album-item img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 10px; display: block; }
        .album-title { color: #f9d77e; font-size: 16px; font-weight: bold; margin-top: 8px; }
        .album-item p { color: #f5e6cc; font-size: 13px; line-height: 1.7; margin: 6px 4px 2px; }
        .album-item.locked { opacity: 0.55; border-color: #555; }
        .album-lock { font-size: 30px; padding: 10px 0 0; }
    `;
    document.head.appendChild(style);

    document.body.insertAdjacentHTML('beforeend', `
        <div id="album-modal">
            <div class="map-header">
                <h2>📖 ألبوم الذكريات</h2>
                <button class="btn btn-red" style="flex:none; padding: 8px 14px;" onclick="closeAlbum()">✖ إغلاق</button>
            </div>
            <div id="album-list"></div>
        </div>`);

    const header = document.querySelector('#map-modal .map-header');
    const closeBtn = header.querySelector('button');
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex; gap:6px;';
    const albumBtn = document.createElement('button');
    albumBtn.className = 'btn btn-blue';
    albumBtn.style.cssText = 'flex:none; padding: 8px 12px;';
    albumBtn.textContent = '📖 الذكريات';
    albumBtn.onclick = openAlbum;
    header.appendChild(actions);
    actions.append(albumBtn, closeBtn);
})();
