export default async function handler(req, res) {
  try {
    const scriptUrl = process.env.SHEET_API_URL;

    if (!scriptUrl) {
      return res.status(500).json({
        stage: "env",
        error: "SHEET_API_URL is missing in Vercel",
      });
    }

    const maskedUrl = scriptUrl.replace(
      /(https:\/\/script\.google\.com\/macros\/s\/).+?(\/exec)/,
      "$1***$2"
    );

    const response = await fetch(scriptUrl, {
      method: "GET",
      redirect: "follow",
    });

    const text = await response.text();

    return res.status(200).json({
      stage: "fetch",
      maskedUrl,
      upstreamStatus: response.status,
      upstreamOk: response.ok,
      bodyPreview: text.slice(0, 500),
    });
  } catch (error) {
    return res.status(500).json({
      stage: "catch",
      error: error?.message || String(error),
      stack: error?.stack || "",
    });
  }
}