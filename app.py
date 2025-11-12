import os
import re
import json
import uuid
import random
import numpy as np
from datetime import datetime, timedelta

from fastapi import FastAPI, File, UploadFile, Request, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline
from sentence_transformers import SentenceTransformer
from PyPDF2 import PdfReader

# =============================
# INITIAL SETUP
# =============================

app = FastAPI(title="AI Study Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories for saving data
DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

CHUNKS_FILE = os.path.join(DATA_DIR, "chunks.json")
FLASHCARDS_FILE = os.path.join(DATA_DIR, "flashcards.json")
QUIZZES_FILE = os.path.join(DATA_DIR, "quizzes.json")

# =============================
# GLOBAL STATE
# =============================
chunks = []
flashcards = []
quizzes = []

# =============================
# MODEL LOADERS
# =============================

print("🔹 Loading lighter AI model (FLAN-T5-Small + SentenceTransformer)...")

qa_refiner = pipeline(
    "text2text-generation",
    model="google/flan-t5-small",  # smaller & faster
    temperature=0.7,
    top_p=0.9
)

embed_model = SentenceTransformer("all-MiniLM-L6-v2")

print("✅ Lightweight models loaded successfully!")
# =============================
# 🧩 ADD HELPERS HERE 👇👇👇
# =============================

# ======= HELPERS =======
def sanitize_text(s: str) -> str:
    if not s: return ""
    s = s.strip()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"^\(*Correct\)*\s*[:\-]*\s*", "", s, flags=re.I)
    return s

def parse_qa_from_model(text: str):
    if not text: return None, None
    q = a = None
    m_q = re.search(r"Q[:\s\-]*([^\n\r]+)", text, flags=re.I)
    m_a = re.search(r"A[:\s\-]*([^\n\r]+)", text, flags=re.I)
    if m_q and m_a:
        q = sanitize_text(m_q.group(1))
        a = sanitize_text(m_a.group(1))
        return q, a
    parts = [p.strip() for p in re.split(r"\n{1,}|\.\s+", text) if p.strip()]
    if len(parts) >= 2:
        q = sanitize_text(parts[0])
        a = sanitize_text(parts[1])
        if not q.endswith("?") and len(q.split()) < 8:
            q = q + "?"
        return q, a
    return None, None

def unique_choices(choices):
    seen = set(); out=[]
    for c in choices:
        c2 = sanitize_text(c)
        if not c2: continue
        if c2.lower() in seen: continue
        seen.add(c2.lower()); out.append(c2)
    return out

def generate_semantic_distractors(target_answer, pool_answers, embed_model=None, top_k=3):
    pool = [p for p in pool_answers if p and p.strip() and p.strip().lower() != target_answer.strip().lower()]
    if not pool: return []
    if embed_model:
        try:
            vecs = embed_model.encode(pool, convert_to_numpy=True)
            targ = embed_model.encode([target_answer], convert_to_numpy=True)[0]
            sims = (vecs @ targ) / (np.linalg.norm(vecs, axis=1) * np.linalg.norm(targ) + 1e-9)
            idxs = np.argsort(sims)[::-1]
            distractors=[]
            for i in idxs:
                val = pool[int(i)]
                if val.strip().lower() == target_answer.strip().lower(): continue
                distractors.append(val)
                if len(distractors) >= top_k: break
            return distractors
        except Exception:
            pass
    random.shuffle(pool)
    return pool[:top_k]
# =============================
# END OF HELPERS
# =============================


# =============================
# UTILITY FUNCTIONS
# =============================

def persist():
    """Save chunks, flashcards, and quizzes to disk."""
    with open(CHUNKS_FILE, "w") as f:
        json.dump(chunks, f, indent=2)
    with open(FLASHCARDS_FILE, "w") as f:
        json.dump(flashcards, f, indent=2)
    with open(QUIZZES_FILE, "w") as f:
        json.dump(quizzes, f, indent=2)

def load_all():
    """Load existing data from files if available."""
    global chunks, flashcards, quizzes
    for path, var in [(CHUNKS_FILE, "chunks"), (FLASHCARDS_FILE, "flashcards"), (QUIZZES_FILE, "quizzes")]:
        if os.path.exists(path):
            with open(path, "r") as f:
                globals()[var] = json.load(f)

load_all()

# =============================
# 1️⃣ READER AGENT
# =============================

@app.post("/upload")
async def upload_notes(file: UploadFile = File(...)):
    """Extract text from PDF and split into smaller chunks."""
    global chunks

    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    pdf = PdfReader(file.file)
    text_data = ""
    for page in pdf.pages:
        text_data += page.extract_text() or ""

    # Break into manageable chunks
    lines = [line.strip() for line in text_data.split("\n") if line.strip()]
    chunks = [{"id": str(i), "text": line} for i, line in enumerate(lines)]

    persist()
    return {"chunks_extracted": len(chunks)}

