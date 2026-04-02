from fastapi import APIRouter
from pydantic import BaseModel
from ..claude import complete

router = APIRouter()


class Comment(BaseModel):
    author: str
    body: str
    createdAt: str | None = None


class SummarizeRequest(BaseModel):
    issue_title: str
    comments: list[Comment]


class SummarizeResponse(BaseModel):
    summary: str
    key_decisions: list[str]
    open_questions: list[str]


SYSTEM = """You are a technical writer summarizing a discussion thread on an engineering issue.
Return ONLY valid JSON with three keys:
- "summary": 2-3 sentence plain-English summary of what was discussed and the current state
- "key_decisions": array of strings, each a decision that was reached
- "open_questions": array of strings, each an unresolved question or blocker

No markdown fences, no extra text."""


@router.post("/summarize-comments", response_model=SummarizeResponse)
async def summarize_comments(body: SummarizeRequest):
    thread = "\n".join(
        f"[{c.author}]: {c.body}" for c in body.comments
    )
    prompt = f"Issue: {body.issue_title}\n\nThread:\n{thread}"

    import json
    raw = complete(SYSTEM, prompt, max_tokens=768)
    try:
        data = json.loads(raw)
    except Exception:
        data = {"summary": raw, "key_decisions": [], "open_questions": []}

    return SummarizeResponse(**data)
