"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  FireIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ChartPieIcon,
} from "@heroicons/react/24/outline";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/solid";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const quickActions = [
  { icon: FireIcon, label: "Ringkasan hari ini", prompt: "Berikan ringkasan penjualan hari ini" },
  { icon: ChartBarIcon, label: "Top products", prompt: "Apa produk terlaris minggu ini?" },
  { icon: CurrencyDollarIcon, label: "Total revenue", prompt: "Berapa total pendapatan bulan ini?" },
  { icon: ExclamationTriangleIcon, label: "Cek low stock", prompt: "Produk apa saja yang stoknya hampir habis?" },
  { icon: ChartPieIcon, label: "Performa staff", prompt: "Bagaimana performa staff bulan ini?" },
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
        className={`fixed bottom-6 right-6 w-14 h-14 bg-black rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center text-white hover:scale-110 z-40 ${isOpen ? 'hidden' : ''}`}
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
      <div className={`fixed top-[55px] right-0 h-[calc(100vh-55px)] w-full bg-white/95 backdrop-blur-xl shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Close Button - Top Right */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 hover:bg-gray-200 rounded-lg transition"
        >
          <XMarkIcon className="w-6 h-6 text-gray-600" />
        </button>

        {/* Chat Content */}
        <div className="flex flex-col items-center justify-center h-full px-8">
          {messages.length === 0 ? (
            /* Welcome Screen */
            <div className="flex flex-col items-center justify-center w-full max-w-4xl">
              {/* Icon */}
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-6">
                <SparklesIcon className="w-8 h-8 text-white" />
              </div>

              {/* Greeting */}
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Hi, {userName}
              </h2>
              <p className="text-lg text-gray-700 mb-12">
                Can I help you with anything?
              </p>

              {/* Input Area - Centered */}
              <div className="w-full max-w-3xl mb-8">
                <div className="flex items-center gap-3 bg-gray-100 border border-gray-300 rounded-2xl px-6 py-4 hover:border-gray-400 transition">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask anything. Type @ for mentions and / for shortcuts."
                    className="flex-1 bg-transparent text-gray-800 placeholder-gray-500 outline-none text-base"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!message.trim() || isLoading}
                    className="p-2 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
                  >
                    <PaperAirplaneIcon className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Quick Actions - Grid */}
              <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {quickActions.map((action, idx) => {
                  const IconComponent = action.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="flex flex-col items-center justify-center gap-2 px-4 py-4 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 rounded-xl transition text-center min-h-[100px]"
                    >
                      <IconComponent className="w-7 h-7 text-gray-800" />
                      <span className="text-sm text-gray-800 leading-tight font-medium">{action.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Text */}
              <p className="text-sm text-gray-600 mt-8">
                Ready to assist you with anything you need, from answering questions to providing recommendations.
              </p>
            </div>
          ) : (
            /* Chat Messages - Scrollable */
            <div className="w-full max-w-4xl h-full flex flex-col py-8">
              <div className="flex-1 overflow-y-auto space-y-4 mb-6">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-5 py-4 ${
                        msg.sender === 'user'
                          ? 'bg-gray-800 text-white'
                          : 'bg-gray-100 border border-gray-300 text-gray-800'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                      <span className={`text-xs mt-1 block ${
                        msg.sender === 'user' ? 'text-gray-300' : 'text-gray-500'
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
                    <div className="bg-gray-100 border border-gray-300 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area - Bottom */}
              <div className="flex items-center gap-3 bg-gray-100 border border-gray-300 rounded-2xl px-6 py-4">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask anything..."
                  className="flex-1 bg-transparent text-gray-800 placeholder-gray-500 outline-none text-base"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!message.trim() || isLoading}
                  className="p-2 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
                >
                  <PaperAirplaneIcon className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
