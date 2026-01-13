# PDF Merger

A Next.js application for merging multiple PDF files. Drag and drop PDFs, reorder them, and merge into a single PDF file.

## Features

- Drag and drop PDF files
- Reorder PDFs by dragging
- Merge PDFs in the specified order
- Download the merged PDF
- Customizable watermark on every page
- Dark/light theme switcher
- Custom output filename

## Getting Started

First, install the dependencies:

```bash
npm install
```

Create a `.env` file in the root directory with your watermark text:

```bash
NEXT_PUBLIC_WATERMARK_TEXT=ROBOCOP ALUPIGUS
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Build for Production

```bash
npm run build
npm start
```
