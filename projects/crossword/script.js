class CrosswordGame {
    constructor() {
        this.currentPuzzle = null;
        this.currentCell = null;
        this.currentDirection = 'across';
        this.puzzles = [];
        this.currentPuzzleIndex = 0;
        
        this.gridContainer = document.getElementById('grid-container');
        this.cluesAcross = document.getElementById('clues-across');
        this.cluesDown = document.getElementById('clues-down');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.checkBtn = document.getElementById('check-btn');
        this.revealBtn = document.getElementById('reveal-btn');
        this.allPuzzlesBtn = document.getElementById('all-puzzles-btn');
        this.backBtn = document.getElementById('back-btn');
        this.puzzleListContainer = document.getElementById('puzzle-list-container');
        this.puzzleList = document.getElementById('puzzle-list');
        this.mainContainer = document.querySelector('.app-container');
        
        this.init();
    }
    
    async init() {
        await this.loadPuzzles();
        this.setupEventListeners();
        this.loadDailyPuzzle();
        this.registerServiceWorker();
    }
    
    async loadPuzzles() {
        try {
            const response = await fetch('crosswords.json');
            const data = await response.json();
            this.puzzles = data.puzzles;
        } catch (error) {
            console.error('Failed to load puzzles:', error);
            this.puzzles = [];
        }
    }
    
    loadRandomPuzzle() {
        if (this.puzzles.length === 0) return;
        
        this.currentPuzzleIndex = Math.floor(Math.random() * this.puzzles.length);
        this.currentPuzzle = this.puzzles[this.currentPuzzleIndex];
        this.renderGrid();
        this.renderClues();
        this.clearHighlights();
        
        // Auto-select 1 Across to start
        this.selectFirstAcrossClue();
    }
    
    loadDailyPuzzle() {
        if (this.puzzles.length === 0) return;
        
        // Start date: August 31, 2025
        const startDate = new Date(2025, 7, 31); // Month is 0-indexed, so 7 = August
        const today = new Date();
        
        // Calculate days since start date
        const timeDifference = today.getTime() - startDate.getTime();
        const daysSinceStart = Math.floor(timeDifference / (1000 * 3600 * 24));
        
        // Calculate puzzle ID (days since start + 1, cycle through available puzzles)
        const puzzleId = (daysSinceStart % this.puzzles.length) + 1;
        
        // Find puzzle with matching ID, or fallback to first puzzle
        const puzzleIndex = this.puzzles.findIndex(puzzle => puzzle.id === puzzleId);
        const selectedIndex = puzzleIndex >= 0 ? puzzleIndex : 0;
        
        this.currentPuzzleIndex = selectedIndex;
        this.currentPuzzle = this.puzzles[this.currentPuzzleIndex];
        this.renderGrid();
        this.renderClues();
        this.clearHighlights();
        
        // Auto-select 1 Across to start
        this.selectFirstAcrossClue();
    }
    
    setupEventListeners() {
        this.newGameBtn.addEventListener('click', () => this.loadRandomPuzzle());
        this.checkBtn.addEventListener('click', () => this.checkAnswers());
        this.revealBtn.addEventListener('click', () => this.revealAnswers());
        this.allPuzzlesBtn.addEventListener('click', () => this.showPuzzleList());
        this.backBtn.addEventListener('click', () => this.hidePuzzleList());
        
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Touch/click handling for grid cells
        this.gridContainer.addEventListener('click', (e) => {
            const cell = e.target.closest('.grid-cell');
            if (cell) {
                // If clicking the same cell, toggle direction
                if (this.currentCell && cell === this.currentCell.element) {
                    this.toggleDirection();
                } else {
                    this.selectCell(cell);
                }
            }
        });
    }
    
    renderGrid() {
        this.gridContainer.innerHTML = '';
        
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                const cellValue = this.currentPuzzle.grid[row][col];
                
                if (cellValue === '') {
                    cell.classList.add('blocked');
                } else {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.maxLength = 1;
                    input.addEventListener('input', (e) => this.handleInput(e));
                    input.addEventListener('focus', () => this.selectCell(cell));
                    cell.appendChild(input);
                    
                    // Add number if this cell starts a word
                    const number = this.getCellNumber(row, col);
                    if (number) {
                        const numberSpan = document.createElement('span');
                        numberSpan.className = 'cell-number';
                        numberSpan.textContent = number;
                        cell.appendChild(numberSpan);
                    }
                }
                
                this.gridContainer.appendChild(cell);
            }
        }
    }
    
    renderClues() {
        this.cluesAcross.innerHTML = '';
        this.cluesDown.innerHTML = '';
        
        // Render across clues
        this.currentPuzzle.clues.across.forEach(clue => {
            const clueElement = document.createElement('div');
            clueElement.className = 'clue-item';
            clueElement.dataset.number = clue.number;
            clueElement.dataset.direction = 'across';
            clueElement.innerHTML = `
                <span class="clue-number">${clue.number}</span>
                <span class="clue-text">${clue.clue}</span>
            `;
            clueElement.addEventListener('click', () => this.selectClue(clue, 'across'));
            this.cluesAcross.appendChild(clueElement);
        });
        
        // Render down clues
        this.currentPuzzle.clues.down.forEach(clue => {
            const clueElement = document.createElement('div');
            clueElement.className = 'clue-item';
            clueElement.dataset.number = clue.number;
            clueElement.dataset.direction = 'down';
            clueElement.innerHTML = `
                <span class="clue-number">${clue.number}</span>
                <span class="clue-text">${clue.clue}</span>
            `;
            clueElement.addEventListener('click', () => this.selectClue(clue, 'down'));
            this.cluesDown.appendChild(clueElement);
        });
    }
    
    getCellNumber(row, col) {
        // Check if this cell starts an across word
        const acrossClue = this.currentPuzzle.clues.across.find(
            clue => clue.startRow === row && clue.startCol === col
        );
        
        // Check if this cell starts a down word
        const downClue = this.currentPuzzle.clues.down.find(
            clue => clue.startRow === row && clue.startCol === col
        );
        
        return acrossClue?.number || downClue?.number || null;
    }
    
    selectCell(cell) {
        this.clearSelection();
        
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        this.currentCell = { row, col, element: cell };
        cell.classList.add('active');
        
        // Focus the input
        const input = cell.querySelector('input');
        if (input) {
            input.focus();
        }
        
        // Highlight the current word
        this.highlightCurrentWord();
        
        // Update clue highlighting
        this.highlightCurrentClue();
    }
    
    selectClue(clue, direction) {
        this.currentDirection = direction;
        
        // Find and select the first cell of this clue
        const startCell = this.gridContainer.querySelector(
            `[data-row="${clue.startRow}"][data-col="${clue.startCol}"]`
        );
        
        if (startCell) {
            this.selectCell(startCell);
        }
        
        // Highlight the clue
        this.clearClueHighlights();
        const clueElement = document.querySelector(
            `.clue-item[data-number="${clue.number}"][data-direction="${direction}"]`
        );
        if (clueElement) {
            clueElement.classList.add('active');
        }
    }
    
    highlightCurrentWord() {
        if (!this.currentCell) return;
        
        this.clearHighlights();
        
        const { row, col } = this.currentCell;
        const cells = this.getWordCells(row, col, this.currentDirection);
        
        cells.forEach(cellPos => {
            const cell = this.gridContainer.querySelector(
                `[data-row="${cellPos.row}"][data-col="${cellPos.col}"]`
            );
            if (cell && !cell.classList.contains('active')) {
                cell.classList.add('highlighted');
            }
        });
    }
    
    getWordCells(row, col, direction) {
        const cells = [];
        
        if (direction === 'across') {
            // Find the start of the word
            let startCol = col;
            while (startCol > 0 && this.currentPuzzle.grid[row][startCol - 1] !== '') {
                startCol--;
            }
            
            // Get all cells in the word
            let currentCol = startCol;
            while (currentCol < 5 && this.currentPuzzle.grid[row][currentCol] !== '') {
                cells.push({ row, col: currentCol });
                currentCol++;
            }
        } else {
            // Find the start of the word
            let startRow = row;
            while (startRow > 0 && this.currentPuzzle.grid[startRow - 1][col] !== '') {
                startRow--;
            }
            
            // Get all cells in the word
            let currentRow = startRow;
            while (currentRow < 5 && this.currentPuzzle.grid[currentRow][col] !== '') {
                cells.push({ row: currentRow, col });
                currentRow++;
            }
        }
        
        return cells;
    }
    
    handleInput(e) {
        const input = e.target;
        const cell = input.parentElement;
        const value = input.value.toUpperCase();
        
        if (value.match(/[A-Z]/)) {
            input.value = value;
            this.moveToNextCell();
            
            // Check if all tiles are filled and auto-check
            if (this.areAllTilesFilled()) {
                setTimeout(() => this.autoCheckAnswers(), 200);
            }
        } else {
            input.value = '';
        }
    }
    
    handleKeyPress(e) {
        if (!this.currentCell) return;
        
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                this.moveTo(-1, 0);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.moveTo(1, 0);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.moveTo(0, -1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.moveTo(0, 1);
                break;
            case 'Backspace':
                this.handleBackspace(e);
                break;
            case ' ':
                e.preventDefault();
                this.toggleDirection();
                break;
            case 'Enter':
                e.preventDefault();
                this.moveToNextWord();
                break;
            case 'Tab':
                e.preventDefault();
                this.moveToNextWord();
                break;
        }
    }
    
    handleBackspace(e) {
        const input = this.currentCell.element.querySelector('input');
        if (input && input.value === '') {
            e.preventDefault();
            this.moveToPreviousCell();
        }
    }
    
    moveToNextCell() {
        if (!this.currentCell) return;
        
        const { row, col } = this.currentCell;
        const cells = this.getWordCells(row, col, this.currentDirection);
        const currentIndex = cells.findIndex(cell => cell.row === row && cell.col === col);
        
        if (currentIndex < cells.length - 1) {
            const nextCell = cells[currentIndex + 1];
            const nextElement = this.gridContainer.querySelector(
                `[data-row="${nextCell.row}"][data-col="${nextCell.col}"]`
            );
            if (nextElement) {
                this.selectCell(nextElement);
            }
        }
    }
    
    moveToPreviousCell() {
        if (!this.currentCell) return;
        
        const { row, col } = this.currentCell;
        const cells = this.getWordCells(row, col, this.currentDirection);
        const currentIndex = cells.findIndex(cell => cell.row === row && cell.col === col);
        
        if (currentIndex > 0) {
            const prevCell = cells[currentIndex - 1];
            const prevElement = this.gridContainer.querySelector(
                `[data-row="${prevCell.row}"][data-col="${prevCell.col}"]`
            );
            if (prevElement) {
                this.selectCell(prevElement);
                const input = prevElement.querySelector('input');
                if (input) {
                    input.value = '';
                }
            }
        }
    }
    
    moveTo(rowDelta, colDelta) {
        if (!this.currentCell) return;
        
        const newRow = this.currentCell.row + rowDelta;
        const newCol = this.currentCell.col + colDelta;
        
        if (newRow >= 0 && newRow < 5 && newCol >= 0 && newCol < 5) {
            const newCell = this.gridContainer.querySelector(
                `[data-row="${newRow}"][data-col="${newCol}"]`
            );
            if (newCell && !newCell.classList.contains('blocked')) {
                this.selectCell(newCell);
            }
        }
    }
    
    toggleDirection() {
        this.currentDirection = this.currentDirection === 'across' ? 'down' : 'across';
        
        this.highlightCurrentWord();
        this.highlightCurrentClue();
    }
    
    moveToNextWord() {
        if (!this.currentCell) return;
        
        const { row, col } = this.currentCell;
        const currentClues = this.currentDirection === 'across' ? 
            this.currentPuzzle.clues.across : this.currentPuzzle.clues.down;
        
        // Find current word's clue
        let currentClue = null;
        let currentClueIndex = -1;
        for (let i = 0; i < currentClues.length; i++) {
            const clue = currentClues[i];
            const cells = this.getWordCells(clue.startRow, clue.startCol, this.currentDirection);
            if (cells.some(cell => cell.row === row && cell.col === col)) {
                currentClue = clue;
                currentClueIndex = i;
                break;
            }
        }
        
        if (currentClueIndex === -1) return;
        
        // Check if we're at the last word in current direction
        const isLastWordInDirection = currentClueIndex === currentClues.length - 1;
        
        if (isLastWordInDirection) {
            // Switch to the other direction and go to first word
            this.currentDirection = this.currentDirection === 'across' ? 'down' : 'across';
            const newDirectionClues = this.currentDirection === 'across' ? 
                this.currentPuzzle.clues.across : this.currentPuzzle.clues.down;
            
            if (newDirectionClues.length > 0) {
                const nextClue = newDirectionClues[0];
                const nextCell = this.gridContainer.querySelector(
                    `[data-row="${nextClue.startRow}"][data-col="${nextClue.startCol}"]`
                );
                if (nextCell) {
                    this.selectCell(nextCell);
                }
            }
        } else {
            // Move to next word in same direction
            const nextIndex = currentClueIndex + 1;
            const nextClue = currentClues[nextIndex];
            
            const nextCell = this.gridContainer.querySelector(
                `[data-row="${nextClue.startRow}"][data-col="${nextClue.startCol}"]`
            );
            if (nextCell) {
                this.selectCell(nextCell);
            }
        }
    }
    
    checkAnswers() {
        let allCorrect = true;
        
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const cell = this.gridContainer.querySelector(
                    `[data-row="${row}"][data-col="${col}"]`
                );
                const input = cell?.querySelector('input');
                
                if (input) {
                    const correctAnswer = this.currentPuzzle.grid[row][col];
                    const userAnswer = input.value.toUpperCase();
                    
                    cell.classList.remove('correct', 'incorrect');
                    
                    if (userAnswer === correctAnswer) {
                        cell.classList.add('correct');
                    } else if (userAnswer !== '') {
                        cell.classList.add('incorrect');
                        allCorrect = false;
                    } else {
                        allCorrect = false;
                    }
                }
            }
        }
        
        if (allCorrect) {
            setTimeout(() => {
                alert('Congratulations! You solved the puzzle!');
            }, 500);
        }
    }
    
    revealAnswers() {
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const cell = this.gridContainer.querySelector(
                    `[data-row="${row}"][data-col="${col}"]`
                );
                const input = cell?.querySelector('input');
                
                if (input) {
                    input.value = this.currentPuzzle.grid[row][col];
                    cell.classList.remove('incorrect');
                    cell.classList.add('correct');
                }
            }
        }
    }
    
    clearSelection() {
        const activeCell = document.querySelector('.grid-cell.active');
        if (activeCell) {
            activeCell.classList.remove('active');
        }
    }
    
    clearHighlights() {
        document.querySelectorAll('.grid-cell.highlighted').forEach(cell => {
            cell.classList.remove('highlighted');
        });
    }
    
    clearClueHighlights() {
        document.querySelectorAll('.clue-item.active').forEach(clue => {
            clue.classList.remove('active');
        });
    }
    
    highlightCurrentClue() {
        if (!this.currentCell) return;
        
        this.clearClueHighlights();
        
        const { row, col } = this.currentCell;
        const currentClues = this.currentDirection === 'across' ? 
            this.currentPuzzle.clues.across : this.currentPuzzle.clues.down;
        
        // Find the clue for the current word
        for (const clue of currentClues) {
            const cells = this.getWordCells(clue.startRow, clue.startCol, this.currentDirection);
            if (cells.some(cell => cell.row === row && cell.col === col)) {
                const clueElement = document.querySelector(
                    `.clue-item[data-number="${clue.number}"][data-direction="${this.currentDirection}"]`
                );
                if (clueElement) {
                    clueElement.classList.add('active');
                }
                break;
            }
        }
    }
    
    selectFirstAcrossClue() {
        if (!this.currentPuzzle || !this.currentPuzzle.clues.across.length) return;
        
        // Find clue number 1 across, or fallback to first across clue
        const firstClue = this.currentPuzzle.clues.across.find(clue => clue.number === 1) || 
                         this.currentPuzzle.clues.across[0];
        
        if (firstClue) {
            // Set direction to across
            this.currentDirection = 'across';
            
            // Find and select the first cell of this clue
            const startCell = this.gridContainer.querySelector(
                `[data-row="${firstClue.startRow}"][data-col="${firstClue.startCol}"]`
            );
            
            if (startCell) {
                this.selectCell(startCell);
            }
        }
    }
    
    showPuzzleList() {
        this.mainContainer.style.display = 'none';
        this.puzzleListContainer.style.display = 'flex';
        this.renderPuzzleList();
    }
    
    hidePuzzleList() {
        this.puzzleListContainer.style.display = 'none';
        this.mainContainer.style.display = 'flex';
    }
    
    renderPuzzleList() {
        this.puzzleList.innerHTML = '';
        
        this.puzzles.forEach((puzzle, index) => {
            const puzzleItem = document.createElement('div');
            puzzleItem.className = 'puzzle-item';
            if (index === this.currentPuzzleIndex) {
                puzzleItem.classList.add('current');
            }
            
            // Create mini grid preview
            const previewGrid = document.createElement('div');
            previewGrid.className = 'puzzle-preview';
            
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 5; col++) {
                    const cell = document.createElement('div');
                    cell.className = 'preview-cell';
                    const cellValue = puzzle.grid[row][col];
                    
                    if (cellValue === '') {
                        cell.classList.add('blocked');
                    }
                    // Don't show any letters - just the grid shape
                    
                    previewGrid.appendChild(cell);
                }
            }
            
            const acrossCount = puzzle.clues.across.length;
            const downCount = puzzle.clues.down.length;
            
            puzzleItem.innerHTML = `
                <div class="puzzle-header">
                    <span class="puzzle-number">Puzzle ${puzzle.id}</span>
                    <span class="puzzle-status new">New</span>
                </div>
                <div class="puzzle-info">
                    <span class="puzzle-clue-count">${acrossCount} Across, ${downCount} Down</span>
                </div>
            `;
            
            puzzleItem.insertBefore(previewGrid, puzzleItem.querySelector('.puzzle-info'));
            
            puzzleItem.addEventListener('click', () => {
                this.loadSpecificPuzzle(index);
                this.hidePuzzleList();
            });
            
            this.puzzleList.appendChild(puzzleItem);
        });
    }
    
    isWordStart(puzzle, row, col) {
        // Check if this cell starts an across word
        const startsAcross = puzzle.clues.across.some(clue => 
            clue.startRow === row && clue.startCol === col
        );
        
        // Check if this cell starts a down word  
        const startsDown = puzzle.clues.down.some(clue =>
            clue.startRow === row && clue.startCol === col
        );
        
        return startsAcross || startsDown;
    }
    
    loadSpecificPuzzle(puzzleIndex) {
        if (puzzleIndex >= 0 && puzzleIndex < this.puzzles.length) {
            this.currentPuzzleIndex = puzzleIndex;
            this.currentPuzzle = this.puzzles[this.currentPuzzleIndex];
            this.renderGrid();
            this.renderClues();
            this.clearHighlights();
            this.selectFirstAcrossClue();
        }
    }
    
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered successfully');
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CrosswordGame();
});