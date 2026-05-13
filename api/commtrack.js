export default async function handler(req, res) {
  try {
    const scriptUrl = process.env.SHEET_API_URL;

    if (!scriptUrl) {
      return res.status(500).json({ error: "Missing SHEET_API_URL" });
    }

    const response = await fetch(scriptUrl, {
      method: "GET",
    });

    const text = await response.text();

    res.status(response.status);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");

    return res.send(text);
  } catch (error) {
    return res.status(500).json({
      error: error?.message || String(error),
    });
  }
}