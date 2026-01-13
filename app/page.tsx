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
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Initialize theme from document
    const initialTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' || 'dark'
    setTheme(initialTheme)
  }, [])

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])


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
        newFiles.push({
          id: `${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: file.size,
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
    setPdfFiles((prev) => prev.filter((file) => file.id !== id))
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
      
      // Embed a font for the watermark
      const font = await mergedPdf.embedFont(StandardFonts.HelveticaBold)

      for (const pdfFile of pdfFiles) {
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

          // Create a page with the image dimensions
          const imageDims = image.scale(1)
          const page = mergedPdf.addPage([imageDims.width, imageDims.height])

          // Draw the image on the page
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: imageDims.width,
            height: imageDims.height,
          })
        }
      }

      // Embed a regular font for footer text and page numbers
      const regularFont = await mergedPdf.embedFont(StandardFonts.Helvetica)
      
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
  }, [pdfFiles, outputFileName, footerText, displayPageNumber, trackEvent])

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
          Drag and drop PDF files, reorder them, and merge into one
        </p>
        <div className={styles.infoMessage}>
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
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>
            You can also merge images (JPG, JPEG, PNG) along with PDFs. Images will be converted to PDF pages.
          </span>
        </div>
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
                  <div className={styles.fileInfo}>
                    <p className={styles.fileName}>{pdfFile.name}</p>
                    <p className={styles.fileSize}>{formatFileSize(pdfFile.size)}</p>
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
    </main>
  )
}
