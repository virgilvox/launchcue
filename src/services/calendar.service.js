// src/services/calendar.service.js (Revised)
import api, { CALENDAR_EVENT_ENDPOINT, TASK_ENDPOINT } from './api.service';

/**
 * Calendar service for handling calendar events
 */
const calendarService = {
  /**
   * Get events for a specific date range
   * @param {string} startDate - Start date in ISO format
   * @param {string} endDate - End date in ISO format
   * @returns {Promise<Array>} Array of events
   */
  async getEvents(startDate, endDate) {
    try {
      const response = await api.get(CALENDAR_EVENT_ENDPOINT, {
        params: { 
          startDate, 
          endDate 
        }
      });
      
      return response;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  },

  /**
   * Create a new calendar event
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} Created event
   */
  async createEvent(eventData) {
    try {
      const response = await api.post(CALENDAR_EVENT_ENDPOINT, eventData);
      return response;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  },

  /**
   * Update an existing calendar event
   * @param {string} id - Event ID
   * @param {Object} eventData - Updated event data
   * @returns {Promise<Object>} Updated event
   */
  async updateEvent(id, eventData) {
    try {
      const response = await api.put(`${CALENDAR_EVENT_ENDPOINT}?id=${id}`, eventData);
      return response;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  },

  /**
   * Delete a calendar event
   * @param {string} id - Event ID
   * @returns {Promise<void>}
   */
  async deleteEvent(id) {
    try {
      await api.delete(`${CALENDAR_EVENT_ENDPOINT}?id=${id}`);
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  },

  /**
   * Get events for a specific project
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Array of events for the project
   */
  async getEventsByProject(projectId) {
    try {
      const response = await api.get(CALENDAR_EVENT_ENDPOINT, {
        params: { 
          projectId 
        }
      });
      
      return response;
    } catch (error) {
      console.error('Error fetching project calendar events:', error);
      throw error;
    }
  },

  /**
   * Get events for a specific task
   * @param {string} taskId - Task ID
   * @returns {Promise<Array>} Array of events for the task
   */
  async getEventsByTask(taskId) {
    try {
      const response = await api.get(CALENDAR_EVENT_ENDPOINT, {
        params: { 
          taskId 
        }
      });
      
      return response;
    } catch (error) {
      console.error('Error fetching task calendar events:', error);
      throw error;
    }
  },

  // Method to fetch tasks with due dates within a range (for calendar view)
  async getTaskDeadlines(start, end) {
    try {
      // Fetch tasks with due dates between start and end
      // Assuming backend /tasks supports filtering by dueDate range
      const params = { 
        dueDate_gte: start, // Example: Greater than or equal to start date
        dueDate_lte: end    // Example: Less than or equal to end date
      };
      
      // Use TASK_ENDPOINT constant for consistency
      const response = await api.get(TASK_ENDPOINT, { params });
      
      // Handle different response types
      if (!response) {
        console.warn('getTaskDeadlines: No response received');
        return [];
      }
      
      // Handle HTML response (error page) or string responses
      if (typeof response === 'string' || (response && response.toString && response.toString().includes('<!DOCTYPE html>'))) {
        console.warn('getTaskDeadlines: Received HTML or string response instead of JSON array');
        return [];
      }
      
      // Handle non-array responses
      if (!Array.isArray(response)) {
        console.warn('getTaskDeadlines: Expected array but got', typeof response);
        // If response is an object with data property that's an array, use that
        if (response && typeof response === 'object' && Array.isArray(response.data)) {
          return response.data;
        }
        // Otherwise return empty array
        return [];
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching task deadlines:', error);
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
  }
};

export default calendarService; 