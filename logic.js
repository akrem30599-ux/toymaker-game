function mulberry32(a) {
    return function () {
        a |= 0;
        a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

const MATERIALS = {
    1: { raw: '🪵', part: '⚙️', name: 'عجلة' },
    2: { raw: '🪨', part: '🔩', name: 'ترس' },
    3: { raw: '🧵', part: '🚩', name: 'علم' },
    4: { raw: '🔮', part: '💡', name: 'عدسة' }
};

const TOY_THEMES = [
    'قطار خشبي 🚂',
    'صندوق موسيقى 🎵',
    'روبوت آلي 🤖',
    'سفينة شراعية ⛵',
    'طائرة ميكانيكية ✈️',
    'عربة سباق 🏎️',
    'قلعة صغيرة 🏰',
    'منطاد هوائي 🎈'
];

class LevelSolver {
    static getStateKey(columns) {
        return columns
            .map(col => col.map(item => `${item.id}${item.hidden ? 'h' : ''}`).join(','))
            .sort()
            .join('|');
    }

    static getTopStackCount(col) {
        if (!col || col.length === 0) return 0;
        const top = col[col.length - 1];
        if (top.hidden) return 0;

        let count = 0;
        for (let i = col.length - 1; i >= 0; i--) {
            if (!col[i].hidden && col[i].id === top.id) count++;
            else break;
        }
        return count;
    }

    static evaluate(columns) {
        let totalItems = 0;
        let hiddenItems = 0;
        let emptyCols = 0;
        let groupedPairs = 0;

        for (const col of columns) {
            if (col.length === 0) {
                emptyCols++;
                continue;
            }

            totalItems += col.length;
            for (let i = 0; i < col.length; i++) {
                if (col[i].hidden) hiddenItems++;
                if (
                    i > 0 &&
                    !col[i].hidden &&
                    !col[i - 1].hidden &&
                    col[i].id === col[i - 1].id
                ) {
                    groupedPairs++;
                }
            }
        }

        return (totalItems * 12) + (hiddenItems * 6) - (emptyCols * 10) - (groupedPairs * 4);
    }

    static applyMove(columns, from, to, maxHeight) {
        const source = columns[from];
        const target = columns[to];

        if (!source || !target || from === to || source.length === 0) return null;

        const count = this.getTopStackCount(source);
        if (count === 0 || target.length >= maxHeight) return null;

        const topId = source[source.length - 1].id;
        if (target.length > 0 && target[target.length - 1].id !== topId) return null;

        const next = columns.map(col => col.map(item => ({ ...item })));
        const moveCount = Math.min(count, maxHeight - next[to].length);
        if (moveCount <= 0) return null;

        const moved = next[from].splice(next[from].length - moveCount, moveCount);
        next[to].push(...moved);

        if (next[from].length > 0) {
            next[from][next[from].length - 1].hidden = false;
        }

        const dest = next[to];
        if (dest.length >= 3) {
            const n = dest.length;
            if (
                !dest[n - 1].hidden &&
                !dest[n - 2].hidden &&
                !dest[n - 3].hidden &&
                dest[n - 1].id === dest[n - 2].id &&
                dest[n - 2].id === dest[n - 3].id
            ) {
                dest.splice(n - 3, 3);
                if (dest.length > 0) dest[dest.length - 1].hidden = false;
            }
        }

        return next;
    }

    static replay(initialColumns, path, maxHeight) {
        let columns = initialColumns.map(col => col.map(item => ({ ...item })));

        for (const step of path) {
            columns = this.applyMove(columns, step.from, step.to, maxHeight);
            if (!columns) return false;
        }

        return columns.every(col => col.length === 0);
    }

    // Beam Search. نسمح بالنقل إلى عمود فارغ حتى عندما تكون المجموعة متجانسة؛
    // فقد يكون العمود الفارغ ضرورياً لإتمام الدمج.
    static solve(initialColumns, maxHeight = 5, beamWidth = 180, maxDepth = 60, maxNodes = 10000) {
        const startCols = initialColumns.map(col => col.map(item => ({ ...item })));
        if (startCols.every(col => col.length === 0)) return [];

        const visited = new Set([this.getStateKey(startCols)]);
        let beam = [{
            cols: startCols,
            path: [],
            score: this.evaluate(startCols)
        }];
        let nodes = 0;

        for (let depth = 0; depth < maxDepth && nodes < maxNodes; depth++) {
            const nextBeam = [];

            for (const state of beam) {
                if (nodes >= maxNodes) break;

                const cols = state.cols;

                for (let i = 0; i < cols.length && nodes < maxNodes; i++) {
                    const fromCol = cols[i];
                    if (fromCol.length === 0) continue;

                    const stackCount = this.getTopStackCount(fromCol);
                    if (stackCount === 0) continue;

                    const topId = fromCol[fromCol.length - 1].id;
                    let triedEmpty = false;

                    for (let j = 0; j < cols.length && nodes < maxNodes; j++) {
                        if (i === j) continue;

                        const toCol = cols[j];
                        if (toCol.length >= maxHeight) continue;

                        if (toCol.length === 0) {
                            // لا نكرر الحالة نفسها عبر أعمدة فارغة متكافئة.
                            if (triedEmpty) continue;
                            triedEmpty = true;
                        } else if (toCol[toCol.length - 1].hidden || toCol[toCol.length - 1].id !== topId) {
                            continue;
                        }

                        nodes++;
                        const nextCols = this.applyMove(cols, i, j, maxHeight);
                        if (!nextCols) continue;

                        const nextPath = [...state.path, { from: i, to: j }];
                        if (nextCols.every(col => col.length === 0)) return nextPath;

                        const key = this.getStateKey(nextCols);
                        if (!visited.has(key)) {
                            visited.add(key);
                            nextBeam.push({
                                cols: nextCols,
                                path: nextPath,
                                score: this.evaluate(nextCols)
                            });
                        }
                    }
                }
            }

            if (nextBeam.length === 0) break;
            nextBeam.sort((a, b) => a.score - b.score);
            beam = nextBeam.slice(0, beamWidth);
        }

        return null;
    }
}

class LevelGenerator {
    static cache = new Map();

    static getConfig(levelNum) {
        const toyName = TOY_THEMES[(levelNum - 1) % TOY_THEMES.length];
        let targets;
        let numCols;
        let maxHeight;
        let hideChance;

        if (levelNum === 1) {
            targets = { 1: 2, 2: 1 };
            numCols = 5;
            maxHeight = 5;
            hideChance = 0.25;
        } else if (levelNum === 2) {
            targets = { 1: 2, 2: 2 };
            numCols = 5;
            maxHeight = 5;
            hideChance = 0.35;
        } else if (levelNum <= 5) {
            targets = { 1: 2, 2: 2, 3: 1 };
            numCols = 5;
            maxHeight = 5;
            hideChance = 0.45;
        } else if (levelNum <= 10) {
            targets = { 1: 2, 2: 2, 3: 2 };
            // مساحة إضافية مقارنة بالمستويات الأولى، مع ارتفاع أكبر للأعمدة.
            numCols = 7;
            maxHeight = 6;
            hideChance = 0.55;
        } else {
            const extra = Math.min(2, Math.floor((levelNum - 10) / 5));
            targets = { 1: 2, 2: 2, 3: 2, 4: 1 + extra };
            // تسع خانات تسمح ببناء مرحلتين مضمونتي الحل في المراحل المتقدمة.
            numCols = 9;
            maxHeight = 6;
            hideChance = 0.62;
        }

        return { levelNum, toyName, targets, numCols, maxHeight, hideChance };
    }

    static pregenerate(levelNum) {
        if (!this.cache.has(levelNum)) {
            setTimeout(() => this.generate(levelNum), 100);
        }
    }

    static shuffle(array, rand) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    static makeInterleavedSequence(targets, rand) {
        const remaining = {};
        for (const [id, count] of Object.entries(targets)) remaining[id] = count;

        const sequence = [];
        let previous = null;

        while (Object.values(remaining).some(count => count > 0)) {
            const choices = Object.keys(remaining)
                .filter(id => remaining[id] > 0 && id !== previous)
                .sort((a, b) => remaining[b] - remaining[a] || Number(a) - Number(b));

            if (choices.length === 0) {
                // هذه الحالة لا تحدث مع توزيعات المراحل الحالية، لكنها تمنع حلقة لا نهائية.
                return null;
            }

            const bestCount = remaining[choices[0]];
            const tied = choices.filter(id => remaining[id] === bestCount);
            const selected = tied[Math.floor(rand() * tied.length)];

            sequence.push(Number(selected));
            remaining[selected]--;
            previous = selected;
        }

        return sequence;
    }

    // يبني تخطيطاً احتياطياً له حل معروف:
    // ثلاثة أعمدة متطابقة + عمود تجميع فارغ لكل مجموعة مواد.
    static buildGuaranteedLayout(config, rand) {
        const sequence = this.makeInterleavedSequence(config.targets, rand);
        if (!sequence) return null;

        const bankCount = Math.ceil(sequence.length / config.maxHeight);
        const requiredColumns = bankCount * 4 + 1;
        const numCols = Math.max(config.numCols, requiredColumns);
        const columns = Array.from({ length: numCols }, () => []);
        const solutionPath = [];

        for (let bank = 0; bank < bankCount; bank++) {
            const segment = sequence.slice(
                bank * config.maxHeight,
                (bank + 1) * config.maxHeight
            );
            const base = bank * 4;

            for (let source = 0; source < 3; source++) {
                columns[base + source] = segment.map((id, index) => ({
                    id,
                    hidden: index !== segment.length - 1 && rand() < config.hideChance
                }));
            }

            const bufferIndex = base + 3;

            // ترتيب التنفيذ من أعلى العمود إلى أسفله.
            for (let i = segment.length - 1; i >= 0; i--) {
                solutionPath.push({ from: base, to: bufferIndex });
                solutionPath.push({ from: base + 1, to: bufferIndex });
                solutionPath.push({ from: base + 2, to: bufferIndex });
            }
        }

        if (!LevelSolver.replay(columns, solutionPath, config.maxHeight)) {
            return null;
        }

        return {
            columns,
            numCols,
            solutionPath,
            parMoves: solutionPath.length
        };
    }

    static generate(levelNum) {
        if (this.cache.has(levelNum)) {
            return JSON.parse(JSON.stringify(this.cache.get(levelNum)));
        }

        const config = this.getConfig(levelNum);
        const rand = mulberry32(levelNum * 7919 + 13);
        const pool = [];

        for (const [id, count] of Object.entries(config.targets)) {
            for (let i = 0; i < count * 3; i++) pool.push(Number(id));
        }

        // محاولات عشوائية، ولا نقبل أي تخطيط إلا إذا وجد solver حلاً له.
        for (let attempt = 0; attempt < 30; attempt++) {
            const shuffled = this.shuffle(pool, rand);
            const columns = Array.from({ length: config.numCols }, () => []);
            const fillCols = config.numCols - 1;
            let validLayout = true;

            for (const id of shuffled) {
                const available = [];

                for (let c = 0; c < fillCols; c++) {
                    const col = columns[c];
                    if (col.length >= config.maxHeight) continue;

                    // منع تكوين ثلاثة متشابهة متجاورة منذ البداية.
                    if (
                        col.length >= 2 &&
                        col[col.length - 1].id === id &&
                        col[col.length - 2].id === id
                    ) continue;

                    available.push(c);
                }

                if (available.length === 0) {
                    validLayout = false;
                    break;
                }

                const chosen = available[Math.floor(rand() * available.length)];
                columns[chosen].push({ id, hidden: false });
            }

            if (!validLayout) continue;

            columns.forEach(col => {
                for (let i = 0; i < col.length - 1; i++) {
                    col[i].hidden = rand() < config.hideChance;
                }
            });

            const solution = LevelSolver.solve(
                columns,
                config.maxHeight,
                180,
                60,
                10000
            );

            if (solution && solution.length > 0 &&
                LevelSolver.replay(columns, solution, config.maxHeight)) {
                const result = {
                    ...config,
                    columns,
                    parMoves: solution.length,
                    solutionPath: solution
                };
                this.cache.set(levelNum, result);
                return JSON.parse(JSON.stringify(result));
            }
        }

        // لا نستخدم تخطيطاً عشوائياً غير مضمون كما كان يحدث في fallback القديم.
        const guaranteed = this.buildGuaranteedLayout(config, rand);

        if (!guaranteed) {
            throw new Error(`تعذر إنشاء مرحلة قابلة للحل للمستوى ${levelNum}`);
        }

        const fallbackResult = {
            ...config,
            numCols: guaranteed.numCols,
            columns: guaranteed.columns,
            parMoves: guaranteed.parMoves,
            solutionPath: guaranteed.solutionPath
        };

        this.cache.set(levelNum, fallbackResult);
        return JSON.parse(JSON.stringify(fallbackResult));
    }
}

class GameLogic {
    constructor() {
        const storage = typeof localStorage !== 'undefined' ? localStorage : null;
        this.maxUnlocked = Number(storage?.getItem('toymaker_max_level')) || 1;

        try {
            this.starsMap = JSON.parse(storage?.getItem('toymaker_stars') || '{}');
        } catch (error) {
            this.starsMap = {};
        }

        const savedLevel = Number(storage?.getItem('toymaker_level')) || 1;
        this.loadLevel(Math.min(savedLevel, this.maxUnlocked));
    }

    loadLevel(levelNum) {
        this.levelNum = Math.max(1, Number(levelNum) || 1);

        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('toymaker_level', this.levelNum);
        }

        const data = LevelGenerator.generate(this.levelNum);
        this.toyName = data.toyName;
        this.maxHeight = data.maxHeight;
        this.targets = data.targets;
        this.parMoves = data.parMoves || 12;
        this.solutionPath = data.solutionPath || [];
        this.initialColumns = JSON.parse(JSON.stringify(data.columns));

        this.reset();
        LevelGenerator.pregenerate(this.levelNum + 1);
    }

    reset() {
        this.columns = JSON.parse(JSON.stringify(this.initialColumns));
        this.built = {};

        for (const id of Object.keys(this.targets)) {
            this.built[id] = 0;
        }

        this.history = [];
        this.movesCount = 0;
        this.hintsUsed = 0;
        this.hintUsedThisMove = false;
        this.lastEarnedStars = 0;
        this.status = 'playing';
    }

    saveState() {
        this.history.push({
            columns: JSON.parse(JSON.stringify(this.columns)),
            built: { ...this.built },
            movesCount: this.movesCount
        });
    }

    undo() {
        if (this.history.length === 0) return false;

        const last = this.history.pop();
        this.columns = last.columns;
        this.built = last.built;
        this.movesCount = last.movesCount;
        this.hintUsedThisMove = false;
        this.status = 'playing';
        return true;
    }

    getTopStack(colIndex) {
        const col = this.columns[colIndex];
        if (!col || col.length === 0) return [];

        const stack = [];
        const top = col[col.length - 1];
        if (top.hidden) return stack;

        for (let i = col.length - 1; i >= 0; i--) {
            if (!col[i].hidden && col[i].id === top.id) {
                stack.unshift(col[i]);
            } else {
                break;
            }
        }

        return stack;
    }

    move(fromIndex, toIndex) {
        if (
            fromIndex === toIndex ||
            this.status !== 'playing' ||
            !this.columns[fromIndex] ||
            !this.columns[toIndex]
        ) return false;

        const fromCol = this.columns[fromIndex];
        const toCol = this.columns[toIndex];
        if (fromCol.length === 0) return false;

        const stackToMove = this.getTopStack(fromIndex);
        if (stackToMove.length === 0) return false;

        const targetTop = toCol.length > 0 ? toCol[toCol.length - 1] : null;
        if (targetTop && (targetTop.hidden || targetTop.id !== stackToMove[0].id)) {
            return false;
        }

        const availableSpace = this.maxHeight - toCol.length;
        if (availableSpace <= 0) return false;

        this.saveState();
        this.movesCount++;
        this.hintUsedThisMove = false;

        const moveCount = Math.min(stackToMove.length, availableSpace);
        const movedItems = fromCol.splice(fromCol.length - moveCount, moveCount);
        toCol.push(...movedItems);

        if (fromCol.length > 0) {
            fromCol[fromCol.length - 1].hidden = false;
        }

        this.checkMerge(toIndex);
        this.checkGameState();
        return true;
    }

    checkMerge(colIndex) {
        const col = this.columns[colIndex];
        if (!col || col.length < 3) return false;

        const len = col.length;
        if (
            !col[len - 1].hidden &&
            !col[len - 2].hidden &&
            !col[len - 3].hidden &&
            col[len - 1].id === col[len - 2].id &&
            col[len - 2].id === col[len - 3].id
        ) {
            const itemId = col[len - 1].id;
            col.splice(len - 3, 3);
            this.built[itemId] = (this.built[itemId] || 0) + 1;

            if (col.length > 0) {
                col[col.length - 1].hidden = false;
            }
            return true;
        }

        return false;
    }

    calculateStars() {
        const penalty = this.hintsUsed * 2;
        const effectiveMoves = this.movesCount + penalty;

        if (effectiveMoves <= this.parMoves + 4) return 3;
        if (effectiveMoves <= this.parMoves + 10) return 2;
        return 1;
    }

    saveWinProgress() {
        const earned = this.calculateStars();
        this.lastEarnedStars = earned;

        const prevBest = this.starsMap[this.levelNum] || 0;
        if (earned > prevBest) {
            this.starsMap[this.levelNum] = earned;
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('toymaker_stars', JSON.stringify(this.starsMap));
            }
        }

        if (this.levelNum + 1 > this.maxUnlocked) {
            this.maxUnlocked = this.levelNum + 1;
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('toymaker_max_level', this.maxUnlocked);
            }
        }
    }

    checkGameState() {
        const isWin = Object.entries(this.targets).every(
            ([id, req]) => (this.built[id] || 0) >= req
        );

        if (isWin) {
            this.status = 'win';
            this.lastEarnedStars = this.calculateStars();
            return;
        }

        let hasValidMove = false;

        for (let i = 0; i < this.columns.length && !hasValidMove; i++) {
            if (this.columns[i].length === 0) continue;

            const top = this.columns[i][this.columns[i].length - 1];
            if (top.hidden) continue;

            for (let j = 0; j < this.columns.length; j++) {
                if (i === j) continue;

                const target = this.columns[j];
                if (
                    target.length < this.maxHeight &&
                    (
                        target.length === 0 ||
                        (
                            !target[target.length - 1].hidden &&
                            target[target.length - 1].id === top.id
                        )
                    )
                ) {
                    hasValidMove = true;
                    break;
                }
            }
        }

        if (!hasValidMove) this.status = 'lose';
    }

    getHint() {
        if (this.status !== 'playing') return null;

        const path = LevelSolver.solve(
            this.columns,
            this.maxHeight,
            220,
            65,
            12000
        );

        if (path && path.length > 0) {
            if (!this.hintUsedThisMove) {
                this.hintsUsed++;
                this.hintUsedThisMove = true;
            }
            return path[0];
        }

        // أول تلميح في التخطيط الاحتياطي مضمون ومتحقق منه مسبقاً.
        if (this.movesCount === 0 && this.solutionPath.length > 0) {
            if (!this.hintUsedThisMove) {
                this.hintsUsed++;
                this.hintUsedThisMove = true;
            }
            return this.solutionPath[0];
        }

        return null;
    }
}
