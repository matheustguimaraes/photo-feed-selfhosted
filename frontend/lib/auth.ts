import Cookies from "js-cookie";
import { authApi } from "./api";

export const setAuthTokens = (access: string, refresh: string): void => {
  Cookies.set("access_token", access, { expires: 7 });
  Cookies.set("refresh_token", refresh, { expires: 7 });
};

export const clearAuthTokens = (): void => {
  Cookies.remove("access_token");
  Cookies.remove("refresh_token");
};

export const getAccessToken = (): string | undefined => {
  return Cookies.get("access_token");
};

export const getRefreshToken = (): string | undefined => {
  return Cookies.get("refresh_token");
};

export const isAuthenticated = (): boolean => {
  return !!Cookies.get("access_token");
};

export const handleLogin = async (
  username: string,
  password: string
): Promise<void> => {
  const response = await authApi.login(username, password);
  setAuthTokens(response.access, response.refresh);
};

export const handleLogout = (): void => {
  clearAuthTokens();
  window.location.href = "/login";
};
