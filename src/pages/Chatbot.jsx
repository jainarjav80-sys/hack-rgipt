import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

const Chatbot = () => {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question) return;
    setLoading(true);
    try {
      const res = await axios.post("http://127.0.0.1:8000/chat/ask", { question });
      setResponse(res.data.answer);
    } catch {
      setResponse("Error fetching response. Try again!");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400 flex flex-col items-center py-10 px-6 text-white">
      <h1 className="text-4xl font-bold mb-8">💬 AI Chatbot</h1>
      <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 w-full max-w-2xl shadow-xl border border-white/40">
        <textarea
          rows="3"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about your notes..."
          className="w-full p-3 rounded-xl bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-pink-400"
        />
        <button
          onClick={handleAsk}
          disabled={loading}
          className="mt-4 w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl font-semibold text-white hover:from-purple-700 hover:to-pink-600 transition"
        >
          {loading ? "Thinking..." : "Ask"}
        </button>
      </div>

      {response && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 bg-white/30 backdrop-blur-lg rounded-2xl p-6 max-w-2xl text-center border border-white/40"
        >
          <p className="text-lg text-white">{response}</p>
        </motion.div>
      )}
    </div>
  );
};

export default Chatbot;
