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

Create a `.env` file in the root directory with configuration:

```bash
NEXT_PUBLIC_WATERMARK_TEXT=ROBOCOP ALUPIGUS
NEXT_PUBLIC_MAX_FILES=3
NEXT_PUBLIC_MAX_FILE_SIZE_MB=10
```

### Environment Variables

- `NEXT_PUBLIC_WATERMARK_TEXT` - Text to display as watermark on each page (default: "ROBOCOP ALUPIGUS")
- `NEXT_PUBLIC_MAX_FILES` - Maximum number of PDF files that can be uploaded (default: 3)
- `NEXT_PUBLIC_MAX_FILE_SIZE_MB` - Maximum file size per file in megabytes (default: 10)

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
