import { ref, computed, type Ref, type ComputedRef } from 'vue'

export interface FilterConfig<T> {
  searchFields?: (keyof T)[]
  defaultSort?: keyof T
  defaultDirection?: 'asc' | 'desc'
  customFilter?: (item: T, filters: Record<string, any>) => boolean
}

export function useListFilters<T extends Record<string, any>>(
  items: Ref<T[]> | ComputedRef<T[]>,
  config: FilterConfig<T> = {}
) {
  const searchQuery = ref('')
  const filters = ref<Record<string, any>>({})
  const sortBy = ref<string>((config.defaultSort as string) ?? '')
  const sortDirection = ref<'asc' | 'desc'>(config.defaultDirection ?? 'asc')

  const filtered = computed(() => {
    let result = [...items.value]

    // Text search across searchFields
    if (searchQuery.value && config.searchFields?.length) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(item =>
        config.searchFields!.some(field => {
          const val = item[field]
          return typeof val === 'string' && val.toLowerCase().includes(query)
        })
      )
    }

    // Custom filter function
    if (config.customFilter) {
      result = result.filter(item => config.customFilter!(item, filters.value))
    }

    return result
  })

  const sorted = computed(() => {
    if (!sortBy.value) return filtered.value
    return [...filtered.value].sort((a, b) => {
      const aVal = a[sortBy.value] ?? ''
      const bVal = b[sortBy.value] ?? ''
      const cmp = typeof aVal === 'string'
        ? aVal.localeCompare(bVal as string)
        : (aVal as number) - (bVal as number)
      return sortDirection.value === 'asc' ? cmp : -cmp
    })
  })

  const hasActiveFilters = computed(() => {
    return searchQuery.value !== '' || Object.values(filters.value).some(v => v !== '' && v != null)
  })

  function clearFilters() {
    searchQuery.value = ''
    filters.value = {}
  }

  function toggleSort(field: string) {
    if (sortBy.value === field) {
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortBy.value = field
      sortDirection.value = 'asc'
    }
  }

  return {
    searchQuery,
    filters,
    sortBy,
    sortDirection,
    filtered,
    sorted,
    hasActiveFilters,
    clearFilters,
    toggleSort,
  }
}
