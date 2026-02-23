<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6 overflow-hidden">
    <!-- Day Header -->
    <div class="py-3 px-4 border-b dark:border-gray-700 text-center">
      <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ dayViewHeader.dayName }}</div>
      <div
        :class="[
          'text-2xl font-bold mt-0.5',
          dayViewHeader.isToday ? 'text-purple-600 dark:text-purple-400' : 'text-gray-800 dark:text-white'
        ]"
      >
        {{ dayViewHeader.dayNum }}
      </div>
    </div>

    <!-- All-Day Events -->
    <div v-if="dayAllDayEvents.length > 0" class="px-4 py-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">All Day</div>
      <div class="flex flex-wrap gap-1">
        <div
          v-for="event in dayAllDayEvents"
          :key="event.id"
          :class="`bg-${event.color}-500 text-white text-xs py-1 px-2 rounded cursor-pointer hover:opacity-80`"
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
          <div class="h-16 border-b border-r dark:border-gray-700 px-2 text-xs text-gray-500 dark:text-gray-400 text-right pr-3 pt-1">
            {{ formatHour(hour) }}
          </div>
          <div class="h-16 border-b dark:border-gray-700 relative">
            <!-- Timed events -->
            <div
              v-for="event in getTimedEventsForDayViewHour(currentDate, hour)"
              :key="event.id"
              :class="`absolute left-1 right-1 bg-${event.color}-500 text-white text-xs rounded cursor-pointer hover:opacity-80 z-10 overflow-hidden px-2 py-1`"
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
</script>
