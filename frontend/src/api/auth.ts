import apiClient from "./apiClient";
import type { User } from "../types";
import { mockLogin, mockRegister } from "./mockClient";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export interface LoginRequest {
  username: string;
  password: string;
  role: "ADMIN" | "STAFF" | "CUSTOMER";
}

export interface RegisterRequest {
  fullName: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

function _loginRequest(payload: LoginRequest): Promise<LoginResponse> {
  return apiClient
    .post<LoginResponse>("/public/auth/login", payload)
    .then((response) => response.data);
}

function _registerRequest(payload: RegisterRequest): Promise<LoginResponse> {
  return apiClient
    .post<LoginResponse>("/public/auth/register", payload)
    .then((response) => response.data);
}

export const loginRequest = USE_MOCK ? mockLogin : _loginRequest;
export const registerRequest = USE_MOCK ? mockRegister : _registerRequest;
