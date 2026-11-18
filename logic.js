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

    // دالة التقييم: الرقم الأصغر يعني حالة أقرب للحل
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
                if (i > 0 && !col[i].hidden && !col[i - 1].hidden && col[i].id === col[i - 1].id) {
                    groupedPairs++;
                }
            }
        }
        return (totalItems * 12) + (hiddenItems * 6) - (emptyCols * 10) - (groupedPairs * 4);
    }

    // بحث موجّه (Beam Search) مع حد زمني لمنع تجمّد الشاشة
    static solve(initialColumns, maxHeight = 5, beamWidth = 150, maxDepth = 45, timeLimitMs = 150) {
        const startCols = JSON.parse(JSON.stringify(initialColumns));
        if (startCols.every(c => c.length === 0)) return [];

        const startTime = Date.now();
        const visited = new Set([this.getStateKey(startCols)]);
        let beam = [{ cols: startCols, path: [], score: this.evaluate(startCols) }];

        for (let depth = 0; depth < maxDepth; depth++) {
            if (Date.now() - startTime > timeLimitMs) break;
            const nextBeam = [];

            for (const state of beam) {
                if (Date.now() - startTime > timeLimitMs) break;
                const { cols, path } = state;

                for (let i = 0; i < cols.length; i++) {
                    const fromCol = cols[i];
                    if (fromCol.length === 0) continue;

                    const stackCount = this.getTopStackCount(fromCol);
                    const topId = fromCol[fromCol.length - 1].id;
                    const fromIsUniform = this.isUniformVisible(fromCol);
                    let triedEmpty = false;

                    for (let j = 0; j < cols.length; j++) {
                        if (i === j) continue;
                        const toCol = cols[j];
                        if (toCol.length >= maxHeight) continue;

                        if (toCol.length === 0) {
                            if (fromIsUniform || triedEmpty) continue;
                            triedEmpty = true;
                        } else if (toCol[toCol.length - 1].id !== topId) {
                            continue;
                        }

                        const nextCols = cols.map(c => c.map(item => ({ ...item })));
                        const moveCount = Math.min(stackCount, maxHeight - nextCols[j].length);
                        const moved = nextCols[i].splice(nextCols[i].length - moveCount, moveCount);
                        nextCols[j].push(...moved);

                        if (nextCols[i].length > 0) {
                            nextCols[i][nextCols[i].length - 1].hidden = false;
                        }

                        const target = nextCols[j];
                        if (target.length >= 3) {
                            const len = target.length;
                            if (
                                !target[len - 1].hidden &&
                                !target[len - 2].hidden &&
                                !target[len - 3].hidden &&
                                target[len - 1].id === target[len - 2].id &&
                                target[len - 2].id === target[len - 3].id
                            ) {
                                target.splice(len - 3, 3);
                                if (target.length > 0) target[target.length - 1].hidden = false;
                            }
                        }

                        const nextPath = [...path, { from: i, to: j }];
                        if (nextCols.every(c => c.length === 0)) {
                            return nextPath;
                        }

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
    static getConfig(levelNum) {
        const toyName = TOY_THEMES[(levelNum - 1) % TOY_THEMES.length];
        let targets = {};
        let numCols = 5;
        let maxHeight = 5;
        let hideChance = 0.4;

        if (levelNum === 1) {
            targets = { 1: 2, 2: 1 };
            numCols = 5;
            hideChance = 0.35;
        } else if (levelNum === 2) {
            targets = { 1: 2, 2: 2 };
            numCols = 5;
            hideChance = 0.45;
        } else if (levelNum <= 5) {
            targets = { 1: 2, 2: 2, 3: 1 };
            numCols = 6;
            hideChance = 0.5;
        } else if (levelNum <= 10) {
            targets = { 1: 2, 2: 2, 3: 2 };
            numCols = 6;
            hideChance = 0.55;
        } else {
            const extra = Math.min(2, Math.floor((levelNum - 10) / 5));
            targets = { 1: 2, 2: 2, 3: 2, 4: 1 + extra };
            numCols = 7;
            maxHeight = 6;
            hideChance = 0.6;
        }

        return { levelNum, toyName, targets, numCols, maxHeight, hideChance };
    }

    static generate(levelNum) {
        const config = this.getConfig(levelNum);
        const pool = [];
        for (const [id, count] of Object.entries(config.targets)) {
            for (let i = 0; i < count * 3; i++) {
                pool.push(Number(id));
            }
        }

        for (let attempt = 0; attempt < 25; attempt++) {
            const shuffled = [...pool].sort(() => Math.random() - 0.5);
            const columns = Array.from({ length: config.numCols }, () => []);
            const fillCols = config.numCols - 1;

            let validLayout = true;
            for (const id of shuffled) {
                const available = [];
                for (let c = 0; c < fillCols; c++) {
                    const col = columns[c];
                    if (col.length >= config.maxHeight) continue;
                    if (col.length >= 2 && col[col.length - 1].id === id && col[col.length - 2].id === id) {
                        continue;
                    }
                    available.push(c);
                }

                if (available.length === 0) {
                    validLayout = false;
                    break;
                }
                const chosen = available[Math.floor(Math.random() * available.length)];
                columns[chosen].push({ id, hidden: false });
            }

            if (!validLayout) continue;

            columns.forEach(col => {
                for (let i = 0; i < col.length - 1; i++) {
                    col[i].hidden = Math.random() < config.hideChance;
                }
            });

            const solution = LevelSolver.solve(columns, config.maxHeight, 120, 40, 120);
            if (solution && solution.length > 0) {
                return { ...config, columns };
            }
        }

        // خطة بديلة آمنة بنفس رقم المستوى واسم اللعبة (بدون استدعاء متكرر)
        const fallbackCols = Array.from({ length: config.numCols }, () => []);
        const fillCols = config.numCols - 2; // ترك عمودين فارغين لضمان الحل
        pool.forEach((id, idx) => {
            fallbackCols[idx % Math.max(1, fillCols)].push({ id, hidden: false });
        });
        return { ...config, columns: fallbackCols };
    }
}

class GameLogic {
    constructor() {
        const savedLevel = Number(localStorage.getItem('toymaker_level')) || 1;
        this.loadLevel(savedLevel);
    }

    loadLevel(levelNum) {
        this.levelNum = levelNum;
        localStorage.setItem('toymaker_level', levelNum);
        const data = LevelGenerator.generate(levelNum);
        this.toyName = data.toyName;
        this.maxHeight = data.maxHeight;
        this.targets = data.targets;
        this.initialColumns = JSON.parse(JSON.stringify(data.columns));
        this.reset();
    }

    reset() {
        this.columns = JSON.parse(JSON.stringify(this.initialColumns));
        this.built = {};
        for (const id of Object.keys(this.targets)) {
            this.built[id] = 0;
        }
        this.history = [];
        this.status = 'playing';
    }

    saveState() {
        this.history.push({
            columns: JSON.parse(JSON.stringify(this.columns)),
            built: { ...this.built }
        });
    }

    undo() {
        if (this.history.length > 0) {
            const last = this.history.pop();
            this.columns = last.columns;
            this.built = last.built;
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
            if (!col[i].hidden && col[i].id === topId) {
                stack.unshift(col[i]);
            } else break;
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
                !col[len - 1].hidden &&
                !col[len - 2].hidden &&
                !col[len - 3].hidden &&
                col[len - 1].id === col[len - 2].id &&
                col[len - 2].id === col[len - 3].id
            ) {
                const itemId = col[len - 1].id;
                col.splice(len - 3, 3);
                this.built[itemId] = (this.built[itemId] || 0) + 1;
                if (col.length > 0) col[col.length - 1].hidden = false;
            }
        }
    }

    checkGameState() {
        const isWin = Object.entries(this.targets).every(
            ([id, req]) => (this.built[id] || 0) >= req
        );
        if (isWin) {
            this.status = 'win';
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
        const path = LevelSolver.solve(this.columns, this.maxHeight, 200, 50, 250);
        return path && path.length > 0 ? path[0] : null;
    }
}
