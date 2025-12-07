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
    <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 md:mb-6 gap-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">{title}</h1>
        <p className="mt-1 text-xs md:text-sm text-gray-500 max-w-xl">{description}</p>
      </div>

      <div className="flex items-center gap-2 md:gap-3 flex-wrap">
        <button
          onClick={onGenerateQR}
          className="flex items-center gap-2 h-[38px] md:h-[42px] px-3 md:px-4 bg-black text-white rounded-xl hover:bg-gray-800 transition"
          title="Generate QR and Code"
        >
          <BiQr className="w-4 md:w-5 h-4 md:h-5" />
          <span className="text-xs md:text-sm font-medium">Generate QR</span>
        </button>
        
        {children}
      </div>
    </div>
  )
}
