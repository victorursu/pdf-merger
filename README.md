# PDF Merger

A Next.js application for merging multiple PDF files and images (JPG, JPEG, PNG). Drag and drop files, reorder them, and merge into a single PDF file. Perfect for medical offices, accounting firms, and other professional environments where heavy document merging is necessary.

**Created by [Victor Ursu](https://buymeacoffee.com/victoru)**

If you find this project useful, consider supporting its development:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/victoru)

![PDF Merger Application](images/pdf-merger-screenshot.jpg)

## Features

- **Merge PDFs and Images**: Merge multiple PDF files and images (JPG, JPEG, PNG) into a single PDF document
- **Drag and Drop Interface**: Easily upload files by dragging and dropping them into the application
- **Reorder Files**: Reorder files by dragging them to your preferred position
- **Divider/Cover Pages**: Insert divider or cover pages before any file in your merge. These pages can contain customizable text that is vertically and horizontally centered. Use `|` to create multiple lines of text
- **Image Resizing**: Automatically resize large images to fit A4 paper dimensions while maintaining aspect ratio
- **Customizable Watermark**: Add a watermark to every page of the merged document
- **Page Numbering**: Optionally display page numbers on each page
- **Custom Footer Text**: Add custom footer text to every page
- **Custom Output Filename**: Set a custom name for your merged PDF file
- **Dark/Light Theme**: Switch between dark and light themes for comfortable viewing
- **Refresh Divider Texts**: When configured, fetch predefined divider texts from an external service

## Recommended Use Cases

This application is particularly well-suited for:

- **Medical Offices**: Merge patient records, lab reports, X-rays, and medical documents into organized PDF files
- **Accounting Firms**: Combine financial statements, invoices, receipts, and tax documents efficiently
- **Legal Practices**: Organize case files, contracts, and legal documents
- **Real Estate**: Merge property documents, contracts, and inspection reports
- **Any Professional Environment**: Where frequent merging of PDFs and images into organized documents is required

The ability to insert divider/cover pages before any document makes it easy to organize and separate different sections, while the image resizing feature ensures that large images (such as scanned documents or photos) fit properly within standard A4 paper dimensions.

## Getting Started

First, install the dependencies:

```bash
npm install
```

Create a `.env` file in the root directory with configuration:

```bash
NEXT_PUBLIC_WATERMARK_TEXT=ROBOCOP
NEXT_PUBLIC_MAX_FILES=3
NEXT_PUBLIC_MAX_FILE_SIZE_MB=10
NEXT_PUBLIC_LIMIT_MESSAGE=LOREM IPSUM
NEXT_PUBLIC_SHOW_BUY_ME_COFFEE=true
NEXT_PUBLIC_DIVIDER_TEXT_SERVICE=http://emr.docksal.site/pdf-merger-divider.json
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### Environment Variables

- `NEXT_PUBLIC_WATERMARK_TEXT` - Text to display as watermark on each page (default: "ROBOCOP")
- `NEXT_PUBLIC_MAX_FILES` - Maximum number of PDF files that can be uploaded (default: 3)
- `NEXT_PUBLIC_MAX_FILE_SIZE_MB` - Maximum file size per file in megabytes (default: 10)
- `NEXT_PUBLIC_LIMIT_MESSAGE` - Custom message displayed at the end of validation error messages (default: "LIMITS CAN BE LIFTED BY ADMINS")
- `NEXT_PUBLIC_COVER_PAGE_FONT_SIZE` - Font size in points for divider/cover page text (default: 24). Use `|` in divider page text to create line breaks. Divider/cover pages can be inserted before any file in the merge.
- `NEXT_PUBLIC_SHOW_BUY_ME_COFFEE` - Show or hide the "Buy Me a Coffee" button. Set to `false` to hide the button (default: `true`)
- `NEXT_PUBLIC_DIVIDER_TEXT_SERVICE` - URL to a JSON service that provides predefined divider texts. When configured, a refresh button appears next to the help icon that allows users to fetch and update the predefined divider texts from this service. The service must return a JSON object with an `items` array containing divider text strings. See [Divider Text Service](#divider-text-service) for details.
- `NEXT_PUBLIC_GA_ID` - Google Analytics 4 (GA4) Measurement ID for tracking user interactions. When configured, the application will track various events. See [Google Analytics](#google-analytics) for details. Format: `G-XXXXXXXXXX`

## Divider Text Service

When `NEXT_PUBLIC_DIVIDER_TEXT_SERVICE` is configured, a refresh button (🔄) appears in the top-right corner of the application, next to the help icon. Clicking this button fetches divider texts from the configured service and updates the predefined divider texts in the settings.

### JSON Format

The service must return a JSON object with the following structure:

```json
{
  "items": [
    "Divider Text 1|Line 2|Line 3",
    "Another Divider Text",
    "Multi-line|Text|Example"
  ],
  "count": 3
}
```

**Required Fields:**
- `items` (array of strings) - An array of divider text strings. Each string can contain `|` characters to create line breaks when displayed on divider pages.

**Optional Fields:**
- `count` (number) - The number of items in the array. This is optional and can be used for validation or display purposes.

**Example Response:**
```json
{
  "items": [
    "Section 1|Introduction",
    "Section 2|Main Content",
    "Section 3|Conclusion"
  ],
  "count": 3
}
```

**Notes:**
- The service must be accessible via HTTP/HTTPS GET request
- CORS restrictions are handled server-side through the Next.js API route (`/api/divider-texts`)
- If the service is unavailable or returns an invalid format, an error message will be displayed
- Successfully fetched divider texts will overwrite the existing predefined divider texts in the user's settings
- The divider texts are stored in browser cookies and persist across sessions

## Google Analytics

When `NEXT_PUBLIC_GA_ID` is configured with a valid Google Analytics 4 (GA4) Measurement ID, the application will track user interactions and events. This helps you understand how users interact with the application.

### Setup

1. Create a Google Analytics 4 property and get your Measurement ID (format: `G-XXXXXXXXXX`)
2. Add the Measurement ID to your `.env` file:
   ```
   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   ```

### Tracked Events

The following table lists all events tracked by the application:

| Event Name | Trigger | Parameters |
|------------|---------|------------|
| `buy_me_coffee_clicked` | When user clicks the "Buy Me a Coffee" button | `link_url` (string) - The URL of the Buy Me a Coffee page |
| `merge_pdf_clicked` | When user clicks the "Merge PDFs" button | `file_count` (number) - Number of files being merged<br>`footer_text` (string) - The footer text entered (or "(empty)" if none)<br>`has_footer_text` (boolean) - Whether footer text was entered<br>`display_page_number` (boolean) - Whether page numbers are enabled |
| `footer_text_entered` | When user types in the footer text field (debounced after 1 second of no typing) | `footer_text` (string) - The actual text entered (or "(empty)" if cleared)<br>`footer_text_length` (number) - Length of the footer text |

### Viewing Events

To view tracked events in Google Analytics:

1. Go to Google Analytics dashboard
2. Navigate to **Reports** > **Engagement** > **Events**
3. Click on an event to see detailed information and parameters

For more information about setting up and using Google Analytics, visit the [Google Analytics documentation](https://support.google.com/analytics).

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

## Support

If you find this project helpful, please consider supporting its development:

[☕ Buy Me a Coffee](https://buymeacoffee.com/victoru)

Your support helps maintain and improve this tool for everyone!

---

**Created with ❤️ by [Victor Ursu](https://buymeacoffee.com/victoru)**
