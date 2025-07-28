"use client";
import ChatScreen from "@/components/Chat/ChatScreen";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function ChatSlugPage() {
  const params = useParams();
  const { slug } = params;
  
  return (
    <ProtectedRoute requireAuth={true}>
      <ChatScreen chatId={slug} />
    </ProtectedRoute>
  );
}
