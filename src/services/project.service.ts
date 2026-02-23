import apiService, { PROJECT_ENDPOINT, TASK_ENDPOINT } from './api.service';
import type { Project, Task, TeamMember } from '@/types/models';
import type { ProjectCreateRequest, ProjectUpdateRequest, TaskCreateRequest } from '@/types/api';

interface ProjectFilter {
  clientId?: string;
  [key: string]: unknown;
}

/**
 * Project Service
 * Handles all project-related API calls
 */
class ProjectService {
  /**
   * Get all projects for the current team
   */
  async getProjects(params: ProjectFilter = {}): Promise<Project[]> {
    try {
      return await apiService.get<Project[]>(PROJECT_ENDPOINT, params as Record<string, unknown>);
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  }

  /**
   * Get projects for a specific client
   */
  async getClientProjects(clientId: string): Promise<Project[]> {
    return apiService.get<Project[]>(`${PROJECT_ENDPOINT}?clientId=${clientId}`);
  }

  /**
   * Get a project by ID
   */
  async getProject(id: string): Promise<Project> {
    try {
      return await apiService.get<Project>(`${PROJECT_ENDPOINT}/${id}`);
    } catch (error) {
      console.error(`Error fetching project ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new project
   */
  async createProject(data: ProjectCreateRequest): Promise<Project> {
    try {
      return await apiService.post<Project>(PROJECT_ENDPOINT, data);
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  /**
   * Update a project
   */
  async updateProject(id: string, data: Partial<ProjectCreateRequest>): Promise<Project> {
    try {
      console.log(`Updating project with ID: ${id}`);
      console.log('Project data:', data);

      // Make sure we're using the correct endpoint format
      const endpoint = `${PROJECT_ENDPOINT}/${id}`;
      console.log('Using endpoint:', endpoint);

      const result = await apiService.put<Project>(endpoint, data);
      console.log('Update result:', result);
      return result;
    } catch (error) {
      console.error(`Error updating project ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(id: string): Promise<unknown> {
    try {
      return await apiService.delete(`${PROJECT_ENDPOINT}/${id}`);
    } catch (error) {
      console.error(`Error deleting project ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get projects for a specific client
   */
  async getProjectsByClient(clientId: string): Promise<Project[]> {
    if (!clientId) throw new Error('Client ID is required');
    try {
      // Use the getProjects method with a filter parameter
      return await this.getProjects({ clientId });
    } catch (error) {
      console.error(`Error fetching projects for client ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Add a task to a project
   */
  async addTask(projectId: string, taskData: TaskCreateRequest): Promise<Task> {
    // Fix: Use the TASK_ENDPOINT and include projectId in the taskData
    const taskWithProject = { ...taskData, projectId };
    return apiService.post<Task>(TASK_ENDPOINT, taskWithProject);
  }

  /**
   * Get all tasks for a project
   */
  async getProjectTasks(projectId: string): Promise<Task[]> {
    try {
      // Use TASK_ENDPOINT constant
      return await apiService.get<Task[]>(TASK_ENDPOINT, { projectId });
    } catch (error) {
      console.error(`Error fetching tasks for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Add a team member to a project
   */
  async addTeamMember(projectId: string, memberData: { userId: string; role?: string }): Promise<unknown> {
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
   */
  async removeTeamMember(projectId: string, memberId: string): Promise<unknown> {
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
   */
  async getProjectMembers(projectId: string): Promise<TeamMember[]> {
    try {
      // Assuming an endpoint like /projects/{projectId}/members exists
      return await apiService.get<TeamMember[]>(`${PROJECT_ENDPOINT}/${projectId}/members`);
    } catch (error) {
      console.error(`Error fetching members for project ${projectId}:`, error);
      throw error;
    }
  }
}

export default new ProjectService();
