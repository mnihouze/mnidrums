# MniDrums

A small Angular site for a drummer's practice resources, with a drum-kit themed layout.

## Pages

- **Metronome** — empty placeholder page, ready for you to build out.
- **Sheets** — empty placeholder page.
- **Musics** — a list of songs, each with a PDF (sheet/transcription) and an external link (e.g. a YouTube reference).
- **Lessons** — a list of lessons, each with a PDF handout and a PNG diagram/thumbnail.
- **Books** — a list of reference books, each with a PDF and a PNG cover thumbnail.

## Project structure

```
src/app/
  components/
    header/        header + nav menu (Metronome, Sheets, Musics, Lessons, Books)
    file-list/      reusable grid used by Musics, Lessons, Books
  models/
    library-item.ts  shared shape for list items (title, description, image, pdf, link)
  pages/
    metronome/       empty page
    sheets/          empty page
    musics/          list of songs (pdf + link)
    lessons/         list of lessons (pdf + png)
    books/           list of books (pdf + png)
src/assets/
  musics/    placeholder PDFs — replace with your real files
  lessons/   placeholder PDFs + PNGs — replace with your real files
  books/     placeholder PDFs + PNGs — replace with your real files
```

## Adding your own files

1. Drop your real PDF/PNG files into the matching folder under `src/assets/`.
2. Open the page's component (e.g. `src/app/pages/musics/musics.component.ts`) and edit the `items` array — set `title`, `description`, `imagePath`, `pdfPath`, and (for Musics) `linkUrl` / `linkLabel` to match your files.
3. If an image path is missing or wrong, the card automatically falls back to a simple document icon, so nothing breaks visually while you're filling things in.

## Development

```bash
npm install
npm start        # ng serve, then open http://localhost:4200
```

## Production build

```bash
npm run build     # outputs to dist/mnidrums-site/browser
```

## Notes

- Only Angular's own packages are used (router, forms) — no extra UI/PDF libraries. PDFs open in a new browser tab via a plain `<a href>` link, which every browser can already view natively.
- Styling is plain CSS with a warm wood/brass drum-shell palette, defined as CSS variables in `src/styles.css`.
- The header nav collapses into a simple toggle menu on narrow screens.