# =============================
# 2️⃣ FLASHCARD AGENT (AI)
# =============================

@app.post("/generate_flashcards")
async def generate_flashcards(request: Request):
    global flashcards, qa_refiner, chunks

    # parse chunk_ids from JSON body if provided
    try:
        data = await request.json()
        chunk_ids = data.get("chunk_ids", [])
    except:
        chunk_ids = []

    if not chunks:
        raise HTTPException(status_code=400, detail="No notes uploaded yet.")

    created = []
    seen = set()

    # Make chunks more granular: smaller threshold -> more usable contexts
    combined_chunks = []
    buffer = ""
    for c in chunks:
        line = c.get("text","").strip()
        if not line: continue
        buffer += " " + line
        if len(buffer) > 120:   # smaller threshold (was 200)
            combined_chunks.append(buffer.strip()); buffer = ""
    if buffer:
        combined_chunks.append(buffer.strip())

    # select subset if requested
    if chunk_ids:
        sel = []
        for i in chunk_ids:
            try:
                idx = int(i)
                if 0 <= idx < len(combined_chunks):
                    sel.append(combined_chunks[idx])
            except:
                continue
        selected = sel or combined_chunks
    else:
        selected = combined_chunks

    # Limit how many chunks we ask model to handle per call
    selected = selected[:12]

    for text in selected:
        if len(text.split()) < 8:   # ignore too small lines
            continue

        # build clearer instruction with strict output format
        prompt = f"""
You are an educational assistant. Read the study note and output EXACTLY one Q/A pair in this format:
Q: <question>
A: <answer>

Be concise. Use only the content from the note.
Note:
{text}
"""
        try:
            res = qa_refiner(prompt, max_new_tokens=120, do_sample=False)[0].get("generated_text","")
            q,a = parse_qa_from_model(res)
        except Exception as e:
            q,a = None,None

        # fallback: simple heuristic create a question if model fails
        if not q or not a or len(a.split())<3:
            # try to find a noun phrase (first 8 words) and make a definition question
            tokens = text.split(".")[0].split()[:10]
            if tokens:
                subj = " ".join(tokens)
                q = f"What is {subj}?"
                a = text.split(".")[0].strip()
            else:
                continue

        q = sanitize_text(q); a = sanitize_text(a)
        if not q or not a or q.lower() in seen:
            continue
        seen.add(q.lower())

        new_fc = {
            "id": str(uuid.uuid4()),
            "source_chunk": "AI",
            "question": q,
            "answer": a,
            "difficulty": "medium",
            "tags": []
        }
        flashcards.append(new_fc)
        created.append({"question": q, "answer": a})

    persist()
    if not created:
        raise HTTPException(status_code=500, detail="No valid flashcards were generated. Try uploading clearer notes.")
    return {"created": len(created), "flashcards": created}

# =============================
# 3️⃣ QUIZ AGENT (AI)
# =============================

