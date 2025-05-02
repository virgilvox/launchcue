import apiService, { TASK_ENDPOINT } from './api.service';

/**
 * Task Service
 * Handles all task related operations and interfaces with the API
 */
class TaskService {
  /**
   * Get all tasks for a project
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} - List of tasks
   */
  async getProjectTasks(projectId) {
    if (!projectId) throw new Error('Project ID is required');
    try {
      return await this.getTasks({ projectId: projectId });
    } catch (error) {
      console.error(`Error fetching tasks for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific task by ID
   * 
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} - Task data
   */
  async getTask(taskId) {
    try {
      return await apiService.get(`${TASK_ENDPOINT}/${taskId}`);
    } catch (error) {
      console.error(`Error fetching task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new task
   * 
   * @param {string} projectId - Project ID
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} - Created task
   */
  async createTask(projectId, taskData) {
    try {
      // Make sure we're sending the expected fields format
      const formattedTaskData = {
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
      
      return await apiService.post(TASK_ENDPOINT, formattedTaskData);
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Update an existing task
   * 
   * @param {string} taskId - Task ID
   * @param {Object} taskData - Updated task data
   * @returns {Promise<Object>} - Updated task
   */
  async updateTask(taskId, taskData) {
    try {
      // Make sure we're sending the expected fields format
      const formattedTaskData = {
        ...(taskData.title !== undefined ? { title: taskData.title } : {}),
        ...(taskData.description !== undefined ? { description: taskData.description } : {}),
        ...(taskData.completed !== undefined ? { status: taskData.completed ? 'Done' : (taskData.status || 'To Do') } : {}),
        ...(taskData.dueDate !== undefined ? { dueDate: taskData.dueDate } : {}),
        ...(taskData.priority !== undefined ? { priority: taskData.priority } : {}),
        ...(taskData.assigneeId !== undefined ? { assigneeId: taskData.assigneeId } : {}),
        ...(taskData.projectId !== undefined ? { projectId: taskData.projectId } : {})
      };
      
      return await apiService.put(`${TASK_ENDPOINT}/${taskId}`, formattedTaskData);
    } catch (error) {
      console.error(`Error updating task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a task
   * 
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} - Result of the operation
   */
  async deleteTask(taskId) {
    try {
      return await apiService.delete(`${TASK_ENDPOINT}/${taskId}`);
    } catch (error) {
      console.error(`Error deleting task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Add a comment to a task
   * 
   * @param {string} taskId - Task ID
   * @param {Object} commentData - Comment data
   * @returns {Promise<Object>} - Created comment
   */
  async addComment(taskId, commentData) {
    return apiService.post(`${TASK_ENDPOINT}/${taskId}/comments`, commentData);
  }

  /**
   * Get all comments for a task
   * 
   * @param {string} taskId - Task ID
   * @returns {Promise<Array>} - List of comments
   */
  async getTaskComments(taskId) {
    return apiService.get(`${TASK_ENDPOINT}/${taskId}/comments`);
  }

  async getTasks(params = {}) { // Allow query params for filtering
    try {
      const response = await apiService.get(TASK_ENDPOINT, params);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }
}

const taskService = new TaskService();
export default taskService; 