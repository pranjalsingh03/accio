"use client";
import Header from "./Header";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
    const { data: session, status } = useSession();
    const [input, setInput] = useState("");
    const [history, setHistory] = useState([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState("");
    const router = useRouter();

    useEffect(() => {
        if (session) {
            fetchHistory();
        }
    }, [session]);

    const fetchHistory = async () => {
        try {
            const res = await fetch("/api/chat");
            if (res.ok) {
                const data = await res.json();
                // Show only the last 3 chats
                setHistory(data.slice(-3));
            }
        } catch (err) {
            console.error("Error fetching history:", err);
            // Don't set error state for history fetch failures
        }
    };

    const createEnhancedPrompt = (userInput) => {
        return `
You are an expert React component generator.

When the user asks you to **"build"**, **"create"**, **"generate"**, or describes a UI element, you must return clean, self-contained component code suitable for direct rendering.

🧠 Expectations:
- Use **React functional components** with Hooks only (no class components)
- Output must be clean, modern **TSX/JSX**
- Style using **Tailwind CSS utility classes** (unless CSS is explicitly requested)
- Ensure **responsiveness** (mobile-first) and **accessibility** (ARIA-compliant)
- Add **inline comments** for non-trivial logic and JSX structure
- Avoid unnecessary complexity; no types/interfaces unless required
- **Do not include**:
  - \`import React from "react"\` (assume React is globally available)
  - \`import './App.css'\` or other CSS imports
  - Any routing-specific logic such as \`useNavigate\` or \`useRouter\`

📦 Output Format:
- Provide a brief explanation of the component first (1–3 sentences)
- Format all code using correct markdown:
  - JSX/TSX: \`\`\`tsx ... \`\`\`
  - CSS (if applicable): \`\`\`css ... \`\`\`
  - HTML (if used): \`\`\`html ... \`\`\`

🛠️ When a prompt is given, generate a clean, modern React functional component:
\`\`\`tsx
// TSX/JSX Component Code
\`\`\`

\`\`\`css
/* Optional CSS file content (only if needed beyond Tailwind) */
\`\`\`

Generate a clean, modern React functional component based on the following prompt:
"${userInput}"
`;
    };

    const getGeminiTitle = async (userMsg, aiMsg) => {
        try {
            const prompt = `Summarize this chat in a short title (max 8 words):\nUser: ${userMsg}\nAI: ${aiMsg}`;
            const res = await fetch("/api/gemini", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt }),
            });
        
            const data = await res.json();
        
            if (res.ok && data.output) {
                return data.output.split("\n")[0].replace(/['"`]/g, "").trim();
            } else {
                console.error("Failed to get Gemini title:", data?.error || data);
                return "Untitled Chat";
            }
        } catch (error) {
            console.error("Error getting title:", error);
            return "Untitled Chat";
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!session) {
            setAiError("Please login to send messages");
            return;
        }

        if (!input.trim()) {
            setAiError("Please enter a message");
            return;
        }
        
        setAiError("");
        setAiLoading(true);
        
        try {
            // Create enhanced prompt for AI
            const enhancedPrompt = createEnhancedPrompt(input);
            
            // Step 1: Get AI response from Gemini
            const geminiRes = await fetch("/api/gemini", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    prompt: enhancedPrompt,
                    images: [] // No images from landing page
                }),
            });
            
            const geminiData = await geminiRes.json();
            if (!geminiRes.ok) {
                throw new Error(geminiData.error || "Failed to generate AI response");
            }

            // Step 2: Generate a title for the chat
            const aiTitle = await getGeminiTitle(input, geminiData.output);

            // Step 3: Create chat with both user message and AI response
            const chatRes = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatId: null, // New chat
                    prompt: input,
                    aiResponse: geminiData.output,
                    aiTitle: aiTitle,
                }),
            });
            
            const chatData = await chatRes.json();
            if (!chatRes.ok) {
                throw new Error(chatData.error || "Failed to create chat");
            }

            // Clear input and navigate to the new chat
            setInput("");
            
            if (chatData && chatData._id) {
                router.push(`/chat/${chatData._id}`);
            } else {
                throw new Error("Chat created but no ID returned");
            }
            
        } catch (err) {
            console.error("Error in handleSend:", err);
            setAiError(err.message || "Failed to send message");
        } finally {
            setAiLoading(false);
        }
    };

    const handleQuickAction = (actionText) => {
        setInput(actionText);
        // Focus the input field
        setTimeout(() => {
            const inputElement = document.querySelector('input[type="text"]');
            if (inputElement) {
                inputElement.focus();
            }
        }, 100);
    };

    const handleHistoryClick = (chat) => {
        if (chat && chat._id) {
            router.push(`/chat/${chat._id}`);
        }
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-[#18181b] to-[#0f0f0f] text-white overflow-hidden">
            {/* Side Panel */}
            <aside className="w-80 bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] flex flex-col border-r border-gray-800 shadow-2xl">
                <div className="p-6 border-b border-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            React Builder AI
                        </h1>
                    </div>
                    
                    {status === "loading" ? (
                        <div className="flex items-center gap-2 text-gray-400">
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                            <span>Loading...</span>
                        </div>
                    ) : session ? (
                        <div className="space-y-2">
                            <p className="text-sm text-gray-400">Welcome back</p>
                            <p className="font-medium text-blue-400">{session.user.email}</p>
                        </div>
                    ) : (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-red-400 text-sm">Please login to use the AI chat</p>
                        </div>
                    )}
                </div>

                {/* Recent Chat History */}
                {session && (
                    <div className="flex-1 p-6 overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4 text-gray-200">Recent Components</h3>
                        <div className="space-y-3">
                            {history.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 mx-auto mb-3 bg-gray-800 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-500 text-sm">No components built yet</p>
                                    <p className="text-gray-600 text-xs mt-1">Start building to see your component history</p>
                                </div>
                            ) : (
                                history.map((chat, idx) => (
                                    <div 
                                        key={chat._id || idx} 
                                        className="bg-gray-800/50 hover:bg-gray-800/70 transition-colors duration-200 rounded-lg p-3 cursor-pointer border border-gray-700/50"
                                        onClick={() => handleHistoryClick(chat)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-300 truncate font-medium">
                                                    {chat.title || "Untitled Component"}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {chat.messages?.length || 0} messages
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col">
                <Header />
                
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="w-full max-w-4xl">
                        {/* Welcome Section */}
                        <div className="text-center mb-12">
                            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                            </div>
                            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                React Component Builder
                            </h1>
                            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                                Generate clean, modern React components with TSX, Tailwind CSS, and accessibility features. Just describe what you need to build.
                            </p>
                        </div>

                        {/* Chat Input Section */}
                        <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
                            <form onSubmit={handleSend} className="space-y-4">
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-xl px-6 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200 text-lg pr-32"
                                        placeholder="Build a modern login form... Create a responsive navbar... Generate a dashboard card..."
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        disabled={!session || aiLoading}
                                        required
                                    />
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <button
                                            type="submit"
                                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                                            disabled={!session || aiLoading || !input.trim()}
                                        >
                                            {aiLoading ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Building...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                    </svg>
                                                    <span>Build</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                
                                {aiError && (
                                    <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>{aiError}</span>
                                    </div>
                                )}
                            </form>

                            {/* Quick Action Cards */}
                            {session && (
                                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div 
                                        className="bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/30 rounded-xl p-4 cursor-pointer transition-all duration-200 group"
                                        onClick={() => handleQuickAction("Create a modern login form with email and password fields")}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                                </svg>
                                            </div>
                                            <h3 className="font-medium text-gray-200 group-hover:text-white transition-colors">UI Components</h3>
                                        </div>
                                        <p className="text-sm text-gray-400">Build forms, buttons, cards, modals, and interactive elements</p>
                                    </div>

                                    <div 
                                        className="bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/30 rounded-xl p-4 cursor-pointer transition-all duration-200 group"
                                        onClick={() => handleQuickAction("Create a responsive navigation bar with mobile menu")}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                                                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <h3 className="font-medium text-gray-200 group-hover:text-white transition-colors">Responsive Design</h3>
                                        </div>
                                        <p className="text-sm text-gray-400">Mobile-first layouts with Tailwind CSS utility classes</p>
                                    </div>

                                    <div 
                                        className="bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/30 rounded-xl p-4 cursor-pointer transition-all duration-200 group"
                                        onClick={() => handleQuickAction("Build a dashboard card component with statistics and charts")}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                </svg>
                                            </div>
                                            <h3 className="font-medium text-gray-200 group-hover:text-white transition-colors">Accessibility Ready</h3>
                                        </div>
                                        <p className="text-sm text-gray-400">ARIA-compliant components with proper semantic markup</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}