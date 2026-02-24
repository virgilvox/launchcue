import { useClientStore } from '@/stores/client'
import { useProjectStore } from '@/stores/project'
import { getClientColor } from '@/constants/clientColors'

export function useEntityLookup() {
  const clientStore = useClientStore()
  const projectStore = useProjectStore()

  function getClientName(clientId: string | null | undefined): string {
    if (!clientId) return '—'
    const client = clientStore.clients.find(c => c.id === clientId)
    return client ? client.name : '—'
  }

  function getProjectName(projectId: string | null | undefined): string {
    if (!projectId) return '—'
    const project = projectStore.projects.find(p => p.id === projectId)
    return project ? project.title : '—'
  }

  function getClientColorId(clientId: string | null | undefined): string {
    if (!clientId) return 'slate'
    const client = clientStore.clients.find(c => c.id === clientId)
    return client?.color || 'slate'
  }

  function getClientHex(clientId: string | null | undefined): string {
    return getClientColor(getClientColorId(clientId))
  }

  return { getClientName, getProjectName, getClientColorId, getClientHex }
}
