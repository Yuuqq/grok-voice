import { createFileRoute } from "@tanstack/react-router";
import { VoiceStudio } from "@/components/voice-studio";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <VoiceStudio />;
}
