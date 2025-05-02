import api, { TEAM_ENDPOINT } from './api.service';

/**
 * Team service for handling team operations
 */
const teamService = {
  /**
   * Get all teams for the current user
   * @returns {Promise<Object>} Promise that resolves to an object with success status and teams or error
   */
  async getTeams() {
    try {
      const response = await api.get(TEAM_ENDPOINT);
      return { 
        success: true, 
        teams: response 
      };
    } catch (error) {
      console.error('Error fetching teams:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Failed to fetch teams' 
      };
    }
  },

  /**
   * Get all members for a specific team
   * @param {string} teamId - The ID of the team
   * @returns {Promise<Object>} Promise that resolves to an object with success status and members or error
   */
  async getTeamMembers(teamId) {
    try {
      const response = await api.get(`${TEAM_ENDPOINT}?id=${teamId}&action=members`);
      
      // Filter out any null or invalid members
      const validMembers = response.filter(member => 
        member && member.id && (member.email || member.displayName)
      );
      
      return { 
        success: true, 
        members: validMembers 
      };
    } catch (error) {
      console.error('Error fetching team members:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Failed to fetch team members' 
      };
    }
  },

  /**
   * Create a new team
   * @param {Object} teamData - The team data
   * @returns {Promise<Object>} Promise that resolves to an object with success status and team or error
   */
  async createTeam(teamData) {
    try {
      const response = await api.post(TEAM_ENDPOINT, teamData);
      return { 
        success: true, 
        team: response 
      };
    } catch (error) {
      console.error('Error creating team:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Failed to create team' 
      };
    }
  },

  /**
   * Invite a user to a team
   * @param {string} teamId - The ID of the team
   * @param {string} email - The email of the user to invite
   * @returns {Promise<Object>} Promise that resolves to an object with success status or error
   */
  async inviteUser(teamId, email) {
    try {
      const response = await api.post(`${TEAM_ENDPOINT}?id=${teamId}&action=invite`, { email });
      return { 
        success: true,
        invite: response
      };
    } catch (error) {
      console.error('Error inviting user:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Failed to invite user' 
      };
    }
  },

  /**
   * Get pending invites for a team
   * @param {string} teamId - The ID of the team
   * @returns {Promise<Object>} Promise that resolves to an object with success status and invites or error
   */
  async getPendingInvites(teamId) {
    try {
      const response = await api.get(`${TEAM_ENDPOINT}?id=${teamId}&action=pendingInvites`);
      return { 
        success: true, 
        invites: response 
      };
    } catch (error) {
      console.error('Error fetching pending invites:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Failed to fetch pending invites' 
      };
    }
  },

  /**
   * Remove a member from a team
   * @param {string} teamId - The ID of the team
   * @param {string} memberId - The ID of the member to remove
   * @returns {Promise<Object>} Promise that resolves to an object with success status or error
   */
  async removeMember(teamId, memberId) {
    try {
      await api.delete(`${TEAM_ENDPOINT}?id=${teamId}&action=removeMember&memberId=${memberId}`);
      return { success: true };
    } catch (error) {
      console.error('Error removing team member:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Failed to remove team member' 
      };
    }
  },

  /**
   * Respond to a team invitation
   * @param {string} inviteId - The ID of the invitation
   * @param {boolean} accept - Whether to accept the invitation
   * @returns {Promise<Object>} Promise that resolves to an object with success status or error
   */
  async respondToInvite(inviteId, accept) {
    try {
      const response = await api.post(`${TEAM_ENDPOINT}?action=respondToInvite`, { 
        inviteId, 
        accept 
      });
      return { 
        success: true,
        team: accept ? response : null
      };
    } catch (error) {
      console.error('Error responding to invite:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Failed to respond to invitation' 
      };
    }
  }
};

export default teamService; 