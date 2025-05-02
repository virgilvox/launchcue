import apiService, { USER_PROFILE_ENDPOINT, AUTH_LOGIN_ENDPOINT, AUTH_CHANGE_PASSWORD_ENDPOINT, /*USER_ENDPOINT /* if needed for /users/:id */ } from './api.service';

const ENDPOINT = '/users'; // Keep for generic /users/:id if needed
const PROFILE_ENDPOINT = '/users/profile'; // Back to nested path

/**
 * User Service
 * Handles all user related operations and interfaces with the API
 */
class UserService {
  /**
   * Get the current user profile
   * 
   * @returns {Promise<Object>} - User profile data
   */
  async getCurrentUser() {
    try {
      return await apiService.get(USER_PROFILE_ENDPOINT);
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  }

  /**
   * Get a specific user by ID
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User data
   */
  async getUser(id) {
    // Assuming a generic endpoint still exists if needed
    // try { return await apiService.get(`${USER_ENDPOINT}/${id}`); } catch (error) { /*...*/ }
    throw new Error("GetUser by ID not implemented/used currently");
  }

  /**
   * Update the current user profile
   * 
   * @param {Object} userData - Updated user data
   * @returns {Promise<Object>} - Updated user profile
   */
  async updateUser(id, data) {
    // try { return await apiService.put(`${USER_ENDPOINT}/${id}`, data); } catch (error) { /*...*/ }
    throw new Error("UpdateUser by ID not implemented/used currently");
  }

  /**
   * Get user profile
   * 
   * @returns {Promise<Object>} - User profile data
   */
  async getUserProfile() {
    try {
      return await apiService.get(USER_PROFILE_ENDPOINT);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * 
   * @param {Object} profileData - Updated user profile data
   * @returns {Promise<Object>} - Updated user profile
   */
  async updateUserProfile(profileData) {
    try {
      return await apiService.put(USER_PROFILE_ENDPOINT, profileData);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Update user password
   * 
   * @param {Object} passwordData - Password data (current and new)
   * @returns {Promise<Object>} - Result of the operation
   */
  async updatePassword(passwordData) {
    try {
      return await apiService.post(AUTH_CHANGE_PASSWORD_ENDPOINT, passwordData);
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  /**
   * Upload user avatar
   * 
   * @param {FormData} formData - Form data with avatar file
   * @returns {Promise<Object>} - Result of the operation with avatar URL
   */
  async uploadAvatar(formData) {
    return apiService.post('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  /**
   * Get user notifications
   * 
   * @returns {Promise<Array>} - List of notifications
   */
  async getNotifications() {
    return apiService.get('/users/notifications');
  }

  /**
   * Mark notification as read
   * 
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} - Result of the operation
   */
  async markNotificationAsRead(notificationId) {
    return apiService.put(`/users/notifications/${notificationId}/read`);
  }

  /**
   * Get user activity/audit logs
   * 
   * @returns {Promise<Array>} - List of activity logs
   */
  async getActivityLogs() {
    return apiService.get('/users/activity');
  }
}

const userService = new UserService();
export default userService; 