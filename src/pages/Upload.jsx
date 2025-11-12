import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

const Upload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [chunksCount, setChunksCount] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage("");
    setChunksCount(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("⚠️ Please select a PDF file first!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      setMessage("⏳ Uploading your notes...");

      const response = await axios.post("http://127.0.0.1:8000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage("✅ Notes uploaded successfully!");
      setChunksCount(response.data.chunks_extracted);
    } catch (error) {
      setMessage("❌ Upload failed. Please try again or check backend logs.");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl bg-white/30 backdrop-blur-lg shadow-2xl rounded-3xl p-10 border border-white/40 text-center"
      >
        {/* Title */}
        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-extrabold text-white drop-shadow-md mb-3"
        >
          📘 Upload Study Notes
        </motion.h1>
        <p className="text-white/80 mb-8 text-lg">
          Upload your <strong>PDF notes</strong> to extract key insights & auto-generate flashcards ✨
        </p>

        {/* Drag-drop area */}
        <motion.label
          htmlFor="file"
          whileHover={{ scale: 1.03 }}
          className="block w-full border-2 border-dashed border-white/60 rounded-2xl py-12 px-6 cursor-pointer hover:bg-white/10 transition backdrop-blur-sm text-white"
        >
          <input
            id="file"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          {file ? (
            <p className="text-xl font-semibold">{file.name}</p>
          ) : (
            <>
              <p className="text-2xl font-semibold">📂 Click or Drag your PDF here</p>
              <p className="text-sm text-white/70 mt-2">Only .pdf files supported</p>
            </>
          )}
        </motion.label>

        {/* Upload button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleUpload}
          disabled={uploading}
          className={`mt-8 w-full py-3 text-lg font-semibold rounded-xl text-white shadow-lg transition ${
            uploading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-purple-600 hover:to-pink-600"
          }`}
        >
          {uploading ? "Uploading..." : "🚀 Upload Notes"}
        </motion.button>

        {/* Message Section */}
        {message && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`mt-6 text-lg ${
              message.includes("✅")
                ? "text-green-200"
                : message.includes("❌")
                ? "text-red-200"
                : "text-yellow-100"
            }`}
          >
            {message}
          </motion.p>
        )}

        {/* Extracted chunks display */}
        {chunksCount !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl py-3 px-5 text-white"
          >
            <p className="text-lg">
              ✅ Successfully extracted{" "}
              <span className="font-bold text-yellow-200">{chunksCount}</span> text chunks from your notes.
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Upload;
