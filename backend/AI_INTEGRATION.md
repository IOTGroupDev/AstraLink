# 🤖 AI Integration - OpenAI GPT-4o-mini

## 📊 Overview

AstraLink использует **OpenAI GPT-4o-mini** для генерации персонализированных астрологических прогнозов и интерпретаций для PREMIUM пользователей.

### ✨ Improvements (December 2024)

- ✅ **Updated model**: `gpt-4-turbo-preview` → `gpt-4o-mini` (98% cost reduction)
- ✅ **Retry logic**: 3 attempts with exponential backoff (1s, 2s, 4s)
- ✅ **JSON mode**: Reliable structured outputs
- ✅ **Streaming**: Real-time Server-Sent Events
- ✅ **Cost tracking**: Automatic token and cost logging
- ✅ **Error handling**: Graceful fallbacks

---

## 💰 Cost Comparison

| Model | Input Cost | Output Cost | Total Cost (1000 horoscopes) | Savings |
|-------|------------|-------------|------------------------------|---------|
| gpt-4-turbo-preview | $10.00/1M | $30.00/1M | ~$100-150 | baseline |
| gpt-4o | $2.50/1M | $10.00/1M | ~$25-35 | 70% |
| **gpt-4o-mini** ✅ | **$0.15/1M** | **$0.60/1M** | **~$2-3** | **98%** |

---

## 🔧 Configuration

### Environment Variables

```bash
# .env
OPENAI_API_KEY="sk-proj-..."
ANTHROPIC_API_KEY="sk-ant-..."  # Optional, fallback to Claude

# At least one AI provider key is required
```

### Model Settings

```typescript
// backend/src/services/ai.service.ts
{
  model: 'gpt-4o-mini',
  temperature: 0.7,
  max_tokens: 2000,
  response_format: { type: 'json_object' }
}
```

---

## 📡 API Endpoints

### 1. Check AI Status

```http
GET /api/ai/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "available": true,
  "provider": "openai",
  "features": {
    "horoscope": true,
    "chartInterpretation": true,
    "streaming": true
  }
}
```

---

### 2. Generate Horoscope (Standard)

```http
POST /api/ai/horoscope/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "period": "day"  // "day" | "tomorrow" | "week" | "month"
}
```

**Response:**
```json
{
  "period": "day",
  "date": "2024-12-13",
  "general": "Сегодня ваша энергия находится на пике...",
  "love": "В отношениях наступает период гармонии...",
  "career": "Благоприятное время для важных переговоров...",
  "health": "Обратите внимание на режим сна...",
  "finance": "Возможны неожиданные финансовые возможности...",
  "advice": "Доверяйте своей интуиции...",
  "challenges": [
    "Избегайте импульсивных решений",
    "Будьте осторожны с коммуникацией",
    "Не переоценивайте свои силы"
  ],
  "opportunities": [
    "Новые деловые связи",
    "Творческие прорывы",
    "Романтические встречи"
  ],
  "generatedBy": "ai",
  "luckyNumbers": [7, 14, 23],
  "luckyColors": ["purple", "gold"],
  "energy": 85,
  "mood": "optimistic"
}
```

---

### 3. 🌊 Stream Horoscope (Real-time)

```http
POST /api/ai/horoscope/stream
Authorization: Bearer <token>
Content-Type: application/json

{
  "period": "day"
}
```

**Response:** Server-Sent Events (SSE)

```
data: {"chunk": "{\"general\": \"Сегодня"}
data: {"chunk": " ваша энергия находится"}
data: {"chunk": " на пике благодаря"}
data: {"chunk": " благоприятному аспекту...\""}
...
data: {"done": true}
```

#### Frontend Example (React/React Native)

```typescript
const streamHoroscope = async () => {
  const response = await fetch('http://localhost:3000/api/ai/horoscope/stream', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ period: 'day' })
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));

        if (data.chunk) {
          fullText += data.chunk;
          setHoroscope(fullText);  // Update UI in real-time
        }

        if (data.done) {
          console.log('Streaming completed');
          const parsed = JSON.parse(fullText);
          setFinalHoroscope(parsed);
        }
      }
    }
  }
};
```

---

### 4. Usage Statistics

```http
GET /api/ai/usage/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "userId": "123",
  "provider": "openai",
  "thisMonth": {
    "requests": 15,
    "estimatedCost": 0.045
  },
  "limits": {
    "monthly": 100,
    "remaining": 85
  }
}
```

---

## 🔍 Features

### 1. Retry Logic with Exponential Backoff

```typescript
// Automatic retry on API failures
// Attempt 1: immediate
// Attempt 2: wait 1s
// Attempt 3: wait 2s
// Attempt 4: wait 4s (if configured)

// Logs:
// ⚠️ OpenAI attempt 1/3 failed: Rate limit exceeded
// 🔄 Retrying in 1000ms...
// ✅ OpenAI generation succeeded on attempt 2
```

### 2. Cost Tracking

