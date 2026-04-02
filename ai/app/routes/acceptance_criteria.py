from fastapi import APIRouter
from pydantic import BaseModel
from ..claude import complete

router = APIRouter()


class ACRequest(BaseModel):
    title: str
    description: str | None = None
    priority: str | None = None
    labels: list[str] = []


class ACResponse(BaseModel):
    criteria: list[str]


SYSTEM = """You are a senior product manager writing acceptance criteria for engineering issues.
Output ONLY a JSON array of strings — each string is one acceptance criterion in "Given/When/Then" or plain imperative style.
No markdown, no preamble, no explanation. Example: ["User can log in with email and password", "Invalid credentials show an error message"]"""


@router.post("/acceptance-criteria", response_model=ACResponse)
async def generate_acceptance_criteria(body: ACRequest):
    context = f"Title: {body.title}"
    if body.description:
        context += f"\nDescription: {body.description}"
    if body.priority:
        context += f"\nPriority: {body.priority}"
    if body.labels:
        context += f"\nLabels: {', '.join(body.labels)}"

    raw = complete(SYSTEM, context, max_tokens=512)

    import json
    try:
        criteria = json.loads(raw)
    except Exception:
        # fallback: split by newline
        criteria = [line.strip("- •").strip() for line in raw.splitlines() if line.strip()]

    return ACResponse(criteria=criteria)
