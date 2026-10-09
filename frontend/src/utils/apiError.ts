import axios, { AxiosError } from "axios";

interface ApiErrorBody {
  message?: string;
  detail?: string | Array<{ msg?: string; message?: string }>;
  error?: string;
  status?: number;
}

export function extractApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorBody | undefined;
    if (data) {
      if (typeof data.detail === "string" && data.detail.trim()) {
        return data.detail;
      }
      if (Array.isArray(data.detail) && data.detail.length > 0) {
        return data.detail.map((e) => e.msg || e.message || JSON.stringify(e)).join(", ");
      }
      if (data.message && data.message.trim()) {
        return data.message;
      }
      if (data.error && data.error.trim()) {
        return data.error;
      }
    }
    return (
      error.message ||
      "Đã xảy ra lỗi không xác định"
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Đã xảy ra lỗi không xác định";
}

export function extractApiStatus(error: unknown): number | undefined {
  if (!axios.isAxiosError(error)) {
    return undefined;
  }

  return (error as AxiosError<ApiErrorBody>).response?.status;
}

