<template>
  <div>
    <!-- View Toggle -->
    <div v-if="allowToggle" class="flex justify-end mb-3">
      <div class="inline-flex rounded-md shadow-sm">
        <button
          :class="['btn btn-sm rounded-r-none', currentView === 'table' ? 'btn-primary' : 'btn-outline']"
          @click="currentView = 'table'"
        >
          <TableCellsIcon class="h-4 w-4" />
        </button>
        <button
          :class="['btn btn-sm rounded-l-none -ml-px', currentView === 'card' ? 'btn-primary' : 'btn-outline']"
          @click="currentView = 'card'"
        >
          <Squares2X2Icon class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Table View -->
    <div v-if="currentView === 'table'" class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table>
        <thead>
          <tr>
            <th v-if="selectable" class="w-10">
              <input
                type="checkbox"
                class="form-checkbox"
                :checked="allSelected"
                @change="toggleSelectAll"
              />
            </th>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="[col.class || '', col.sortable ? 'cursor-pointer select-none hover:text-gray-900 dark:hover:text-white' : '']"
              @click="col.sortable && toggleSort(col.key)"
            >
              <span class="inline-flex items-center gap-1">
                {{ col.label }}
                <template v-if="col.sortable && sortKey === col.key">
                  <ChevronUpIcon v-if="sortDirection === 'asc'" class="h-3 w-3" />
                  <ChevronDownIcon v-else class="h-3 w-3" />
                </template>
              </span>
            </th>
            <th v-if="$slots.actions" class="w-20">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in sortedData"
            :key="rowKey ? row[rowKey] : index"
            class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            :class="{ 'cursor-pointer': clickable }"
            @click="clickable && $emit('row-click', row)"
          >
            <td v-if="selectable" @click.stop>
              <input
                type="checkbox"
                class="form-checkbox"
                :checked="selectedIds.has(row[rowKey])"
                @change="toggleSelect(row[rowKey])"
              />
            </td>
            <td v-for="col in columns" :key="col.key" :class="col.tdClass || ''">
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                {{ row[col.key] }}
              </slot>
            </td>
            <td v-if="$slots.actions" @click.stop>
              <slot name="actions" :row="row"></slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Card View -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="(row, index) in sortedData"
        :key="rowKey ? row[rowKey] : index"
        class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
        :class="{ 'cursor-pointer': clickable }"
        @click="clickable && $emit('row-click', row)"
      >
        <slot name="card" :row="row">
          <div v-for="col in columns" :key="col.key" class="mb-2 last:mb-0">
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ col.label }}</span>
            <div class="text-sm text-gray-900 dark:text-gray-100">
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                {{ row[col.key] }}
              </slot>
            </div>
          </div>
        </slot>
      </div>
    </div>

    <!-- Empty State -->
    <slot v-if="!sortedData.length" name="empty">
      <EmptyState
        :title="emptyTitle"
        :description="emptyDescription"
      />
    </slot>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { TableCellsIcon, Squares2X2Icon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import EmptyState from './EmptyState.vue'

const props = defineProps({
  columns: {
    type: Array,
    required: true
    // { key: string, label: string, sortable?: boolean, class?: string, tdClass?: string }
  },
  data: {
    type: Array,
    required: true
  },
  rowKey: {
    type: String,
    default: 'id'
  },
  defaultView: {
    type: String,
    default: 'table',
    validator: (v) => ['table', 'card'].includes(v)
  },
  allowToggle: {
    type: Boolean,
    default: false
  },
  clickable: {
    type: Boolean,
    default: false
  },
  selectable: {
    type: Boolean,
    default: false
  },
  emptyTitle: {
    type: String,
    default: 'No data'
  },
  emptyDescription: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['row-click', 'selection-change'])

const currentView = ref(props.defaultView)
const sortKey = ref('')
const sortDirection = ref('asc')
const selectedIds = ref(new Set())

const sortedData = computed(() => {
  if (!sortKey.value) return props.data
  return [...props.data].sort((a, b) => {
    const aVal = a[sortKey.value]
    const bVal = b[sortKey.value]
    if (aVal == null) return 1
    if (bVal == null) return -1
    const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal
    return sortDirection.value === 'asc' ? cmp : -cmp
  })
})

const allSelected = computed(() =>
  props.data.length > 0 && props.data.every(row => selectedIds.value.has(row[props.rowKey]))
)

const toggleSort = (key) => {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDirection.value = 'asc'
  }
}

const toggleSelect = (id) => {
  const newSet = new Set(selectedIds.value)
  if (newSet.has(id)) {
    newSet.delete(id)
  } else {
    newSet.add(id)
  }
  selectedIds.value = newSet
  emit('selection-change', Array.from(newSet))
}

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(props.data.map(row => row[props.rowKey]))
  }
  emit('selection-change', Array.from(selectedIds.value))
}

watch(() => props.data, () => {
  // Clear selections that no longer exist in data
  const validIds = new Set(props.data.map(row => row[props.rowKey]))
  const cleaned = new Set([...selectedIds.value].filter(id => validIds.has(id)))
  if (cleaned.size !== selectedIds.value.size) {
    selectedIds.value = cleaned
    emit('selection-change', Array.from(cleaned))
  }
})
</script>
