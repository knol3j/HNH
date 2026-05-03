// Validate required environment variables on import
const requiredVars = [
  'VITE_API_URL',
  'VITE_AGENT_URL',
  'VITE_AGENT_SECRET'
];

const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);

if (missingVars.length > 0) {
  const errorMsg = `
Missing required environment variables: ${missingVars.join(', ')}

Please ensure these variables are set in your .env file:
${missingVars.map(varName => `${varName}=your_value_here`).join('\n')}

For development, you can copy .env.example to .env and fill in the values.
  `.trim();

  // In development, throw an error to catch misconfiguration early
  if (import.meta.env.MODE !== 'production') {
    throw new Error(errorMsg);
  } else {
    // In production, log to console but don't crash
    console.error('Environment validation warning:', errorMsg);
  }
}

// Export the validated env vars for use in the application
export const env = {
  apiUrl: import.meta.env.VITE_API_URL,
  agentUrl: import.meta.env.VITE_AGENT_URL,
  agentSecret: import.meta.env.VITE_AGENT_SECRET,
  // Add more as needed
};

export default env;