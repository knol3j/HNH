/**
 * Frontend Environment Variable Validation
 * Runs immediately on import in development to catch missing config
 */

const requiredEnvVars = [
  'VITE_API_URL',
  'VITE_AGENT_URL',
  'VITE_AGENT_SECRET',
];

const optionalEnvVars = [
  'VITE_COINGECKO_API_KEY',
  'VITE_STRIPE_PUBLIC_KEY',
];

function validate() {
  const missing = requiredEnvVars.filter(key => !import.meta.env[key]);
  if (missing.length > 0) {
    const msg = `❌ Missing required environment variables: ${missing.join(', ')}. Check your .env file.`;
    if (import.meta.env.DEV) {
      console.error(msg);
      // In dev, we can be lenient - show warning but don't throw
      // In prod, we might want to fail hard
    } else {
      console.error(msg);
    }
  }

  // Validate AGENT_SECRET is set (security)
  const agentSecret = import.meta.env.VITE_AGENT_SECRET;
  if (!agentSecret || agentSecret === 'HNH_LOCAL_AGENT_SECRET') {
    console.warn('⚠️  Using default AGENT_SECRET. Set VITE_AGENT_SECRET in production for security.');
  }
}

// Run validation immediately
validate();

export const getEnv = (key: string): string => {
  const val = import.meta.env[key];
  if (!val) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return val;
};
