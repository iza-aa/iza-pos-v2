"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/solid";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const quickActions = [
  { icon: "🔥", label: "Ringkasan hari ini", prompt: "Berikan ringkasan penjualan hari ini" },
  { icon: "📊", label: "Top products", prompt: "Apa produk terlaris minggu ini?" },
  { icon: "💰", label: "Total revenue", prompt: "Berapa total pendapatan bulan ini?" },
  { icon: "⚠️", label: "Cek low stock", prompt: "Produk apa saja yang stoknya hampir habis?" },
  { icon: "📈", label: "Performa staff", prompt: "Bagaimana performa staff bulan ini?" },
];

export default function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState("Owner");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const name = localStorage.getItem("user_name") || "Owner";
    setUserName(name);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (text?: string) => {
    const messageText = text || message;
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    // Simulasi AI response (nanti bisa diganti dengan actual AI API)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Terima kasih atas pertanyaan Anda: "${messageText}"\n\nFitur AI sedang dalam pengembangan. Segera hadir untuk membantu analisis bisnis Anda!`,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleQuickAction = (prompt: string) => {
    handleSend(prompt);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center text-white hover:scale-110 z-40 ${isOpen ? 'hidden' : ''}`}
      >
        <ChatBubbleLeftRightIcon className="w-6 h-6" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide Drawer */}
      <div className={`fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">AI Assistant</h3>
              <p className="text-xs text-gray-500">Powered by AI</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Chat Content */}
        <div className="flex flex-col h-[calc(100%-72px)]">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              /* Welcome Screen */
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                  <SparklesIcon className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-1">
                  Hi, {userName}
                </h2>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Can I help you with anything?
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Ready to assist you with anything you need, from answering questions to providing recommendations. Let's get started!
                </p>

                {/* Quick Actions */}
                <div className="w-full space-y-2">
                  {quickActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition text-left"
                    >
                      <span className="text-lg">{action.icon}</span>
                      <span className="text-sm text-gray-700">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Chat Messages */
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.sender === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                      <span className={`text-xs mt-1 block ${
                        msg.sender === 'user' ? 'text-blue-100' : 'text-gray-400'
                      }`}>
                        {msg.timestamp.toLocaleTimeString('id-ID', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>
                ))}
                
                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-end gap-2 bg-gray-100 rounded-2xl p-3">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 bg-transparent text-gray-800 placeholder-gray-500 resize-none outline-none text-sm"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                style={{ maxHeight: '100px' }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!message.trim() || isLoading}
                className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 rounded-xl transition"
              >
                <PaperAirplaneIcon className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-2 text-xs text-gray-400">
              <span>Press</span>
              <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600">Enter</kbd>
              <span>to send</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
