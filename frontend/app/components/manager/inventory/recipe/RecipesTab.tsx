'use client'

import RecipeDishesTab from './dishes'

interface RecipesTabProps {
  viewAsOwner: boolean
}

export default function RecipesTab({ viewAsOwner }: RecipesTabProps) {
  return <RecipeDishesTab viewAsOwner={viewAsOwner} />
}
