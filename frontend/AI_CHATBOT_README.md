# 🤖 IZA POS Database AI Chatbot

Chatbot pintar untuk membantu query database menggunakan Google Gemini AI dengan smart routing 3-tier.

## 📁 Struktur Folder

```
frontend/
├── lib/
│   ├── services/
│   │   └── chatbot/
│   │       ├── context-loader.ts    ✅ Load DATABASE_AI_GUIDE.md
│   │       ├── gemini.ts            ✅ Gemini API wrapper
│   │       ├── router.ts            ✅ Smart routing logic
│   │       ├── guardrails.ts        ✅ Rate limiting & validation
│   │       └── index.ts             ✅ Export all
│   └── types/
│       └── chatbot.ts               ✅ TypeScript types
├── app/
│   ├── api/
│   │   └── chatbot/
│   │       └── route.ts             ✅ POST /api/chatbot endpoint
│   └── components/
│       └── shared/
│           └── DatabaseChatbot.tsx  ✅ UI component
└── docs/
    └── DATABASE_AI_GUIDE.md         ✅ Already exists!
```

## 🚀 Langkah Setup

### 1. Install Dependencies

```bash
cd frontend
npm install @google/generative-ai
```

### 2. Setup Environment Variables

Tambahkan di `.env.local`:

```env
# Gemini API Key (Get from: https://makersuite.google.com/app/apikey)
GEMINI_API_KEY=your_api_key_here
```

### 3. Update DATABASE_AI_GUIDE.md Location

Pastikan file `DATABASE_AI_GUIDE.md` ada di `frontend/docs/`:

```bash
# Check file exists
ls frontend/docs/DATABASE_AI_GUIDE.md
```

Jika belum ada, buat dengan data yang sudah kita diskusikan sebelumnya.

### 4. Test API Endpoint

```bash
# Start dev server
npm run dev

# Test health check
curl http://localhost:3000/api/chatbot
```

Expected response:
```json
{
  "status": "ok",
  "service": "IZA POS Database Chatbot",
  "version": "1.0.0",
  "models": ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-pro"],
  "strategy": "3-tier smart routing"
}
```

### 5. Integrate UI Component

Tambahkan chatbot ke halaman (contoh: manager dashboard):

```tsx
import { useState } from 'react'
import DatabaseChatbot from '@/app/components/shared/DatabaseChatbot'
import { SparklesIcon } from '@heroicons/react/24/outline'

export default function ManagerDashboard() {
  const [chatbotOpen, setChatbotOpen] = useState(false)

  return (
    <div>
      {/* Your existing dashboard content */}
      
      {/* Floating chatbot button */}
      <button
        onClick={() => setChatbotOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:scale-110 transition flex items-center justify-center"
      >
        <SparklesIcon className="w-6 h-6" />
      </button>

      {/* Chatbot modal */}
      <DatabaseChatbot 
        isOpen={chatbotOpen}
        onClose={() => setChatbotOpen(false)}
      />
    </div>
  )
}
```

## 🎯 Smart Routing Strategy

### Tier 1: Flash-Lite (85% queries)
**Model:** `gemini-2.5-flash-lite`  
**Use Cases:**
- Simple SELECT queries
- Table/column info
- "What is..." questions
- Basic JOIN queries

**Examples:**
```
- What tables exist in the database?
- Show me columns in the orders table
- How do I query all active products?
```

### Tier 2: Flash (12% queries)
**Model:** `gemini-2.5-flash`  
**Use Cases:**
- Complex JOINs (3+ tables)
- Report generation
- Aggregation queries
- Performance questions

**Examples:**
```
- Get total sales by product with inventory deduction details
- Show me orders with customer info and payment status
- How to optimize this JOIN query?
```

### Tier 3: Pro (3% queries)
**Model:** `gemini-2.5-pro`  
**Use Cases:**
- Debugging complex issues
- Architecture questions
- Trigger/function logic
- Best practices & refactoring

**Examples:**
```
- Why is my trigger not deducting inventory correctly?
- Design pattern for multi-level recipe system
- Optimize database schema for scalability
```

## 🛡️ Guardrails

### Rate Limiting
- **Limit:** 20 requests per hour per user
- **Window:** 3600 seconds (1 hour)
- **Storage:** In-memory (upgrade to Redis for production)

### Validation
- Max query length: 2000 characters
- SQL injection prevention
- Dangerous pattern detection

### Sanitization (Free Tier)
- Auto-remove emails → `[EMAIL]`
- Auto-remove phone numbers → `[PHONE]`
- Auto-remove credit cards → `[CARD]`
- Auto-redact passwords → `[REDACTED]`

## 📊 Model Specifications

| Model | Speed | Cost (Free) | Cost (Paid) | Best For |
|-------|-------|-------------|-------------|----------|
| Flash-Lite | ⚡⚡⚡ Fastest | $0 | $0.10/$0.40 per 1M tokens | Simple queries |
| Flash | ⚡⚡ Fast | $0 | $0.30/$2.50 per 1M tokens | Complex queries |
| Pro | ⚡ Moderate | $0 | $1.25/$10.00 per 1M tokens | Reasoning |

**Free Tier Trade-off:** Data used to improve Google products

## 🔍 Testing

### Test Query Examples

**Simple (Flash-Lite):**
```
What columns are in the products table?
```

**Medium (Flash):**
```
Show me a query to get all orders with customer name, items, and payment status
```

**Complex (Pro):**
```
Explain the hybrid recipe system and how inventory deduction works with base recipes, modifiers, and overrides
```

## 📝 Next Steps

1. ✅ **Setup Complete** - All files created
2. ⏳ **Get API Key** - Visit https://makersuite.google.com/app/apikey
3. ⏳ **Add .env.local** - Configure GEMINI_API_KEY
4. ⏳ **Create DATABASE_AI_GUIDE.md** - If not already exists
5. ⏳ **Test API** - Run health check
6. ⏳ **Integrate UI** - Add to dashboard
7. ⏳ **Deploy** - Push to production

## 🐛 Troubleshooting

### "Failed to load database guide"
- Check `frontend/docs/DATABASE_AI_GUIDE.md` exists
- Verify file path in `context-loader.ts`

### "GEMINI_API_KEY not configured"
- Add API key to `.env.local`
- Restart dev server

### "Rate limit exceeded"
- Wait for reset time (shown in error)
- Upgrade to paid tier for higher limits

### Model fallback not working
- Check API key has access to all models
- Verify internet connection
- Check Gemini API status

## 📚 Resources

- [Gemini API Docs](https://ai.google.dev/docs)
- [Rate Limiting Guide](https://ai.google.dev/docs/rate_limits)
- [Best Practices](https://ai.google.dev/docs/best_practices)

---

**Status:** ✅ Ready for implementation  
**Version:** 1.0.0  
**Last Updated:** 2025-12-14
