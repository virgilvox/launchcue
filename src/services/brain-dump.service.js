import apiService, { BRAINDUMP_ENDPOINT, CLIENT_ENDPOINT, PROJECT_ENDPOINT, BRAINDUMP_CONTEXT_ENDPOINT, AI_PROCESS_ENDPOINT, BRAINDUMP_CREATE_ITEMS_ENDPOINT } from './api.service';

class BrainDumpService {
  // --- CRUD for Brain Dumps --- 
  async getDumps() {
    try { return await apiService.get(BRAINDUMP_ENDPOINT); } catch (error) { throw error; }
  }
  async getDump(id) {
    try { return await apiService.get(`${BRAINDUMP_ENDPOINT}/${id}`); } catch (error) { throw error; }
  }
  async createDump(data) {
    try { return await apiService.post(BRAINDUMP_ENDPOINT, data); } catch (error) { throw error; }
  }
  async updateDump(id, data) {
    try { return await apiService.put(`${BRAINDUMP_ENDPOINT}/${id}`, data); } catch (error) { throw error; }
  }
  async deleteDump(id) {
    try { return await apiService.delete(`${BRAINDUMP_ENDPOINT}/${id}`); } catch (error) { throw error; }
  }

  // --- Data fetching for context selection ---
  async getClients() {
    try { return await apiService.get(CLIENT_ENDPOINT); } catch (error) { throw error; }
  }

  async getClientProjects(clientId) {
    if (!clientId) return [];
    try { return await apiService.get(PROJECT_ENDPOINT, { clientId: clientId }); } catch (error) { throw error; }
  }

  // --- Fetching detailed context data for AI ---
  async getContextData(params) {
      try { return await apiService.get(BRAINDUMP_CONTEXT_ENDPOINT, params); } catch (error) { throw error; }
  }

  // --- AI Processing --- 
  /**
   * Process raw text input using the AI service.
   * @param {object} options - Processing options
   * @param {string} options.input - The raw text to process
   * @param {string} options.processingType - e.g., 'summarize', 'actionItems'
   * @param {string} [options.contextInfo] - Optional formatted context string
   * @param {boolean} [options.useEnrichedContext=false] - Hint for backend prompt strategy
   * @param {number} [options.maxTokens=1024] - Max tokens for AI response
   * @returns {Promise<Object>} - AI processing result { response: string, structuredData?: any[] }
   */
  async processText(options) {
      try { 
          const aiPayload = {
            prompt: options.input,
            processingDetails: {
              type: options.processingType,
              context: options.contextInfo || '',
              enriched: options.useEnrichedContext || false
            },
            max_tokens: options.maxTokens || 1500
          };
          
          // Use direct call to apiService.post
          return await apiService.post(AI_PROCESS_ENDPOINT, aiPayload);
      } catch (error) { 
          console.error("AI Processing error:", error);
          throw error;
      }
  }

  // --- Creating items from structured data ---
  async createItems(itemsPayload) {
      try { 
          return await apiService.post(BRAINDUMP_CREATE_ITEMS_ENDPOINT, itemsPayload); 
      } catch (error) { throw error; }
  }
}

export default new BrainDumpService(); 