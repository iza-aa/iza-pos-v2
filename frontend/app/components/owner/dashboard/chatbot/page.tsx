"use client";

import React, { useState } from "react";
import {
  MagnifyingGlassIcon,
  CodeBracketIcon,
  MapPinIcon,
  BookOpenIcon,
  GlobeAltIcon,
  PhotoIcon,
  PaperClipIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";

export default function Chatbot() {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim()) {
      // Logic untuk mengirim pesan
      console.log("Sending:", message);
      setMessage("");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto mb-4">
        {/* Messages akan ditampilkan di sini */}
        <div className="flex items-center justify-center h-full text-gray-400">
          <span>Start a conversation...</span>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-gray-100 border border-gray-200 rounded-2xl p-4">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask anything. Type @ for mentions and / for shortcuts."
          className="w-full bg-transparent text-black placeholder-gray-500 resize-none outline-none mb-3"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        {/* Action Icons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-700 rounded-lg transition">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </button>
            <button className="p-2 hover:bg-gray-700 rounded-lg transition">
              <CodeBracketIcon className="h-5 w-5 text-gray-400" />
            </button>
            <button className="p-2 hover:bg-gray-700 rounded-lg transition">
              <MapPinIcon className="h-5 w-5 text-gray-400" />
            </button>
            <button className="p-2 hover:bg-gray-700 rounded-lg transition">
              <BookOpenIcon className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-700 rounded-lg transition">
              <GlobeAltIcon className="h-5 w-5 text-gray-400" />
            </button>
            <button className="p-2 hover:bg-gray-700 rounded-lg transition">
              <PhotoIcon className="h-5 w-5 text-gray-400" />
            </button>
            <button className="p-2 hover:bg-gray-700 rounded-lg transition">
              <PaperClipIcon className="h-5 w-5 text-gray-400" />
            </button>
            <button className="p-2 hover:bg-gray-700 rounded-lg transition">
              <MicrophoneIcon className="h-5 w-5 text-gray-400" />
            </button>
            <button
              onClick={handleSend}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            >
              <PaperAirplaneIcon className="h-5 w-5 text-gray-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
