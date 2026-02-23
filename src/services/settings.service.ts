import apiService from './api.service';

interface Settings {
  [key: string]: unknown;
}

const ENDPOINT = '/settings'; // Assuming endpoint for team/user settings

class SettingsService {
  async getSettings(): Promise<Settings> {
    try {
      // Usually GET fetches settings for the current user/team context
      return await apiService.get<Settings>(ENDPOINT);
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }

  async updateSettings(data: Partial<Settings>): Promise<Settings> {
    try {
      // Usually PUT or POST updates settings
      return await apiService.put<Settings>(ENDPOINT, data);
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  // Add more specific methods if needed (e.g., updateNotificationSettings)
}

export default new SettingsService();
