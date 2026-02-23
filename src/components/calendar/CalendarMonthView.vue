<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6 overflow-hidden">
    <!-- Days of Week Header -->
    <div class="grid grid-cols-7 border-b dark:border-gray-700">
      <div v-for="day in daysOfWeek" :key="day" class="py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ day }}
      </div>
    </div>

    <!-- Calendar Days -->
    <div class="grid grid-cols-7 h-[30rem]">
      <div
        v-for="(day, index) in calendarDays"
        :key="index"
        :class="[
          'border-b border-r dark:border-gray-700 p-1 relative',
          day.isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900',
          day.isToday ? 'font-bold' : ''
        ]"
      >
        <div class="flex justify-between p-1">
          <span
            :class="[
              'text-sm inline-block w-6 h-6 leading-6 text-center rounded-full',
              day.isToday ? 'bg-primary-500 text-white' : 'text-gray-700 dark:text-gray-300'
            ]"
          >
            {{ day.date.getDate() }}
          </span>
          <span class="text-xs text-gray-700 dark:text-gray-300">{{ getDateInfo(day.date) }}</span>
        </div>

        <!-- Events for this day -->
        <div class="mt-1 space-y-1 max-h-[80%] overflow-y-auto">
          <div
            v-for="event in getEventsForDay(day.date)"
            :key="event.id"
            :class="`bg-${event.color}-500 text-white text-xs py-1 px-2 rounded truncate cursor-pointer hover:opacity-80`"
            @click="$emit('select-event', event)"
          >
            {{ getEventTitle(event) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
}

interface CalendarEvent {
  id: string;
  color: string;
  type?: string;
  projectId?: string;
  title?: string;
  start?: string | Date;
  end?: string | Date;
  [key: string]: any;
}

defineProps<{
  calendarDays: CalendarDay[];
  daysOfWeek: string[];
  getEventsForDay: (date: Date) => CalendarEvent[];
  getEventTitle: (event: CalendarEvent) => string;
  getDateInfo: (date: Date) => string;
}>();

defineEmits<{
  (e: 'select-event', event: CalendarEvent): void;
}>();
</script>
