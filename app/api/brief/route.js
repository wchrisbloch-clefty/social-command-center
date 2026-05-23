export async function POST(request) {
  const body = await request.json();
  const { prompt, type } = body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return Response.json({ text: "API key not configured. Add GEMINI_API_KEY in Vercel settings.", error: true }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: type === "handle" ? 150 : 350,
            temperature: type === "handle" ? 0.1 : 0.7,
          },
        }),
      }
    );

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (type === "handle") {
      try {
        const clean = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        return Response.json({ handles: parsed });
      } catch {
        return Response.json({ handles: {} });
      }
    }

    return Response.json({ text });
  } catch (err) {
    return Response.json({ text: "Request failed. Please try again.", error: true }, { status: 500 });
  }
}
