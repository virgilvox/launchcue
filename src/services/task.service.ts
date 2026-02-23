import apiService, { TASK_ENDPOINT } from './api.service';
import type { Task, Comment } from '@/types/models';
import type { TaskCreateRequest, TaskUpdateRequest, TaskFilter } from '@/types/api';

/**
 * Task Service
 * Handles all task related operations and interfaces with the API
 */
class TaskService {
  /**
   * Get all tasks for a project
   */
  async getProjectTasks(projectId: string): Promise<Task[]> {
    if (!projectId) throw new Error('Project ID is required');
    try {
      return await this.getTasks({ projectId });
    } catch (error) {
      console.error(`Error fetching tasks for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific task by ID
   */
  async getTask(taskId: string): Promise<Task> {
    try {
      return await apiService.get<Task>(`${TASK_ENDPOINT}/${taskId}`);
    } catch (error) {
      console.error(`Error fetching task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new task
   */
  async createTask(projectId: string, taskData: TaskCreateRequest & { completed?: boolean }): Promise<Task> {
    try {
      // Make sure we're sending the expected fields format
      const formattedTaskData: Record<string, unknown> = {
        title: taskData.title,
        description: taskData.description || '',
        status: taskData.completed ? 'Done' : (taskData.status || 'To Do'),
        projectId: projectId,
        dueDate: taskData.dueDate || null,
        type: taskData.type || 'task',
        priority: taskData.priority || 'Medium',
        // Only include assigneeId if it exists
        ...(taskData.assigneeId ? { assigneeId: taskData.assigneeId } : {})
      };

      return await apiService.post<Task>(TASK_ENDPOINT, formattedTaskData);
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Update an existing task
   */
  async updateTask(taskId: string, taskData: Partial<TaskUpdateRequest> & { completed?: boolean }): Promise<Task> {
    try {
      // Make sure we're sending the expected fields format
      const formattedTaskData: Record<string, unknown> = {
        ...(taskData.title !== undefined ? { title: taskData.title } : {}),
        ...(taskData.description !== undefined ? { description: taskData.description } : {}),
        ...(taskData.completed !== undefined ? { status: taskData.completed ? 'Done' : (taskData.status || 'To Do') } : {}),
        ...(taskData.dueDate !== undefined ? { dueDate: taskData.dueDate } : {}),
        ...(taskData.priority !== undefined ? { priority: taskData.priority } : {}),
        ...(taskData.assigneeId !== undefined ? { assigneeId: taskData.assigneeId } : {}),
        ...(taskData.projectId !== undefined ? { projectId: taskData.projectId } : {})
      };

      return await apiService.put<Task>(`${TASK_ENDPOINT}/${taskId}`, formattedTaskData);
    } catch (error) {
      console.error(`Error updating task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<unknown> {
    try {
      return await apiService.delete(`${TASK_ENDPOINT}/${taskId}`);
    } catch (error) {
      console.error(`Error deleting task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Add a comment to a task
   */
  async addComment(taskId: string, commentData: { content: string }): Promise<Comment> {
    return apiService.post<Comment>(`${TASK_ENDPOINT}/${taskId}/comments`, commentData);
  }

  /**
   * Get all comments for a task
   */
  async getTaskComments(taskId: string): Promise<Comment[]> {
    return apiService.get<Comment[]>(`${TASK_ENDPOINT}/${taskId}/comments`);
  }

  async getTasks(params: TaskFilter = {}): Promise<Task[]> {
    try {
      const response = await apiService.get<Task[] | unknown>(TASK_ENDPOINT, params as Record<string, unknown>);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }
}

const taskService = new TaskService();
export default taskService;
