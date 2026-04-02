from fastapi import APIRouter
from pydantic import BaseModel
from ..claude import complete

router = APIRouter()


class SprintIssue(BaseModel):
    id: str
    title: str
    status: str
    priority: str
    labels: list[str] = []
    assignee: str | None = None


class ReleaseNotesRequest(BaseModel):
    sprint_name: str
    project_name: str
    start_date: str
    end_date: str
    issues: list[SprintIssue]
    version: str | None = None


class ReleaseNotesResponse(BaseModel):
    version: str
    title: str
    highlights: list[str]
    sections: dict[str, list[str]]   # e.g. {"Features": [...], "Bug Fixes": [...]}
    markdown: str


SYSTEM = """You are a technical writer generating release notes from a completed sprint.
Return ONLY valid JSON with these keys:
- "version": the version string (use what's provided or infer from sprint name)
- "title": a short, punchy release title (e.g. "Faster Payments & iOS Polish")
- "highlights": array of 2-3 top headline features/fixes (plain English, user-facing language)
- "sections": object where keys are section names (e.g. "Features", "Bug Fixes", "Improvements", "Infrastructure") and values are arrays of changelog line strings
- "markdown": full release notes as a Markdown string ready to publish

Only include issues with status "done". Group them logically by label/type.
Write for a technical audience but avoid jargon where possible.
No markdown fences around the JSON itself."""


@router.post("/release-notes", response_model=ReleaseNotesResponse)
async def generate_release_notes(body: ReleaseNotesRequest):
    done_issues = [i for i in body.issues if i.status == "done"]

    issues_str = "\n".join(
        f"- {i.id}: {i.title}"
        + (f" [labels: {', '.join(i.labels)}]" if i.labels else "")
        + (f" (by {i.assignee})" if i.assignee else "")
        for i in done_issues
    )

    prompt = (
        f"Project: {body.project_name}\n"
        f"Sprint: {body.sprint_name} ({body.start_date} → {body.end_date})\n"
        + (f"Version: {body.version}\n" if body.version else "")
        + f"\nCompleted issues ({len(done_issues)}):\n{issues_str}"
    )

    import json
    raw = complete(SYSTEM, prompt, max_tokens=2048)
    try:
        data = json.loads(raw)
    except Exception:
        data = {
            "version": body.version or body.sprint_name,
            "title": f"{body.sprint_name} Release",
            "highlights": [],
            "sections": {"Notes": [raw]},
            "markdown": raw,
        }

    return ReleaseNotesResponse(**data)
