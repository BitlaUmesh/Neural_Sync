cat << 'EOF' > README.md
# Neural-Sync ⚡

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vercel: Deployed](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://vercel.com)

**Autonomous, context-aware Git merge conflict resolution natively integrated into VS Code.**

Traditional Git merge tools force a binary, text-based choice, inevitably destroying architectural intent when complex logical changes collide. Neural-Sync is an AI-driven middleware that intercepts Git conflicts directly within the IDE, analyzes the structural goals of both conflicting branches, and synthesizes a functional, production-ready hybrid.

---

## 🎥 Action Demo

![Neural-Sync Action Demo](https://github.com/BitlaUmesh/Neural_Sync/releases/download/v1.0-demo/demo.mp4)

---

## 🏗️ System Architecture

This repository is structured as a Monorepo containing both the client extension and the inference middleware.

* **`/frontend` (IDE Client):** A native TypeScript VS Code extension. Uses a background tripwire event listener (`vscode.workspace.onDidChangeTextDocument`) with a 1000ms debounce to detect `<<<<<<< HEAD` markers and trigger the Webview UI.
* **`/backend` (Inference Middleware):** Python FastAPI server deployed on Vercel. Handles payload validation via Pydantic, strict CORS for `vscode-webview://`, and Groq API communication.
* **AI Engine:** LLaMA-3 (via Groq), strictly constrained to escaped JSON payloads to prevent hallucinated markdown injection.

---

## 🚀 Core Features

* **Intent-Based Synthesis:** Analyzes race conditions, variable renaming, and logic updates across conflicting commits, rather than simple string concatenation.
* **Native IDE Tripwire:** Zero CLI commands. Listens for conflict markers in the active editor and prompts resolution instantly.
* **1-Click Inject:** Synthesized code is injected directly into the active editor, automatically stripping Git markers.

---

## 💻 Local Development Setup

To test locally, both the backend middleware and frontend client must run concurrently.

### 1. Backend Initialization (FastAPI)
Establish the Python environment and boot the server:
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
echo "GROQ_API_KEY=your_api_key_here" > .env
uvicorn main:app --reload --port 8000
```

API accessible at http://localhost:8000/docs.

### 2. Frontend Initialization (VS Code Extension)
Install dependencies and launch the Extension Host:
```bash
cd frontend
npm install
```
Press F5 in VS Code to open the Extension Development Host.

---

## 🗺️ Enterprise Roadmap
- [x] Establish FastAPI to Groq JSON inference pipeline.

- [x] Implement VS Code Webview UI and debounced conflict tripwire.

- [ ] Phase 2 (Privacy Pivot): Sever cloud dependencies. Implement local on-device inference via Ollama/WebGPU to bypass enterprise IP blockades.

- [ ] Phase 3 (Context Expansion): Implement local AST parsing to track conflicts across multiple dependent files.
EOF
