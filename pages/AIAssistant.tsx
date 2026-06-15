
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
    <div className="h-[calc(100vh-12rem)] grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in fade-in duration-500">
      <div className="lg:col-span-3 flex flex-col bg-white border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-white/60 backdrop-blur-3xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 text-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold tracking-tight font-medium text-slate-900 text-xl  tracking-tight">AI Business Assistant</h3>
              <p className="text-[10px] font-medium font-bold text-blue-500  tracking-normal mt-1">Powered by Gemini</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={handleOpenKeyDialog}
              className={`w-10 h-10 flex items-center justify-center border-2 border-transparent transition-all ${needsApiKey ? 'border-red-600 bg-red-100 text-red-600 animate-pulse' : 'text-slate-500 hover:border-slate-200 hover:text-slate-900'}`}
              title="Configure API Key"
            >
              <Key className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 flex items-center justify-center border-2 border-transparent text-slate-500 hover:border-red-600 hover:text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {needsApiKey && (
          <div className="p-6 bg-red-50 border-b-4 border-red-600 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 border-2 border-red-600 bg-red-200 text-red-600 flex items-center justify-center shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="text-red-900">
                <p className="font-medium font-bold  text-sm">Gemini API Key Required</p>
                <p className="text-xs font-medium mt-1 opacity-80">Please setup API key to enable intelligence. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1 font-bold">Learn more <ExternalLink className="w-3 h-3" /></a></p>
              </div>
            </div>
            <button 
              onClick={handleOpenKeyDialog}
              className="px-6 py-4 bg-red-600 border border-slate-200 rounded-2xl text-white font-medium font-bold text-xs  tracking-normal hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)]"
            >
              Connect Key
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white custom-scrollbar">
          {chatHistory.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto opacity-40">
              <Sparkles className="w-20 h-20 text-slate-900 mb-6" />
              <h4 className="text-3xl font-semibold tracking-tight font-medium text-slate-900 ">NaijaShop AI</h4>
              <p className="text-sm font-medium font-bold text-slate-500 mt-4 ">"What was our most profitable category last week?"</p>
            </div>
          )}

          {chatHistory.map((chat) => (
            <div key={chat.id} className="space-y-6">
              <div className="flex justify-end">
                <div className="bg-slate-900 border border-slate-200 rounded-2xl text-white p-6 max-w-[80%] shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                  <p className="text-sm font-medium leading-relaxed">{chat.message}</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-12 h-12 bg-blue-600 border border-slate-200 rounded-2xl text-white flex items-center justify-center shadow-[0_2px_10px_rgb(0,0,0,0.02)] shrink-0">
                  <Bot className="w-6 h-6" />
                </div>
                <div className="bg-white/60 backdrop-blur-3xl text-slate-900 p-6 border border-slate-200 rounded-2xl max-w-[85%] prose prose-sm prose-slate shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({node, ...props}) => <p className="mb-4 leading-relaxed font-sans" {...props} />,
                      ul: ({node, ...props}) => <ul className="mb-4 list-square pl-5" {...props} />,
                      ol: ({node, ...props}) => <ol className="mb-4 list-decimal pl-5 font-medium" {...props} />,
                      li: ({node, ...props}) => <li className="mb-2" {...props} />,
                      h1: ({node, ...props}) => <h1 className="text-2xl font-semibold tracking-tight font-medium  tracking-tight mb-4 border-b-2 border-slate-200 pb-2" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-semibold tracking-tight font-medium  mb-3" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-lg font-medium font-bold mb-2 " {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold text-blue-500" {...props} />
                    }}
                  >
                    {chat.response}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-6">
              <div className="w-12 h-12 bg-blue-600 border border-slate-200 rounded-2xl text-white flex items-center justify-center shadow-[0_2px_10px_rgb(0,0,0,0.02)] shrink-0">
                <Bot className="w-6 h-6" />
              </div>
              <div className="bg-white p-5 border border-slate-200 rounded-2xl flex items-center gap-4 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                <span className="text-[10px] font-medium font-bold text-slate-900  tracking-normal">Analyzing records...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-6 bg-white/60 backdrop-blur-3xl border-t border-slate-100">
          <div className="relative flex items-center gap-4">
            <input 
              type="text"
              placeholder={needsApiKey ? "Connect API key to start chatting..." : "Ask about sales trends, stock levels, or profits..."}
              disabled={needsApiKey || isTyping}
              className="flex-1 px-6 py-5 bg-white border border-slate-200 rounded-2xl focus:bg-slate-50 outline-none font-medium font-bold text-sm text-slate-900 placeholder:text-slate-400 transition-all disabled:bg-slate-200 disabled:cursor-not-allowed shadow-inner"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isTyping || needsApiKey}
              className="px-8 py-5 bg-[#10b981] border border-slate-200 rounded-2xl text-slate-900 hover:-translate-y-0.5 hover:shadow-sm transition-all disabled:opacity-50 disabled:bg-slate-400 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex items-center justify-center font-medium font-bold  tracking-normal text-xs"
            >
              <Send className="w-5 h-5 mr-2 hidden md:block" /> Send
            </button>
          </div>
        </form>
      </div>

      <div className="hidden lg:flex flex-col gap-8">
        <div className="bg-white p-8 border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-8">
          <h4 className="font-semibold tracking-tight font-medium text-slate-900 text-xl  tracking-tight flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-blue-500" />
            Live Insights
          </h4>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b-2 border-dashed border-slate-200 pb-4">
              <span className="text-[10px] font-medium font-bold text-slate-500  tracking-normal">Total Inventory</span>
              <span className="font-medium font-bold text-slate-900 ">{shopContext.totalItems} Items</span>
            </div>
            <div className="flex items-center justify-between border-b-2 border-dashed border-slate-200 pb-4">
              <span className="text-[10px] font-medium font-bold text-slate-500  tracking-normal">Stock Alert</span>
              <span className={`font-medium font-bold  ${shopContext.lowStockCount > 0 ? 'text-red-600 bg-red-100 px-2' : 'text-[#10b981] bg-slate-900 px-2'}`}>
                {shopContext.lowStockCount} Items Low
              </span>
            </div>
            <div className="pt-2">
              <p className="text-[10px] font-medium font-bold text-slate-500  tracking-normal mb-3">Month to Date</p>
              <p className="text-4xl font-semibold tracking-tight font-medium text-slate-900">{formatCurrency(shopContext.monthlyRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-8 border border-slate-200 rounded-[2rem] shadow-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full -translate-y-16 translate-x-16"></div>
          <h5 className="font-medium font-bold text-[#10b981] text-[10px]  tracking-normal mb-4">Pro Tip</h5>
          <p className="text-sm font-sans font-medium text-slate-300 leading-relaxed">Try asking: <br/><strong className="text-white mt-2 inline-block">"What's my most profitable category?"</strong></p>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
