interface ActivityLogHeaderProps {
  title: string
  description: string
}

export default function ActivityLogHeader({ title, description }: ActivityLogHeaderProps) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800">{title}</h1>
      <p className="text-xs md:text-sm text-gray-500">{description}</p>
    </div>
  )
}
