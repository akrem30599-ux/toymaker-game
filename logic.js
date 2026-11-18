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

    static isUniformVisible(col) {
        if (col.length === 0) return true;
        const firstId = col[0].id;
        return col.every(item => !item.hidden && item.id === firstId);
    }

    static getTopStackCount(col) {
        if (col.length === 0) return 0;
        const topId = col[col.length - 1].id;
        let count = 0;
        for (let i = col.length - 1; i >= 0; i--) {
            if (!col[i].hidden && col[i].id === topId) count++;
            else break;
        }
        return count;
    }

    static evaluate(columns) {
        let totalItems = 0, hiddenItems = 0, emptyCols = 0, groupedPairs = 0;
        for (const col of columns) {
            if (col.length === 0) { emptyCols++; continue; }
            totalItems += col.length;
            for (let i = 0; i < col.length; i++) {
                if (col[i].hidden) hiddenItems++;
                if (i > 0 && !col[i].hidden && !col[i - 1].hidden && col[i].id === col[i - 1].id) {
                    groupedPairs++;
                }
            }
        }
        return (totalItems * 12) + (hiddenItems * 6) - (emptyCols * 10) - (groupedPairs * 4);
    }

    // بحث موجّه (Beam Search) بحد عُقد ثابت لضمان تطابق النتائج على جميع الأجهزة
    static solve(initialColumns, maxHeight = 5, beamWidth = 150, maxDepth = 45, maxNodes = 4000) {
        const startCols = JSON.parse(JSON.stringify(initialColumns));
        if (startCols.every(c => c.length === 0)) return [];

        const visited = new Set([this.getStateKey(startCols)]);
        let beam = [{ cols: startCols, path: [], score: this.evaluate(startCols) }];
        let nodes = 0;

        for (let depth = 0; depth < maxDepth && nodes < maxNodes; depth++) {
            const nextBeam = [];

            for (const state of beam) {
                if (nodes >= maxNodes) break;
                const { cols, path } = state;

                for (let i = 0; i < cols.length && nodes < maxNodes; i++) {
                    const fromCol = cols[i];
                    if (fromCol.length === 0) continue;

                    const stackCount = this.getTopStackCount(fromCol);
                    const topId = fromCol[fromCol.length - 1].id;
                    const fromIsUniform = this.isUniformVisible(fromCol);
                    let triedEmpty = false;

                    for (let j = 0; j < cols.length && nodes < maxNodes; j++) {
                        if (i === j) continue;
                        const toCol = cols[j];
                        if (toCol.length >= maxHeight) continue;

                        if (toCol.length === 0) {
                            if (fromIsUniform || triedEmpty) continue;
                            triedEmpty = true;
                        } else if (toCol[toCol.length - 1].id !== topId) {
                            continue;
                        }

                        nodes++;
                        const nextCols = cols.map(c => c.map(item => ({ ...item })));
                        const moveCount = Math.min(stackCount, maxHeight - nextCols[j].length);
                        const moved = nextCols[i].splice(nextCols[i].length - moveCount, moveCount);
                        nextCols[j].push(...moved);

                        if (nextCols[i].length > 0) nextCols[i][nextCols[i].length - 1].hidden = false;

                        const target = nextCols[j];
                        if (target.length >= 3) {
                            const len = target.length;
                            if (
                                !target[len - 1].hidden && !target[len - 2].hidden && !target[len - 3].hidden &&
                                target[len - 1].id === target[len - 2].id && target[len - 2].id === target[len - 3].id
                            ) {
                                target.splice(len - 3, 3);
                                if (target.length > 0) target[target.length - 1].hidden = false;
                            }
                        }

                        const nextPath = [...path, { from: i, to: j }];
                        if (nextCols.every(c => c.length === 0)) return nextPath;

                        const key = this.getStateKey(nextCols);
                        if (!visited.has(key)) {
                            visited.add(key);
                            nextBeam.push({ cols: nextCols, path: nextPath, score: this.evaluate(nextCols) });
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
        let targets = {};
        let numCols = 5;
        let maxHeight = 5;
        let hideChance = 0.4;

        if (levelNum === 1) {
            targets = { 1: 2, 2: 1 };
            numCols = 5; hideChance = 0.35;
        } else if (levelNum === 2) {
            targets = { 1: 2, 2: 2 };
            numCols = 5; hideChance = 0.45;
        } else if (levelNum <= 5) {
            targets = { 1: 2, 2: 2, 3: 1 };
            numCols = 6; hideChance = 0.5;
        } else if (levelNum <= 10) {
            targets = { 1: 2, 2: 2, 3: 2 };
            numCols = 6; hideChance = 0.55;
        } else {
            const extra = Math.min(2, Math.floor((levelNum - 10) / 5));
            targets = { 1: 2, 2: 2, 3: 2, 4: 1 + extra };
            numCols = 7; maxHeight = 6; hideChance = 0.6;
        }

        return { levelNum, toyName, targets, numCols, maxHeight, hideChance };
    }

    static pregenerate(levelNum) {
        if (!this.cache.has(levelNum)) {
            setTimeout(() => this.generate(levelNum), 100);
        }
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

        for (let attempt = 0; attempt < 25; attempt++) {
            const shuffled = [...pool];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(rand() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            const columns = Array.from({ length: config.numCols }, () => []);
            const fillCols = config.numCols - 1;

            let validLayout = true;
            for (const id of shuffled) {
                const available = [];
                for (let c = 0; c < fillCols; c++) {
                    const col = columns[c];
                    if (col.length >= config.maxHeight) continue;
                    if (col.length >= 2 && col[col.length - 1].id === id && col[col.length - 2].id === id) continue;
                    available.push(c);
                }
                if (available.length === 0) { validLayout = false; break; }
                columns[available[Math.floor(rand() * available.length)]].push({ id, hidden: false });
            }

            if (!validLayout) continue;

            columns.forEach(col => {
                for (let i = 0; i < col.length - 1; i++) {
                    col[i].hidden = rand() < config.hideChance;
                }
            });

            const solution = LevelSolver.solve(columns, config.maxHeight, 120, 40, 4000);
            if (solution && solution.length > 0) {
                const result = { ...config, columns, parMoves: solution.length };
                this.cache.set(levelNum, result);
                return JSON.parse(JSON.stringify(result));
            }
        }

        console.log('fallback', levelNum);
        const fallbackCols = Array.from({ length: config.numCols }, () => []);
        const fillCols = config.numCols - 2;
        pool.forEach((id, idx) => {
            fallbackCols[idx % Math.max(1, fillCols)].push({ id, hidden: false });
        });
        const fallbackResult = { ...config, columns: fallbackCols, parMoves: pool.length };
        this.cache.set(levelNum, fallbackResult);
        return JSON.parse(JSON.stringify(fallbackResult));
    }
}

class GameLogic {
    constructor() {
        this.maxUnlocked = Number(localStorage.getItem('toymaker_max_level')) || 1;
        this.starsMap = JSON.parse(localStorage.getItem('toymaker_stars') || '{}');
        const savedLevel = Number(localStorage.getItem('toymaker_level')) || 1;
        this.loadLevel(Math.min(savedLevel, this.maxUnlocked));
    }

    loadLevel(levelNum) {
        this.levelNum = levelNum;
        localStorage.setItem('toymaker_level', levelNum);
        const data = LevelGenerator.generate(levelNum);
        this.toyName = data.toyName;
        this.maxHeight = data.maxHeight;
        this.targets = data.targets;
        this.parMoves = data.parMoves || 12;
        this.initialColumns = JSON.parse(JSON.stringify(data.columns));
        this.reset();
        LevelGenerator.pregenerate(levelNum + 1);
    }

    reset() {
        this.columns = JSON.parse(JSON.stringify(this.initialColumns));
        this.built = {};
        for (const id of Object.keys(this.targets)) this.built[id] = 0;
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
        if (this.history.length > 0) {
            const last = this.history.pop();
            this.columns = last.columns;
            this.built = last.built;
            this.movesCount = last.movesCount;
            this.hintUsedThisMove = false;
            this.status = 'playing';
            return true;
        }
        return false;
    }

    getTopStack(colIndex) {
        const col = this.columns[colIndex];
        if (col.length === 0) return [];
        const stack = [];
        const topId = col[col.length - 1].id;
        for (let i = col.length - 1; i >= 0; i--) {
            if (!col[i].hidden && col[i].id === topId) stack.unshift(col[i]);
            else break;
        }
        return stack;
    }

    move(fromIndex, toIndex) {
        if (fromIndex === toIndex || this.status !== 'playing') return false;

        const fromCol = this.columns[fromIndex];
        const toCol = this.columns[toIndex];
        if (fromCol.length === 0) return false;

        const stackToMove = this.getTopStack(fromIndex);
        const targetTop = toCol.length > 0 ? toCol[toCol.length - 1] : null;
        if (targetTop && targetTop.id !== stackToMove[0].id) return false;

        const availableSpace = this.maxHeight - toCol.length;
        if (availableSpace === 0) return false;

        this.saveState();
        this.movesCount++;
        this.hintUsedThisMove = false;

        const moveCount = Math.min(stackToMove.length, availableSpace);
        const movedItems = fromCol.splice(fromCol.length - moveCount, moveCount);
        toCol.push(...movedItems);

        if (fromCol.length > 0) fromCol[fromCol.length - 1].hidden = false;

        this.checkMerge(toIndex);
        this.checkGameState();
        return true;
    }

    checkMerge(colIndex) {
        const col = this.columns[colIndex];
        if (col.length >= 3) {
            const len = col.length;
            if (
                !col[len - 1].hidden && !col[len - 2].hidden && !col[len - 3].hidden &&
                col[len - 1].id === col[len - 2].id && col[len - 2].id === col[len - 3].id
            ) {
                const itemId = col[len - 1].id;
                col.splice(len - 3, 3);
                this.built[itemId] = (this.built[itemId] || 0) + 1;
                if (col.length > 0) col[col.length - 1].hidden = false;
            }
        }
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
            localStorage.setItem('toymaker_stars', JSON.stringify(this.starsMap));
        }
        if (this.levelNum + 1 > this.maxUnlocked) {
            this.maxUnlocked = this.levelNum + 1;
            localStorage.setItem('toymaker_max_level', this.maxUnlocked);
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
        for (let i = 0; i < this.columns.length; i++) {
            if (this.columns[i].length === 0) continue;
            const topId = this.columns[i][this.columns[i].length - 1].id;
            for (let j = 0; j < this.columns.length; j++) {
                if (i === j) continue;
                const targetCol = this.columns[j];
                if (targetCol.length < this.maxHeight && (targetCol.length === 0 || targetCol[targetCol.length - 1].id === topId)) {
                    hasValidMove = true;
                    break;
                }
            }
            if (hasValidMove) break;
        }

        if (!hasValidMove) this.status = 'lose';
    }

    getHint() {
        const path = LevelSolver.solve(this.columns, this.maxHeight, 200, 50, 6000);
        if (path && path.length > 0) {
            if (!this.hintUsedThisMove) {
                this.hintsUsed++;
                this.hintUsedThisMove = true;
            }
            return path[0];
        }
        return null;
    }
}
