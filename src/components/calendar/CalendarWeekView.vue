<template>
  <div class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] mb-6 overflow-hidden">
    <!-- Week Day Headers -->
    <div class="grid grid-cols-[4rem_repeat(7,1fr)] border-b border-[var(--border-light)]">
      <!-- Empty corner for time gutter -->
      <div class="py-2 border-r border-[var(--border-light)]"></div>
      <div
        v-for="day in weekDays"
        :key="day.dateStr"
        :class="[
          'py-2 text-center border-r border-[var(--border-light)] last:border-r-0',
          day.isToday ? 'bg-[var(--accent-primary-wash)]' : ''
        ]"
      >
        <div class="text-xs font-medium text-[var(--text-secondary)] uppercase">{{ day.dayName }}</div>
        <div
          :class="[
            'text-lg font-semibold mt-0.5',
            day.isToday ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'
          ]"
        >
          {{ day.dayNum }}
        </div>
      </div>
    </div>

    <!-- All-Day Events Row -->
    <div v-if="hasAllDayEventsInWeek" class="grid grid-cols-[4rem_repeat(7,1fr)] border-b border-[var(--border-light)]">
      <div class="px-1 py-1 text-xs text-[var(--text-secondary)] border-r border-[var(--border-light)] flex items-center justify-center">
        All Day
      </div>
      <div
        v-for="day in weekDays"
        :key="'allday-' + day.dateStr"
        class="px-1 py-1 border-r border-[var(--border-light)] last:border-r-0 min-h-[2rem]"
      >
        <div
          v-for="event in getAllDayEventsForDay(day.date)"
          :key="event.id"
          :class="`bg-${event.color}-500 text-white text-xs py-0.5 px-1.5 truncate cursor-pointer hover:opacity-80 mb-0.5`"
          @click="$emit('select-event', event)"
        >
          {{ getEventTitle(event) }}
        </div>
      </div>
    </div>

    <!-- Time Grid -->
    <div class="overflow-y-auto max-h-[32rem]">
      <div class="grid grid-cols-[4rem_repeat(7,1fr)]">
        <template v-for="hour in weekHours" :key="hour">
          <!-- Hour Row -->
          <div class="h-14 border-b border-r border-[var(--border-light)] px-1 text-xs text-[var(--text-secondary)] text-right pr-2 pt-0.5">
            {{ formatHour(hour) }}
          </div>
          <div
            v-for="day in weekDays"
            :key="day.dateStr + '-' + hour"
            :class="[
              'h-14 border-b border-r border-[var(--border-light)] last:border-r-0 relative',
              day.isToday ? 'bg-[var(--accent-primary-wash)]' : ''
            ]"
          >
            <!-- Events positioned by time -->
            <div
              v-for="event in getTimedEventsForDayHour(day.date, hour)"
              :key="event.id"
              :class="`absolute inset-x-0.5 bg-${event.color}-500 text-white text-xs py-0.5 px-1 cursor-pointer hover:opacity-80 z-10 overflow-hidden`"
              :style="getWeekEventStyle(event, hour)"
              @click="$emit('select-event', event)"
            >
              <div class="font-medium truncate">{{ getEventTitle(event) }}</div>
              <div v-if="event.start" class="truncate opacity-80">{{ formatEventTime(event.start) }}</div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface WeekDay {
  date: Date;
  dateStr: string;
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
  weekDays: WeekDay[];
  weekHours: number[];
  hasAllDayEventsInWeek: boolean;
  getAllDayEventsForDay: (date: Date) => CalendarEvent[];
  getTimedEventsForDayHour: (date: Date, hour: number) => CalendarEvent[];
  getWeekEventStyle: (event: CalendarEvent, hour: number) => Record<string, string>;
  getEventTitle: (event: CalendarEvent) => string;
  formatHour: (hour: number) => string;
  formatEventTime: (date: string | Date) => string;
}>();

defineEmits<{
  (e: 'select-event', event: CalendarEvent): void;
}>();
</script>
