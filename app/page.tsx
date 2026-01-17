'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { PDFDocument, StandardFonts, degrees, rgb, PDFImage } from 'pdf-lib'
import styles from './page.module.css'

declare global {
  interface Window {
    gtag: (
      command: string,
      targetId: string | Date,
      config?: Record<string, any>
    ) => void
    dataLayer: any[]
  }
}

interface PDFFile {
  id: string
  file: File
  name: string
  size: number
  hasCoverPage: boolean
  coverPageText: string
  previewUrl?: string // Object URL for image thumbnails
}

export default function Home() {
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isMerging, setIsMerging] = useState(false)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [outputFileName, setOutputFileName] = useState('combined')
  const [footerText, setFooterText] = useState('')
  const [displayPageNumber, setDisplayPageNumber] = useState(true)
  const [resizeImagesToA4, setResizeImagesToA4] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [fontSize, setFontSize] = useState('')
  const [predefinedDividerTexts, setPredefinedDividerTexts] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Initialize theme from document
    const initialTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' || 'dark'
    setTheme(initialTheme)

    // Load font size from cookies
    const savedFontSize = document.cookie
      .split('; ')
      .find((row) => row.startsWith('divider_font_size='))
      ?.split('=')[1]
    if (savedFontSize) {
      setFontSize(savedFontSize)
    }

    // Load predefined divider texts from cookies
    const savedTexts = document.cookie
      .split('; ')
      .find((row) => row.startsWith('predefined_divider_texts='))
      ?.split('=')[1]
    if (savedTexts) {
      try {
        const decoded = decodeURIComponent(savedTexts)
        const parsed = JSON.parse(decoded)
        if (Array.isArray(parsed)) {
          setPredefinedDividerTexts(parsed)
        }
      } catch (e) {
        console.error('Error parsing predefined divider texts:', e)
      }
    }
  }, [])

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      pdfFiles.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl)
        }
      })
    }
  }, [pdfFiles])


  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return

    // Get validation limits from environment variables
    const maxFiles = parseInt(process.env.NEXT_PUBLIC_MAX_FILES || '3', 10)
    const maxFileSizeMB = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '10', 10)
    const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024 // Convert MB to bytes
    const limitMessage = process.env.NEXT_PUBLIC_LIMIT_MESSAGE || 'LIMITS CAN BE LIFTED BY VICTOR'

    const pdfFilesArray = Array.from(files).filter(
      (file) =>
        file.type === 'application/pdf' ||
        file.type === 'image/jpeg' ||
        file.type === 'image/jpg' ||
        file.type === 'image/png'
    )

    // Validate total number of files (existing + new)
    const totalFiles = pdfFiles.length + pdfFilesArray.length
    if (totalFiles > maxFiles) {
      alert(
        `Maximum ${maxFiles} file${maxFiles > 1 ? 's' : ''} allowed. You are trying to add ${pdfFilesArray.length} file${pdfFilesArray.length > 1 ? 's' : ''}, but you already have ${pdfFiles.length} file${pdfFiles.length > 1 ? 's' : ''}.\n\n${limitMessage}`
      )
      return
    }

    // Validate file sizes
    const oversizedFiles: string[] = []
    const newFiles: PDFFile[] = []

    pdfFilesArray.forEach((file) => {
      if (file.size > maxFileSizeBytes) {
        oversizedFiles.push(file.name)
      } else {
        // Create preview URL for image files
        const isImage = file.type === 'image/jpeg' || file.type === 'image/jpg' || file.type === 'image/png'
        const previewUrl = isImage ? URL.createObjectURL(file) : undefined
        
        newFiles.push({
          id: `${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: file.size,
          hasCoverPage: false,
          coverPageText: '',
          previewUrl,
        })
      }
    })

    if (oversizedFiles.length > 0) {
      alert(
        `The following file${oversizedFiles.length > 1 ? 's' : ''} exceed${oversizedFiles.length > 1 ? '' : 's'} the maximum size of ${maxFileSizeMB}MB:\n${oversizedFiles.join('\n')}\n\n${limitMessage}`
      )
    }

    if (newFiles.length > 0) {
      setPdfFiles((prev) => [...prev, ...newFiles])
    }
  }, [pdfFiles])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect]
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(e.target.files)
    },
    [handleFileSelect]
  )

  const removeFile = useCallback((id: string) => {
    setPdfFiles((prev) => {
      const fileToRemove = prev.find((file) => file.id === id)
      if (fileToRemove?.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl)
      }
      return prev.filter((file) => file.id !== id)
    })
  }, [])

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOverItem = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null) {
      const newFiles = [...pdfFiles]
      const draggedItem = newFiles[draggedIndex]
      newFiles.splice(draggedIndex, 1)
      newFiles.splice(dragOverIndex, 0, draggedItem)
      setPdfFiles(newFiles)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDropItem = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (draggedIndex !== null && draggedIndex !== index) {
      const newFiles = [...pdfFiles]
      const draggedItem = newFiles[draggedIndex]
      newFiles.splice(draggedIndex, 1)
      newFiles.splice(index, 0, draggedItem)
      setPdfFiles(newFiles)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const sanitizeFileName = (fileName: string): string => {
    // Convert to lowercase
    let sanitized = fileName.toLowerCase()
    
    // Remove file extension if present
    sanitized = sanitized.replace(/\.pdf$/, '')
    
    // Replace spaces and special characters with dashes
    sanitized = sanitized.replace(/[^a-z0-9]+/g, '-')
    
    // Remove leading/trailing dashes
    sanitized = sanitized.replace(/^-+|-+$/g, '')
    
    // Ensure it's not empty
    if (!sanitized) {
      sanitized = 'merged'
    }
    
    // Add .pdf extension
    return `${sanitized}.pdf`
  }

  const trackEvent = useCallback((eventName: string, parameters?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, parameters)
    }
  }, [])

  const mergePDFs = useCallback(async () => {
    if (pdfFiles.length === 0) return

    // Track merge button click with file count and footer text
    trackEvent('merge_pdf_clicked', {
      file_count: pdfFiles.length,
      footer_text: footerText || '(empty)',
      has_footer_text: footerText.length > 0,
      display_page_number: displayPageNumber,
    })

    setIsMerging(true)
    try {
      const mergedPdf = await PDFDocument.create()
      
      // Embed fonts for watermark, cover pages, and footer
      const font = await mergedPdf.embedFont(StandardFonts.HelveticaBold)
      const regularFont = await mergedPdf.embedFont(StandardFonts.Helvetica)

      for (const pdfFile of pdfFiles) {
        // Add cover page if checkbox is checked and text is provided
        if (pdfFile.hasCoverPage && pdfFile.coverPageText.trim()) {
          // Create a standard letter-size page for cover (8.5 x 11 inches = 612 x 792 points)
          const coverPage = mergedPdf.addPage([612, 792])
          const { width, height } = coverPage.getSize()
          
          // Get font size from cookies or environment variable, default to 24
          const savedFontSize = document.cookie
            .split('; ')
            .find((row) => row.startsWith('divider_font_size='))
            ?.split('=')[1]
          const coverFontSize = savedFontSize
            ? parseInt(savedFontSize, 10)
            : parseInt(process.env.NEXT_PUBLIC_COVER_PAGE_FONT_SIZE || '24', 10)
          
          // Split text by | to create multiple lines
          const textLines = pdfFile.coverPageText.split('|').map((line) => line.trim())
          const lineHeight = regularFont.heightAtSize(coverFontSize) * 1.2 // 1.2 line spacing
          const totalHeight = textLines.length * lineHeight
          
          // Calculate starting Y position to center all lines vertically
          const startY = (height + totalHeight) / 2
          
          // Draw each line, centered horizontally
          textLines.forEach((line, lineIndex) => {
            if (line) {
              const lineWidth = regularFont.widthOfTextAtSize(line, coverFontSize)
              const x = (width - lineWidth) / 2
              const y = startY - (lineIndex * lineHeight)
              
              coverPage.drawText(line, {
                x,
                y,
                size: coverFontSize,
                font: regularFont,
                color: rgb(0, 0, 0),
              })
            }
          })
        }

        const arrayBuffer = await pdfFile.file.arrayBuffer()
        const fileType = pdfFile.file.type

        if (fileType === 'application/pdf') {
          // Handle PDF files
          const pdf = await PDFDocument.load(arrayBuffer)
          const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
          pages.forEach((page) => {
            mergedPdf.addPage(page)
          })
        } else if (
          fileType === 'image/jpeg' ||
          fileType === 'image/jpg' ||
          fileType === 'image/png'
        ) {
          // Handle image files - convert to PDF page
          let image: PDFImage
          if (fileType === 'image/png') {
            image = await mergedPdf.embedPng(arrayBuffer)
          } else {
            image = await mergedPdf.embedJpg(arrayBuffer)
          }

          // Get original image dimensions
          const imageDims = image.scale(1)
          let imageWidth = imageDims.width
          let imageHeight = imageDims.height
          let pageWidth = imageWidth
          let pageHeight = imageHeight
          let x = 0
          let y = 0

          // Resize to A4 if checkbox is enabled
          if (resizeImagesToA4) {
            // A4 dimensions in points (portrait: 595.28 x 841.89)
            const A4_WIDTH = 595.28
            const A4_HEIGHT = 841.89

            // Calculate scale ratios for both dimensions
            const widthScaleRatio = A4_WIDTH / imageWidth
            const heightScaleRatio = A4_HEIGHT / imageHeight

            // Use the smaller scale ratio to ensure image fits within A4 bounds
            const scaleRatio = Math.min(widthScaleRatio, heightScaleRatio)

            // Only resize if image is larger than A4 in at least one dimension
            if (scaleRatio < 1) {
              imageWidth = imageWidth * scaleRatio
              imageHeight = imageHeight * scaleRatio
            }

            // Create an A4 page
            pageWidth = A4_WIDTH
            pageHeight = A4_HEIGHT

            // Center the image on the page
            x = (A4_WIDTH - imageWidth) / 2
            y = (A4_HEIGHT - imageHeight) / 2
          }

          // Create a page with calculated dimensions
          const page = mergedPdf.addPage([pageWidth, pageHeight])

          // Draw the image on the page
          page.drawImage(image, {
            x,
            y,
            width: imageWidth,
            height: imageHeight,
          })
        }
      }

      // Add watermark to all pages
      const pages = mergedPdf.getPages()
      const watermarkText = process.env.NEXT_PUBLIC_WATERMARK_TEXT || ''
      
      pages.forEach((page, index) => {
        const { width, height } = page.getSize()
        
        // Add watermark
        if (watermarkText) {
          const fontSize = Math.min(width, height) * 0.15 // 15% of the smaller dimension
          const textWidth = font.widthOfTextAtSize(watermarkText, fontSize)
          const textHeight = font.heightAtSize(fontSize)
          
          // Center the watermark on the page
          const x = (width - textWidth) / 2
          const y = (height + textHeight) / 2
          
          // Draw watermark with rotation and transparency
          page.drawText(watermarkText, {
            x,
            y,
            size: fontSize,
            font: font,
            color: rgb(0.8, 0.8, 0.8), // Light gray color
            opacity: 0.6, // 60% opacity (less transparent)
            rotate: degrees(-45), // -45 degrees rotation
          })
        }
        
        // Add footer text and page number
        const footerFontSize = 10
        const footerY = 30 // Position from bottom
        const pageNumber = index + 1
        
        // Draw footer text (centered, one line above page number)
        if (footerText) {
          const footerTextWidth = regularFont.widthOfTextAtSize(footerText, footerFontSize)
          const footerTextX = (width - footerTextWidth) / 2
          page.drawText(footerText, {
            x: footerTextX,
            y: footerY + (displayPageNumber ? 15 : 0), // One line above page number if page number is displayed
            size: footerFontSize,
            font: regularFont,
            color: rgb(0, 0, 0),
          })
        }
        
        // Draw page number (centered at bottom)
        if (displayPageNumber) {
          const pageNumberText = `Page ${pageNumber}`
          const pageNumberWidth = regularFont.widthOfTextAtSize(pageNumberText, footerFontSize)
          const pageNumberX = (width - pageNumberWidth) / 2
          page.drawText(pageNumberText, {
            x: pageNumberX,
            y: footerY,
            size: footerFontSize,
            font: regularFont,
            color: rgb(0, 0, 0),
          })
        }
      })

      const pdfBytes = await mergedPdf.save()
      // Convert Uint8Array to ArrayBuffer for Blob constructor
      const arrayBuffer = pdfBytes.buffer.slice(
        pdfBytes.byteOffset,
        pdfBytes.byteOffset + pdfBytes.byteLength
      ) as ArrayBuffer
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = sanitizeFileName(outputFileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error merging PDFs:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`An error occurred while merging PDFs: ${errorMessage}. Please try again.`)
    } finally {
      setIsMerging(false)
    }
  }, [pdfFiles, outputFileName, footerText, displayPageNumber, resizeImagesToA4, trackEvent])

  return (
    <main className={styles.main}>
      <a
        href="https://www.buymeacoffee.com/victoru"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.buyMeCoffeeButton}
        aria-label="Buy me a coffee"
        onClick={() => {
          if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'buy_me_coffee_clicked', {
              link_url: 'https://www.buymeacoffee.com/victoru',
            })
          }
        }}
      >
        <img
          src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
          alt="Buy Me A Coffee"
          className={styles.bmcButtonImage}
        />
      </a>
      <button
        className={styles.helpButton}
        onClick={() => setShowHelpModal(true)}
        aria-label="Help"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      <button
        className={styles.settingsButton}
        onClick={() => setShowSettingsModal(true)}
        aria-label="Settings"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      <button
        className={styles.themeToggle}
        onClick={toggleTheme}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>
      <div className={styles.container}>
        <h1 className={styles.title}>PDF Merger</h1>
        <p className={styles.subtitle}>
          Drag and drop PDF or image files, reorder them, and merge into a single PDF
        </p>
        <div className={styles.securityMessage}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <div>
            <strong>100% Secure & Private:</strong> All file processing happens entirely in your browser. Your files never leave your device and are never uploaded to any server. Everything is processed locally for maximum privacy and security.
          </div>
        </div>

        <div
          className={`${styles.dropZone} ${isDragging ? styles.dragOver : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/jpg,image/png"
            multiple
            onChange={handleFileInputChange}
            className={styles.fileInput}
          />
          <div className={styles.dropZoneContent}>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className={styles.dropZoneText}>
              {isDragging
                ? 'Drop PDF files or images here'
                : 'Click or drag PDF files and images (JPG, PNG) here to upload'}
            </p>
          </div>
        </div>

        {pdfFiles.length > 0 && (
          <div className={styles.fileList}>
            <h2 className={styles.fileListTitle}>
              Files ({pdfFiles.length})
            </h2>
            <div className={styles.files}>
              {pdfFiles.map((pdfFile, index) => (
                <div
                  key={pdfFile.id}
                  className={`${styles.fileItem} ${
                    dragOverIndex === index ? styles.dragOverItem : ''
                  } ${draggedIndex === index ? styles.dragging : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOverItem(e, index)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDropItem(e, index)}
                >
                  <div className={styles.fileIcon}>
                    {pdfFile.file.type === 'application/pdf' ? (
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    ) : pdfFile.previewUrl ? (
                      <img
                        src={pdfFile.previewUrl}
                        alt={pdfFile.name}
                        className={styles.fileThumbnail}
                      />
                    ) : (
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    )}
                  </div>
                  <div className={styles.fileContent}>
                    <div className={styles.coverPageControls}>
                      <label className={styles.coverPageLabel}>
                        <input
                          type="checkbox"
                          checked={pdfFile.hasCoverPage}
                          onChange={(e) => {
                            e.stopPropagation()
                            setPdfFiles((prev) =>
                              prev.map((file) =>
                                file.id === pdfFile.id
                                  ? { ...file, hasCoverPage: e.target.checked }
                                  : file
                              )
                            )
                          }}
                          className={styles.coverPageCheckbox}
                        />
                        <span>Divider page</span>
                      </label>
                      {pdfFile.hasCoverPage && (
                        <>
                          <select
                            className={styles.coverPageSelect}
                            value={
                              pdfFile.coverPageText && predefinedDividerTexts.includes(pdfFile.coverPageText)
                                ? pdfFile.coverPageText
                                : pdfFile.coverPageText
                                ? 'other'
                                : ''
                            }
                            onChange={(e) => {
                              const value = e.target.value
                              if (value === 'other') {
                                // Keep current text if it exists, otherwise clear
                                if (!pdfFile.coverPageText || predefinedDividerTexts.includes(pdfFile.coverPageText)) {
                                  setPdfFiles((prev) =>
                                    prev.map((file) =>
                                      file.id === pdfFile.id
                                        ? { ...file, coverPageText: '' }
                                        : file
                                    )
                                  )
                                }
                              } else if (value === '') {
                                setPdfFiles((prev) =>
                                  prev.map((file) =>
                                    file.id === pdfFile.id
                                      ? { ...file, coverPageText: '' }
                                      : file
                                  )
                                )
                              } else {
                                setPdfFiles((prev) =>
                                  prev.map((file) =>
                                    file.id === pdfFile.id
                                      ? { ...file, coverPageText: value }
                                      : file
                                  )
                                )
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onFocus={(e) => e.stopPropagation()}
                          >
                            <option value="">Select divider text...</option>
                            {predefinedDividerTexts.map((text, idx) => (
                              <option key={idx} value={text}>
                                {text}
                              </option>
                            ))}
                            <option value="other">Other...</option>
                          </select>
                          {(!pdfFile.coverPageText || !predefinedDividerTexts.includes(pdfFile.coverPageText)) && (
                            <input
                              type="text"
                              className={styles.coverPageInput}
                              value={pdfFile.coverPageText}
                              onChange={(e) => {
                                setPdfFiles((prev) =>
                                  prev.map((file) =>
                                    file.id === pdfFile.id
                                      ? { ...file, coverPageText: e.target.value }
                                      : file
                                  )
                                )
                              }}
                              placeholder="Enter custom divider text"
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => e.stopPropagation()}
                            />
                          )}
                        </>
                      )}
                    </div>
                    <div className={styles.fileInfo}>
                      <p className={styles.fileName}>{pdfFile.name}</p>
                      <p className={styles.fileSize}>{formatFileSize(pdfFile.size)}</p>
                    </div>
                  </div>
                  <div className={styles.fileActions}>
                    <span className={styles.fileOrder}>{index + 1}</span>
                    <button
                      className={styles.removeButton}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(pdfFile.id)
                      }}
                      aria-label="Remove file"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.outputFileNameSection}>
              <label htmlFor="outputFileName" className={styles.outputFileNameLabel}>
                Output File Name
              </label>
              <input
                id="outputFileName"
                type="text"
                className={styles.outputFileNameInput}
                value={outputFileName}
                onChange={(e) => setOutputFileName(e.target.value)}
                placeholder="combined"
              />
              <p className={styles.outputFileNameHint}>
                Will be saved as: {sanitizeFileName(outputFileName)}
              </p>
            </div>
            <div className={styles.footerSection}>
              <label htmlFor="footerText" className={styles.footerLabel}>
                Footer Text
              </label>
              <input
                id="footerText"
                type="text"
                className={styles.footerInput}
                value={footerText}
                onChange={(e) => {
                  const newValue = e.target.value
                  setFooterText(newValue)
                  // Track footer text input (debounced to avoid too many events)
                  if (typeof window !== 'undefined' && window.gtag) {
                    clearTimeout((window as any).footerTextTimeout)
                    ;(window as any).footerTextTimeout = setTimeout(() => {
                      window.gtag('event', 'footer_text_entered', {
                        footer_text: newValue || '(empty)',
                        footer_text_length: newValue.length,
                      })
                    }, 1000) // Track after 1 second of no typing
                  }
                }}
                placeholder="Enter footer text (optional)"
              />
            </div>
            <div className={styles.pageNumberToggleSection}>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={displayPageNumber}
                  onChange={(e) => setDisplayPageNumber(e.target.checked)}
                  className={styles.toggleInput}
                />
                <span className={styles.toggleText}>Display page number</span>
              </label>
            </div>
            <div className={styles.pageNumberToggleSection}>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={resizeImagesToA4}
                  onChange={(e) => setResizeImagesToA4(e.target.checked)}
                  className={styles.toggleInput}
                />
                <span className={styles.toggleText}>Resize images to fit A4 paper</span>
              </label>
            </div>
            <button
              className={styles.mergeButton}
              onClick={mergePDFs}
              disabled={isMerging || pdfFiles.length === 0}
            >
              {isMerging ? 'Merging...' : 'Merge PDFs'}
            </button>
          </div>
        )}
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className={styles.modalOverlay} onClick={() => setShowHelpModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.modalClose}
              onClick={() => setShowHelpModal(false)}
              aria-label="Close"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h2 className={styles.modalTitle}>Feature Guide</h2>
            <div className={styles.modalBody}>
              <div className={styles.helpSection}>
                <h3 className={styles.helpSectionTitle}>Divider Page</h3>
                <p className={styles.helpText}>
                  A divider page is a blank page inserted before a file in the merged PDF. 
                  Check the "Divider page" checkbox and enter text to create a cover/divider page.
                </p>
                <p className={styles.helpText}>
                  <strong>Multi-line text:</strong> Use the pipe character (<code>|</code>) to break text into multiple lines. 
                  For example: <code>Line 1|Line 2|Line 3</code> will create three centered lines on the divider page.
                </p>
              </div>

              <div className={styles.helpSection}>
                <h3 className={styles.helpSectionTitle}>Output Filename</h3>
                <p className={styles.helpText}>
                  Enter the name for your merged PDF file. The filename will be automatically sanitized:
                  converted to lowercase, spaces and special characters replaced with dashes, and the .pdf extension added.
                </p>
              </div>

              <div className={styles.helpSection}>
                <h3 className={styles.helpSectionTitle}>Footer Text</h3>
                <p className={styles.helpText}>
                  Enter text to display at the bottom of every page in the merged PDF. 
                  The footer text appears centered, one line above the page number (if page numbers are enabled).
                </p>
              </div>

              <div className={styles.helpSection}>
                <h3 className={styles.helpSectionTitle}>Display Page Number</h3>
                <p className={styles.helpText}>
                  Toggle this checkbox to show or hide page numbers on each page. 
                  When enabled, page numbers appear at the bottom center of each page (e.g., "Page 1", "Page 2").
                </p>
              </div>

              <div className={styles.helpSection}>
                <h3 className={styles.helpSectionTitle}>Resize Images to Fit A4 Paper</h3>
                <p className={styles.helpText}>
                  When enabled, this checkbox automatically resizes large images to fit within A4 paper dimensions (595.28 x 841.89 points) 
                  while maintaining the original aspect ratio. Images are centered on an A4 page. 
                  If disabled, images will be added at their original size.
                </p>
              </div>

              <div className={styles.helpSection}>
                <h3 className={styles.helpSectionTitle}>Settings</h3>
                <p className={styles.helpText}>
                  Use the settings icon (gear) to customize the divider page font size and create predefined divider text options. 
                  These settings are saved in cookies on your computer and are specific to each browser. 
                  <strong>Settings will not carry over between different computers or browsers.</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSettingsModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.modalClose}
              onClick={() => setShowSettingsModal(false)}
              aria-label="Close"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h2 className={styles.modalTitle}>Settings</h2>
            <div className={styles.modalBody}>
              <div className={styles.settingsSection}>
                <label className={styles.settingsLabel}>
                  Divider Page Font Size (points)
                </label>
                <input
                  type="number"
                  className={styles.settingsInput}
                  value={fontSize}
                  onChange={(e) => {
                    const value = e.target.value
                    setFontSize(value)
                    if (value) {
                      document.cookie = `divider_font_size=${value}; path=/; max-age=31536000`
                    } else {
                      document.cookie = 'divider_font_size=; path=/; max-age=0'
                    }
                  }}
                  placeholder={process.env.NEXT_PUBLIC_COVER_PAGE_FONT_SIZE || '24'}
                />
                <p className={styles.settingsHint}>
                  Leave empty to use default from environment ({process.env.NEXT_PUBLIC_COVER_PAGE_FONT_SIZE || '24'}pt)
                </p>
              </div>

              <div className={styles.settingsSection}>
                <label className={styles.settingsLabel}>
                  Predefined Divider Texts
                </label>
                <div className={styles.predefinedTextsList}>
                  {predefinedDividerTexts.map((text, index) => (
                    <div key={index} className={styles.predefinedTextItem}>
                      <input
                        type="text"
                        className={styles.predefinedTextInput}
                        value={text}
                        onChange={(e) => {
                          const newTexts = [...predefinedDividerTexts]
                          newTexts[index] = e.target.value
                          setPredefinedDividerTexts(newTexts)
                          document.cookie = `predefined_divider_texts=${encodeURIComponent(JSON.stringify(newTexts))}; path=/; max-age=31536000`
                        }}
                      />
                      <button
                        className={styles.removeTextButton}
                        onClick={() => {
                          const newTexts = predefinedDividerTexts.filter((_, i) => i !== index)
                          setPredefinedDividerTexts(newTexts)
                          document.cookie = `predefined_divider_texts=${encodeURIComponent(JSON.stringify(newTexts))}; path=/; max-age=31536000`
                        }}
                        aria-label="Remove"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button
                    className={styles.addTextButton}
                    onClick={() => {
                      const newTexts = [...predefinedDividerTexts, '']
                      setPredefinedDividerTexts(newTexts)
                      document.cookie = `predefined_divider_texts=${encodeURIComponent(JSON.stringify(newTexts))}; path=/; max-age=31536000`
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
