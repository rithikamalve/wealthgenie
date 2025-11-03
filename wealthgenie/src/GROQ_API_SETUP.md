# Groq API Setup Guide

## 🔑 Getting Your Groq API Key

1. Go to [https://console.groq.com](https://console.groq.com)
2. Sign up or log in to your account
3. Navigate to the API Keys section
4. Create a new API key and copy it

## 📝 Configuration Steps

### Step 1: Locate the Configuration File

Open the file: `/utils/groq/config.ts`

### Step 2: Add Your API Key

In the `config.ts` file, you'll see:

```typescript
export const groqApiKey = "YOUR_GROQ_API_KEY_HERE";
```

Replace `"YOUR_GROQ_API_KEY_HERE"` with your actual Groq API key:

```typescript
export const groqApiKey = "gsk_abc123xyz456...";
```

**Example:**
```typescript
export const groqApiKey = "gsk_1a2b3c4d5e6f7g8h9i0j";
export const groqModel = "llama-3.3-70b-versatile";
export const groqApiUrl = "https://api.groq.com/openai/v1/chat/completions";
```

### Step 3: Save the File

Save `/utils/groq/config.ts` - the changes will take effect immediately (no server restart needed in most cases).

## 🚨 Important Security Notes

### ⚠️ Keep Your API Key Private

- The `/utils/groq/config.ts` file contains your sensitive API key
- **DO NOT** share this file publicly or commit it with your actual key to public repositories
- Consider adding this file to `.gitignore` if you're sharing your code:

```gitignore
# Add to .gitignore
/utils/groq/config.ts
```

### Alternative: Use a Template

Create a `config.template.ts` file for version control:
```typescript
// config.template.ts
export const groqApiKey = "YOUR_GROQ_API_KEY_HERE";
export const groqModel = "llama-3.3-70b-versatile";
export const groqApiUrl = "https://api.groq.com/openai/v1/chat/completions";
```

Then copy it to `config.ts` and add your actual key (and gitignore `config.ts`).

## ✅ Verification

Once configured, the chatbot will:
- ✓ Use Groq AI for intelligent, conversational responses
- ✓ Analyze your actual financial data (income, expenses, EMIs, savings goals)
- ✓ Provide personalized financial advice based on your transactions
- ✓ Answer natural language questions about your finances

If the API key is missing or invalid, you'll see an error message in:
- **Browser console**: Instructions to add the API key
- **Chat interface**: A friendly message asking you to configure the key

## 🎯 Example Questions You Can Ask

Once set up, try asking:
- "How much did I spend on groceries last month?"
- "What's my biggest expense category?"
- "Am I on track with my savings goals?"
- "Can I save ₹5,000 more based on my income?"
- "What's my total monthly EMI?"
- "Give me financial advice based on my spending"

## 🐛 Troubleshooting

**Issue**: Chatbot says "I need a Groq API key..."
- **Solution**: Open `/utils/groq/config.ts`
- Verify you replaced `"YOUR_GROQ_API_KEY_HERE"` with your actual key
- Make sure the key is wrapped in quotes: `"gsk_..."`
- Check browser console for detailed instructions

**Issue**: Getting API errors
- **Solution**: Verify your API key is valid and active in Groq Console
- Check that you have API credits/quota remaining
- Check browser console for detailed error messages
- Ensure there are no extra spaces or characters in your API key

**Issue**: "process is not defined" error
- **Solution**: This is fixed! Make sure you're using `/utils/groq/config.ts` for configuration, not environment variables

## 📊 Technical Details

- **Model Used**: `llama-3.3-70b-versatile`
- **API Endpoint**: `https://api.groq.com/openai/v1/chat/completions`
- **Context Provided**: Complete financial data including transactions, EMIs, savings goals
- **Response Format**: Natural language, conversational
- **Data Restriction**: Only uses data from your uploaded Excel files

---

For more information about Groq API, visit: [https://console.groq.com/docs](https://console.groq.com/docs)
