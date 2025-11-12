import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

const Planner = () => {
  const [plan, setPlan] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPlan = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get("http://127.0.0.1:8000/planner/recommend");
      setPlan(response.data.plan || []);
    } catch (err) {
      console.error(err);
      setError("⚠️ No quiz data yet! Complete a quiz first.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400 flex flex-col items-center py-10 px-6 text-white">
      <h1 className="text-4xl font-bold mb-8">📅 Study Planner</h1>

      <button
        onClick={fetchPlan}
        disabled={loading}
        className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-600 mb-8 disabled:opacity-50"
      >
        {loading ? "Generating..." : "🧭 Generate Plan"}
      </button>

      {error && <p className="text-red-200 mb-6">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
        {plan.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/20 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/30"
          >
            <h3 className="font-bold text-xl mb-2">{p.topic}</h3>
            <p className="text-white/80">Accuracy: {p.accuracy}%</p>
            <p className="text-white/80">Next Review: {p.next_review}</p>
          </motion.div>
        ))}
      </div>

      {plan.length === 0 && !loading && !error && (
        <p className="mt-6 text-white/70">No plans yet — take a quiz to get started!</p>
      )}
    </div>
  );
};

export default Planner;
