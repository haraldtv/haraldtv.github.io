# Mini Crossword PWA

A mobile-first Progressive Web App (PWA) featuring 5x5 crossword puzzles in the style of NYT Mini Crossword. Built for iOS with a native feel and optimized for touch interaction.

## Features

- 🎯 5x5 crossword grid optimized for mobile
- 📱 iOS-native design and interactions  
- 💾 Offline functionality with service worker
- 🎲 Random puzzle selection from JSON data
- ✅ Answer checking and reveal functionality
- 🎨 Clean, accessible interface with proper contrast
- ⌨️ Keyboard navigation support
- 📲 Installable as PWA on iOS devices

## How to Play

1. **Tap a cell** to select it and start typing
2. **Tap clues** to jump to that word
3. **Use arrow keys** or swipe to navigate between cells
4. **Press space** to toggle between across/down direction
5. **Use "Check"** to verify your answers
6. **Use "Reveal"** to see the solution
7. **"New Game"** loads a random puzzle

## Adding Puzzles

Edit `crosswords.json` to add new puzzles. Each puzzle should have:

```json
{
  "id": 1,
  "grid": [
    ["H", "E", "A", "R", "T"],
    ["O", "", "P", "", "H"],
    // ... 5x5 grid with "" for blocked cells
  ],
  "clues": {
    "across": [
      {"number": 1, "clue": "Clue text", "answer": "HEART", "startRow": 0, "startCol": 0}
    ],
    "down": [
      {"number": 1, "clue": "Clue text", "answer": "HOUSE", "startRow": 0, "startCol": 0}
    ]
  }
}
```

## Installation

This is a static site that can be deployed to GitHub Pages:

1. Enable GitHub Pages in repository settings
2. Set source to "GitHub Actions"
3. The included workflow will auto-deploy on push to main

## Local Development

Simply serve the files with any static server:

```bash
python -m http.server 8000
# or
npx serve .
```

## Browser Support

- iOS Safari (primary target)
- Chrome/Edge on mobile and desktop
- Firefox on mobile and desktop

The app uses modern CSS features like CSS Grid and CSS custom properties.