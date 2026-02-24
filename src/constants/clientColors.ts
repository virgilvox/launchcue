export interface ClientColor {
  id: string
  hex: string
  label: string
}

export const CLIENT_COLORS: ClientColor[] = [
  { id: 'slate', hex: '#64748B', label: 'Slate' },
  { id: 'red', hex: '#EF4444', label: 'Red' },
  { id: 'orange', hex: '#F97316', label: 'Orange' },
  { id: 'amber', hex: '#F59E0B', label: 'Amber' },
  { id: 'emerald', hex: '#10B981', label: 'Emerald' },
  { id: 'teal', hex: '#14B8A6', label: 'Teal' },
  { id: 'cyan', hex: '#06B6D4', label: 'Cyan' },
  { id: 'blue', hex: '#3B82F6', label: 'Blue' },
  { id: 'violet', hex: '#8B5CF6', label: 'Violet' },
  { id: 'pink', hex: '#EC4899', label: 'Pink' },
]

export function getClientColor(colorId?: string): string {
  if (!colorId) return CLIENT_COLORS[0].hex
  const found = CLIENT_COLORS.find(c => c.id === colorId)
  return found ? found.hex : CLIENT_COLORS[0].hex
}

export function getNextClientColor(existingClients: Array<{ color?: string }>): string {
  const count = existingClients.length
  return CLIENT_COLORS[count % CLIENT_COLORS.length].id
}
