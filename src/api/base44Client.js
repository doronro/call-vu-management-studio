import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication disabled for development
export const base44 = createClient({
  appId: "67d1a256007cb294dd8ba980", 
  requiresAuth: false // Disable authentication requirement for development
});
