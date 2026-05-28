import React, { useState } from "react";
import TopBar from "@/components/TopBar";
import Dashboard from "@/pages/Dashboard";
import SetupPage from "@/pages/SetupPage";
import Splash from "@/components/Splash";

export default function App() {
  const [phase, setPhase] = useState<"splash" | "setup" | "ready">("splash");

  const handleReady = () => {
    localStorage.setItem("duck-setup-done", "true");
    setPhase("ready");
  };

  const handleNeedsSetup = () => {
    setPhase("setup");
  };

  const handleSetupComplete = () => {
    localStorage.setItem("duck-setup-done", "true");
    setPhase("ready");
  };

  if (phase === "splash") {
    return <Splash onReady={handleReady} onNeedsSetup={handleNeedsSetup} />;
  }

  return (
    <div className="h-screen flex flex-col bg-hermes-bg">
      <TopBar />
      <div className="flex-1 overflow-hidden">
        {phase === "ready" ? (
          <Dashboard />
        ) : (
          <SetupPage onComplete={handleSetupComplete} />
        )}
      </div>
    </div>
  );
}
