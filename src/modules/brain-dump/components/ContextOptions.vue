<template>
  <div class="space-y-3">
    <label class="block text-sm font-medium text-[var(--text-primary)]">Context Options:</label>
    
    <div class="grid grid-cols-2 gap-x-4 gap-y-2">
      <div class="flex items-center">
        <input id="ctxClientInfo" :checked="contextOptions.clientInfo" @change="updateOption('clientInfo', $event.target.checked)" type="checkbox" class="form-checkbox" />
        <label for="ctxClientInfo" class="ml-2 label mb-0">Client Info</label>
      </div>
      <div class="flex items-center">
        <input id="ctxProjectInfo" :checked="contextOptions.projectInfo" @change="updateOption('projectInfo', $event.target.checked)" type="checkbox" class="form-checkbox" />
        <label for="ctxProjectInfo" class="ml-2 label mb-0">Project Info</label>
      </div>
      <div class="flex items-center">
        <input id="ctxTasks" :checked="contextOptions.tasks" @change="updateOption('tasks', $event.target.checked)" type="checkbox" class="form-checkbox" />
        <label for="ctxTasks" class="ml-2 label mb-0">Tasks</label>
      </div>
       <div class="flex items-center">
        <input id="ctxEvents" :checked="contextOptions.calendarEvents" @change="updateOption('calendarEvents', $event.target.checked)" type="checkbox" class="form-checkbox" />
        <label for="ctxEvents" class="ml-2 label mb-0">Calendar Events</label>
      </div>
       <div class="flex items-center">
        <input id="ctxNotes" :checked="contextOptions.allNotes" @change="updateOption('allNotes', $event.target.checked)" type="checkbox" class="form-checkbox" />
        <label for="ctxNotes" class="ml-2 label mb-0">All Notes</label>
      </div>
       <div class="flex items-center">
        <input id="ctxSummaries" :checked="contextOptions.pastSummaries" @change="updateOption('pastSummaries', $event.target.checked)" type="checkbox" class="form-checkbox" />
        <label for="ctxSummaries" class="ml-2 label mb-0">Past Summaries</label>
      </div>
       <div class="flex items-center">
        <input id="ctxCampaigns" :checked="contextOptions.campaigns" @change="updateOption('campaigns', $event.target.checked)" type="checkbox" class="form-checkbox" />
        <label for="ctxCampaigns" class="ml-2 label mb-0">Campaigns</label>
      </div>
    </div>
    
    <div v-if="isLoading" class="text-xs text-[var(--text-secondary)] pt-2">
      Loading context...
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
    contextOptions: {
        type: Object,
        required: true
    },
    isLoading: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:contextOptions']);

const updateOption = (key, value) => {
    emit('update:contextOptions', { ...props.contextOptions, [key]: value });
};
</script> 