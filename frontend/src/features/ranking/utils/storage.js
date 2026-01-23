/**
 * Local Storage Utilities
 * Handles all localStorage operations with error handling
 */

/**
 * Load data from localStorage with fallback
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist or parsing fails
 * @returns {*} Parsed value or default
 */
export function loadFromStorage(key, defaultValue) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (err) {
    console.warn(`Failed to load ${key} from storage:`, err);
    return defaultValue;
  }
}

/**
 * Save data to localStorage with error handling
 * @param {string} key - Storage key
 * @param {*} value - Value to save (will be JSON stringified)
 */
export function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to save ${key} to storage:`, err);
  }
}

/**
 * Remove item from localStorage
 * @param {string} key - Storage key to remove
 */
export function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`Failed to remove ${key} from storage:`, err);
  }
}

/**
 * Clear multiple storage keys
 * @param {string[]} keys - Array of keys to clear
 */
export function clearStorage(keys) {
  keys.forEach(key => removeFromStorage(key));
}
