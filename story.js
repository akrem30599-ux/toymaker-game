// story.js — حكاية عم منصور وريما
// يُحمَّل بعد السكربت الرئيسي في index.html مباشرة.

// ======================================
// 1. بيانات الحكاية والذكريات
// ======================================

const STORY = {
    1: {
        toyImg: 'train.png?v=2',
        memImg: 'memory-train.gif?v=1',

        title: 'ذكرى من الماضي',
        text: 'صنع عم منصور هذا القطار لطفل صغير منذ سنوات طويلة... واليوم عادت إليه ذكرى جميلة.',
        line: 'لقد أعاد القطار ذكرى جميلة إلى قلب عم منصور ❤️'
    }

    // لإضافة ذكرى جديدة، أضف مستوى جديداً:
    // 2: {
    //     toyImg: 'musicbox.png',
    //     memImg: 'memory-musicbox.png',
    //     title: 'ذكرى صندوق الموسيقى',
    //     text: '...',
    //     line: '...'
    // }
};

// ======================================
// 2. حفظ الذكريات
// ======================================

const MEMORY_KEY = 'toymaker_memories_v2';

let pendingMemoryLevel = null;

const badToyImgs = new Set();
const badMemoryImgs = new Set();

function getSeenMemories() {
    try {
        const data = JSON.parse(
            localStorage.getItem(MEMORY_KEY) || '[]'
        );

        return Array.isArray(data) ? data : [];
    } catch (e) {
        return [];
    }
}

function markMemorySeen(level) {
    const seen = getSeenMemories();

    if (!seen.includes(level)) {
        seen.push(level);

        try {
            localStorage.setItem(
                MEMORY_KEY,
                JSON.stringify(seen)
            );
        } catch (e) {
            console.warn('تعذر حفظ الذكرى:', e);
        }
    }
}

// ======================================
// 3. عرض بطاقة الذكرى
// ======================================

function fillMemoryCard(story) {
    const img = document.getElementById('memory-image');
    const title = document.getElementById('memory-title');
    const text = document.getElementById('memory-text');

    if (title) {
        title.textContent = story.title || '';
    }

    if (text) {
        text.textContent = story.text || '';
    }

    if (img) {
        img.style.display = 'block';

        if (badMemoryImgs.has(story.memImg)) {
            img.style.display = 'none';
        } else {
            img.onerror = function () {
                badMemoryImgs.add(story.memImg);
                this.style.display = 'none';
            };

            if (img.getAttribute('src') !== story.memImg) {
                img.src = story.memImg;
            }
        }
    }
}

// ======================================
// 4. معاينة اللعبة المصغرة
// ======================================

window.updateToyPreview = function (pct) {
    const preview = document.getElementById('toy-preview');

    if (!preview || typeof gameLogic === 'undefined') {
        return;
    }

    pct = Math.max(0, Math.min(100, Number(pct) || 0));

    const story = STORY[gameLogic.levelNum];

    if (story && story.toyImg && !badToyImgs.has(story.toyImg)) {

        let image = document.getElementById('toy-image');

        if (!image) {
            image = document.createElement('img');
            image.id = 'toy-image';
            preview.replaceChildren(image);
        }

        if (image.getAttribute('src') !== story.toyImg) {
            image.src = story.toyImg;
        }

        image.alt = gameLogic.toyName || 'اللعبة';

        image.onerror = function () {
            badToyImgs.add(story.toyImg);
            preview.textContent =
                typeof extractToyEmoji === 'function'
                    ? extractToyEmoji(gameLogic.toyName)
                    : '🧸';
        };

        image.style.filter =
            `grayscale(${100 - pct}%) opacity(${0.35 + (pct / 100) * 0.65})`;

    } else {
        preview.textContent =
            typeof extractToyEmoji === 'function'
                ? extractToyEmoji(gameLogic.toyName)
                : '🧸';
    }

    preview.style.boxShadow =
        pct === 100 ? '0 0 14px #2ecc71' : 'none';
};

// ======================================
// 5. شاشة الفوز والخسارة
// ======================================