Every API call logs:
```json
{
  "provider": "openai",
  "model": "gpt-4o-mini",
  "attempt": 1,
  "duration": "2341ms",
  "promptTokens": 856,
  "completionTokens": 1243,
  "totalTokens": 2099,
  "estimatedCost": "$0.000935",
  "costBreakdown": {
    "input": "$0.000128",
    "output": "$0.000746"
  }
}
```

### 3. JSON Mode

Guarantees valid JSON responses - no more regex parsing!

```typescript
// Old way: fragile regex
const jsonMatch = response.match(/\{[\s\S]*\}/);

// New way: guaranteed JSON
response_format: { type: 'json_object' }
const parsed = JSON.parse(response);  // Always works
```

### 4. Streaming for Better UX

Users see horoscope generation in real-time instead of waiting 5-10 seconds for complete response.

**Benefits:**
- ⚡ Perceived performance improvement
- 👀 Engaging user experience
- 🎯 Early cancellation possible
- 📱 Mobile-friendly progressive loading

---

## 🧪 Testing

### Unit Tests

```bash
cd backend
npm test ai.service.spec.ts
```

### Manual Testing

```bash
# 1. Start backend
npm run start:dev

# 2. Test AI status
curl http://localhost:3000/api/ai/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Test standard generation
curl -X POST http://localhost:3000/api/ai/horoscope/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"period": "day"}'

# 4. Test streaming (use httpie or EventSource client)
curl -N -X POST http://localhost:3000/api/ai/horoscope/stream \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"period": "day"}'
```

---

## 📈 Monitoring

### Logs

AI service logs include:
- ✅ Provider initialization
- 🔄 Request attempts and retries
- 💰 Token usage and costs
- ⚠️ Errors and warnings
- ⏱️ Performance metrics

```bash
# Watch AI logs
npm run start:dev | grep "openai\|claude"
```

### Future: Redis Metrics

```typescript
// TODO: Implement Redis-based metrics
await redis.incr('openai:total_requests');
await redis.incrby('openai:total_tokens', usage.total_tokens);
await redis.incrbyfloat('openai:total_cost', totalCost);
```

---

## 🔐 Security

### Subscription Validation

All AI endpoints are protected:
- ✅ JWT authentication required
- ✅ PREMIUM subscription check
- ✅ Rate limiting (10/sec, 100/min, 1000/hour)

### API Key Protection

```bash
# NEVER commit .env file
# Use environment variables in production
export OPENAI_API_KEY="sk-..."
```

---

## 🚀 Performance

### Typical Response Times

| Endpoint | Time (non-cached) | Time (cached) |
|----------|-------------------|---------------|
| Standard generation | 2-4 seconds | 50ms |
| Streaming (first chunk) | 200-500ms | N/A |
| Streaming (complete) | 2-4 seconds | N/A |

### Optimization Tips

1. **Enable Redis caching**: 6-hour TTL for horoscopes
2. **Use streaming**: Better perceived performance
3. **Batch requests**: Multiple users, single prompt
4. **Adjust max_tokens**: Reduce for shorter responses

---

## 🐛 Troubleshooting

### Error: "OpenAI не инициализирован"

**Cause:** Missing `OPENAI_API_KEY` in environment

**Fix:**
```bash
echo 'OPENAI_API_KEY=sk-...' >> .env
```

### Error: "Rate limit exceeded"

**Cause:** Too many API requests

**Solution:** Automatic retry with backoff. If persists, upgrade OpenAI plan.

### Error: "Streaming доступен только с OpenAI"

**Cause:** Claude is configured as primary provider

**Fix:** Ensure OpenAI is initialized first, or disable Claude:
```bash
# Comment out in .env
# ANTHROPIC_API_KEY=...
```

### JSON Parsing Errors

**Cause:** Rare cases where JSON mode fails

**Solution:** Automatic fallback to text parsing. Check logs for details.

---

## 📝 Best Practices

1. ✅ **Always use streaming** for user-facing horoscopes
2. ✅ **Cache AI responses** in Redis (6-hour TTL)
3. ✅ **Monitor costs** via usage stats endpoint
4. ✅ **Implement rate limiting** per user (not just global)
5. ✅ **Provide fallback** to rule-based generation for FREE users
6. ✅ **Log all AI calls** for debugging and analytics

---

## 🔮 Future Enhancements

- [ ] Claude streaming support
- [ ] DALL-E image generation (zodiac illustrations)
- [ ] GPT-4 Vision (analyze uploaded natal charts)
- [ ] Embeddings for semantic search
- [ ] Real-time usage dashboard
- [ ] Cost optimization algorithms
- [ ] A/B testing different prompts
- [ ] Multi-language support

---

## 📚 Resources

- [OpenAI API Docs](https://platform.openai.com/docs/api-reference)
- [GPT-4o-mini Pricing](https://openai.com/pricing)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

---

**Last Updated:** December 2024
**Version:** 2.0 (gpt-4o-mini upgrade)
