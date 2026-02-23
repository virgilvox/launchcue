import apiService, { NOTE_ENDPOINT } from './api.service';
import type { Note } from '@/types/models';
import type { NoteCreateRequest } from '@/types/api';

interface NoteFilter {
  projectId?: string;
  clientId?: string;
  [key: string]: unknown;
}

/**
 * Note Service
 * Handles all note related operations and interfaces with the API
 */
class NoteService {
  /**
   * Get all notes for the current team
   */
  async getNotes(params: NoteFilter = {}): Promise<Note[]> {
    try {
      return await apiService.get<Note[]>(NOTE_ENDPOINT, params as Record<string, unknown>);
    } catch (error) {
      console.error('Error fetching notes:', error);
      throw error;
    }
  }

  /**
   * Get a specific note by ID
   */
  async getNote(id: string): Promise<Note> {
    try {
      return await apiService.get<Note>(`${NOTE_ENDPOINT}/${id}`);
    } catch (error) {
      console.error(`Error fetching note ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new note
   */
  async createNote(data: NoteCreateRequest): Promise<Note> {
    try {
      return await apiService.post<Note>(NOTE_ENDPOINT, data);
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  }

  /**
   * Update an existing note
   */
  async updateNote(id: string, data: Partial<NoteCreateRequest>): Promise<Note> {
    try {
      return await apiService.put<Note>(`${NOTE_ENDPOINT}/${id}`, data);
    } catch (error) {
      console.error(`Error updating note ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a note
   */
  async deleteNote(id: string): Promise<unknown> {
    try {
      return await apiService.delete(`${NOTE_ENDPOINT}/${id}`);
    } catch (error) {
      console.error(`Error deleting note ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get notes for a specific project
   */
  async getProjectNotes(projectId: string): Promise<Note[]> {
    return apiService.get<Note[]>(NOTE_ENDPOINT, { projectId });
  }

  /**
   * Get notes for a specific client
   */
  async getClientNotes(clientId: string): Promise<Note[]> {
    return apiService.get<Note[]>(NOTE_ENDPOINT, { clientId });
  }
}

export default new NoteService();
