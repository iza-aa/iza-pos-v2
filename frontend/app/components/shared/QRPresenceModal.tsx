'use client'

import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { 
  XMarkIcon, 
  ClipboardDocumentIcon,
  ArrowDownTrayIcon,
  PrinterIcon
} from '@heroicons/react/24/outline'

interface QRPresenceModalProps {
  isOpen: boolean
  onClose: () => void
  presenceCode: string
  expiresAt: Date | null
  remainingSeconds: number
}

export default function QRPresenceModal({
  isOpen,
  onClose,
  presenceCode,
  expiresAt,
  remainingSeconds
}: QRPresenceModalProps) {
  const qrRef = useRef<HTMLDivElement>(null)

  if (!isOpen) return null

  const handleCopyCode = () => {
    navigator.clipboard.writeText(presenceCode)
    alert('Kode berhasil dicopy!')
  }

  const handleDownloadQR = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    canvas.width = 300
    canvas.height = 300

    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 300, 300)
      const pngFile = canvas.toDataURL('image/png')
      
      const downloadLink = document.createElement('a')
      downloadLink.download = `QR-Presence-${presenceCode}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code Presensi - ${presenceCode}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .qr-container {
              text-align: center;
              border: 2px solid #000;
              padding: 30px;
              border-radius: 10px;
            }
            h1 {
              margin-top: 0;
              margin-bottom: 20px;
              font-size: 28px;
            }
            .code {
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 4px;
              margin: 20px 0;
              font-family: monospace;
            }
            .instructions {
              margin-top: 20px;
              font-size: 14px;
              color: #666;
            }
            .expiry {
              margin-top: 10px;
              font-size: 12px;
              color: #f00;
            }
            @media print {
              body {
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>QR Code Presensi</h1>
            ${svgData}
            <div class="code">${presenceCode}</div>
            <div class="instructions">
              Scan QR Code atau masukkan kode di atas<br/>
              untuk melakukan presensi
            </div>
            ${expiresAt ? `
              <div class="expiry">
                Berlaku hingga: ${expiresAt.toLocaleString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            ` : ''}
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">QR Code Presensi</h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center">
          {/* QR Code */}
          <div 
            ref={qrRef}
            className="bg-white p-6 rounded-lg border-4 border-gray-900 mb-4"
          >
            <QRCodeSVG 
              value={presenceCode} 
              size={200}
              level="H"
              includeMargin={false}
            />
          </div>

          {/* Code Display */}
          <div className="bg-gray-50 rounded-lg p-4 w-full mb-4">
            <div className="text-xs text-gray-500 text-center mb-2">Kode Presensi</div>
            <div className="text-3xl font-bold text-center tracking-[0.3em] text-gray-900 font-mono">
              {presenceCode}
            </div>
          </div>

          {/* Timer */}
          {expiresAt && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 w-full mb-4">
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-600 font-semibold">
                  Expired dalam: {formatTimer(remainingSeconds)}
                </span>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="text-sm text-gray-600 text-center mb-6">
            Scan QR Code atau masukkan kode manual<br/>
            untuk melakukan presensi staff
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2 w-full">
            <button
              onClick={handleCopyCode}
              className="flex flex-col items-center gap-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              <ClipboardDocumentIcon className="w-5 h-5 text-gray-700" />
              <span className="text-xs text-gray-700 font-medium">Copy</span>
            </button>
            
            <button
              onClick={handleDownloadQR}
              className="flex flex-col items-center gap-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              <ArrowDownTrayIcon className="w-5 h-5 text-gray-700" />
              <span className="text-xs text-gray-700 font-medium">Download</span>
            </button>
            
            <button
              onClick={handlePrint}
              className="flex flex-col items-center gap-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              <PrinterIcon className="w-5 h-5 text-gray-700" />
              <span className="text-xs text-gray-700 font-medium">Print</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
