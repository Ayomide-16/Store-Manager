
import React, { useState, useRef, useEffect } from 'react';
import { useShop } from '../store';
import { getBusinessInsights } from '../services/geminiService';
import { Send, MessageSquare, Bot, User, Trash2, Sparkles, Loader2, Key, AlertCircle, ExternalLink } from 'lucide-react';
import { formatCurrency } from '../utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const AIAssistant: React.FC = () => {
  const { items, sales, chatHistory, addChatMessage } = useShop();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isTyping]);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setNeedsApiKey(!hasKey);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setNeedsApiKey(false); // Assume successful selection as per guidelines
    }
  };

  const shopContext = {
    totalItems: items.length,
    lowStockCount: items.filter(i => i.quantityInStock <= i.reorderLevel).length,
    monthlyRevenue: sales.filter(s => s.saleDate.startsWith(new Date().toISOString().slice(0, 7))).reduce((a, c) => a + c.totalAmount, 0),
    topItems: items.sort((a, b) => b.quantityInStock - a.quantityInStock).slice(0, 5).map(i => ({ name: i.name, stock: i.quantityInStock })),
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input;
    setInput('');
    setIsTyping(true);

    try {
      const response = await getBusinessInsights(userMessage, shopContext);
      addChatMessage(userMessage, response);
    } catch (error: any) {
      if (error.message?.includes("PERMISSION_DENIED") || error.message?.includes("403") || error.message?.includes("not found")) {
        setNeedsApiKey(true);
      }
      addChatMessage(userMessage, "I'm having trouble accessing my intelligence core. Please ensure your API key is connected and has sufficient permissions.");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
      <div className="lg:col-span-3 flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-indigo-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">AI Business Assistant</h3>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Powered by Gemini Flash</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleOpenKeyDialog}
              className={`p-2 rounded-xl transition-all ${needsApiKey ? 'bg-amber-100 text-amber-600 animate-pulse' : 'text-slate-400 hover:text-indigo-600 hover:bg-white'}`}
              title="Configure API Key"
            >
              <Key className="w-5 h-5" />
            </button>
            <button className="text-slate-400 hover:text-red-500 transition-colors p-2">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {needsApiKey && (
          <div className="p-4 bg-amber-50 border-b border-amber-100 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <div className="text-sm text-amber-800">
                <p className="font-bold leading-tight">Gemini API Key Required</p>
                <p className="text-xs opacity-80">Please select a paid API key to enable business intelligence. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-0.5">Learn more <ExternalLink className="w-2.5 h-2.5" /></a></p>
              </div>
            </div>
            <button 
              onClick={handleOpenKeyDialog}
              className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-700 transition-all shadow-md"
            >
              Connect Key
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {chatHistory.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto opacity-40">
              <Sparkles className="w-16 h-16 text-indigo-400 mb-4" />
              <h4 className="text-xl font-bold text-slate-900">NaijaShop Intelligence</h4>
              <p className="text-sm text-slate-500 mt-2 italic">"What was our most profitable category last week?"</p>
            </div>
          )}

          {chatHistory.map((chat) => (
            <div key={chat.id} className="space-y-4">
              <div className="flex justify-end">
                <div className="bg-indigo-600 text-white p-4 rounded-2xl rounded-tr-none max-w-[80%] shadow-lg shadow-indigo-600/10">
                  <p className="text-sm font-medium leading-relaxed">{chat.message}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-slate-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-slate-50 text-slate-800 p-5 rounded-2xl rounded-tl-none border border-slate-100 max-w-[85%] prose prose-sm prose-slate prose-indigo shadow-sm">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({node, ...props}) => <p className="mb-4 leading-relaxed font-medium" {...props} />,
                      ul: ({node, ...props}) => <ul className="mb-4 list-disc pl-5" {...props} />,
                      ol: ({node, ...props}) => <ol className="mb-4 list-decimal pl-5" {...props} />,
                      li: ({node, ...props}) => <li className="mb-1" {...props} />,
                      h1: ({node, ...props}) => <h1 className="text-xl font-black mb-4" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-lg font-black mb-3" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-md font-black mb-2" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-black text-slate-900" {...props} />
                    }}
                  >
                    {chat.response}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-slate-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-2 shadow-sm">
                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Analyzing shop records...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 bg-slate-50 border-t border-slate-100">
          <div className="relative flex items-center gap-2">
            <input 
              type="text"
              placeholder={needsApiKey ? "Connect API key above to start chatting..." : "Ask about sales trends, stock levels, or profits..."}
              disabled={needsApiKey || isTyping}
              className="flex-1 pl-6 pr-14 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isTyping || needsApiKey}
              className="absolute right-2 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:bg-slate-400 shadow-lg shadow-indigo-600/10"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>

      <div className="hidden lg:flex flex-col gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <h4 className="font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Live Insights
          </h4>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Inventory</span>
              <span className="font-black text-slate-900">{shopContext.totalItems} Items</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Alert</span>
              <span className={`font-black ${shopContext.lowStockCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {shopContext.lowStockCount} Items Low
              </span>
            </div>
            <div className="pt-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Month to Date</p>
              <p className="text-2xl font-black text-indigo-600">{formatCurrency(shopContext.monthlyRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -translate-y-16 translate-x-16"></div>
          <h5 className="font-bold text-indigo-400 text-xs uppercase tracking-widest mb-2">Pro Tip</h5>
          <p className="text-sm text-slate-300 leading-relaxed">Try asking: <br/><strong>"What's my most profitable category?"</strong></p>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
