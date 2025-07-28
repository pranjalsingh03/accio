import ChatScreen from "@/components/Chat/ChatScreen";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function ChatPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <ChatScreen />
    </ProtectedRoute>
  );
}
