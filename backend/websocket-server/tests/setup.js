// Setup script for Jest
const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock console methods to avoid noisy test output, unless we are debugging
global.console = {
  ...console,
  // log: jest.fn(),
  // info: jest.fn(),
  // debug: jest.fn(),
  error: jest.fn(),
};

// Mock Supabase
jest.mock('@supabase/supabase-js', () => {
  const mSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
  };
  return {
    createClient: jest.fn(() => mSupabase),
  };
});
