import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/navbar";
import Footer from "./components/footer";

import Login from "./pages/Login";
import Upload from "./pages/Upload";
import Flashcards from "./pages/Flashcards";
import Quiz from "./pages/Quiz";
import Planner from "./pages/Planner";
import Chatbot from "./pages/Chatbot";


const App = () => {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        {/* Navbar */}
        <Navbar />

        {/* Main Page Container */}
        <main className="flex-grow px-6 py-8">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/chatbot" element={<Chatbot />} />
          </Routes>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </Router>
  );
};

export default App;