WorkshopScene.prototype.checkGameEnd = function () {

    const overlay = document.getElementById('overlay');
    const msg = document.getElementById('overlay-msg');
    const starsEl = document.getElementById('overlay-stars');
    const subEl = document.getElementById('overlay-sub');
    const btn = document.getElementById('overlay-btn');
    const memoryCard = document.getElementById('memory-card');

    if (!overlay || !msg || !starsEl || !subEl || !btn) {
        return;
    }

    // إعادة ضبط حالة الفوز عندما لا تكون اللعبة فائزة
    if (gameLogic.status !== 'win') {
        this.winTriggered = false;

        if (this.winOverlayTimer) {
            clearTimeout(this.winOverlayTimer);
            this.winOverlayTimer = null;
        }
    }

    // ----------------------------------
    // حالة الفوز
    // ----------------------------------

    if (gameLogic.status === 'win') {

        const lvl = gameLogic.levelNum;
        const story = STORY[lvl];

        msg.textContent = `🎉 اكتمل ${gameLogic.toyName}`;
        msg.style.color = '#f1c40f';

        const earned = Math.max(
            1,
            Math.min(3, gameLogic.lastEarnedStars || 1)
        );

        starsEl.textContent =
            '⭐'.repeat(earned) + '☆'.repeat(3 - earned);

        const showMemory =
            !!story &&
            (
                pendingMemoryLevel === lvl ||
                !getSeenMemories().includes(lvl)
            );

        if (showMemory) {

            pendingMemoryLevel = lvl;

            if (memoryCard) {
                fillMemoryCard(story);
                memoryCard.style.display = 'block';
            }

            subEl.textContent = story.line || '';

        } else {

            if (memoryCard) {
                memoryCard.style.display = 'none';
            }

            subEl.textContent =
                `أكملته في ${gameLogic.movesCount} حركة`;
        }

        btn.textContent = 'المستوى التالي ➡️';
        btn.onclick = uiNextLevel;

        // لا نكرر مؤقت إظهار شاشة الفوز
        if (!this.winOverlayTimer) {

            this.winOverlayTimer = setTimeout(() => {

                this.winOverlayTimer = null;

                // التأكد أن اللاعب ما زال في المستوى نفسه
                if (
                    gameLogic.status === 'win' &&
                    gameLogic.levelNum === lvl
                ) {

                    gameLogic.saveWinProgress();

                    if (pendingMemoryLevel === lvl) {
                        markMemorySeen(lvl);
                    }

                    overlay.style.display = 'flex';
                }

            }, 550);
        }

        // تشغيل مؤثر الفوز مرة واحدة فقط
        if (!this.winTriggered) {

            this.winTriggered = true;

            if (typeof sfx !== 'undefined' && sfx.win) {
                sfx.win();
            }

            if (typeof this.playWinParticles === 'function') {
                this.playWinParticles();
            }
        }
    }

    // ----------------------------------
    // حالة الخسارة
    // ----------------------------------

    else if (gameLogic.status === 'lose') {

        if (memoryCard) {
            memoryCard.style.display = 'none';
        }

        msg.textContent = '❌ لا توجد حركات!';
        msg.style.color = '#e74c3c';

        starsEl.textContent = '';

        subEl.textContent =
            'جرّب التراجع أو إعادة المستوى';

        btn.textContent = 'إعادة المستوى 🔄';
        btn.onclick = uiRestart;

        overlay.style.display = 'flex';
    }
};

// ======================================
// 6. تصفير حالة الذكرى عند الانتقال
// ======================================

[
    'uiRestart',
    'uiNextLevel',
    'selectLevelFromMap'
].forEach(name => {

    const original = window[name];

    if (typeof original !== 'function') {
        return;
    }

    window[name] = function (...args) {

        pendingMemoryLevel = null;

        return original.apply(this, args);
    };
});

// ======================================
// 7. ألبوم الذكريات
// ======================================

