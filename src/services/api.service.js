import axios from 'axios';

// Use direct Netlify function paths
const API_BASE = '/.netlify/functions';

// Define endpoints using the base path and FLATTENED names
const CLIENT_ENDPOINT = `${API_BASE}/clients`;
// CLIENT_CONTACTS_ENDPOINT removed - contacts are embedded in clients
const PROJECT_ENDPOINT = `${API_BASE}/projects`;
const PROJECT_DETAIL_ENDPOINT = `${API_BASE}/project-detail`; // Use renamed detail endpoint
const TASK_ENDPOINT = `${API_BASE}/tasks`;
const AUTH_LOGIN_ENDPOINT = `${API_BASE}/auth-login`;
const AUTH_REGISTER_ENDPOINT = `${API_BASE}/auth-register`;
const AUTH_LOGOUT_ENDPOINT = `${API_BASE}/auth-logout`;
const AUTH_SWITCH_TEAM_ENDPOINT = `${API_BASE}/auth-switch-team`; 
const AUTH_CHANGE_PASSWORD_ENDPOINT = `${API_BASE}/auth-change-password`;
const USER_PROFILE_ENDPOINT = `${API_BASE}/user-profile`; 
const API_KEY_ENDPOINT = `${API_BASE}/api-keys`;
const TEAM_ENDPOINT = `${API_BASE}/teams`;
const CAMPAIGN_ENDPOINT = `${API_BASE}/campaigns`;
const NOTE_ENDPOINT = `${API_BASE}/notes`;
const BRAINDUMP_ENDPOINT = `${API_BASE}/braindumps`;
const BRAINDUMP_CONTEXT_ENDPOINT = `${API_BASE}/brain-dump-context`;
const BRAINDUMP_CREATE_ITEMS_ENDPOINT = `${API_BASE}/brain-dump-create-items`;
const CALENDAR_EVENT_ENDPOINT = `${API_BASE}/calendar-events`; 
const AI_PROCESS_ENDPOINT = `${API_BASE}/ai-process`;
const RESOURCE_ENDPOINT = `${API_BASE}/resources`;

/**
 * API Service for making HTTP requests to Netlify Functions
 * This service handles communication between the frontend and backend
 */
class ApiService {
  constructor() {
    this._token = localStorage.getItem('token') || null;
    this._onUnauthorized = null;

    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });

    // Auth interceptor reads token from memory (set by auth store)
    this.axiosInstance.interceptors.request.use(config => {
      if (this._token) {
        config.headers['Authorization'] = `Bearer ${this._token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      response => response.data,
      error => {
        if (error.response && error.response.status === 401) {
          const isAuthEndpoint = error.config?.url?.includes('/auth-') ||
                                error.config?.url?.includes('/user-profile');

          if (isAuthEndpoint && this._onUnauthorized) {
            this._onUnauthorized();
          } else if (!isAuthEndpoint) {
            console.warn('Non-auth endpoint returned 401:', error.config?.url);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Register callback for 401 handling (called by auth store to avoid circular imports)
  onUnauthorized(callback) {
    this._onUnauthorized = callback;
  }

  // Set auth token in memory and localStorage (for persistence across page loads)
  setAuthToken(token) {
    this._token = token || null;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  // Authentication endpoints
  async login(email, password) {
    try {
      return await this.axiosInstance.post(AUTH_LOGIN_ENDPOINT, { email, password });
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async register(userData) {
    try {
      return await this.axiosInstance.post(AUTH_REGISTER_ENDPOINT, userData);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async logout() {
    this.setAuthToken(null);
    // Optional: call logout endpoint if it did something server-side
    // try { await this.axiosInstance.post(AUTH_LOGOUT_ENDPOINT); } catch(e) {} 
    return Promise.resolve();
  }

  async switchTeam(teamId) {
    try {
      return await this.axiosInstance.post(AUTH_SWITCH_TEAM_ENDPOINT, { teamId });
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async changePassword(passwordData) {
    try {
      return await this.axiosInstance.post(AUTH_CHANGE_PASSWORD_ENDPOINT, passwordData);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  // Generic CRUD operations (using endpoint constants)
  async get(endpoint, params = {}) {
    try {
      return await this.axiosInstance.get(endpoint, { params });
    } catch (error) {
      console.error(`GET ${endpoint} failed:`, error);
      throw this._handleError(error);
    }
  }

  async post(endpoint, data = {}) {
    try {
      return await this.axiosInstance.post(endpoint, data);
    } catch (error) {
      console.error(`POST ${endpoint} failed:`, error);
      throw this._handleError(error);
    }
  }

  async put(endpoint, data = {}) {
    try {
      return await this.axiosInstance.put(endpoint, data);
    } catch (error) {
      console.error(`PUT ${endpoint} failed:`, error);
      throw this._handleError(error);
    }
  }

  async delete(endpoint, config = {}) {
    try {
      return await this.axiosInstance.delete(endpoint, config);
    } catch (error) {
      console.error(`DELETE ${endpoint} failed:`, error);
      throw this._handleError(error);
    }
  }

  // Process AI with Claude API via our backend
  async processWithClaude(data) {
    try {
      return await this.axiosInstance.post(AI_PROCESS_ENDPOINT, data);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  // Error handling
  _handleError(error) {
    if (error.response) {
      // Server responded with a status outside 2xx range
      console.error('API error response:', {
        status: error.response.status,
        url: error.config?.url || 'Unknown URL',
        method: error.config?.method || 'Unknown method',
        data: error.response.data 
      });
      return {
        status: error.response.status,
        message: error.response.data.message || 'An error occurred on the server',
        ...error.response.data
      };
    } else if (error.request) {
      // Request was made but no response received
      console.error('API request error (no response):', {
        url: error.config?.url || 'Unknown URL',
        method: error.config?.method || 'Unknown method'
      }, error.request);
      return {
        status: 0,
        message: 'No response from server. Please check your connection.'
      };
    } else {
      // Something happened in setting up the request
      console.error('API request setup error:', {
        url: error.config?.url || 'Unknown URL',
        method: error.config?.method || 'Unknown method',
        message: error.message
      });
      return {
        status: 0,
        message: error.message || 'Error setting up the request'
      };
    }
  }
}

const apiService = new ApiService();
export default apiService;
// Export constants with correct full paths - ENSURE ALL ARE INCLUDED
export { 
    API_BASE, // Export base too if needed elsewhere
    CLIENT_ENDPOINT,
    PROJECT_ENDPOINT, PROJECT_DETAIL_ENDPOINT,
    TASK_ENDPOINT, 
    AUTH_LOGIN_ENDPOINT, AUTH_REGISTER_ENDPOINT, AUTH_LOGOUT_ENDPOINT, 
    AUTH_SWITCH_TEAM_ENDPOINT, AUTH_CHANGE_PASSWORD_ENDPOINT,
    USER_PROFILE_ENDPOINT,
    API_KEY_ENDPOINT, 
    TEAM_ENDPOINT,
    CAMPAIGN_ENDPOINT, 
    NOTE_ENDPOINT, 
    BRAINDUMP_ENDPOINT,
    BRAINDUMP_CONTEXT_ENDPOINT, 
    BRAINDUMP_CREATE_ITEMS_ENDPOINT,
    CALENDAR_EVENT_ENDPOINT,
    AI_PROCESS_ENDPOINT,
    RESOURCE_ENDPOINT
}; 