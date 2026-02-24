import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  SwitchTeamRequest,
  ChangePasswordRequest,
  SearchResult,
} from '@/types/api';

// Use direct Netlify function paths
const API_BASE = '/.netlify/functions' as const;

// Define endpoints using the base path and FLATTENED names
const CLIENT_ENDPOINT = `${API_BASE}/clients` as const;
const PROJECT_ENDPOINT = `${API_BASE}/projects` as const;
const PROJECT_DETAIL_ENDPOINT = `${API_BASE}/project-detail` as const;
const TASK_ENDPOINT = `${API_BASE}/tasks` as const;
const AUTH_LOGIN_ENDPOINT = `${API_BASE}/auth-login` as const;
const AUTH_REGISTER_ENDPOINT = `${API_BASE}/auth-register` as const;
const AUTH_LOGOUT_ENDPOINT = `${API_BASE}/auth-logout` as const;
const AUTH_SWITCH_TEAM_ENDPOINT = `${API_BASE}/auth-switch-team` as const;
const AUTH_CHANGE_PASSWORD_ENDPOINT = `${API_BASE}/auth-change-password` as const;
const USER_PROFILE_ENDPOINT = `${API_BASE}/user-profile` as const;
const API_KEY_ENDPOINT = `${API_BASE}/api-keys` as const;
const TEAM_ENDPOINT = `${API_BASE}/teams` as const;
const CAMPAIGN_ENDPOINT = `${API_BASE}/campaigns` as const;
const NOTE_ENDPOINT = `${API_BASE}/notes` as const;
const BRAINDUMP_ENDPOINT = `${API_BASE}/braindumps` as const;
const BRAINDUMP_CONTEXT_ENDPOINT = `${API_BASE}/brain-dump-context` as const;
const BRAINDUMP_CREATE_ITEMS_ENDPOINT = `${API_BASE}/brain-dump-create-items` as const;
const CALENDAR_EVENT_ENDPOINT = `${API_BASE}/calendar-events` as const;
const AI_PROCESS_ENDPOINT = `${API_BASE}/ai-process` as const;
const RESOURCE_ENDPOINT = `${API_BASE}/resources` as const;
const SEARCH_ENDPOINT = `${API_BASE}/search` as const;
const SCOPE_TEMPLATE_ENDPOINT = `${API_BASE}/scope-templates` as const;
const SCOPE_ENDPOINT = `${API_BASE}/scopes` as const;
const CLIENT_INVITATION_ENDPOINT = `${API_BASE}/client-invitations` as const;
const ONBOARDING_ENDPOINT = `${API_BASE}/onboarding` as const;
const INVOICE_ENDPOINT = `${API_BASE}/invoices` as const;

interface ApiErrorResponse {
  status: number;
  message: string;
  [key: string]: unknown;
}

interface AiProcessRequest {
  prompt: string;
  processingDetails: {
    type: string;
    context: string;
    enriched: boolean;
  };
  max_tokens: number;
}

/**
 * API Service for making HTTP requests to Netlify Functions
 * This service handles communication between the frontend and backend
 */
class ApiService {
  private _token: string | null;
  private _onUnauthorized: (() => void) | null;
  private _logoutTriggered: boolean;
  readonly axiosInstance: AxiosInstance;

