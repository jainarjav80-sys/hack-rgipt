import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

const Flashcards = () => {
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await axios.post("http://127.0.0.1:8000/generate_flashcards");
      setFlashcards(response.data.flashcards);
    } catch (error) {
      console.error(error);
      alert("Error generating flashcards. Upload notes first!");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400 py-10 px-6">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl text-white font-bold mb-8"
      >
        🧠 Flashcards
      </motion.h2>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className={`mb-8 px-8 py-3 rounded-xl text-white text-lg font-semibold ${
          loading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-purple-700 hover:to-pink-600"
        }`}
      >
        {loading ? "Generating..." : "✨ Generate Flashcards"}
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
        {flashcards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/20 backdrop-blur-lg rounded-2xl p-6 text-white shadow-lg border border-white/30 hover:scale-105 transition"
          >
            <h3 className="font-bold text-xl mb-2">Q: {card.question}</h3>
            <p className="text-white/90">A: {card.answer}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Flashcards;

