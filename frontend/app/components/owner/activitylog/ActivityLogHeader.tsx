interface ActivityLogHeaderProps {
  title: string
  description: string
}

export default function ActivityLogHeader({ title, description }: ActivityLogHeaderProps) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  )
}
