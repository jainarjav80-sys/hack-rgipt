import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

const Quiz = () => {
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const startQuiz = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        "http://127.0.0.1:8000/quiz/generate?num_questions=5"
      );
      setQuiz(response.data);
      setAnswers({});
      setResult(null);
    } catch (error) {
      console.error("Error generating quiz:", error);
      alert("⚠️ Please generate flashcards first before taking a quiz.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (qid, choice) => {
    setAnswers((prev) => ({ ...prev, [qid]: choice }));
  };

  const submitQuiz = async () => {
    if (!quiz || Object.keys(answers).length === 0) {
      alert("Please answer at least one question!");
      return;
    }

    try {
      const payload = {
        quiz_id: quiz.id,
        answers,
      };
      const res = await axios.post("http://127.0.0.1:8000/quiz/submit", payload);
      setResult(res.data);
    } catch (error) {
      console.error("Error submitting quiz:", error);
      alert("Quiz submission failed!");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400 flex flex-col items-center py-10 px-6">
      <h1 className="text-4xl text-white font-bold mb-8">🧩 AI Quiz</h1>

      {!quiz && !result && (
        <button
          onClick={startQuiz}
          disabled={loading}
          className={`bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3 rounded-xl text-white text-lg font-semibold hover:from-purple-700 hover:to-pink-600 ${
            loading && "opacity-60 cursor-not-allowed"
          }`}
        >
          {loading ? "Generating..." : "Start Quiz"}
        </button>
      )}

      {/* QUIZ QUESTIONS */}
      {quiz && !result && (
        <div className="w-full max-w-3xl space-y-8">
          {quiz.questions.map((q) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white/20 backdrop-blur-md border border-white/40 p-6 rounded-2xl text-white"
            >
              <h2 className="text-xl font-semibold mb-4">{q.question}</h2>
              {q.choices.map((choice, index) => (
                <label
                  key={index}
                  className={`block cursor-pointer p-2 rounded-md transition ${
                    answers[q.id] === choice
                      ? "bg-pink-500/30 border border-pink-400"
                      : "hover:bg-white/10"
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={choice}
                    onChange={() => handleAnswer(q.id, choice)}
                    className="mr-2 accent-pink-400"
                  />
                  {choice}
                </label>
              ))}
            </motion.div>
          ))}

          <button
            onClick={submitQuiz}
            className="w-full py-3 mt-6 bg-gradient-to-r from-green-500 to-teal-500 text-white text-lg rounded-xl font-semibold hover:from-green-600 hover:to-teal-600"
          >
            Submit Quiz
          </button>
        </div>
      )}

      {/* RESULT DISPLAY */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/30 backdrop-blur-lg p-8 rounded-2xl text-center mt-10 text-white max-w-xl"
        >
          <h2 className="text-3xl font-bold mb-3">🎉 Your Score: {result.score}%</h2>
          <p className="mb-4 text-white/80">Detailed feedback below 👇</p>

          {result.details?.map((d, i) => (
            <div
              key={i}
              className={`my-3 p-3 rounded-xl border ${
                d.is_correct
                  ? "border-green-400 bg-green-400/10"
                  : "border-red-400 bg-red-400/10"
              }`}
            >
              <h3 className="font-semibold">{d.question}</h3>
              <p className="text-sm text-yellow-200">
                Your Answer: {d.your_answer || "None"}
              </p>
              <p className="text-sm text-green-300">
                Correct: {d.correct_answer}
              </p>
              <p className="text-white/90 mt-1 italic">
                💡 {d.explanation || "No explanation available."}
              </p>
            </div>
          ))}

          <button
            onClick={() => {
              setQuiz(null);
              setResult(null);
            }}
            className="mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3 rounded-xl text-white hover:from-purple-700 hover:to-pink-600"
          >
            Retry Quiz
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default Quiz;
