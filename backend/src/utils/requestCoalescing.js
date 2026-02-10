/**
 * Request Coalescing (Cache Stampede Prevention)
 * 
 * When a cache entry expires and multiple users request the same data
 * simultaneously, only ONE request to GitHub should be made. All other
 * callers wait for the first request to complete and share its result.
 * 
 * Without this, 10 concurrent users = 10 identical GitHub API calls.
 * With this, 10 concurrent users = 1 GitHub API call.
 * 
 * Usage:
 *   const result = await coalesce('my-unique-key', async () => {
 *       return await expensiveGitHubCall();
 *   });
 */

// Map of in-flight request promises keyed by request identifier
const inflightRequests = new Map();

/**
 * Coalesce concurrent requests for the same resource.
 * Only the first caller executes the factory function; all others
 * await the same promise.
 * 
 * @param {string} key - Unique identifier for the request (e.g. cache key)
 * @param {() => Promise<any>} factory - Async function that fetches the data
 * @returns {Promise<any>} The result from the factory function
 */
async function coalesce(key, factory) {
    // If there's already an in-flight request for this key, reuse it
    if (inflightRequests.has(key)) {
        return inflightRequests.get(key);
    }

    // Create the promise and register it
    const promise = factory()
        .then(result => {
            inflightRequests.delete(key);
            return result;
        })
        .catch(error => {
            inflightRequests.delete(key);
            throw error;
        });

    inflightRequests.set(key, promise);
    return promise;
}

/**
 * Get the number of currently in-flight coalesced requests.
 * Useful for monitoring/debugging.
 * @returns {number}
 */
function getInflightCount() {
    return inflightRequests.size;
}

module.exports = { coalesce, getInflightCount };
