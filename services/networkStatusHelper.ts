/**
 * Network Status Helper
 * 
 * Provides utilities for identifying and explaining common network issues,
 * such as Mixed Content (HTTPS -> HTTP) and unreachable local agents.
 */

export const explainFetchError = (e: any, url: string): string => {
    const errorStr = String(e);

    // Check if it's a localhost URL
    const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');

    // Check if current page is HTTPS
    const isHttps = window.location.protocol === 'https:';

    if (errorStr.includes('TypeError: Failed to fetch') || errorStr.includes('NetworkError')) {
        if (isHttps && isLocalhost && !url.includes('https://')) {
            return "Connection blocked by browser (Mixed Content). To fix: \n1. Click the 'Not Secure' or 'Lock' icon in your address bar.\n2. Select 'Site settings'.\n3. Set 'Insecure content' to 'Allow'.\n4. Refresh the page.";
        }

        if (isLocalhost) {
            return "Cannot reach local mining agent. Please ensure the agent is running on port 4343 and CORS is enabled.";
        }
    }

    return errorStr;
};

export const isMixedContentError = (e: any, url: string): boolean => {
    const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
    const isHttps = window.location.protocol === 'https:';
    const errorStr = String(e);

    return (isHttps && isLocalhost && !url.includes('https://') &&
        (errorStr.includes('TypeError: Failed to fetch') || errorStr.includes('NetworkError')));
};
