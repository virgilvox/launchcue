// src/services/settings.service.js (Created)
import apiService from './api.service';

const ENDPOINT = '/settings'; // Assuming endpoint for team/user settings

class SettingsService {
  async getSettings() {
    try {
      // Usually GET fetches settings for the current user/team context
      return await apiService.get(ENDPOINT);
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }

  async updateSettings(data) {
    try {
      // Usually PUT or POST updates settings
      return await apiService.put(ENDPOINT, data);
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }
  
  // Add more specific methods if needed (e.g., updateNotificationSettings)
}

export default new SettingsService(); 