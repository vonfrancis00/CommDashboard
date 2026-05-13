export default async function handler(req, res) {
  try {
    const scriptUrl = process.env.SHEET_API_URL;

    if (!scriptUrl) {
      return res.status(500).json({
        error: "Missing SHEET_API_URL in Vercel environment variables",
      });
    }

    const response = await fetch(scriptUrl, {
      method: "GET",
      redirect: "follow",
    });

    const text = await response.text();

    res.setHeader("Content-Type", "application/json");

    if (!response.ok) {
      return res.status(response.status).send(
        JSON.stringify({
          error: `Apps Script returned HTTP ${response.status}`,
          body: text,
        })
      );
    }

    return res.status(200).send(text);
  } catch (error) {
    return res.status(500).json({
      error: error?.message || String(error),
    });
  }
}