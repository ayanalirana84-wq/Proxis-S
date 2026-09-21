import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Vercel Environment Variable se API Key fetch karein
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server error: GEMINI_API_KEY Missing!" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Fast aur free model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const { messages, userName } = req.body;

    const systemInstruction = `You are Proxis AI (Proxineon AI), an ultra-intelligent, highly intuitive AI personal assistant built by RonzDavil Organisation. You are assisting ${userName || 'User'}. Respond in a friendly, helpful tone using clear Markdown and English/Roman Urdu mix where appropriate.`;

    // History aur prompt build karein
    let contents = [];

    if (Array.isArray(messages)) {
      for (const msg of messages) {
        if (msg.role === 'user') {
          let parts = [{ text: msg.content || '' }];

          // Attached Images process karein
          if (msg.files && msg.files.length > 0) {
            msg.files.forEach(file => {
              if (file.type === 'image') {
                const base64Data = file.data.includes(',') ? file.data.split(',')[1] : file.data;
                const mimeType = file.data.substring(file.data.indexOf(":") + 1, file.data.indexOf(";")) || "image/jpeg";
                parts.push({
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                  }
                });
              } else if (file.type === 'text') {
                parts.push({ text: `\n[Attached File Content (${file.name})]:\n${file.data}` });
              }
            });
          }
          contents.push({ role: 'user', parts });
        } else if (msg.role === 'assistant') {
          contents.push({ role: 'model', parts: [{ text: msg.content }] });
        }
      }
    }

    // Gemini API Request
    const result = await model.generateContent({
      contents: contents,
      systemInstruction: systemInstruction
    });

    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ reply: text });

  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: error.message || "Something went wrong" });
  }
}

