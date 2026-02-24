import api, { CALENDAR_EVENT_ENDPOINT, TASK_ENDPOINT } from './api.service';
import type { CalendarEvent, Task } from '@/types/models';
import type { CalendarEventCreateRequest } from '@/types/api';

interface CalendarServiceInterface {
  getEvents(startDate: string, endDate: string): Promise<CalendarEvent[]>;
  createEvent(eventData: CalendarEventCreateRequest): Promise<CalendarEvent>;
  updateEvent(id: string, eventData: Partial<CalendarEventCreateRequest>): Promise<CalendarEvent>;
  deleteEvent(id: string): Promise<void>;
  getEventsByProject(projectId: string): Promise<CalendarEvent[]>;
  getEventsByTask(taskId: string): Promise<CalendarEvent[]>;
  getTaskDeadlines(start: string, end: string): Promise<Task[]>;
}

/**
 * Calendar service for handling calendar events
 */
const calendarService: CalendarServiceInterface = {
  /**
   * Get events for a specific date range
   */
  async getEvents(startDate: string, endDate: string): Promise<CalendarEvent[]> {
    try {
      const response = await api.get<CalendarEvent[]>(CALENDAR_EVENT_ENDPOINT, {
        startDate,
        endDate
      });

      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a new calendar event
   */
  async createEvent(eventData: CalendarEventCreateRequest): Promise<CalendarEvent> {
    try {
      const response = await api.post<CalendarEvent>(CALENDAR_EVENT_ENDPOINT, eventData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update an existing calendar event
   */
  async updateEvent(id: string, eventData: Partial<CalendarEventCreateRequest>): Promise<CalendarEvent> {
    try {
      const response = await api.put<CalendarEvent>(`${CALENDAR_EVENT_ENDPOINT}?id=${id}`, eventData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete a calendar event
   */
  async deleteEvent(id: string): Promise<void> {
    try {
      await api.delete(`${CALENDAR_EVENT_ENDPOINT}?id=${id}`);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get events for a specific project
   */
  async getEventsByProject(projectId: string): Promise<CalendarEvent[]> {
    try {
      const response = await api.get<CalendarEvent[]>(CALENDAR_EVENT_ENDPOINT, {
        projectId
      });

      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get events for a specific task
   */
  async getEventsByTask(taskId: string): Promise<CalendarEvent[]> {
    try {
      const response = await api.get<CalendarEvent[]>(CALENDAR_EVENT_ENDPOINT, {
        taskId
      });

      return response;
    } catch (error) {
      throw error;
    }
  },

  // Method to fetch tasks with due dates within a range (for calendar view)
  async getTaskDeadlines(start: string, end: string): Promise<Task[]> {
    try {
      // Fetch tasks with due dates between start and end
      // Assuming backend /tasks supports filtering by dueDate range
      const params = {
        dueDate_gte: start, // Example: Greater than or equal to start date
        dueDate_lte: end    // Example: Less than or equal to end date
      };

      // Use TASK_ENDPOINT constant for consistency
      const response = await api.get<Task[] | { data: Task[] } | string>(TASK_ENDPOINT, params);

      // Handle different response types
      if (!response) {
        return [];
      }

      // Handle HTML response (error page) or string responses
      if (typeof response === 'string' || (response && response.toString && response.toString().includes('<!DOCTYPE html>'))) {
        return [];
      }

      // Handle non-array responses
      if (!Array.isArray(response)) {
        // If response is an object with data property that's an array, use that
        if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
          return response.data;
        }
        // Otherwise return empty array
        return [];
      }

      return response;
    } catch (error) {
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
  }
};

export default calendarService;
