export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "API Key missing in Vercel Environment Variables!" });
    }

    const { messages, userName } = req.body;

    const systemInstruction = `You are Proxis AI (Proxineon AI), built by RonzDavil Organisation. You are assisting ${userName || 'User'}. Respond in a friendly tone using clear Markdown and English/Roman Urdu.`;

    // History Format Convert Karein Gemini REST API ke liye
    let contents = [];

    if (Array.isArray(messages)) {
      for (const msg of messages) {
        if (msg.role === 'user') {
          let parts = [{ text: msg.content || '' }];

          if (msg.files && msg.files.length > 0) {
            msg.files.forEach(file => {
              if (file.type === 'image') {
                const base64Data = file.data.includes(',') ? file.data.split(',')[1] : file.data;
                const mimeType = file.data.substring(file.data.indexOf(":") + 1, file.data.indexOf(";")) || "image/jpeg";
                parts.push({
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                  }
                });
              } else if (file.type === 'text') {
                parts.push({ text: `\n[Attached File (${file.name})]:\n${file.data}` });
              }
            });
          }
          contents.push({ role: 'user', parts });
        } else if (msg.role === 'assistant') {
          contents.push({ role: 'model', parts: [{ text: msg.content }] });
        }
      }
    }

    // Direct Google REST API Endpoint Call
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: contents
      })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      return res.status(apiResponse.status).json({ 
        error: data.error?.message || "Google API Error" 
      });
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
    return res.status(200).json({ reply: replyText });

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
