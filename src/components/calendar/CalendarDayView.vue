<template>
  <div class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] mb-6 overflow-hidden">
    <!-- Day Header -->
    <div class="py-3 px-4 border-b border-[var(--border-light)] text-center">
      <div class="text-xs font-medium text-[var(--text-secondary)] uppercase">{{ dayViewHeader.dayName }}</div>
      <div
        :class="[
          'text-2xl font-bold mt-0.5',
          dayViewHeader.isToday ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'
        ]"
      >
        {{ dayViewHeader.dayNum }}
      </div>
    </div>

    <!-- All-Day Events -->
    <div v-if="dayAllDayEvents.length > 0" class="px-4 py-2 border-b border-[var(--border-light)] bg-[var(--surface)]">
      <div class="text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase">All Day</div>
      <div class="flex flex-wrap gap-1">
        <div
          v-for="event in dayAllDayEvents"
          :key="event.id"
          :class="[getEventBg(event.color), 'text-white text-xs py-1 px-2 cursor-pointer hover:opacity-80']"
          @click="$emit('select-event', event)"
        >
          {{ getEventTitle(event) }}
        </div>
      </div>
    </div>

    <!-- Time Slots -->
    <div class="overflow-y-auto max-h-[36rem]">
      <div class="grid grid-cols-[5rem_1fr]">
        <template v-for="hour in dayHours" :key="hour">
          <div class="h-16 border-b border-r border-[var(--border-light)] px-2 text-xs text-[var(--text-secondary)] text-right pr-3 pt-1">
            {{ formatHour(hour) }}
          </div>
          <div class="h-16 border-b border-[var(--border-light)] relative">
            <!-- Timed events -->
            <div
              v-for="event in getTimedEventsForDayViewHour(currentDate, hour)"
              :key="event.id"
              :class="[getEventBg(event.color), 'absolute left-1 right-1 text-white text-xs cursor-pointer hover:opacity-80 z-10 overflow-hidden px-2 py-1']"
              :style="getDayEventStyle(event, hour)"
              @click="$emit('select-event', event)"
            >
              <div class="font-medium truncate">{{ getEventTitle(event) }}</div>
              <div class="truncate opacity-80">
                {{ formatEventTime(event.start) }}
                <span v-if="event.end"> - {{ formatEventTime(event.end) }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface DayViewHeader {
  dayName: string;
  dayNum: number;
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
  dayViewHeader: DayViewHeader;
  dayAllDayEvents: CalendarEvent[];
  dayHours: number[];
  currentDate: Date;
  getTimedEventsForDayViewHour: (date: Date, hour: number) => CalendarEvent[];
  getDayEventStyle: (event: CalendarEvent, hour: number) => Record<string, string>;
  getEventTitle: (event: CalendarEvent) => string;
  formatHour: (hour: number) => string;
  formatEventTime: (date: string | Date) => string;
}>();

defineEmits<{
  (e: 'select-event', event: CalendarEvent): void;
}>();

const colorMap: Record<string, string> = {
  blue: 'bg-[#3B82F6]',
  green: 'bg-[#22C55E]',
  red: 'bg-[#EF4444]',
  orange: 'bg-[#F97316]',
  purple: 'bg-[#8B5CF6]',
  yellow: 'bg-[#EAB308]',
  pink: 'bg-[#EC4899]',
  indigo: 'bg-[#6366F1]',
};
const getEventBg = (color: string) => colorMap[color] || 'bg-[var(--accent-primary)]';
</script>
