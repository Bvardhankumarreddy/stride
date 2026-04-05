import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { ToastProvider } from "@/components/Toast";
import CreateIssueModal from "@/components/CreateIssueModal";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <div className="md:pl-64 min-h-dvh">{children}</div>
      <BottomNav />
      <ToastProvider />
      <CreateIssueModal />
      <KeyboardShortcuts />
    </>
  );
}
