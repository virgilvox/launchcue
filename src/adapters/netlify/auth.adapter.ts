import type { User } from '@/types/models'
import type { AuthResponse, ChangePasswordRequest } from '@/types/api'
import type { AuthAdapter } from '../types'
import apiService, { USER_PROFILE_ENDPOINT } from '@/services/api.service'

/**
 * Netlify auth adapter — delegates to the existing apiService auth methods.
 */
export class NetlifyAuthAdapter implements AuthAdapter {
  async login(email: string, password: string): Promise<AuthResponse> {
    return apiService.login(email, password)
  }

  async register(data: { name: string; email: string; password: string }): Promise<AuthResponse> {
    return apiService.register(data)
  }

  async logout(): Promise<void> {
    return apiService.logout()
  }

  async switchTeam(teamId: string): Promise<AuthResponse> {
    return apiService.switchTeam(teamId)
  }

  async changePassword(data: ChangePasswordRequest): Promise<unknown> {
    return apiService.changePassword(data)
  }

  async getProfile(): Promise<User> {
    return apiService.get<User>(USER_PROFILE_ENDPOINT)
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    return apiService.put<User>(USER_PROFILE_ENDPOINT, data)
  }

  setToken(token: string | null): void {
    apiService.setAuthToken(token)
  }

  getToken(): string | null {
    return sessionStorage.getItem('token')
  }

  onUnauthorized(callback: () => void): void {
    apiService.onUnauthorized(callback)
  }
}
