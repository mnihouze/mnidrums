# 🥁 Mni Drums

A small Angular website for drummers — a metronome, and organized libraries for
sheet music, songs, lessons, and books. Warm wood/brass "drum shell" visual theme,
built with plain Angular + CSS (no UI/animation libraries).

## Features

- **Header nav** — sticky, drum-hoop styled menu: Metronome, Sheets, Musics, Lessons, Books.
- **Metronome** — BPM slider (30–260), ±1 / ±5 nudge buttons, tap tempo, selectable
  time signature (2/4–7/4), visual beat indicator, and a click sound generated with
  the native Web Audio API (no audio files or libraries required).
- **Sheets** — placeholder page, ready for future content.
- **Musics** — card grid of songs, each with a PDF link and an external link
  (e.g. a reference recording or video).
- **Lessons** / **Books** — card grid with a PNG thumbnail + matching PDF per item.
  Falls back to a generic document icon automatically if an image is missing, so
  you can add real files gradually without breaking the layout.

## Requirements

- [Node.js](https://nodejs.org/) v18.19+, v20.11+, or v22+
- npm (comes with Node)

## Getting started

```bash
# install dependencies
npm install

# run the dev server
npm start
```

Then open **http://localhost:4200**.

## Building for production

```bash
npm run build
```

Output goes to `dist/drum-site/browser` — deploy that folder to any static host
(GitHub Pages, Netlify, Vercel, S3, nginx, etc.).

## Adding your own content

Content lives as plain arrays inside each page's component — no CMS or backend needed.

| Page    | File                                              | Assets folder        |
|---------|---------------------------------------------------|-----------------------|
| Musics  | `src/app/pages/musics/musics.component.ts`         | `src/assets/musics/`  |
| Lessons | `src/app/pages/lessons/lessons.component.ts`       | `src/assets/lessons/` |
| Books   | `src/app/pages/books/books.component.ts`           | `src/assets/books/`   |

1. Drop your PDF (and PNG thumbnail, for Lessons/Books) into the matching `src/assets/...` folder.
2. Open the page's `.component.ts` file and add/edit an entry in the `items` array, e.g.:

   ```ts
   {
     title: 'My Song',
     description: 'Optional short description.',
     pdfPath: 'assets/musics/my-song.pdf',
     linkUrl: 'https://example.com/video',
     linkLabel: 'Watch performance',
   }
   ```

3. Save — the dev server hot-reloads automatically.

The shared item shape (`LibraryItem`) lives in `src/app/models/library-item.ts`
and is used by `Musics`, `Lessons`, and `Books` via the reusable
`app-file-list` component (`src/app/components/file-list/`).

## Project structure

```
src/app/
├── components/
│   ├── header/         # top nav bar
│   └── file-list/       # reusable card grid for Musics/Lessons/Books
├── models/
│   └── library-item.ts  # shared data shape for list items
├── pages/
│   ├── metronome/        # metronome tool
│   ├── sheets/           # empty placeholder page
│   ├── musics/
│   ├── lessons/
│   └── books/
├── app.routes.ts
├── app.component.*
└── app.config.ts
```

## Tech

- Angular 18 (standalone components, no NgModules)
- Plain CSS with custom properties for theming — no Bootstrap/Tailwind/Material
- Native Web Audio API for the metronome click — no audio library

## License

Use freely for your own drum practice site.
