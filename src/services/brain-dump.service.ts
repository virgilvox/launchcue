import apiService, { BRAINDUMP_ENDPOINT, CLIENT_ENDPOINT, PROJECT_ENDPOINT, BRAINDUMP_CONTEXT_ENDPOINT, AI_PROCESS_ENDPOINT, BRAINDUMP_CREATE_ITEMS_ENDPOINT } from './api.service';
import type { BrainDump, Client, Project } from '@/types/models';
import type { BrainDumpCreateRequest } from '@/types/api';

interface ProcessTextOptions {
  input: string;
  processingType: string;
  contextInfo?: string;
  useEnrichedContext?: boolean;
  maxTokens?: number;
}

interface AiProcessingResult {
  response: string;
  structuredData?: unknown[];
}

interface CreateItemsPayload {
  items: unknown[];
  [key: string]: unknown;
}

interface ContextDataParams {
  clientId?: string;
  projectId?: string;
  [key: string]: unknown;
}

class BrainDumpService {
  // --- CRUD for Brain Dumps ---
  async getDumps(): Promise<BrainDump[]> {
    try { return await apiService.get<BrainDump[]>(BRAINDUMP_ENDPOINT); } catch (error) { throw error; }
  }
  async getDump(id: string): Promise<BrainDump> {
    try { return await apiService.get<BrainDump>(`${BRAINDUMP_ENDPOINT}/${id}`); } catch (error) { throw error; }
  }
  async createDump(data: BrainDumpCreateRequest): Promise<BrainDump> {
    try { return await apiService.post<BrainDump>(BRAINDUMP_ENDPOINT, data); } catch (error) { throw error; }
  }
  async updateDump(id: string, data: Partial<BrainDumpCreateRequest>): Promise<BrainDump> {
    try { return await apiService.put<BrainDump>(`${BRAINDUMP_ENDPOINT}/${id}`, data); } catch (error) { throw error; }
  }
  async deleteDump(id: string): Promise<unknown> {
    try { return await apiService.delete(`${BRAINDUMP_ENDPOINT}/${id}`); } catch (error) { throw error; }
  }

  // --- Data fetching for context selection ---
  async getClients(): Promise<Client[]> {
    try { return await apiService.get<Client[]>(CLIENT_ENDPOINT); } catch (error) { throw error; }
  }

  async getClientProjects(clientId: string): Promise<Project[]> {
    if (!clientId) return [];
    try { return await apiService.get<Project[]>(PROJECT_ENDPOINT, { clientId }); } catch (error) { throw error; }
  }

  // --- Fetching detailed context data for AI ---
  async getContextData(params: ContextDataParams): Promise<unknown> {
      try { return await apiService.get(BRAINDUMP_CONTEXT_ENDPOINT, params as Record<string, unknown>); } catch (error) { throw error; }
  }

  // --- AI Processing ---
  /**
   * Process raw text input using the AI service.
   */
  async processText(options: ProcessTextOptions): Promise<AiProcessingResult> {
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
          return await apiService.post<AiProcessingResult>(AI_PROCESS_ENDPOINT, aiPayload);
      } catch (error) {
          console.error("AI Processing error:", error);
          throw error;
      }
  }

  // --- Creating items from structured data ---
  async createItems(itemsPayload: CreateItemsPayload): Promise<unknown> {
      try {
          return await apiService.post(BRAINDUMP_CREATE_ITEMS_ENDPOINT, itemsPayload);
      } catch (error) { throw error; }
  }
}

export default new BrainDumpService();
