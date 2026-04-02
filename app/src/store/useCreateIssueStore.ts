import { create } from "zustand";

interface CreateIssueStore {
  open: boolean;
  defaultStatus: string;
  openModal: (status?: string) => void;
  closeModal: () => void;
}

export const useCreateIssueStore = create<CreateIssueStore>((set) => ({
  open: false,
  defaultStatus: "todo",
  openModal: (status = "todo") => set({ open: true, defaultStatus: status }),
  closeModal: () => set({ open: false }),
}));
