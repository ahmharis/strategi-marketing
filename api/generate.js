// api/generate.js - Backend dengan prompt JSON yang disempurnakan

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return response.status(500).json({ error: 'API key not configured on server' });
    }

    const { inputs } = request.body;
    if (!inputs) {
        return response.status(400).json({ error: 'Missing "inputs" in request body' });
    }

    // --- PROMPT YANG DISEMPURNAKAN ---
    // Memberikan instruksi yang lebih kaya dan kontekstual untuk setiap field JSON.
    const userQuery = `
      Anda adalah seorang Chief Marketing Officer (CMO) AI yang sangat strategis dan kreatif. Tugas Anda adalah mengubah data mentah bisnis menjadi sebuah rencana pemasaran yang tajam, actionable, dan meyakinkan.
      
      Gunakan data bisnis berikut:
      - Nama Produk: ${inputs.productName}
      - Deskripsi: ${inputs.productDesc}
      - Target Audiens: ${inputs.targetAudience}
      - Tujuan Pemasaran: ${inputs.marketingGoals}
      - Kelebihan Unik (USP): ${inputs.usp}
      - Kompetitor Utama: ${inputs.competitors}

      Analisis data tersebut secara mendalam dan berikan jawaban HANYA dalam format JSON yang valid, tanpa teks lain di luar JSON. Pastikan setiap bagian diisi dengan analisis yang relevan dan berkualitas tinggi.
      
      Struktur JSON yang harus digunakan:
      {
        "ringkasanEksekutif": "Tulis sebuah paragraf ringkasan yang kuat dan profesional, seolah-olah Anda mempresentasikannya kepada investor. Jelaskan secara singkat masalah, solusi, dan potensi pasar.",
        "analisisTargetAudiens": {
          "deskripsi": "Buat deskripsi 'persona' yang hidup untuk target audiens. Beri mereka nama, jelaskan keseharian mereka, masalah yang mereka hadapi, dan mengapa produk ini relevan bagi mereka.",
          "poinPenting": ["Sebutkan 3 wawasan psikografis atau demografis paling penting tentang audiens ini.", "Poin insight kedua.", "Poin insight ketiga."]
        },
        "strategiUtama": [
          { "nama": "Nama Strategi Inti #1", "deskripsi": "Jelaskan strategi ini dengan jelas. Fokus pada 'mengapa' strategi ini penting berdasarkan USP dan data kompetitor." },
          { "nama": "Nama Strategi Inti #2", "deskripsi": "Jelaskan strategi kedua yang mendukung strategi pertama, dengan fokus pada bagaimana cara mencapai tujuan pemasaran." }
        ],
        "kanalPemasaran": [
          { "kanal": "Pilih kanal paling relevan #1 (e.g., Instagram)", "taktik": "Berikan 2-3 taktik spesifik dan kreatif untuk kanal ini. Contoh: 'Kolaborasi dengan 5 micro-influencer di niche kuliner untuk review jujur'." },
          { "kanal": "Pilih kanal paling relevan #2 (e.g., TikTok)", "taktik": "Berikan 2-3 taktik spesifik dan kreatif untuk kanal ini. Contoh: 'Buat challenge #SenjaDiTanganmu dimana user memposting foto kopi dengan latar senja'." },
          { "kanal": "Pilih kanal paling relevan #3 (e.g., Komunitas Lokal)", "taktik": "Berikan 2-3 taktik spesifik dan kreatif untuk kanal ini. Contoh: 'Sponsori acara mingguan di co-working space terdekat dengan menyediakan produk gratis'." }
        ],
        "ideKonten": [
          { "platform": "Instagram Reels/TikTok", "ide": "Berikan satu ide video pendek yang menarik dan mudah dibuat." },
          { "platform": "Instagram Feed", "ide": "Berikan satu ide untuk post gambar atau carousel yang menonjolkan USP produk." }
        ]
      }
    `;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    };

    const fetchOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    };

    const geminiResponse = await fetch(apiUrl, fetchOptions);

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      console.error('Gemini API Error:', errorData);
      return response.status(geminiResponse.status).json({ error: 'Failed to fetch response from Gemini API', details: errorData });
    }
    
    const geminiResult = await geminiResponse.json();
    const jsonText = geminiResult.candidates[0].content.parts[0].text;
    const structuredData = JSON.parse(jsonText);

    response.status(200).json(structuredData);

  } catch (error) {
    console.error('Internal Server Error:', error);
    response.status(500).json({ error: 'An internal server error occurred.' });
  }
}

