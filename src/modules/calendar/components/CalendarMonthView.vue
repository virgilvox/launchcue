<template>
  <div class="card mb-6 overflow-hidden">
    <!-- Days of Week Header -->
    <div class="grid grid-cols-7 border-b-2 border-[var(--border-light)]">
      <div v-for="day in daysOfWeek" :key="day" class="py-2 text-center text-sm font-medium text-[var(--text-primary)]">
        {{ day }}
      </div>
    </div>

    <!-- Calendar Days -->
    <div class="grid grid-cols-7 h-[30rem]">
      <div
        v-for="(day, index) in calendarDays"
        :key="index"
        :class="[
          'border-b border-r border-[var(--border-light)] p-1 relative',
          day.isCurrentMonth ? 'bg-[var(--surface-elevated)]' : 'bg-[var(--surface)]',
          day.isToday ? 'font-bold' : ''
        ]"
      >
        <div class="flex justify-between p-1">
          <span
            :class="[
              'text-sm inline-block w-6 h-6 leading-6 text-center rounded-full',
              day.isToday ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-primary)]'
            ]"
          >
            {{ day.date.getDate() }}
          </span>
          <span class="text-xs text-[var(--text-primary)]">{{ getDateInfo(day.date) }}</span>
        </div>

        <!-- Events for this day -->
        <div class="mt-1 space-y-1 max-h-[80%] overflow-y-auto">
          <div
            v-for="event in getEventsForDay(day.date)"
            :key="event.id"
            :class="[getEventBg(event.color), 'text-xs py-1 px-2 truncate cursor-pointer hover:opacity-80']"
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

const colorMap: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-[#3B82F6]', text: 'text-white' },
  green: { bg: 'bg-[#22C55E]', text: 'text-white' },
  red: { bg: 'bg-[#EF4444]', text: 'text-white' },
  orange: { bg: 'bg-[#F97316]', text: 'text-white' },
  purple: { bg: 'bg-[#8B5CF6]', text: 'text-white' },
  yellow: { bg: 'bg-[#EAB308]', text: 'text-[#1A1A1A]' },
  pink: { bg: 'bg-[#EC4899]', text: 'text-white' },
  indigo: { bg: 'bg-[#6366F1]', text: 'text-white' },
};
const getEventBg = (color: string) => {
  const entry = colorMap[color];
  return entry ? `${entry.bg} ${entry.text}` : 'bg-[var(--accent-primary)] text-white';
};
</script>
