import { describe, it, expect, beforeEach } from "vitest";
import { useIssueStore } from "@/store/useIssueStore";

beforeEach(() => {
  useIssueStore.setState({
    issues: [
      { id: "STR-1", title: "Issue 1", columnId: "todo" },
      { id: "STR-2", title: "Issue 2", columnId: "todo" },
      { id: "STR-3", title: "Issue 3", columnId: "in-progress" },
    ],
  });
});

describe("useIssueStore", () => {
  it("moveIssue changes columnId", () => {
    useIssueStore.getState().moveIssue("STR-1", "in-progress");
    const issue = useIssueStore.getState().issues.find((i) => i.id === "STR-1");
    expect(issue?.columnId).toBe("in-progress");
  });

  it("moveIssue does not affect other issues", () => {
    useIssueStore.getState().moveIssue("STR-1", "done");
    const unchanged = useIssueStore.getState().issues.find((i) => i.id === "STR-2");
    expect(unchanged?.columnId).toBe("todo");
  });

  it("reorderIssue swaps positions", () => {
    useIssueStore.getState().reorderIssue("STR-1", "STR-2");
    const ids = useIssueStore.getState().issues.map((i) => i.id);
    expect(ids[0]).toBe("STR-2");
    expect(ids[1]).toBe("STR-1");
  });

  it("reorderIssue with unknown id is a no-op", () => {
    const before = useIssueStore.getState().issues.map((i) => i.id);
    useIssueStore.getState().reorderIssue("STR-999", "STR-1");
    const after = useIssueStore.getState().issues.map((i) => i.id);
    expect(after).toEqual(before);
  });
});
