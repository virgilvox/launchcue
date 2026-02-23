import api, { TEAM_ENDPOINT } from './api.service';
import type { Team, TeamMember, TeamInvite } from '@/types/models';
import type { TeamCreateRequest } from '@/types/api';

interface TeamServiceResult<T = unknown> {
  success: boolean;
  error?: string;
  teams?: T[];
  team?: T | null;
  members?: TeamMember[];
  invites?: TeamInvite[];
  invite?: unknown;
  data?: unknown;
}

interface TeamServiceInterface {
  getTeams(): Promise<TeamServiceResult<Team>>;
  getTeamMembers(teamId: string): Promise<TeamServiceResult>;
  createTeam(teamData: TeamCreateRequest): Promise<TeamServiceResult<Team>>;
  inviteUser(teamId: string, email: string): Promise<TeamServiceResult>;
  inviteTeamMember(teamId: string, email: string): Promise<TeamServiceResult>;
  getPendingInvites(teamId: string): Promise<TeamServiceResult>;
  removeMember(teamId: string, memberId: string): Promise<TeamServiceResult>;
  updateMemberRole(teamId: string, memberId: string, newRole: string): Promise<TeamServiceResult>;
  respondToInvite(inviteId: string, accept: boolean): Promise<TeamServiceResult<Team>>;
}

/**
 * Team service for handling team operations
 */
const teamService: TeamServiceInterface = {
  /**
   * Get all teams for the current user
   */
  async getTeams(): Promise<TeamServiceResult<Team>> {
    try {
      const response = await api.get<Team[]>(TEAM_ENDPOINT);
      return {
        success: true,
        teams: response
      };
    } catch (error: unknown) {
      console.error('Error fetching teams:', error);
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to fetch teams'
      };
    }
  },

  /**
   * Get all members for a specific team
   */
  async getTeamMembers(teamId: string): Promise<TeamServiceResult> {
    try {
      const response = await api.get<TeamMember[]>(`${TEAM_ENDPOINT}?id=${teamId}&action=members`);

      // Filter out any null or invalid members
      const validMembers = (response as TeamMember[]).filter((member: TeamMember) =>
        member && member.userId && (member.email || member.name)
      );

      return {
        success: true,
        members: validMembers
      };
    } catch (error: unknown) {
      console.error('Error fetching team members:', error);
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to fetch team members'
      };
    }
  },

  /**
   * Create a new team
   */
  async createTeam(teamData: TeamCreateRequest): Promise<TeamServiceResult<Team>> {
    try {
      const response = await api.post<Team>(TEAM_ENDPOINT, teamData);
      return {
        success: true,
        team: response
      };
    } catch (error: unknown) {
      console.error('Error creating team:', error);
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to create team'
      };
    }
  },

  /**
   * Invite a user to a team
   */
  async inviteUser(teamId: string, email: string): Promise<TeamServiceResult> {
    if (!teamId) {
      console.error('Team ID is required for invitation');
      return {
        success: false,
        error: 'Team ID is required'
      };
    }

    if (!email) {
      console.error('Email is required for invitation');
      return {
        success: false,
        error: 'Email is required'
      };
    }

    console.log(`Inviting user ${email} to team ${teamId}`);

    try {
      const response = await api.post(`${TEAM_ENDPOINT}?id=${teamId}&action=invite`, { email });
      console.log('Invitation response:', response);
      return {
        success: true,
        invite: response
      };
    } catch (error: unknown) {
      console.error('Error inviting user:', error);

      // Detailed error logging
      const err = error as { response?: { data?: { error?: string }; status?: number }; message?: string };
      if (err.response) {
        console.error('Response error data:', err.response.data);
        console.error('Response status:', err.response.status);
      }

      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to invite user'
      };
    }
  },

  /**
   * Invite a team member (alias for inviteUser for backward compatibility)
   */
  async inviteTeamMember(teamId: string, email: string): Promise<TeamServiceResult> {
    return this.inviteUser(teamId, email);
  },

  /**
   * Get pending invites for a team
   */
  async getPendingInvites(teamId: string): Promise<TeamServiceResult> {
    try {
      const response = await api.get<TeamInvite[]>(`${TEAM_ENDPOINT}?id=${teamId}&action=pendingInvites`);
      return {
        success: true,
        invites: response
      };
    } catch (error: unknown) {
      console.error('Error fetching pending invites:', error);
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to fetch pending invites'
      };
    }
  },

  /**
   * Remove a member from a team
   */
  async removeMember(teamId: string, memberId: string): Promise<TeamServiceResult> {
    try {
      await api.delete(`${TEAM_ENDPOINT}?id=${teamId}&action=removeMember&memberId=${memberId}`);
      return { success: true };
    } catch (error: unknown) {
      console.error('Error removing team member:', error);
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to remove team member'
      };
    }
  },

  /**
   * Update a team member's role
   */
  async updateMemberRole(teamId: string, memberId: string, newRole: string): Promise<TeamServiceResult> {
    try {
      const response = await api.put(`${TEAM_ENDPOINT}?id=${teamId}&action=updateRole`, { memberId, newRole });
      return {
        success: true,
        data: response
      };
    } catch (error: unknown) {
      console.error('Error updating member role:', error);
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to update member role'
      };
    }
  },

  /**
   * Respond to a team invitation
   */
  async respondToInvite(inviteId: string, accept: boolean): Promise<TeamServiceResult<Team>> {
    try {
      const response = await api.post<Team>(`${TEAM_ENDPOINT}?action=respondToInvite`, {
        inviteId,
        accept
      });
      return {
        success: true,
        team: accept ? response : null
      };
    } catch (error: unknown) {
      console.error('Error responding to invite:', error);
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to respond to invitation'
      };
    }
  }
};

export default teamService;
