// API Base URL for backend endpoints
// Expo web/native apps should use EXPO_PUBLIC_* env vars.
export const API_BASE_URL =
	process.env.EXPO_PUBLIC_API_BASE ||
	'http://localhost:3000/api';
