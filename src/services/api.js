// src/services/api.js

const BASE_URL =
  import.meta.env.VITE_SHEET_API_URL || "/commtrack-api";

/**
 * Generic request function for Google Apps Script
 */
export async function request(action = "", method = "GET", data = {}) {
  try {
    let url = BASE_URL;

    const options = {
      method,
      redirect: "follow",
      cache: "no-store",
    };

    if (method.toUpperCase() === "GET") {
      const params = new URLSearchParams();

      if (action) {
        params.append("action", action);
      }

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value);
        }
      });

      if ([...params].length > 0) {
        url += `?${params.toString()}`;
      }
    } else {
      options.headers = {
        "Content-Type": "text/plain;charset=utf-8",
      };

      const body = {
  action,
  ...data,
};

options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON returned:\n${text}`);
    }
  } catch (err) {
    console.error("API Error:", err);
    throw err;
  }
}
/**
 * Login
 */
export function login(username, password) {
  return request("login", "POST", {
    username,
    password,
  });
}