import { BiQr } from 'react-icons/bi'
import { ReactNode } from 'react'

interface StaffManagerHeaderProps {
  title: string
  description: string
  onGenerateQR: () => void
  children?: ReactNode
}

export default function StaffManagerHeader({ 
  title, 
  description, 
  onGenerateQR,
  children
}: StaffManagerHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        <p className="mt-1 text-sm text-gray-500 max-w-xl">{description}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onGenerateQR}
          className="flex items-center gap-2 h-[42px] px-4 bg-black text-white rounded-xl hover:bg-gray-800 transition"
          title="Generate QR and Code"
        >
          <BiQr className="w-5 h-5" />
          <span className="text-sm font-medium hidden sm:inline">Generate QR</span>
        </button>
        
        {children}
      </div>
    </div>
  )
}
