// src/services/api.js

const BASE_URL =
  import.meta.env.VITE_SHEET_API_URL;


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



    return text
      ? JSON.parse(text)
      : {};


  } catch (err) {


    console.error(
      "API Error:",
      err
    );


    throw err;


  }

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