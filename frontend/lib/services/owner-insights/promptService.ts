import type { OwnerInsightCategory } from "./insightSchema";

export function buildOwnerInsightPrompt(
  category: OwnerInsightCategory,
  snapshot: Record<string, unknown>,
) {
  return `Anda adalah Business Intelligence Advisor untuk owner IZA POS.

Tugas:
Buat maksimal 5 rekomendasi bisnis untuk kategori: ${category}.
Analisis hanya berdasarkan snapshot JSON yang diberikan.
Jangan membuat angka, tren, atau fakta yang tidak ada di snapshot.
Gunakan Bahasa Indonesia yang jelas, profesional, dan actionable.

Konteks periode:
- Periode utama: Today
- Perbandingan: Yesterday
- Timezone: Asia/Jakarta

Aturan wajib:
1. Output hanya JSON valid, tanpa markdown, tanpa penjelasan tambahan.
2. Root JSON harus berbentuk array.
3. Setiap item harus mengikuti schema:
   {
     "id": "string-singkat-unik",
     "category": "${category}",
     "title": "string",
     "priority": "high|medium|low",
     "confidence": "high|medium|low",
     "problem": "string",
     "evidence": ["string dengan angka dari snapshot"],
     "recommendation": "string",
     "expectedImpact": "string",
     "actionLabel": "string opsional",
     "actionHref": "string opsional"
   }
4. Setiap recommendation harus punya minimal 1 evidence.
5. Evidence harus menyebut angka/metrik dari snapshot.
6. Hindari saran generik seperti "tingkatkan promosi" kecuali dijelaskan berdasarkan metrik.
7. Jika data tidak cukup, buat insight yang menyatakan data belum cukup dan rekomendasikan metrik apa yang perlu dipantau.
8. Jangan menyebut bahwa Anda adalah AI.
9. Jangan menyarankan diskon besar tanpa mempertimbangkan margin/discount cost jika data tersedia.
10. Untuk actionHref, gunakan hanya route internal yang relevan dari daftar:
    - /owner/dashboard?tab=sales
    - /owner/dashboard?tab=rewards
    - /owner/dashboard?tab=inventory
    - /owner/dashboard?tab=staff
    - /owner/dashboard?tab=operations

Snapshot JSON:
${JSON.stringify(snapshot, null, 2)}`;
}

export function buildJsonRepairPrompt(
  category: OwnerInsightCategory,
  invalidResponse: string,
) {
  return `Ubah respons berikut menjadi JSON array valid saja.
Jangan tambahkan markdown atau penjelasan.
Pastikan setiap item memiliki category "${category}", evidence array tidak kosong, problem tidak kosong, dan recommendation tidak kosong.

Respons:
${invalidResponse}`;
}
