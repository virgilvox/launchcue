import apiService, { NOTE_ENDPOINT } from './api.service';

/**
 * Note Service
 * Handles all note related operations and interfaces with the API
 */
class NoteService {
  /**
   * Get all notes for the current team
   * 
   * @returns {Promise<Array>} - List of notes
   */
  async getNotes(params={}) {
    try {
      return await apiService.get(NOTE_ENDPOINT, params);
    } catch (error) {
      console.error('Error fetching notes:', error);
      throw error;
    }
  }

  /**
   * Get a specific note by ID
   * 
   * @param {string} id - Note ID
   * @returns {Promise<Object>} - Note data
   */
  async getNote(id) {
    try {
      return await apiService.get(`${NOTE_ENDPOINT}/${id}`);
    } catch (error) {
      console.error(`Error fetching note ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new note
   * 
   * @param {Object} data - Note data
   * @returns {Promise<Object>} - Created note
   */
  async createNote(data) {
    try {
      return await apiService.post(NOTE_ENDPOINT, data);
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  }

  /**
   * Update an existing note
   * 
   * @param {string} id - Note ID
   * @param {Object} data - Updated note data
   * @returns {Promise<Object>} - Updated note
   */
  async updateNote(id, data) {
    try {
      return await apiService.put(`${NOTE_ENDPOINT}/${id}`, data);
    } catch (error) {
      console.error(`Error updating note ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a note
   * 
   * @param {string} id - Note ID
   * @returns {Promise<Object>} - Result of the operation
   */
  async deleteNote(id) {
    try {
      return await apiService.delete(`${NOTE_ENDPOINT}/${id}`);
    } catch (error) {
      console.error(`Error deleting note ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get notes for a specific project
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} - List of notes for the project
   */
  async getProjectNotes(projectId) {
    return apiService.get(NOTE_ENDPOINT, { projectId });
  }

  /**
   * Get notes for a specific client
   * 
   * @param {string} clientId - Client ID
   * @returns {Promise<Array>} - List of notes for the client
   */
  async getClientNotes(clientId) {
    return apiService.get(NOTE_ENDPOINT, { clientId });
  }
}

export default new NoteService(); 