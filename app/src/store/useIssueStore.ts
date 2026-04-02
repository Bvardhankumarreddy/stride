import { create } from "zustand";

export interface Issue {
  id: string;
  title: string;
  label?: string | null;
  priority?: string | null;
  featured?: boolean;
  done?: boolean;
  columnId: string;
  assignee?: string;
  assigneeInitials?: string;
  estimate?: number | null;
}

export type ColumnId = "todo" | "in-progress" | "in-review" | "done";

interface IssueStore {
  issues: Issue[];
  hydrated: boolean;
  moveIssue: (issueId: string, toColumnId: ColumnId) => void;
  reorderIssue: (issueId: string, overId: string) => void;
  setIssues: (issues: Issue[]) => void;
}

export const useIssueStore = create<IssueStore>((set) => ({
  issues: [],
  hydrated: false,

  setIssues: (issues) => set({ issues, hydrated: true }),

  moveIssue: (issueId, toColumnId) =>
    set((state) => ({
      issues: state.issues.map((issue) =>
        issue.id === issueId ? { ...issue, columnId: toColumnId } : issue
      ),
    })),

  reorderIssue: (issueId, overId) =>
    set((state) => {
      const items = [...state.issues];
      const activeIndex = items.findIndex((i) => i.id === issueId);
      const overIndex   = items.findIndex((i) => i.id === overId);
      if (activeIndex === -1 || overIndex === -1) return state;
      const [moved] = items.splice(activeIndex, 1);
      items.splice(overIndex, 0, moved);
      return { issues: items };
    }),
}));
