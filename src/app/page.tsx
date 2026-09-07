"use client";

import { useEffect, useState } from "react";
import { ChatPane } from "@/components/ChatPane";
import { SettingsSheet } from "@/components/SettingsSheet";
import { Sidebar } from "@/components/Sidebar";
import { SourceDrawer } from "@/components/SourceDrawer";
import { Toasts } from "@/components/Toasts";
import { useStore } from "@/lib/store";

export default function Page() {
  const hydrate = useStore((state) => state.hydrate);
  const ready = useStore((state) => state.ready);
  const ingest = useStore((state) => state.ingest);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Files can be dropped anywhere in the window, not just on the sidebar target.
  useEffect(() => {
    let depth = 0;
    const onEnter = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      depth += 1;
      setDragging(true);
    };
    const onLeave = () => {
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const onOver = (event: DragEvent) => event.preventDefault();
    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      depth = 0;
      setDragging(false);
      const files = event.dataTransfer?.files;
      if (files?.length) void ingest([...files]);
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [ingest]);

  // Cmd/Ctrl + K opens settings — the one thing a first-time visitor needs.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSettingsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="relative z-10 grid h-dvh grid-cols-1 overflow-hidden lg:grid-cols-[320px_1fr]">
      <div className="hidden min-h-0 lg:block">
        <Sidebar onOpenSettings={() => setSettingsOpen(true)} />
      </div>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <button
            aria-label="Close library"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
          />
          <div className="relative w-[88%] max-w-sm">
            <Sidebar
              onOpenSettings={() => {
                setSidebarOpen(false);
                setSettingsOpen(true);
              }}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="min-h-0">
        {ready ? (
          <ChatPane
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-mist-500">Opening your local library…</p>
          </div>
        )}
      </div>

      {dragging ? (
        <div className="pointer-events-none fixed inset-3 z-50 flex items-center justify-center rounded-2xl border-2 border-dashed border-iris-400/60 bg-ink-950/70 backdrop-blur-sm">
          <p className="text-sm font-medium text-mist-100">Drop to index in this browser</p>
        </div>
      ) : null}

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <SourceDrawer />
      <Toasts />
    </main>
  );
}
