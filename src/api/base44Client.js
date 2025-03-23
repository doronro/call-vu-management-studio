import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication disabled for development
export const base44 = createClient({
  appId: "67d1a256007cb294dd8ba980", 
  requiresAuth: false, // Disable authentication requirement for development
  debug: true, // Enable debug mode to get more detailed logs
  timeout: 10000, // Increase timeout for API requests
  retryConfig: {
    retries: 3, // Number of retry attempts
    initialDelayMs: 1000, // Initial delay between retries
    maxDelayMs: 5000 // Maximum delay between retries
  }
});

// Add global error handler for SDK operations
base44.on('error', (error) => {
  console.error('Base44 SDK Error:', error);
});

// Add global success handler for debugging
base44.on('success', (response) => {
  console.log('Base44 SDK Success:', response);
});
