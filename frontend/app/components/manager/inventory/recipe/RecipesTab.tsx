'use client'

import RecipeDishesTab from './RecipeDishesTab'

interface RecipesTabProps {
  viewAsOwner: boolean
}

export default function RecipesTab({ viewAsOwner }: RecipesTabProps) {
  return <RecipeDishesTab viewAsOwner={viewAsOwner} />
}
