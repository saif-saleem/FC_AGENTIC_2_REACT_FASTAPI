from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.rag_chat import get_answer

app = FastAPI()

# === Allow frontend (React) to connect ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Serve static logo and assets ===
app.mount(
    "/assets",
    StaticFiles(directory=os.path.join(os.path.dirname(__file__), "app", "assets")),
    name="assets",
)

# ✅ NEW: Home route for quick status check
@app.get("/")
def home():
    return {"message": "Flora Carbon GPT backend is running successfully!"}

# === Chat endpoint ===
@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    query = data.get("message", "")
    selected_standard = data.get("selected_standard", "gs")

    result = get_answer(query=query, selected_standard=selected_standard)
    return {"answer": result.get("answer"), "clarification": result.get("clarification")}
