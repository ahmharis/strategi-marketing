// api/generate.js - Versi final dengan prompt yang disempurnakan untuk hasil yang konsisten.

export default async function handler(request, response) {
  // 1. Memastikan metode request adalah POST
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // 2. Mengambil API Key dari Environment Variables Vercel
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return response.status(500).json({ error: 'API key tidak terkonfigurasi di server.' });
    }

    // 3. Mengambil data yang dikirim dari frontend
    const { inputs, conversationHistory } = request.body;
    
    let contents;
    let systemInstructionText = `Anda adalah seorang CMO (Chief Marketing Officer) AI elit kelas dunia. Anda berpikir secara strategis, kreatif, dan berorientasi pada hasil. Jawaban Anda harus tajam, mendalam, dan langsung ke intinya.`;
    let forceJson = false;
    
    // 4. Membedakan antara permintaan awal dan pertanyaan lanjutan
    if (inputs) {
      // Ini adalah permintaan awal untuk membuat strategi.
      // Prompt ini memberikan contoh struktur yang harus diisi, yang jauh lebih efektif.
      const userQuery = `
        Sebagai seorang CMO ahli, lakukan analisis mendalam terhadap data bisnis berikut.
        Tugas Anda adalah mengisi struktur JSON di bawah ini dengan analisis dan strategi yang paling relevan dan berdampak tinggi.
        Pastikan setiap bagian terisi dengan wawasan yang actionable.

        **Data Bisnis dari Klien:**
        ${JSON.stringify(inputs, null, 2)}

        **Struktur Output JSON yang HARUS Anda isi:**
        {
          "ringkasanEksekutif": "Tulis sebuah paragraf ringkasan yang kuat dan profesional, menyoroti peluang terbesar.",
          "analisisTargetAudiens": {
            "deskripsi": "Buat deskripsi 'persona' yang hidup untuk target audiens ini, seolah-olah mereka adalah orang sungguhan.",
            "poinPenting": ["Tuliskan satu insight psikologis utama tentang audiens ini.", "Tuliskan masalah utama yang bisa dipecahkan produk Anda untuk mereka.", "Tuliskan di mana audiens ini paling sering menghabiskan waktu online."]
          },
          "strategiUtama": [
            { "nama": "Nama Strategi Inti #1 (Contoh: Dominasi Konten Lokal)", "deskripsi": "Jelaskan secara detail bagaimana strategi ini akan dieksekusi." },
            { "nama": "Nama Strategi Inti #2 (Contoh: Program Loyalitas Komunitas)", "deskripsi": "Jelaskan secara detail bagaimana strategi kedua ini akan dieksekusi." }
          ],
          "kanalPemasaran": [
            { "kanal": "Instagram", "taktik": "Berikan 2-3 taktik spesifik dan kreatif untuk Instagram." },
            { "kanal": "TikTok", "taktik": "Berikan 2-3 taktik spesifik dan kreatif untuk TikTok." }
          ],
          "ideKonten": [
            { "platform": "Instagram Reels", "ide": "Berikan satu ide konten video yang menarik dan relevan." },
            { "platform": "TikTok", "ide": "Berikan satu ide konten video yang berpotensi viral." }
          ]
        }
      `;
      contents = [{ parts: [{ text: userQuery }] }];
      forceJson = true; 
    } else if (conversationHistory) {
      // Ini adalah pertanyaan follow-up
      contents = conversationHistory;
      systemInstructionText += ` Jawablah pertanyaan lanjutan secara natural dan membantu berdasarkan konteks percakapan.`;
    } else {
      return response.status(400).json({ error: 'Request body harus berisi "inputs" atau "conversationHistory"' });
    }
    
    // 5. Membangun payload untuk dikirim ke Google AI
    const payload = {
      contents: contents,
      systemInstruction: { parts: [{ text: systemInstructionText }] },
      generationConfig: {}
    };

    if (forceJson) {
      payload.generationConfig.responseMimeType = "application/json";
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    // 6. Mengirim request ke Google AI
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const geminiResult = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error('Gemini API Error:', geminiResult);
      return response.status(geminiResponse.status).json({ error: geminiResult?.error?.message || 'Gagal mengambil respons dari Gemini API' });
    }
    
    // 7. Pengecekan krusial untuk respons kosong
    if (!geminiResult.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.warn('Gemini response blocked or empty:', geminiResult);
        return response.status(500).json({ error: 'AI tidak memberikan respons yang valid. Ini bisa terjadi karena filter keamanan atau input yang terlalu ambigu. Coba ubah isian Anda.' });
    }
    
    const textResponse = geminiResult.candidates[0].content.parts[0].text;
    
    // 8. Mengirimkan hasil kembali ke frontend
    response.status(200).json({ text: textResponse });

  } catch (error) {
    console.error('Internal Server Error:', error);
    response.status(500).json({ error: 'Terjadi kesalahan internal pada server.' });
  }
}

