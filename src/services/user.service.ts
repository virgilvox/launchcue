import apiService, { USER_PROFILE_ENDPOINT, AUTH_CHANGE_PASSWORD_ENDPOINT } from './api.service';
import type { User, Notification, AuditLog } from '@/types/models';
import type { ProfileUpdateRequest, ChangePasswordRequest } from '@/types/api';

/**
 * User Service
 * Handles all user related operations and interfaces with the API
 */
class UserService {
  /**
   * Get the current user profile
   */
  async getCurrentUser(): Promise<User> {
    try {
      return await apiService.get<User>(USER_PROFILE_ENDPOINT);
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  }

  /**
   * Get a specific user by ID
   */
  async getUser(_id: string): Promise<User> {
    // Assuming a generic endpoint still exists if needed
    throw new Error("GetUser by ID not implemented/used currently");
  }

  /**
   * Update the current user profile
   */
  async updateUser(_id: string, _data: Partial<ProfileUpdateRequest>): Promise<User> {
    throw new Error("UpdateUser by ID not implemented/used currently");
  }

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<User> {
    try {
      return await apiService.get<User>(USER_PROFILE_ENDPOINT);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(profileData: ProfileUpdateRequest): Promise<User> {
    try {
      return await apiService.put<User>(USER_PROFILE_ENDPOINT, profileData);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Update user password
   */
  async updatePassword(passwordData: ChangePasswordRequest): Promise<unknown> {
    try {
      return await apiService.post(AUTH_CHANGE_PASSWORD_ENDPOINT, passwordData);
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(formData: FormData): Promise<{ avatarUrl: string }> {
    return apiService.post<{ avatarUrl: string }>('/users/avatar', formData);
  }

  /**
   * Get user notifications
   */
  async getNotifications(): Promise<Notification[]> {
    return apiService.get<Notification[]>('/users/notifications');
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<unknown> {
    return apiService.put(`/users/notifications/${notificationId}/read`);
  }

  /**
   * Get user activity/audit logs
   */
  async getActivityLogs(): Promise<AuditLog[]> {
    return apiService.get<AuditLog[]>('/users/activity');
  }
}

const userService = new UserService();
export default userService;
