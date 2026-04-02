from fastapi import APIRouter
from pydantic import BaseModel
from ..claude import complete

router = APIRouter()


class SprintIssue(BaseModel):
    id: str
    title: str
    status: str
    priority: str
    assignee: str | None = None
    estimate: int | None = None


class DigestRequest(BaseModel):
    sprint_name: str
    start_date: str
    end_date: str
    issues: list[SprintIssue]
    team_size: int | None = None


class DigestResponse(BaseModel):
    health: str           # "on-track" | "at-risk" | "off-track"
    health_reason: str
    summary: str
    blockers: list[str]
    highlights: list[str]
    recommendations: list[str]


SYSTEM = """You are an engineering team lead generating a daily sprint digest.
Analyse the sprint data and return ONLY valid JSON with these keys:
- "health": one of "on-track", "at-risk", "off-track"
- "health_reason": one sentence explaining the health rating
- "summary": 2-3 sentence narrative of sprint progress
- "blockers": array of strings, each a current blocker or risk
- "highlights": array of strings, each a positive highlight
- "recommendations": array of strings, each an actionable recommendation for the team

No markdown fences, no extra text."""


@router.post("/daily-digest", response_model=DigestResponse)
async def daily_digest(body: DigestRequest):
    done = [i for i in body.issues if i.status == "done"]
    in_progress = [i for i in body.issues if i.status == "in-progress"]
    todo = [i for i in body.issues if i.status == "todo"]
    urgent = [i for i in body.issues if i.priority in ("urgent", "high")]

    issues_str = "\n".join(
        f"- [{i.status.upper()}] {i.id}: {i.title} (priority={i.priority}"
        + (f", assignee={i.assignee}" if i.assignee else "")
        + (f", estimate={i.estimate}pt" if i.estimate else "")
        + ")"
        for i in body.issues
    )

    prompt = (
        f"Sprint: {body.sprint_name} ({body.start_date} → {body.end_date})\n"
        f"Team size: {body.team_size or 'unknown'}\n"
        f"Progress: {len(done)} done, {len(in_progress)} in-progress, {len(todo)} todo\n"
        f"Urgent/High priority open: {len([i for i in urgent if i.status != 'done'])}\n\n"
        f"Issues:\n{issues_str}"
    )

    import json
    raw = complete(SYSTEM, prompt, max_tokens=1024)
    try:
        data = json.loads(raw)
    except Exception:
        data = {
            "health": "at-risk",
            "health_reason": "Could not analyse sprint data.",
            "summary": raw,
            "blockers": [],
            "highlights": [],
            "recommendations": [],
        }

    return DigestResponse(**data)