@app.post("/quiz/generate")
def generate_quiz(num_questions: int = 5):
    global flashcards, quizzes, qa_refiner, embed_model

    if not flashcards:
        raise HTTPException(status_code=400, detail="No flashcards available.")

    # choose random flashcards but more variety if pool large
    n = min(num_questions, len(flashcards))
    selected = random.sample(flashcards, n)
    questions = []

    # build answers pool for distractors
    answers_pool = [fc["answer"] for fc in flashcards if fc.get("answer")]

    for fc in selected:
        try:
            prompt = f"""
Create one high-quality multiple choice question (4 options) from this concept.
Outputs must be clearly labeled as:
Question: <...>
A) <...>
B) <...>
C) <...>
D) <...>
Mark the correct option with (Correct) AFTER the option text.

Concept:
Q: {fc['question']}
A: {fc['answer']}
"""
            response = qa_refiner(prompt, max_new_tokens=180, do_sample=False)[0].get("generated_text","")
            # Clean response
            response = response.replace("\r","")
            # Extract question
            q_match = re.search(r"Question[:\-]?\s*(.*\?)", response, flags=re.I)
            question_text = sanitize_text(q_match.group(1)) if q_match else sanitize_text(fc['question'])

            # extract options A-D
            opt_matches = re.findall(r"[A-D]\)\s*([^\n]+)", response)
            if not opt_matches:
                # sometimes model uses 'A.' or 'A -', try fallback
                opt_matches = re.findall(r"[A-D][\.\-]\s*([^\n]+)", response)

            # extract (Correct) marker
            correct_opt = None
            c_match = re.search(r"\(Correct\)\s*([^\n]+)", response)
            if c_match:
                correct_opt = sanitize_text(c_match.group(1))

            # If options missing or duplicates -> generate distractors
            options = unique_choices(opt_matches)
            if len(options) < 4:
                # get semantically similar distractors from pool
                distractors = generate_semantic_distractors(fc["answer"], answers_pool, embed_model, top_k=4)
                # ensure fc['answer'] included and unique
                candidate = unique_choices(distractors + [fc["answer"]])
                # take up to 4
                options = candidate[:4]

            # ensure unique and length==4
            options = unique_choices(options)
            # if still <4 pad with simple variations
            if len(options) < 4:
                # add trimmed words from the answer or question
                extras = []
                for token in fc['answer'].split():
                    token = token.strip().strip(".,;:()")
                    if token and token.lower() != fc['answer'].lower():
                        extras.append(token)
                for e in extras:
                    options.append(e)
                    if len(options) >= 4: break
            options = options[:4]

            # now find correct_answer — if model gave correct_opt match to options; otherwise use fc['answer']
            correct_answer = None
            if correct_opt:
                # match to one of options ignoring case/strip
                for o in options:
                    if correct_opt.strip().lower() in o.strip().lower() or o.strip().lower() in correct_opt.strip().lower():
                        correct_answer = o
                        break
            if not correct_answer:
                # prefer exact answer match
                for o in options:
                    if o.strip().lower() == fc['answer'].strip().lower():
                        correct_answer = o; break
            if not correct_answer:
                # fallback: choose option that shares most words with fc['answer']
                best=None;bestscore=0
                ans_tokens = set(re.findall(r"\w+", fc['answer'].lower()))
                for o in options:
                    score = len(ans_tokens & set(re.findall(r"\w+", o.lower())))
                    if score > bestscore: best=o; bestscore=score
                correct_answer = best if best else options[0]

            questions.append({
                "id": str(uuid.uuid4()),
                "question": question_text,
                "choices": options,
                "correct_answer": correct_answer
            })

        except Exception as e:
            print("⚠️ Quiz generation failed:", e)
            continue

    quiz = {"id": str(len(quizzes) + 1), "questions": questions}
    quizzes.append(quiz)
    persist()
    return quiz


# =============================
# 4️⃣ QUIZ SUBMITTER (AI EXPLANATIONS)
# =============================

from pydantic import BaseModel

class QuizSubmission(BaseModel):
    quiz_id: str
    answers: dict

@app.post("/quiz/submit")
def submit_quiz(data: QuizSubmission):
    global quizzes, qa_refiner

    quiz = next((x for x in quizzes if x["id"] == data.quiz_id), None)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    correct = 0
    detailed = []

    for q in quiz["questions"]:
        user_answer = data.answers.get(q["id"], "")
        is_correct = user_answer == q["correct_answer"]
        if is_correct:
            correct += 1

        try:
            prompt = f"Explain why '{q['correct_answer']}' is correct and others are wrong for: {q['question']}"
            explanation = qa_refiner(prompt, max_new_tokens=80, do_sample=False)[0]["generated_text"]
        except:
            explanation = "Explanation unavailable."

        detailed.append({
            "question": q["question"],
            "your_answer": user_answer,
            "correct_answer": q["correct_answer"],
            "is_correct": is_correct,
            "explanation": explanation
        })

    score = round(100 * correct / len(quiz["questions"]), 2)
    return {"score": score, "details": detailed}

# =============================
# 6️⃣ CHAT / DOUBT AGENT (AI)
# =============================

@app.post("/chat/ask")
async def chat_agent(request: Request):
    try:
        data = await request.json()
        question = data.get("question", "").strip()

        if not question:
            raise HTTPException(status_code=400, detail="Question cannot be empty.")

        if not chunks:
            raise HTTPException(status_code=400, detail="No notes uploaded yet.")

        query_emb = embed_model.encode([question])
        sims = [np.dot(query_emb, embed_model.encode([c['text']]).T)[0][0] for c in chunks]
        best_idx = int(np.argmax(sims))
        context = chunks[best_idx]["text"]

        prompt = f"Use this note to answer clearly:\n{context}\n\nQuestion: {question}"
        answer = qa_refiner(prompt, max_new_tokens=120, do_sample=False)[0]["generated_text"]

        return {"question": question, "context": context, "answer": answer}

    except Exception as e:
        print("⚠️ Chat error:", e)
        raise HTTPException(status_code=500, detail=str(e))