  constructor() {
    this._token = sessionStorage.getItem('token') || null;
    this._onUnauthorized = null;
    this._logoutTriggered = false;

    this.axiosInstance = axios.create({
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });

    // Auth interceptor reads token from memory (set by auth store)
    this.axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      if (this._token) {
        config.headers['Authorization'] = `Bearer ${this._token}`;
      }
      return config;
    });

    // Response interceptor for error handling and retry logic
    this.axiosInstance.interceptors.response.use(
      response => response.data,
      async (error: AxiosError) => {
        if (error.response && error.response.status === 401) {
          // Any 401 means the token is invalid/revoked — trigger logout once
          if (this._onUnauthorized && !this._logoutTriggered) {
            this._logoutTriggered = true;
            this._onUnauthorized();
          }
          // Don't retry 401s — reject immediately
          return Promise.reject(error);
        }

        // Retry on transient server errors and rate limiting
        const retryableStatuses = [429, 502, 503, 504];
        const status = error.response?.status;
        if (status && retryableStatuses.includes(status) && error.config) {
          const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };
          config._retryCount = config._retryCount || 0;

          if (config._retryCount < 2) {
            config._retryCount++;

            // Respect Retry-After header on 429
            let delay: number;
            const retryAfter = error.response?.headers?.['retry-after'];
            if (status === 429 && retryAfter) {
              delay = parseInt(retryAfter, 10) * 1000;
            } else {
              // Exponential backoff: 1s, 2s, 4s + jitter
              delay = Math.pow(2, config._retryCount - 1) * 1000 + Math.random() * 500;
            }

            await new Promise(resolve => setTimeout(resolve, delay));
            return this.axiosInstance.request(config);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Register callback for 401 handling (called by auth store to avoid circular imports)
  onUnauthorized(callback: () => void): void {
    this._onUnauthorized = callback;
  }

  // Set auth token in memory and sessionStorage (for persistence across page loads)
  setAuthToken(token: string | null): void {
    this._token = token || null;
    if (token) {
      sessionStorage.setItem('token', token);
      this._logoutTriggered = false; // Reset on new valid token
    } else {
      sessionStorage.removeItem('token');
    }
  }

  // Authentication endpoints
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      return await this.axiosInstance.post(AUTH_LOGIN_ENDPOINT, { email, password }) as unknown as AuthResponse;
    } catch (error) {
      throw this._handleError(error as AxiosError);
    }
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      return await this.axiosInstance.post(AUTH_REGISTER_ENDPOINT, userData) as unknown as AuthResponse;
    } catch (error) {
      throw this._handleError(error as AxiosError);
    }
  }

  async logout(): Promise<void> {
    this.setAuthToken(null);
    // Optional: call logout endpoint if it did something server-side
    // try { await this.axiosInstance.post(AUTH_LOGOUT_ENDPOINT); } catch(e) {}
    return Promise.resolve();
  }

  async switchTeam(teamId: string): Promise<AuthResponse> {
    try {
      return await this.axiosInstance.post(AUTH_SWITCH_TEAM_ENDPOINT, { teamId } as SwitchTeamRequest) as unknown as AuthResponse;
    } catch (error) {
      throw this._handleError(error as AxiosError);
    }
  }

  async changePassword(passwordData: ChangePasswordRequest): Promise<unknown> {
    try {
      return await this.axiosInstance.post(AUTH_CHANGE_PASSWORD_ENDPOINT, passwordData);
    } catch (error) {
      throw this._handleError(error as AxiosError);
    }
  }

  // Generic CRUD operations (using endpoint constants)
  async get<T = unknown>(endpoint: string, params: Record<string, unknown> = {}): Promise<T> {
    try {
      return await this.axiosInstance.get(endpoint, { params }) as unknown as T;
    } catch (error) {
      throw this._handleError(error as AxiosError);
    }
  }

  async post<T = unknown>(endpoint: string, data: unknown = {}): Promise<T> {
    try {
      return await this.axiosInstance.post(endpoint, data) as unknown as T;
    } catch (error) {
      throw this._handleError(error as AxiosError);
    }
  }

  async put<T = unknown>(endpoint: string, data: unknown = {}): Promise<T> {
    try {
      return await this.axiosInstance.put(endpoint, data) as unknown as T;
    } catch (error) {
      throw this._handleError(error as AxiosError);
    }
  }

  async delete<T = unknown>(endpoint: string, config: Record<string, unknown> = {}): Promise<T> {
    try {
      return await this.axiosInstance.delete(endpoint, config) as unknown as T;
    } catch (error) {
      throw this._handleError(error as AxiosError);
    }
  }

  // Global search across collections
  async search(query: string, types: string[] | null = null): Promise<SearchResult[]> {
    try {
      const params: Record<string, string> = { q: query };
      if (types && types.length > 0) {
        params.types = types.join(',');
      }
      return await this.axiosInstance.get(SEARCH_ENDPOINT, { params }) as unknown as SearchResult[];
    } catch (error) {
      throw this._handleError(error as AxiosError);
    }
  }

  // Process AI with Claude API via our backend
  async processWithClaude(data: AiProcessRequest): Promise<unknown> {
    try {
      return await this.axiosInstance.post(AI_PROCESS_ENDPOINT, data);
    } catch (error) {
      throw this._handleError(error as AxiosError);
    }
  }

  // Error handling
  private _handleError(error: AxiosError): ApiErrorResponse {
    if (error.response) {
      // Server responded with a status outside 2xx range
      const data = error.response.data as Record<string, unknown> | undefined;
      return {
        status: error.response.status,
        message: (data?.message as string) || 'An error occurred on the server',
        ...data
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        status: 0,
        message: 'No response from server. Please check your connection.'
      };
    } else {
      // Something happened in setting up the request
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
    RESOURCE_ENDPOINT,
    SEARCH_ENDPOINT,
    SCOPE_TEMPLATE_ENDPOINT,
    SCOPE_ENDPOINT,
    CLIENT_INVITATION_ENDPOINT,
    ONBOARDING_ENDPOINT,
    INVOICE_ENDPOINT
};
