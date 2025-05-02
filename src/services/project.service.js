import apiService, { PROJECT_ENDPOINT, TASK_ENDPOINT } from './api.service';

/**
 * Project Service
 * Handles all project-related API calls
 */
class ProjectService {
  /**
   * Get all projects for the current team
   * @returns {Promise<Array>} Array of projects
   */
  async getProjects(params = {}) { // Accept optional query params (like clientId)
    try {
      return await apiService.get(PROJECT_ENDPOINT, params);
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  }

  /**
   * Get projects for a specific client
   * @param {string} clientId Client ID
   * @returns {Promise<Array>} Array of projects
   */
  async getClientProjects(clientId) {
    return apiService.get(`${PROJECT_ENDPOINT}?clientId=${clientId}`);
  }

  /**
   * Get a project by ID
   * @param {string} id Project ID
   * @returns {Promise<Object>} Project data
   */
  async getProject(id) {
    try {
      return await apiService.get(`${PROJECT_ENDPOINT}/${id}`);
    } catch (error) {
      console.error(`Error fetching project ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new project
   * @param {Object} projectData Project data
   * @returns {Promise<Object>} Created project
   */
  async createProject(data) {
    try {
      return await apiService.post(PROJECT_ENDPOINT, data);
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  /**
   * Update a project
   * @param {string} id Project ID
   * @param {Object} projectData Updated project data
   * @returns {Promise<Object>} Updated project
   */
  async updateProject(id, data) {
    try {
      console.log(`Updating project with ID: ${id}`);
      console.log('Project data:', data);
      
      // Make sure we're using the correct endpoint format
      const endpoint = `${PROJECT_ENDPOINT}/${id}`;
      console.log('Using endpoint:', endpoint);
      
      const result = await apiService.put(endpoint, data);
      console.log('Update result:', result);
      return result;
    } catch (error) {
      console.error(`Error updating project ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a project
   * @param {string} id Project ID
   * @returns {Promise<Object>} Response
   */
  async deleteProject(id) {
    try {
      return await apiService.delete(`${PROJECT_ENDPOINT}/${id}`);
    } catch (error) {
      console.error(`Error deleting project ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get projects for a specific client
   * 
   * @param {string} clientId - Client ID
   * @returns {Promise<Array>} - List of projects for the client
   */
  async getProjectsByClient(clientId) {
    if (!clientId) throw new Error('Client ID is required');
    try {
      // Use the getProjects method with a filter parameter
      return await this.getProjects({ clientId: clientId });
    } catch (error) {
      console.error(`Error fetching projects for client ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Add a task to a project
   * 
   * @param {string} projectId - Project ID
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} - Created task
   */
  async addTask(projectId, taskData) {
    // Fix: Use the TASK_ENDPOINT and include projectId in the taskData
    const taskWithProject = { ...taskData, projectId };
    return apiService.post(TASK_ENDPOINT, taskWithProject);
  }

  /**
   * Get all tasks for a project
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} - List of tasks
   */
  async getProjectTasks(projectId) {
    try {
      // Use TASK_ENDPOINT constant
      return await apiService.get(TASK_ENDPOINT, { projectId: projectId });
    } catch (error) {
      console.error(`Error fetching tasks for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Add a team member to a project
   * 
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Result of the operation
   */
  async addTeamMember(projectId, memberData) {
    try {
      // Assuming endpoint like /projects/{projectId}/members
      return await apiService.post(`${PROJECT_ENDPOINT}/${projectId}/members`, memberData);
    } catch (error) {
      console.error(`Error adding member to project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Remove a team member from a project
   * 
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Result of the operation
   */
  async removeTeamMember(projectId, memberId) {
    try {
      // Assuming endpoint like /projects/{projectId}/members/{memberId}
      return await apiService.delete(`${PROJECT_ENDPOINT}/${projectId}/members/${memberId}`);
    } catch (error) {
      console.error(`Error removing member ${memberId} from project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get all team members for a project
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} - List of team members
   */
  async getProjectMembers(projectId) {
    try {
      // Assuming an endpoint like /projects/{projectId}/members exists
      return await apiService.get(`${PROJECT_ENDPOINT}/${projectId}/members`);
    } catch (error) {
      console.error(`Error fetching members for project ${projectId}:`, error);
      throw error;
    }
  }
}

export default new ProjectService(); 