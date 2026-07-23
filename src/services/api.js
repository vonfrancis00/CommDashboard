// src/services/api.js

const BASE_URL =
  import.meta.env.VITE_SHEET_API_URL;

const RECORDS_CACHE_MS = 60_000;
let recordsCache = null;
let recordsCacheTime = 0;
let recordsRequest = null;

function getAuthToken() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}").authToken || "";
  } catch {
    return "";
  }
}
if (import.meta.env.DEV) {

  console.log(
    "API URL:",
    BASE_URL
  );

}


export async function request(
  action = "",
  method = "GET",
  data = {}
) {

  try {

    let url = BASE_URL;


    const options = {

      method:
        method.toUpperCase(),

      cache:
        "no-store",

    };


    // =====================
    // GET
    // =====================
    if (
      method.toUpperCase() === "GET"
    ) {


      const params =
        new URLSearchParams({
          _t: Date.now(),
        });


      if (action) {

        params.append(
          "action",
          action
        );

      }

      const authToken = getAuthToken();
      if (authToken) params.append("authToken", authToken);


      Object.entries(data).forEach(
        ([key, value]) => {

          if (
            value !== undefined &&
            value !== null
          ) {

            params.append(
              key,
              value
            );

          }

        }
      );


      url +=
        `?${params.toString()}`;

    }


    // =====================
    // POST
    // =====================
    else {


      options.headers = {

        "Content-Type":
          "text/plain;charset=utf-8",

      };


      options.body =
        JSON.stringify({

          action,
          ...(action === "login" ? {} : { authToken: getAuthToken() }),

          ...data,

        });

    }



    const response =
      await fetch(
        url,
        options
      );



    const text =
      await response.text();



    if (!response.ok) {


      throw new Error(
        `HTTP ${response.status}: ${text}`
      );


    }



    const result = text
      ? JSON.parse(text)
      : {};

    if (result?.code === "AUTH_REQUIRED") {
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("commtrack:session-expired"));
      const authError = new Error(result.error || "Your session has expired.");
      authError.code = "AUTH_REQUIRED";
      throw authError;
    }

    if (
      action !== "login" &&
      result &&
      !Array.isArray(result) &&
      result.success === false
    ) {
      const apiError = new Error(result.error || result.message || "The request failed.");
      apiError.code = result.code || "API_ERROR";
      throw apiError;
    }

    if (
      method.toUpperCase() === "GET" &&
      action === "getRecords" &&
      Array.isArray(result)
    ) {
      recordsCache = result;
      recordsCacheTime = Date.now();
    } else if (method.toUpperCase() !== "GET") {
      recordsCache = null;
      recordsCacheTime = 0;
    }

    return result;

  } catch (err) {


    console.error(
      "API Error:",
      err
    );


    throw err;


  }

}

export function getRecords({ force = false } = {}) {
  if (
    !force &&
    recordsCache &&
    Date.now() - recordsCacheTime < RECORDS_CACHE_MS
  ) {
    return Promise.resolve(recordsCache);
  }

  if (!force && recordsRequest) return recordsRequest;

  const pending = request("getRecords", "GET");
  recordsRequest = pending;
  const clearPending = () => {
    if (recordsRequest === pending) recordsRequest = null;
  };
  pending.then(clearPending, clearPending);
  return pending;
}



// LOGIN
export function login(
  username,
  password
) {


  return request(
    "login",
    "POST",
    {

      username,

      password,

    }

  );


}
