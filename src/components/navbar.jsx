import React from "react";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const { pathname } = useLocation();

  const links = [
    { name: "Login", to: "/" },
    { name: "Upload Notes", to: "/upload" },
    { name: "Flashcards", to: "/flashcards" },
    { name: "Quiz", to: "/quiz" },
    { name: "Planner", to: "/planner" },
    { name: "Chatbot", to: "/chatbot" },
  ];

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-4 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center px-6">
        {/* Brand / Logo */}
        <Link to="/" className="text-2xl font-bold tracking-wide hover:text-yellow-300 transition">
          📘 AI Study Assistant
        </Link>

        {/* Navigation Links */}
        <div className="flex gap-6">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`font-medium hover:text-yellow-300 transition ${
                pathname === link.to ? "underline decoration-yellow-400" : ""
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
