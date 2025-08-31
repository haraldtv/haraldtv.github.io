class Modal {
    constructor() {
        this.modalElement = null;
        this.backdropElement = null;
        this.isVisible = false;
    }
    
    show(title, message, buttonText = 'OK', onClose = null) {
        if (this.isVisible) return;
        
        this.create(title, message, buttonText, onClose);
        document.body.appendChild(this.backdropElement);
        
        // Disable page interaction
        this.disablePage();
        
        // Show with animation
        setTimeout(() => {
            this.backdropElement.classList.add('modal-visible');
            this.modalElement.classList.add('modal-visible');
        }, 10);
        
        this.isVisible = true;
    }
    
    hide() {
        if (!this.isVisible) return;
        
        this.backdropElement.classList.remove('modal-visible');
        this.modalElement.classList.remove('modal-visible');
        
        setTimeout(() => {
            if (this.backdropElement && this.backdropElement.parentNode) {
                document.body.removeChild(this.backdropElement);
            }
            this.enablePage();
            this.isVisible = false;
        }, 300);
    }
    
    create(title, message, buttonText, onClose) {
        // Create backdrop
        this.backdropElement = document.createElement('div');
        this.backdropElement.className = 'modal-backdrop';
        
        // Create modal
        this.modalElement = document.createElement('div');
        this.modalElement.className = 'modal';
        
        // Create modal content
        this.modalElement.innerHTML = `
            <div class="modal-header">
                <h2 class="modal-title">${title}</h2>
            </div>
            <div class="modal-body">
                <p class="modal-message">${message}</p>
            </div>
            <div class="modal-footer">
                <button class="modal-button">${buttonText}</button>
            </div>
        `;
        
        // Add click handlers
        const button = this.modalElement.querySelector('.modal-button');
        button.addEventListener('click', () => {
            this.hide();
            if (onClose) onClose();
        });
        
        // Close on backdrop click
        this.backdropElement.addEventListener('click', (e) => {
            if (e.target === this.backdropElement) {
                this.hide();
                if (onClose) onClose();
            }
        });
        
        // Add modal to backdrop
        this.backdropElement.appendChild(this.modalElement);
    }
    
    disablePage() {
        const appContainer = document.querySelector('.app-container');
        const puzzleListContainer = document.querySelector('.puzzle-list-container');
        
        if (appContainer) appContainer.style.pointerEvents = 'none';
        if (puzzleListContainer) puzzleListContainer.style.pointerEvents = 'none';
        
        document.body.style.overflow = 'hidden';
        
        // Hide iOS keyboard by blurring active input
        this.hideKeyboard();
    }
    
    enablePage() {
        const appContainer = document.querySelector('.app-container');
        const puzzleListContainer = document.querySelector('.puzzle-list-container');
        
        if (appContainer) appContainer.style.pointerEvents = '';
        if (puzzleListContainer) puzzleListContainer.style.pointerEvents = '';
        
        document.body.style.overflow = '';
    }
    
    hideKeyboard() {
        // Force blur on any active input to hide mobile keyboard
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            activeElement.blur();
        }
        
        // Additional iOS-specific keyboard hiding techniques
        if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
            // Create a temporary input and focus/blur it to force keyboard to hide
            const tempInput = document.createElement('input');
            tempInput.style.position = 'absolute';
            tempInput.style.left = '-9999px';
            tempInput.style.opacity = '0';
            document.body.appendChild(tempInput);
            
            setTimeout(() => {
                tempInput.focus();
                setTimeout(() => {
                    tempInput.blur();
                    document.body.removeChild(tempInput);
                }, 100);
            }, 100);
        }
    }
}

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
        this.modal = new Modal();
        this.dailyBanner = document.getElementById('daily-puzzle-banner');
        this.bannerText = document.getElementById('banner-text');
        this.currentClueDisplay = document.getElementById('current-clue');
        this.currentClueText = document.getElementById('current-clue-text');
        
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
        this.updateDailyBanner();
        
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
        this.updateDailyBanner();
        
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
                    input.setAttribute('autocomplete', 'off');
                    input.setAttribute('autocorrect', 'off');
                    input.setAttribute('autocapitalize', 'off');
                    input.setAttribute('spellcheck', 'false');
                    input.addEventListener('input', (e) => this.handleInput(e));
                    input.addEventListener('focus', () => this.selectCell(cell));
                    input.addEventListener('contextmenu', (e) => e.preventDefault());
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
        
        // Focus the input but prevent scrolling
        const input = cell.querySelector('input');
        if (input) {
            input.focus({ preventScroll: true });
            
            // Immediately blur to prevent any scrolling behavior
            setTimeout(() => {
                input.blur();
            }, 1);
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
        let value = input.value;
        
        // Only allow a-z and A-Z letters, convert to uppercase
        if (value.match(/[a-zA-Z]/)) {
            value = value.toUpperCase();
            input.value = value;
            
            // Check if the current word is now completed
            const { row, col } = this.currentCell;
            const currentClues = this.currentDirection === 'across' ? 
                this.currentPuzzle.clues.across : this.currentPuzzle.clues.down;
            
            // Find current word's clue
            let currentClue = null;
            for (const clue of currentClues) {
                const cells = this.getWordCells(clue.startRow, clue.startCol, this.currentDirection);
                if (cells.some(cell => cell.row === row && cell.col === col)) {
                    currentClue = clue;
                    break;
                }
            }
            
            if (currentClue && this.isWordCompleted(currentClue, this.currentDirection)) {
                // Word is now completed, move to next word
                this.moveToNextWord();
            } else {
                // Word not completed, check if this is the last cell of the current word
                const cells = this.getWordCells(row, col, this.currentDirection);
                const currentIndex = cells.findIndex(cell => cell.row === row && cell.col === col);
                
                if (currentIndex === cells.length - 1) {
                    // This is the last letter of the word, move to next word
                    this.moveToNextWord();
                } else {
                    // Move to next cell in same word
                    this.moveToNextCell();
                }
            }
            
            // Check if all tiles are filled and auto-check
            if (this.areAllTilesFilled()) {
                setTimeout(() => this.autoCheckAnswers(), 200);
            }
        } else {
            // Invalid input - clear the field
            input.value = '';
        }
    }
    
    handleKeyPress(e) {
        if (!this.currentCell) return;
        
        // Handle letter input directly from keyboard
        if (e.key.match(/^[a-zA-Z]$/)) {
            e.preventDefault();
            const input = this.currentCell.element.querySelector('input');
            if (input) {
                const value = e.key.toUpperCase();
                input.value = value;
                
                // Check if the current word is now completed
                const { row, col } = this.currentCell;
                const currentClues = this.currentDirection === 'across' ? 
                    this.currentPuzzle.clues.across : this.currentPuzzle.clues.down;
                
                // Find current word's clue
                let currentClue = null;
                for (const clue of currentClues) {
                    const cells = this.getWordCells(clue.startRow, clue.startCol, this.currentDirection);
                    if (cells.some(cell => cell.row === row && cell.col === col)) {
                        currentClue = clue;
                        break;
                    }
                }
                
                if (currentClue && this.isWordCompleted(currentClue, this.currentDirection)) {
                    // Word is now completed, move to next word
                    this.moveToNextWord();
                } else {
                    // Word not completed, check if this is the last cell of the current word
                    const cells = this.getWordCells(row, col, this.currentDirection);
                    const currentIndex = cells.findIndex(cell => cell.row === row && cell.col === col);
                    
                    if (currentIndex === cells.length - 1) {
                        // This is the last letter of the word, move to next word
                        this.moveToNextWord();
                    } else {
                        // Move to next cell in same word
                        this.moveToNextCell();
                    }
                }
                
                // Check if all tiles are filled and auto-check
                if (this.areAllTilesFilled()) {
                    setTimeout(() => this.autoCheckAnswers(), 200);
                }
            }
            return;
        }
        
        // Handle navigation and special keys
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                if (this.currentDirection === 'down') {
                    // In down mode, navigate up
                    this.moveTo(-1, 0);
                } else {
                    // In across mode, switch to down mode
                    this.currentDirection = 'down';
                    this.highlightCurrentWord();
                    this.highlightCurrentClue();
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (this.currentDirection === 'down') {
                    // In down mode, navigate down
                    this.moveTo(1, 0);
                } else {
                    // In across mode, switch to down mode
                    this.currentDirection = 'down';
                    this.highlightCurrentWord();
                    this.highlightCurrentClue();
                }
                break;
            case 'ArrowLeft':
                e.preventDefault();
                if (this.currentDirection === 'across') {
                    // In across mode, navigate left
                    this.moveTo(0, -1);
                } else {
                    // In down mode, switch to across mode
                    this.currentDirection = 'across';
                    this.highlightCurrentWord();
                    this.highlightCurrentClue();
                }
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (this.currentDirection === 'across') {
                    // In across mode, navigate right
                    this.moveTo(0, 1);
                } else {
                    // In down mode, switch to across mode
                    this.currentDirection = 'across';
                    this.highlightCurrentWord();
                    this.highlightCurrentClue();
                }
                break;
            case 'Backspace':
                e.preventDefault();
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
            default:
                // Prevent all other keys from being entered
                e.preventDefault();
                break;
        }
    }
    
    handleBackspace(e) {
        const input = this.currentCell.element.querySelector('input');
        if (input) {
            if (input.value !== '') {
                // Clear the current cell
                input.value = '';
            } else {
                // Current cell is empty, move to previous cell and clear it
                this.moveToPreviousCell();
            }
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
    
    isWordCompleted(clue, direction) {
        const cells = this.getWordCells(clue.startRow, clue.startCol, direction);
        for (const cellPos of cells) {
            const cell = this.gridContainer.querySelector(
                `[data-row="${cellPos.row}"][data-col="${cellPos.col}"]`
            );
            const input = cell?.querySelector('input');
            if (!input || input.value.trim() === '') {
                return false;
            }
        }
        return true;
    }
    
    findFirstEmptyCell(clue, direction) {
        const cells = this.getWordCells(clue.startRow, clue.startCol, direction);
        for (const cellPos of cells) {
            const cell = this.gridContainer.querySelector(
                `[data-row="${cellPos.row}"][data-col="${cellPos.col}"]`
            );
            const input = cell?.querySelector('input');
            if (input && input.value.trim() === '') {
                return cell;
            }
        }
        return null; // Word is completed
    }
    
    moveToNextWord() {
        if (!this.currentCell) return;
        
        const { row, col } = this.currentCell;
        let currentClues = this.currentDirection === 'across' ? 
            this.currentPuzzle.clues.across : this.currentPuzzle.clues.down;
        
        // Find current word's clue
        let currentClueIndex = -1;
        for (let i = 0; i < currentClues.length; i++) {
            const clue = currentClues[i];
            const cells = this.getWordCells(clue.startRow, clue.startCol, this.currentDirection);
            if (cells.some(cell => cell.row === row && cell.col === col)) {
                currentClueIndex = i;
                break;
            }
        }
        
        if (currentClueIndex === -1) return;
        
        // Start looking for the next incomplete word
        let searchIndex = currentClueIndex + 1;
        let searchDirection = this.currentDirection;
        let searchClues = currentClues;
        
        // Search through remaining words in current direction
        while (searchIndex < searchClues.length) {
            const clue = searchClues[searchIndex];
            if (!this.isWordCompleted(clue, searchDirection)) {
                const firstEmptyCell = this.findFirstEmptyCell(clue, searchDirection);
                if (firstEmptyCell) {
                    this.currentDirection = searchDirection;
                    this.selectCell(firstEmptyCell);
                    return;
                }
            }
            searchIndex++;
        }
        
        // If we reached here, all remaining words in current direction are completed
        // Switch direction and search from the beginning
        searchDirection = searchDirection === 'across' ? 'down' : 'across';
        searchClues = searchDirection === 'across' ? 
            this.currentPuzzle.clues.across : this.currentPuzzle.clues.down;
        searchIndex = 0;
        
        // Search through all words in the other direction
        while (searchIndex < searchClues.length) {
            const clue = searchClues[searchIndex];
            if (!this.isWordCompleted(clue, searchDirection)) {
                const firstEmptyCell = this.findFirstEmptyCell(clue, searchDirection);
                if (firstEmptyCell) {
                    this.currentDirection = searchDirection;
                    this.selectCell(firstEmptyCell);
                    return;
                }
            }
            searchIndex++;
        }
        
        // If we reach here, all words are completed - stay on current cell
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
                this.modal.show(
                    'Puzzle Complete! 🎉', 
                    'Congratulations! You solved the puzzle!',
                    'Continue'
                );
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
        if (!this.currentCell) {
            // Hide the mobile clue display if no cell is selected
            if (this.currentClueDisplay) {
                this.currentClueDisplay.style.display = 'none';
            }
            return;
        }
        
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
                
                // Update mobile clue display
                if (this.currentClueDisplay && this.currentClueText) {
                    const directionText = this.currentDirection === 'across' ? 'Across' : 'Down';
                    this.currentClueText.textContent = `${clue.number} ${directionText}: ${clue.clue}`;
                    this.currentClueDisplay.style.display = 'block';
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
            this.updateDailyBanner();
            this.selectFirstAcrossClue();
        }
    }
    
    areAllTilesFilled() {
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const correctAnswer = this.currentPuzzle.grid[row][col];
                
                // Skip empty cells (blocked cells in the puzzle)
                if (correctAnswer === '') {
                    continue;
                }
                
                const cell = this.gridContainer.querySelector(
                    `[data-row="${row}"][data-col="${col}"]`
                );
                const input = cell?.querySelector('input');
                
                if (!input || input.value.trim() === '') {
                    return false;
                }
            }
        }
        return true;
    }
    
    autoCheckAnswers() {
        let allCorrect = true;
        
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const correctAnswer = this.currentPuzzle.grid[row][col];
                
                // Skip empty cells (blocked cells in the puzzle)
                if (correctAnswer === '') {
                    continue;
                }
                
                const cell = this.gridContainer.querySelector(
                    `[data-row="${row}"][data-col="${col}"]`
                );
                const input = cell?.querySelector('input');
                
                if (input) {
                    const userAnswer = input.value.toUpperCase();
                    
                    if (userAnswer !== correctAnswer) {
                        allCorrect = false;
                        break;
                    }
                }
            }
            if (!allCorrect) break;
        }
        
        if (allCorrect) {
            // Mark all cells as correct
            document.querySelectorAll('.grid-cell input').forEach(input => {
                const cell = input.parentElement;
                cell.classList.remove('incorrect');
                cell.classList.add('correct');
            });
            
            setTimeout(() => {
                this.modal.show(
                    'Puzzle Complete! 🎉', 
                    'Congratulations! You solved the puzzle!',
                    'Continue'
                );
            }, 500);
        } else {
            // Show modal for incorrect completion
            setTimeout(() => {
                this.modal.show(
                    'Not Quite Right',
                    'Keep trying! You\'re close to solving this puzzle.',
                    'Try Again'
                );
            }, 200);
        }
    }
    
    updateDailyBanner() {
        if (!this.dailyBanner || !this.bannerText) return;
        
        const isDailyPuzzle = this.isCurrentPuzzleToday();
        
        if (isDailyPuzzle) {
            const today = new Date();
            const formattedDate = today.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric', 
                month: 'long',
                day: 'numeric'
            });
            
            this.bannerText.textContent = `Today's puzzle • ${formattedDate}`;
            this.dailyBanner.style.display = 'block';
        } else {
            this.dailyBanner.style.display = 'none';
        }
    }
    
    isCurrentPuzzleToday() {
        if (!this.currentPuzzle) return false;
        
        // Start date: August 31, 2025
        const startDate = new Date(2025, 7, 31); // Month is 0-indexed, so 7 = August
        const today = new Date();
        
        // Calculate days since start date
        const timeDifference = today.getTime() - startDate.getTime();
        const daysSinceStart = Math.floor(timeDifference / (1000 * 3600 * 24));
        
        // Calculate what today's puzzle ID should be
        const todaysPuzzleId = (daysSinceStart % this.puzzles.length) + 1;
        
        // Check if current puzzle matches today's puzzle
        return this.currentPuzzle.id === todaysPuzzleId;
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