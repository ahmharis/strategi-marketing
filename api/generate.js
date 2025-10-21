// api/generate.js - Ini adalah Vercel Serverless Function (Backend kita)

export default async function handler(request, response) {
  // Hanya izinkan metode POST
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // 1. Ambil API Key dari Environment Variable yang aman di Vercel
    // Nama 'GEMINI_API_KEY' harus sama persis dengan yang kita atur di Vercel nanti
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Jika API key tidak ditemukan di server, kirim error
      return response.status(500).json({ error: 'API key not configured on server' });
    }

    // 2. Ambil data (conversation history, dll) yang dikirim dari frontend
    const { contents, systemInstruction } = request.body;
    
    // Validasi data yang masuk
    if (!contents) {
        return response.status(400).json({ error: 'Missing "contents" in request body' });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    // 3. Buat payload untuk dikirim ke Google Gemini API
    const payload = {
      contents: contents,
      systemInstruction: systemInstruction,
    };

    // 4. Hubungi Google Gemini API dari sisi server
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    const geminiResponse = await fetch(apiUrl, fetchOptions);

    if (!geminiResponse.ok) {
      // Jika Google mengembalikan error, teruskan informasinya
      const errorData = await geminiResponse.json();
      console.error('Gemini API Error:', errorData);
      return response.status(geminiResponse.status).json({ error: 'Failed to fetch response from Gemini API', details: errorData });
    }
    
    // 5. Kirim kembali hasil dari Google ke frontend
    const geminiResult = await geminiResponse.json();
    response.status(200).json(geminiResult);

  } catch (error) {
    // Tangani error tak terduga
    console.error('Internal Server Error:', error);
    response.status(500).json({ error: 'An internal server error occurred.' });
  }
}
