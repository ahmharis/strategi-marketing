// api/generate.js - Versi yang disempurnakan dengan prompt yang lebih baik dan penanganan error yang lebih kuat

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return response.status(500).json({ error: 'API key tidak terkonfigurasi di server.' });
    }

    const { inputs, conversationHistory } = request.body;
    
    let contents;
    let systemInstructionText = `Anda adalah seorang CMO (Chief Marketing Officer) AI yang sangat ahli. Tugas Anda adalah memberikan analisis dan strategi pemasaran yang tajam, terstruktur, dan actionable.`;
    let forceJson = false;
    
    if (inputs) {
      // Ini adalah permintaan awal untuk membuat strategi.
      // Prompt ini lebih langsung dan to-the-point.
      const userQuery = `
        Analisis data bisnis ini dan berikan output HANYA dalam format JSON yang valid, tanpa teks atau penjelasan tambahan di luar JSON.
        Data Bisnis: ${JSON.stringify(inputs)}
      `;
      contents = [{ parts: [{ text: userQuery }] }];
      systemInstructionText += ` Anda harus mengisi struktur JSON yang diberikan dengan analisis mendalam.`;
      forceJson = true; // Kita memaksa output menjadi JSON
    } else if (conversationHistory) {
      // Ini adalah pertanyaan follow-up
      contents = conversationHistory;
      systemInstructionText += ` Jawablah pertanyaan lanjutan secara natural dan konversasional berdasarkan riwayat percakapan.`;
    } else {
      return response.status(400).json({ error: 'Request body harus berisi "inputs" atau "conversationHistory"' });
    }
    
    const payload = {
      contents: contents,
      systemInstruction: {
        parts: [{ text: systemInstructionText }]
      },
      generationConfig: {}
    };

    // Hanya terapkan responseMimeType jika diminta secara eksplisit
    if (forceJson) {
      payload.generationConfig.responseMimeType = "application/json";
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const fetchOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    };

    const geminiResponse = await fetch(apiUrl, fetchOptions);
    const geminiResult = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error('Gemini API Error:', geminiResult);
      const errorMessage = geminiResult?.error?.message || 'Gagal mengambil respons dari Gemini API';
      return response.status(geminiResponse.status).json({ error: errorMessage });
    }
    
    // --- PENANGANAN ERROR BARU YANG PENTING ---
    // Cek apakah AI benar-benar memberikan jawaban atau diblokir oleh filter keamanan
    if (!geminiResult.candidates || geminiResult.candidates.length === 0 || !geminiResult.candidates[0].content) {
        console.warn('Gemini response blocked or empty:', geminiResult);
        return response.status(500).json({ error: 'AI tidak memberikan respons yang valid. Ini bisa terjadi karena filter keamanan atau permintaan yang ambigu. Coba ubah isian Anda.' });
    }
    
    const textResponse = geminiResult.candidates[0].content.parts[0].text;
    
    response.status(200).json({ text: textResponse });

  } catch (error) {
    console.error('Internal Server Error:', error);
    response.status(500).json({ error: 'Terjadi kesalahan internal pada server.' });
  }
}

