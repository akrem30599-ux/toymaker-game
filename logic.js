class GameLogic {
    constructor() {
        this.maxHeight = 5;
        this.targetWheels = 4;
        this.reset();
    }

    reset() {
        // المستويات المبدئية (1=خشب، 2=حديد)
        this.columns = [
            [{id: 1, hidden: true}, {id: 1, hidden: true}, {id: 1, hidden: false}],
            [{id: 2, hidden: true}, {id: 1, hidden: false}, {id: 1, hidden: false}],
            [],
            [{id: 2, hidden: false}, {id: 2, hidden: false}],
            [{id: 1, hidden: false}]
        ];
        this.wheelsBuilt = 0;
        this.history = [];
        this.status = 'playing'; // 'playing', 'win', 'lose'
    }

    // حفظ حالة اللعبة قبل كل حركة لاستخدامها في زر التراجع
    saveState() {
        this.history.push({
            columns: JSON.parse(JSON.stringify(this.columns)),
            wheelsBuilt: this.wheelsBuilt
        });
    }

    undo() {
        if (this.history.length > 0) {
            const lastState = this.history.pop();
            this.columns = lastState.columns;
            this.wheelsBuilt = lastState.wheelsBuilt;
            this.status = 'playing';
            return true;
        }
        return false;
    }

    // معرفة كم قطعة متطابقة موجودة في أعلى العمود لغرض نقلها دفعة واحدة
    getTopStack(colIndex) {
        const col = this.columns[colIndex];
        if (col.length === 0) return [];
        let stack = [];
        const topItem = col[col.length - 1];
        for (let i = col.length - 1; i >= 0; i--) {
            if (!col[i].hidden && col[i].id === topItem.id) {
                stack.unshift(col[i]); // إضافة في البداية للحفاظ على الترتيب
            } else {
                break;
            }
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

        // التحقق من تطابق النوع
        if (targetTop && targetTop.id !== stackToMove[0].id) return false;

        const availableSpace = this.maxHeight - toCol.length;
        if (availableSpace === 0) return false;

        this.saveState(); // حفظ الحركة

        // نقل القطع (حسب المساحة المتوفرة)
        const itemsToMoveCount = Math.min(stackToMove.length, availableSpace);
        const movedItems = fromCol.splice(fromCol.length - itemsToMoveCount, itemsToMoveCount);
        toCol.push(...movedItems);

        // كشف العنصر الذي كان مخفياً
        if (fromCol.length > 0) fromCol[fromCol.length - 1].hidden = false;

        this.checkMerge(toIndex);
        this.checkGameState();
        return true;
    }

    checkMerge(colIndex) {
        const col = this.columns[colIndex];
        if (col.length >= 3) {
            const len = col.length;
            if (col[len-1].id === col[len-2].id && col[len-2].id === col[len-3].id) {
                if (col[len-1].id === 1) { // 3 خشب تندمج لتصبح عجلة
                    col.splice(len - 3, 3);
                    this.wheelsBuilt++;
                }
            }
        }
    }

    checkGameState() {
        if (this.wheelsBuilt >= this.targetWheels) {
            this.status = 'win';
            return;
        }

        // فحص الخسارة: هل توجد أي حركة ممكنة؟
        let hasValidMove = false;
        for (let i = 0; i < this.columns.length; i++) {
            if (this.columns[i].length === 0) continue;
            const topItem = this.columns[i][this.columns[i].length - 1];
            
            for (let j = 0; j < this.columns.length; j++) {
                if (i === j) continue;
                const targetCol = this.columns[j];
                if (targetCol.length < this.maxHeight) {
                    if (targetCol.length === 0 || targetCol[targetCol.length - 1].id === topItem.id) {
                        hasValidMove = true;
                        break;
                    }
                }
            }
            if (hasValidMove) break;
        }

        if (!hasValidMove) this.status = 'lose';
    }
}
