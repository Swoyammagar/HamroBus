import { useAuth } from "../context/AuthContext";
// Export this hook for use in your app
export const useLogout = () => {
  const { logout } = useAuth();
  
  return async () => {
    await logout();
  };
};