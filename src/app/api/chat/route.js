import connectDB from "@/lib/mongodb";
import Chat from "@/models/Chat";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export async function GET(request) {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([], { status: 401 });
  const chats = await Chat.find({ user: session.user.email }).sort({ createdAt: -1 });
  return NextResponse.json(chats);
}

export async function POST(request) {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { chatId, prompt, aiResponse, aiTitle } = await request.json();
  let chat;
  if (chatId) {
    chat = await Chat.findById(chatId);
    if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    chat.messages.push({ user: session.user.email, content: prompt });
    if (aiResponse) chat.messages.push({ user: "Gemini", content: aiResponse });
    if (aiTitle && (!chat.title || chat.title === "")) {
      chat.title = aiTitle;
    }
    await chat.save();
  } else {
    chat = new Chat({
      user: session.user.email,
      title: "",
      messages: [
        { user: session.user.email, content: prompt },
        ...(aiResponse ? [{ user: "Gemini", content: aiResponse }] : []),
      ],
    });
    if (aiTitle) chat.title = aiTitle;
    await chat.save();
  }
  return NextResponse.json(chat);
} 