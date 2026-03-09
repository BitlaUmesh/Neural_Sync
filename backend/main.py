import os
import json
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import AsyncGroq

from parser import extract_conflict_blocks, parse_code_to_ast
from security import scan_ast_for_threats

app = FastAPI()

# Allow CORS for local VS Code extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConflictPayload(BaseModel):
    raw_conflict_text: str

async def synthesize_merge_with_llm(dev_a_code: str, dev_b_code: str):
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is missing.")
    
    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    
    system_prompt = (
        "You are a senior Git conflict resolution AI. Analyze Dev A and Dev B's code. "
        "Synthesize their intents into a single, bug-free block of code. "
        "You MUST return ONLY a valid JSON object with three keys: 'intent_tag' (e.g., [Performance], [Security], [Logic]), "
        "'explanation' (a 1-sentence summary), and 'merged_code' (the final python code).\n\n"
        "CRITICAL JSON FORMATTING RULE:\n"
        "You must output strictly valid JSON. NEVER use triple quotes. The merged_code must be a single, valid JSON string wrapped in double quotes.\n"
        "CRITICAL ESCAPING RULE: Inside the Python code itself, YOU MUST EXCLUSIVELY USE SINGLE QUOTES (') for all strings (e.g., print('Error') NOT print(\"Error\")). If you use double quotes inside the Python code, the JSON parser will crash. Escape all newlines as \\n.\n"
        "You must return strictly valid JSON. CRITICAL: For the 'merged_code' field, you MUST escape all double quotes using \\\" and use \\n for line breaks. DO NOT use triple quotes (\"\"\") and DO NOT wrap the JSON or the code in Markdown formatting. Return raw JSON only."
    )

    user_prompt = f"Dev A Code:\n{dev_a_code}\n\nDev B Code:\n{dev_b_code}"
    
    response = await client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        response_format={"type": "json_object"}
    )
    
    return json.loads(response.choices[0].message.content)

@app.post("/api/merge")
async def merge_conflict(payload: ConflictPayload):
    blocks = extract_conflict_blocks(payload.raw_conflict_text)
    dev_a = blocks.get("dev_a_code", "")
    dev_b = blocks.get("dev_b_code", "")

    ast_a = parse_code_to_ast(dev_a)
    ast_b = parse_code_to_ast(dev_b)

    scan_a = scan_ast_for_threats(ast_a)
    scan_b = scan_ast_for_threats(ast_b)

    for scan in (scan_a, scan_b):
        if not scan.get("is_safe", True):
            threat_name = scan.get("threat_found", "Unknown")
            return {
                "intent_tag": "[Security Block]",
                "explanation": f"Destructive code detected: {threat_name}",
                "merged_code": "MERGE REJECTED BY ANTIGRAVITY GATE."
            }

    return await synthesize_merge_with_llm(dev_a, dev_b)
