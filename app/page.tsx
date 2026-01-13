'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import styles from './page.module.css'

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
  const [outputFileName, setOutputFileName] = useState('robocop-alupigus')
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

    const pdfFilesArray = Array.from(files).filter(
      (file) => file.type === 'application/pdf'
    )

    // Validate total number of files (existing + new)
    const totalFiles = pdfFiles.length + pdfFilesArray.length
    if (totalFiles > maxFiles) {
      alert(
        `Maximum ${maxFiles} file${maxFiles > 1 ? 's' : ''} allowed. You are trying to add ${pdfFilesArray.length} file${pdfFilesArray.length > 1 ? 's' : ''}, but you already have ${pdfFiles.length} file${pdfFiles.length > 1 ? 's' : ''}.`
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
        `The following file${oversizedFiles.length > 1 ? 's' : ''} exceed${oversizedFiles.length > 1 ? '' : 's'} the maximum size of ${maxFileSizeMB}MB:\n${oversizedFiles.join('\n')}`
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

  const mergePDFs = useCallback(async () => {
    if (pdfFiles.length === 0) return

    setIsMerging(true)
    try {
      const mergedPdf = await PDFDocument.create()
      
      // Embed a font for the watermark
      const font = await mergedPdf.embedFont(StandardFonts.HelveticaBold)

      for (const pdfFile of pdfFiles) {
        const arrayBuffer = await pdfFile.file.arrayBuffer()
        const pdf = await PDFDocument.load(arrayBuffer)
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
        pages.forEach((page) => {
          mergedPdf.addPage(page)
        })
      }

      // Add watermark to all pages
      const pages = mergedPdf.getPages()
      const watermarkText = process.env.NEXT_PUBLIC_WATERMARK_TEXT || 'ROBOCOP ALUPIGUS'
      
      pages.forEach((page) => {
        const { width, height } = page.getSize()
        
        // Calculate text dimensions
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
      })

      const pdfBytes = await mergedPdf.save()
      // Convert Uint8Array to ArrayBuffer for Blob constructor
      const arrayBuffer = pdfBytes.buffer.slice(
        pdfBytes.byteOffset,
        pdfBytes.byteOffset + pdfBytes.byteLength
      )
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
  }, [pdfFiles, outputFileName])

  return (
    <main className={styles.main}>
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
            accept="application/pdf"
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
                ? 'Drop PDF files here'
                : 'Click or drag PDF files here to upload'}
            </p>
          </div>
        </div>

        {pdfFiles.length > 0 && (
          <div className={styles.fileList}>
            <h2 className={styles.fileListTitle}>
              PDF Files ({pdfFiles.length})
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
                placeholder="robocop-alupigus"
              />
              <p className={styles.outputFileNameHint}>
                Will be saved as: {sanitizeFileName(outputFileName)}
              </p>
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
