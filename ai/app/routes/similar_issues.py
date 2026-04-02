from fastapi import APIRouter
from pydantic import BaseModel
from ..claude import complete

router = APIRouter()


class Issue(BaseModel):
    id: str
    title: str
    description: str | None = None
    status: str | None = None


class SimilarRequest(BaseModel):
    target: Issue
    candidates: list[Issue]


class SimilarIssue(BaseModel):
    id: str
    title: str
    reason: str
    similarity_score: float  # 0.0 – 1.0


class SimilarResponse(BaseModel):
    similar: list[SimilarIssue]


SYSTEM = """You are a duplicate-detection engine for an issue tracker.
Given a target issue and a list of candidate issues, identify which candidates are similar or potentially duplicate.
Return ONLY a JSON array of objects with keys: "id", "title", "reason" (one sentence), "similarity_score" (float 0–1).
Only include candidates with similarity_score >= 0.4. If none qualify, return [].
No markdown, no preamble."""


@router.post("/similar-issues", response_model=SimilarResponse)
async def find_similar_issues(body: SimilarRequest):
    target_str = f"ID: {body.target.id}\nTitle: {body.target.title}"
    if body.target.description:
        target_str += f"\nDescription: {body.target.description}"

    candidates_str = "\n\n".join(
        f"ID: {c.id}\nTitle: {c.title}" + (f"\nDescription: {c.description}" if c.description else "")
        for c in body.candidates
    )

    prompt = f"TARGET ISSUE:\n{target_str}\n\nCANDIDATES:\n{candidates_str}"

    import json
    raw = complete(SYSTEM, prompt, max_tokens=1024)
    try:
        items = json.loads(raw)
    except Exception:
        items = []

    return SimilarResponse(similar=[SimilarIssue(**i) for i in items])
