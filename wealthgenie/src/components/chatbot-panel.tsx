import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Bot, Send, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { transactionApi, savingsApi, emiApi } from "../utils/api";
import { groqApiKey, groqModel, groqApiUrl } from "../utils/groq/config";

const samplePrompts = [
  "How much did I spend on Food?",
  "What's my total income?",
  "Show my top spending categories",
  "What are my upcoming EMIs?",
  "How are my savings goals progressing?",
];

interface ChatbotPanelProps {
  accessToken: string;
  activeFileId: string | null;
}

export function ChatbotPanel({ accessToken, activeFileId }: ChatbotPanelProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transactionData, setTransactionData] = useState<any[]>([]);
  const [emiData, setEmiData] = useState<any[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeFileId) {
      fetchData();
      setMessages([
        {
          role: "assistant",
          content: "Hello! I'm your Smart Finance Assistant. I can help you analyze your spending, track savings, and provide personalized financial advice based on your uploaded data. How can I help you today?",
        },
      ]);
    }
  }, [activeFileId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchData = async () => {
    try {
      if (!activeFileId) return;
      
      const { transactions } = await transactionApi.getAll(accessToken, { fileId: activeFileId });
      setTransactionData(transactions || []);
      
      // Fetch EMI data
      const { emis } = await emiApi.getAll(accessToken, { fileId: activeFileId });
      setEmiData(emis || []);
      
      // Fetch Savings Goals
      const { savings } = await savingsApi.getAll(accessToken, { fileId: activeFileId });
      setSavingsGoals(savings || []);
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
    }
  };

  // Show message if no file is active
  if (!activeFileId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl text-gray-900 mb-2">Chat Assistant Unavailable</h3>
          <p className="text-gray-600 mb-4">Upload a file to start chatting with your AI finance assistant</p>
        </div>
      </div>
    );
  }

  const analyzeQuery = async (query: string): Promise<string> => {
    // Check for Groq API key
    console.log("🔍 Groq API Key check:", groqApiKey ? `Present (${groqApiKey.substring(0, 10)}...)` : "Missing");
    
    if (!groqApiKey || groqApiKey === "YOUR_GROQ_API_KEY_HERE" || groqApiKey.trim() === "") {
      console.error("❌ GROQ_API_KEY missing or not configured.");
      console.log("🔑 Please add your Groq API key to: /utils/groq/config.ts");
      console.log("📝 Steps:");
      console.log("   1. Get your API key from https://console.groq.com");
      console.log("   2. Open /utils/groq/config.ts");
      console.log("   3. Replace 'YOUR_GROQ_API_KEY_HERE' with your actual key");
      console.log("   4. Save the file");
      return "I need a Groq API key to provide intelligent answers. Please configure it in /utils/groq/config.ts - check the console for instructions.";
    }
    
    console.log("✅ Groq API Key validated successfully");

    // Prepare financial context data
    const income = transactionData.filter(t => t.type === 'Income');
    const expenses = transactionData.filter(t => t.type === 'Expense');
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const savings = totalIncome - totalExpenses;

    // Build category breakdown
    const categoryMap = new Map<string, number>();
    expenses.forEach(t => {
      const cat = t.category || 'Others';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + t.amount);
    });
    const topCategories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Build EMI summary
    const activeEmis = emiData.filter(emi => {
      const endDate = new Date(emi.endDate);
      return endDate >= new Date();
    });
    const totalMonthlyEmi = activeEmis.reduce((sum, emi) => sum + emi.emiAmount, 0);

    // Build savings goals summary
    const savingsGoalsSummary = savingsGoals.map(goal => {
      const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount * 100).toFixed(1) : 0;
      const remaining = goal.targetAmount - goal.currentAmount;
      return {
        name: goal.goalName,
        progress: `${progress}%`,
        current: goal.currentAmount,
        target: goal.targetAmount,
        remaining: remaining,
      };
    });

    // Build financial context for Groq
    const financialContext = {
      summary: {
        totalIncome: `₹${totalIncome.toLocaleString()}`,
        totalExpenses: `₹${totalExpenses.toLocaleString()}`,
        netSavings: `₹${savings.toLocaleString()}`,
        savingsRate: totalIncome > 0 ? `${((savings / totalIncome) * 100).toFixed(1)}%` : '0%',
        transactionCount: transactionData.length,
      },
      categories: topCategories.map(([cat, amt]) => ({
        category: cat,
        amount: `₹${amt.toLocaleString()}`,
        percentage: totalExpenses > 0 ? `${((amt / totalExpenses) * 100).toFixed(1)}%` : '0%',
      })),
      emis: activeEmis.map(emi => ({
        loanName: emi.loanName,
        emiAmount: `₹${emi.emiAmount.toLocaleString()}`,
        endDate: new Date(emi.endDate).toLocaleDateString(),
      })),
      totalMonthlyEmi: `₹${totalMonthlyEmi.toLocaleString()}`,
      savingsGoals: savingsGoalsSummary,
      recentTransactions: transactionData.slice(-10).map(t => ({
        date: new Date(t.date).toLocaleDateString(),
        description: t.description,
        amount: `₹${t.amount.toLocaleString()}`,
        category: t.category,
        type: t.type,
      })),
    };

    // Call Groq API
    try {
      const res = await fetch(groqApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            {
              role: "system",
              content: `You are a personal finance assistant helping users understand their financial data. You have access to their complete financial information including income, expenses, EMIs, and savings goals.

IMPORTANT RULES:
- Only use the data provided in the context. Never make up numbers or transactions.
- Always use Indian Rupee (₹) currency format.
- Be conversational, friendly, and helpful.
- Provide actionable advice when appropriate.
- If the user asks about data not in the context, politely say you don't have that information.
- Keep responses concise but informative.
- Use the actual numbers from the context provided.

Financial Context:
${JSON.stringify(financialContext, null, 2)}`,
            },
            { role: "user", content: query },
          ],
          temperature: 0.7,
          max_completion_tokens: 1024,
          top_p: 1,
          stream: false,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Groq API Error:", errorData);
        throw new Error(errorData.error?.message || "Failed to get response from Groq API");
      }

      const data = await res.json();
      return data?.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response. Please try again.";
    } catch (error: any) {
      console.error("Error calling Groq API:", error);
      return `Sorry, I encountered an error: ${error.message}. Please check your API key and try again.`;
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userInput = input;
    setInput("");

    // Add user message
    const userMessage = { role: "user", content: userInput };
    setMessages([...messages, userMessage]);
    
    setIsLoading(true);
    
    try {
      // Call Groq API
      const response = await analyzeQuery(userInput);
      const assistantMessage = { role: "assistant", content: response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error in handleSend:", error);
      const errorMessage = { 
        role: "assistant", 
        content: "Sorry, I encountered an error processing your request. Please try again." 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="h-[600px] flex flex-col">
      <Card className="h-full flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm text-gray-900">Smart Finance Assistant</h3>
              <p className="text-xs text-gray-600">Ask me anything about your finances</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4" ref={scrollRef}>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{message.content}</p>
                </div>

                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">You</span>
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            </div>
          </ScrollArea>
        </div>

        {/* Sample Prompts */}
        {messages.length === 1 && (
          <div className="p-4 border-t bg-gray-50 flex-shrink-0">
            <p className="text-xs text-gray-600 mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {samplePrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handlePromptClick(prompt)}
                  className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t flex-shrink-0">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask me about your finances..."
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
