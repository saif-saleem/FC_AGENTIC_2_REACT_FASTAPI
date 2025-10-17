import os
from dotenv import load_dotenv
from openai import OpenAI
from app.utils import (
    retrieve_context,
    expand_query_variants
)

load_dotenv()
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

chat_state = {}

# -------------------------------------------------------------------
# Helper Functions
# -------------------------------------------------------------------
def _normalize_standard_key(s):
    if not s:
        return None
    s_low = s.lower().replace("-", "_").replace(" ", "_")
    mapping = {
        "vcs": "vcs", "verra": "vcs",
        "icr": "icr",
        "plan_vivo": "plan_vivo", "planvivo": "plan_vivo",
        "other": "other",
        "gs": "gs", "gold_standard": "gs"
    }
    return mapping.get(s_low, None)


def batch_chunks(lst, n):
    """Yield successive n-sized batches from list."""
    for i in range(0, len(lst), n):
        yield lst[i:i + n]


# -------------------------------------------------------------------
# Core Chat Logic
# -------------------------------------------------------------------
def get_answer(query=None, selected_standard=None, follow_up_answer=None,
               original_query=None, model="gpt-4.1", temperature=0.0):

    # ------------------- Validation -------------------
    if not selected_standard:
        return {
            "clarification": "Please choose a standard: VCS, ICR, PLAN_VIVO, GS, OTHER",
            "answer": None,
            "sources": [],
            "highlights": []
        }

    standard_key = _normalize_standard_key(selected_standard)
    if not standard_key:
        return {"answer": "Invalid or unsupported standard selected.", "sources": [], "highlights": []}

    chat_state["standard_used"] = standard_key
    chat_state["original_query"] = query or original_query

    # ------------------- Retrieve Context -------------------
    results = retrieve_context(query, selected_standard=standard_key, top_k=20, return_scores=True)
    if not results:
        return {"answer": "No relevant information found.", "sources": [], "highlights": []}

    sources = [doc.metadata for doc, _ in results]

    # ------------------- MAP PHASE -------------------
    summaries = []
    batch_size = 5
    for batch in batch_chunks(results, batch_size):
        batch_text = ""
        for i, (doc, _) in enumerate(batch, start=1):
            page_info = doc.metadata.get("page", "")
            source_name = doc.metadata.get("source", "")
            header = f"\n[Document Section {i}"
            if source_name:
                header += f" - {source_name}"
            if page_info:
                header += f", Page {page_info}"
            header += "]\n"
            batch_text += header + doc.page_content + "\n"

        map_prompt = f"""
You are a domain expert in carbon credit standards and documentation.
QUESTION: {query}

You are given multiple extracted document sections (each bracketed like [Document Section X]).
For EACH section:

1. Summarize only the content that directly answers the QUESTION.
2. Write concise bullet points.
3. If you notice a page number or document name in brackets, include it in parentheses for traceability.
4. Do NOT mention words like "chunk", "fragment", or "section" in your answer.

Document Sections:
{batch_text}
"""
        try:
            resp = openai_client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a professional summarization assistant."},
                    {"role": "user", "content": map_prompt}
                ],
                temperature=0
            )
            summaries.append(resp.choices[0].message.content.strip())
        except Exception as e:
            summaries.append(f"[Error summarizing batch: {e}]")

    # ------------------- REDUCE PHASE -------------------
    reduce_prompt = f"""
QUESTION: {query}

You are given multiple PARTIAL SUMMARIES that were derived from different document sections.

TASK:
- Produce a comprehensive, accurate, and well-structured answer.
- Use bullet points or a table format if suitable.
- If you include a table, DO NOT include any references (file names, page numbers, document codes) inside the table cells.
- Inline references (like "(Gold Standard Methodology, Page 18) (file names, page numbers, document codes)") are allowed ONLY in paragraphs or bullet points — NOT inside tables.
- Merge overlapping ideas but preserve all unique insights.
- Never use words like "chunk", "fragment", or "section".
- The output should be clean, professional, and formatted for readability.


PARTIAL SUMMARIES:
{chr(10).join(summaries)}
"""
    try:
        final_resp = openai_client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system",
                 "content": "You are an expert analyst specializing in carbon credit methodologies and standards."},
                {"role": "user", "content": reduce_prompt}
            ],
            temperature=temperature
        )
        final_answer = final_resp.choices[0].message.content.strip()
    except Exception as e:
        final_answer = f"[Error generating final summary: {e}]"

    # ------------------- Highlights (Optional) -------------------
    highlights = [{
        "snippet": doc.page_content[:200] + "...",
        "page": doc.metadata.get("page", "N/A")
    } for doc, _ in results]

    return {
        "answer": final_answer,
        "sources": sources,
        "highlights": highlights
    }