function openAlbum() {

    if (typeof sfx !== 'undefined' && sfx.select) {
        sfx.select();
    }

    const modal = document.getElementById('album-modal');
    const list = document.getElementById('album-list');

    if (!modal || !list) {
        return;
    }

    const seen = getSeenMemories();

    list.replaceChildren();

    Object.keys(STORY)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach(lvl => {

            const story = STORY[lvl];

            const item = document.createElement('div');

            if (seen.includes(lvl)) {

                item.className = 'album-item';

                const img = document.createElement('img');
                img.alt = story.title || 'ذكرى';

                if (badMemoryImgs.has(story.memImg)) {
                    img.style.display = 'none';
                } else {
                    img.src = story.memImg;

                    img.onerror = function () {
                        badMemoryImgs.add(story.memImg);
                        this.style.display = 'none';
                    };
                }

                const title = document.createElement('div');
                title.className = 'album-title';
                title.textContent =
                    `${story.title} · المستوى ${lvl}`;

                const paragraph = document.createElement('p');
                paragraph.textContent = story.text || '';

                item.append(img, title, paragraph);

            } else {

                item.className = 'album-item locked';

                const lock = document.createElement('div');
                lock.className = 'album-lock';
                lock.textContent = '🔒';

                const title = document.createElement('div');
                title.className = 'album-title';
                title.textContent = 'ذكرى مخفية';

                const paragraph = document.createElement('p');
                paragraph.textContent =
                    `أكمل المستوى ${lvl} لتكشفها`;

                item.append(lock, title, paragraph);
            }

            list.appendChild(item);
        });

    modal.style.display = 'flex';
}

function closeAlbum() {

    if (typeof sfx !== 'undefined' && sfx.select) {
        sfx.select();
    }

    const modal = document.getElementById('album-modal');

    if (modal) {
        modal.style.display = 'none';
    }
}

// ======================================
// 8. إنشاء ألبوم الذكريات وأزراره
// ======================================

(function setupAlbum() {

    // منع إنشاء الألبوم مرتين
    if (document.getElementById('album-modal')) {
        return;
    }

    // CSS
    const style = document.createElement('style');

    style.textContent = `
        #game-container canvas {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }

        #album-modal {
            position: fixed;
            inset: 0;
            background: rgba(18, 11, 7, 0.97);
            display: none;
            flex-direction: column;
            align-items: center;
            padding: 16px 14px;
            z-index: 55;
            overflow-y: auto;
            box-sizing: border-box;
        }

        #album-list {
            width: 100%;
            max-width: 360px;
            display: flex;
            flex-direction: column;
            gap: 14px;
            padding-bottom: 24px;
        }

        .album-item {
            background: linear-gradient(145deg, #56351f, #29190f);
            border: 2px solid #bd874b;
            border-radius: 16px;
            padding: 10px;
            text-align: center;
            box-sizing: border-box;
        }

        .album-item img {
            width: 100%;
            aspect-ratio: 16 / 9;
            object-fit: cover;
            border-radius: 10px;
            display: block;
        }

        .album-title {
            color: #f9d77e;
            font-size: 16px;
            font-weight: bold;
            margin-top: 8px;
        }

        .album-item p {
            color: #f5e6cc;
            font-size: 13px;
            line-height: 1.7;
            margin: 6px 4px 2px;
        }

        .album-item.locked {
            opacity: 0.55;
            border-color: #555;
        }

        .album-lock {
            font-size: 30px;
            padding: 10px 0 0;
        }
    `;

    document.head.appendChild(style);

    // إنشاء نافذة الألبوم
    document.body.insertAdjacentHTML('beforeend', `
        <div id="album-modal">
            <div class="map-header">
                <h2>📖 ألبوم الذكريات</h2>
                <button
                    class="btn btn-red"
                    style="flex:none; padding:8px 14px;"
                    onclick="closeAlbum()">
                    ✖ إغلاق
                </button>
            </div>

            <div id="album-list"></div>
        </div>
    `);

    // إضافة زر الألبوم إلى نافذة الخريطة
    const header = document.querySelector(
        '#map-modal .map-header'
    );

    if (!header) {
        console.warn('لم يتم العثور على رأس نافذة الخريطة');
        return;
    }

    const closeBtn = header.querySelector('button');

    const actions = document.createElement('div');

    actions.style.cssText =
        'display:flex; gap:6px; align-items:center;';

    const albumBtn = document.createElement('button');

    albumBtn.className = 'btn btn-blue';

    albumBtn.style.cssText =
        'flex:none; padding:8px 12px;';

    albumBtn.textContent = '📖 الذكريات';
    albumBtn.onclick = openAlbum;

    if (closeBtn) {
        header.appendChild(actions);
        actions.append(albumBtn, closeBtn);
    } else {
        header.appendChild(albumBtn);
    }

})();
