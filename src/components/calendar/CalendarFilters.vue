<template>
  <div class="flex flex-wrap gap-4 mt-4">
    <div class="w-64">
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Client</label>
      <select :value="clientId" @change="onClientChange" class="input select-bordered w-full">
        <option :value="null">All Clients</option>
        <option v-for="client in clients" :key="client.id" :value="client.id" class="text-gray-800 dark:text-white">
          {{ client.name }}
        </option>
      </select>
    </div>

    <div class="w-64">
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Project</label>
      <select :value="projectId" @change="onProjectChange" class="input select-bordered w-full">
        <option :value="null">All Projects</option>
        <option v-for="project in projects" :key="project.id" :value="project.id" class="text-gray-800 dark:text-white">
          {{ project.name }}
        </option>
      </select>
    </div>

    <div class="flex items-end">
      <button @click="emit('clear')" class="btn btn-outline btn-sm">
        Clear Filters
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  clients: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string }>;
  clientId: string | null;
  projectId: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:clientId', value: string | null): void;
  (e: 'update:projectId', value: string | null): void;
  (e: 'clear'): void;
}>();

function onClientChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  emit('update:clientId', value || null);
}

function onProjectChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  emit('update:projectId', value || null);
}
</script>
