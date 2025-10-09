/**
 * User mapping configuration
 * Maps usernames to user IDs and display names for activity tracking
 *
 * Users are defined via environment variables for security:
 * VITE_USERS='ben:user-ben:Ben Malone:pass123,tyler:user-tyler:Tyler:pass456'
 * Format: username:userId:displayName:password,username:userId:displayName:password
 */

export interface User {
  id: string
  username: string
  displayName: string
  password: string
}

// Parse users from environment variable
const parseUsers = (): Record<string, User> => {
  const usersEnv = import.meta.env.VITE_USERS;

  if (!usersEnv) {
    // Fallback for local development only
    console.warn('VITE_USERS not set - using default development users');
    return {
      ben: {
        id: 'user-ben',
        username: 'ben',
        displayName: 'Ben Malone',
        password: 'password123'
      },
      tyler: {
        id: 'user-tyler',
        username: 'tyler',
        displayName: 'Tyler',
        password: 'password123'
      },
      hannah: {
        id: 'user-hannah',
        username: 'hannah',
        displayName: 'Hannah',
        password: 'password123'
      }
    };
  }

  const users: Record<string, User> = {};

  usersEnv.split(',').forEach(userStr => {
    const [username, id, displayName, password] = userStr.split(':');
    if (username && id && displayName && password) {
      users[username.toLowerCase()] = {
        id,
        username: username.toLowerCase(),
        displayName,
        password
      };
    }
  });

  return users;
};

export const USERS: Record<string, User> = parseUsers();

// Helper function to get user by ID
export const getUserById = (userId: string | null): User | null => {
  if (!userId) return null
  return Object.values(USERS).find(u => u.id === userId) || null
}

// Helper function to get display name by user ID
export const getDisplayName = (userId: string | null): string => {
  if (userId === 'unknown') return 'Unknown User'
  const user = getUserById(userId)
  return user?.displayName || 'Unknown User'
}

// Helper function to get user initials for avatars
export const getUserInitials = (userId: string | null): string => {
  const user = getUserById(userId)
  if (!user) return '?'

  const names = user.displayName.split(' ')
  if (names.length >= 2) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
  }
  return user.displayName.substring(0, 2).toUpperCase()
}
