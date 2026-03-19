import { vi } from 'vitest'

// Stub environment variables for all tests
process.env.SUPABASE_URL = 'http://localhost:8000'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
process.env.SMTP_HOST = 'localhost'
process.env.SMTP_PORT = '587'
process.env.SMTP_USER = 'test'
process.env.SMTP_PASS = 'test'
process.env.SMTP_FROM = 'noreply@test.dev'
process.env.NODE_ENV = 'test'

// Mock the supabase module globally — individual tests override return values
vi.mock('../src/supabase.js', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => mockSupabase._query),
    _query: {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
    },
  }
  return {
    getSupabase: vi.fn(() => mockSupabase),
    __mockSupabase: mockSupabase,
  }
})
