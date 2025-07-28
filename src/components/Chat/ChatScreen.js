
"use client";
import React from 'react';
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { duotoneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Helper: detect code language and extension
const getCodeInfo = (codeBlock) => {
  const match = codeBlock.match(/^```([a-zA-Z0-9]*)\n([\s\S]*)```$/);
  if (!match) return { lang: '', code: codeBlock, ext: 'txt' };
  const lang = match[1] || '';
  const code = match[2] || '';
  let ext = 'txt';
  const langMap = {
    'js': 'js', 'javascript': 'js', 'jsx': 'jsx', 'ts': 'ts', 'typescript': 'ts',
    'tsx': 'tsx', 'json': 'json', 'css': 'css', 'html': 'html',
    'python': 'py', 'py': 'py', 'java': 'java', 'c': 'c',
    'cpp': 'cpp', 'c++': 'cpp', 'md': 'md', 'markdown': 'md',
    'php': 'php', 'ruby': 'rb', 'go': 'go', 'rust': 'rs',
    'sql': 'sql', 'yaml': 'yaml', 'yml': 'yml', 'xml': 'xml'
  };
  ext = langMap[lang] || 'txt';
  return { lang, code, ext };
};

// Helper: extract all code blocks from a message
const extractCodeBlocks = (content) => {
  const codeBlockRegex = /```([a-zA-Z0-9]*)\n([\s\S]*?)```/g;
  const blocks = [];
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const lang = match[1] || 'text';
    const code = match[2].trim();
    const { ext } = getCodeInfo(match[0]);
    
    // Validate that the code block is complete
    if (code && code.length > 0) {
      blocks.push({ lang, code, ext, raw: match[0] });
    } else {
      console.warn('Empty or invalid code block detected:', match[0]);
    }
  }
  
  // If no complete blocks found, try to extract incomplete blocks
  if (blocks.length === 0) {
    const incompleteRegex = /```([a-zA-Z0-9]*)\n([\s\S]*)$/;
    const incompleteMatch = content.match(incompleteRegex);
    if (incompleteMatch && incompleteMatch[2].trim()) {
      console.warn('Incomplete code block detected, using partial content');
      const lang = incompleteMatch[1] || 'text';
      const code = incompleteMatch[2].trim();
      const { ext } = getCodeInfo(`\`\`\`${lang}\n${code}\`\`\``);
      blocks.push({ lang, code, ext, raw: incompleteMatch[0], incomplete: true });
    }
  }
  
  return blocks;
};

// Fixed LivePreviewModal Component
function LivePreviewModal({ show, codeToRender, onClose }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (show && iframeRef.current && codeToRender) {
      const iframe = iframeRef.current;

      const sendMessage = () => {
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            {
              type: 'RENDER_CODE',
              code: {
                jsx: codeToRender.jsx || '',
                css: codeToRender.css || '',
                html: codeToRender.html || '',
              }
            },
            window.location.origin
          );
          console.log('Sent code to iframe:', codeToRender);
        }
      };

      const onLoad = () => { 
        setTimeout(sendMessage, 100); // Small delay to ensure iframe is ready
      };
      
      iframe.addEventListener('load', onLoad);
      
      // Fallback timer in case load event doesn't fire
      const fallbackTimer = setTimeout(sendMessage, 500);

      return () => {
        iframe.removeEventListener('load', onLoad);
        clearTimeout(fallbackTimer);
      };
    }
  }, [show, codeToRender]);

  if (!show) {
    return null;
  }

  // Check if there's actual code to render
  const hasActualCode = codeToRender && (
    (codeToRender.jsx && codeToRender.jsx.trim() && codeToRender.jsx.trim() !== '// No JSX generated for this prompt.') ||
    (codeToRender.css && codeToRender.css.trim() && codeToRender.css.trim() !== '/* No CSS generated for this prompt. */') ||
    (codeToRender.html && codeToRender.html.trim())
  );

  return (
    <div className="h-full w-full bg-white rounded-lg shadow-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            🚀 Live Component Preview
            {!hasActualCode && <span className="text-xs text-yellow-600">(No code to render)</span>}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-1 rounded"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 bg-gray-100 flex items-center justify-center relative overflow-hidden">
        {hasActualCode ? (
          <iframe
            ref={iframeRef}
            title="Component Live Preview"
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full border-none"
            src="/preview.html"
            style={{ minHeight: '200px' }}
          />
        ) : (
          <div className="text-center text-gray-500 p-8">
            <div className="text-4xl mb-4">🎨</div>
            <p className="text-lg font-medium mb-2">No Component Generated Yet</p>
            <p className="text-sm">Ask the AI to create a React component to see it here!</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Code Inspector with Tabs
const CodeInspector = ({ jsxCode, cssCode, onDownload, onCopy }) => {
  const [activeTab, setActiveTab] = useState('jsx');

  const tabs = [];
  if (jsxCode && jsxCode.trim()) tabs.push({ id: 'jsx', label: 'JSX/TSX', code: jsxCode, lang: 'jsx' });
  if (cssCode && cssCode.trim()) tabs.push({ id: 'css', label: 'CSS', code: cssCode, lang: 'css' });

  if (tabs.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-gray-400 text-center h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">📝</div>
          <p>No code generated yet.</p>
          <p className="text-sm mt-1">Ask me to create a component!</p>
        </div>
      </div>
    );
  }

  // Ensure active tab exists
  if (!tabs.find(t => t.id === activeTab)) {
    setActiveTab(tabs[0].id);
  }

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <div className="bg-[#1a1a1a] rounded-lg border border-gray-700 overflow-hidden h-full flex flex-col">
      {/* Tab Headers */}
      <div className="bg-[#2a2a2a] px-4 py-2 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-orange-400 text-black font-semibold'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => onCopy(currentTab)}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200 shadow-lg"
            >
              📋 Copy {currentTab.label}
            </button>
            <button
              onClick={onDownload}
              className="px-3 py-1 text-xs bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-all duration-200 shadow-lg"
            >
              📦 Download ZIP
            </button>
          </div>
        </div>
      </div>

      {/* Code Display */}
      <div className="relative flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          <SyntaxHighlighter
            style={duotoneDark}
            language={currentTab.lang}
            PreTag="div"
            customStyle={{
              margin: 0,
              borderRadius: 0,
              background: '#1a1a1a',
              fontSize: '14px',
              height: '100%'
            }}
            showLineNumbers={true}
            lineNumberStyle={{ color: '#666', fontSize: '12px' }}
          >
            {currentTab.code}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
};

// Image Upload Component
const ImageUpload = ({ onImageSelect, selectedImages, onRemoveImage }) => {
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          onImageSelect({
            file,
            dataUrl: e.target.result,
            name: file.name
          });
        };
        reader.readAsDataURL(file);
      }
    }
    
    // Reset file input
    e.target.value = '';
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="p-2 text-gray-400 hover:text-orange-400 transition-colors rounded-lg hover:bg-gray-700/50"
        title="Add images"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {selectedImages.length > 0 && (
        <div className="flex gap-2">
          {selectedImages.map((img, idx) => (
            <div key={idx} className="relative group">
              <img
                src={img.dataUrl}
                alt={img.name}
                className="w-10 h-10 rounded-lg object-cover border border-gray-600"
              />
              <button
                onClick={() => onRemoveImage(idx)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function ChatScreen({ chatId }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [input, setInput] = useState("");
  const [selectedImages, setSelectedImages] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [generatedComponent, setGeneratedComponent] = useState({ jsx: '', css: '', html: '' });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (session) fetchChats();
  }, [session]);

  useEffect(() => {
    if (chatId && chats.length > 0) {
      const found = chats.find((c) => c._id === chatId);
      if (found) {
        setSelectedChat(found);
        extractComponentFromChat(found);
      }
    } else if (chats.length > 0 && !chatId) {
      setSelectedChat(chats[0]);
      extractComponentFromChat(chats[0]);
    }
  }, [chatId, chats]);

  const extractComponentFromChat = (chat) => {
    if (!chat || !chat.messages || chat.messages.length === 0) {
      setGeneratedComponent({ jsx: '', css: '', html: '' });
      return;
    }

    // Find the latest AI message with code
    const aiMessages = chat.messages.filter(msg => msg.user === "Gemini").reverse();
    
    for (const msg of aiMessages) {
      const codeBlocks = extractCodeBlocks(msg.content);
      const jsxBlock = codeBlocks.find(block => 
        ['jsx', 'tsx', 'javascript', 'js'].includes(block.lang) && 
        /(?:import.*React|from\s+['"]react['"]|<[A-Z]|\breturn\s*\(?\s*<|JSX\.Element|const\s+\w+\s*=|function\s+\w+)/i.test(block.code)
      );
      const cssBlock = codeBlocks.find(block => block.lang === 'css');
      const htmlBlock = codeBlocks.find(block => block.lang === 'html');
      
      if (jsxBlock || cssBlock || htmlBlock) {
        setGeneratedComponent({
          jsx: jsxBlock ? jsxBlock.code : '',
          css: cssBlock ? cssBlock.code : '',
          html: htmlBlock ? htmlBlock.code : ''
        });
        return;
      }
    }
    
    setGeneratedComponent({ jsx: '', css: '', html: '' });
  };

  const fetchChats = async () => {
    try {
      const res = await fetch("/api/chat");
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    }
  };

  const handleSelectChat = (chat) => {
    router.push(`/chat/${chat._id}`);
  };

  const handleNewChat = () => {
    router.push("/chat");
    setSelectedChat(null);
    setInput("");
    setSelectedImages([]);
    setGeneratedComponent({ jsx: '', css: '', html: '' });
  };

  const handleImageSelect = (imageData) => {
    setSelectedImages(prev => [...prev, imageData]);
  };

  const handleRemoveImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
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

  // Get conversation context (last 5 messages)
  const getConversationContext = (messages) => {
    if (!messages || messages.length === 0) return "";
    
    // Get last 5 messages (or all if less than 5)
    const contextMessages = messages.slice(-5);
    
    const contextString = contextMessages.map(msg => {
      const role = msg.user === "Gemini" ? "Assistant" : "User";
      return `${role}: ${msg.content}`;
    }).join('\n\n');
    
    return contextString;
  };

  const createEnhancedPrompt = (userInput, images, conversationContext) => {
    let enhancedPrompt = '';
    
    // Add previous conversation context if available
    if (conversationContext) {
      enhancedPrompt += `// 🗂 Previous context to consider:\n${conversationContext}\n\n`;
    }
  
    enhancedPrompt += `
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

If prior conversation context is available, use it to **build upon or iterate the component**. If images are attached, use them to infer layout, visual structure, and styling inspiration.
`;
  
    if (images && images.length > 0) {
      enhancedPrompt += `\n// 🖼️ ${images.length} image(s) attached. Use layout, structure, and design patterns as visual inspiration.`;
    }
  
    return enhancedPrompt;
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setAiError("");
    setAiLoading(true);
    
    try {
      // Get conversation context
      const conversationContext = selectedChat?.messages ? getConversationContext(selectedChat.messages) : "";
      
      // Create enhanced prompt with context
      const enhancedPrompt = createEnhancedPrompt(input, selectedImages, conversationContext);
      
      // Prepare request body with images
      const requestBody = {
        prompt: enhancedPrompt,
        images: selectedImages.map(img => ({
          data: img.dataUrl.split(',')[1], // Remove data:image/jpeg;base64, prefix
          mimeType: img.file.type
        }))
      };

      const geminiRes = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      
      const geminiData = await geminiRes.json();
      if (!geminiRes.ok) throw new Error(geminiData.error || "Gemini error");

      let aiTitle = undefined;
      if (!selectedChat) {
        aiTitle = await getGeminiTitle(input, geminiData.output);
      }

      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: selectedChat?._id,
          prompt: input,
          aiResponse: geminiData.output,
          aiTitle,
        }),
      });
      
      const chatData = await chatRes.json();
      if (chatRes.ok) {
        await fetchChats();
        setSelectedChat(chatData);
        extractComponentFromChat(chatData);
        setInput("");
        setSelectedImages([]);
      } else {
        setAiError(chatData.error || "Failed to save chat");
      }
      scrollToBottom();
    } catch (err) {
      setAiError(err.message || "Failed to send message");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopy = async (tab) => {
    try {
      await navigator.clipboard.writeText(tab.code);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = async () => {
    const zip = new JSZip();
    
    if (generatedComponent.jsx) {
      zip.file("Component.jsx", generatedComponent.jsx);
    }
    
    if (generatedComponent.css) {
      zip.file("styles.css", generatedComponent.css);
    }
    
    if (generatedComponent.html) {
      zip.file("index.html", generatedComponent.html);
    }
    
    // Add package.json
    const packageJson = {
      name: "generated-component",
      version: "1.0.0",
      dependencies: {
        "react": "^18.0.0",
        "react-dom": "^18.0.0"
      }
    };
    zip.file("package.json", JSON.stringify(packageJson, null, 2));
    
    // Add README
    const readme = `# Generated React Component

This component was generated using AI.

## Files:
- Component.jsx - Main React component
${generatedComponent.css ? '- styles.css - Component styles' : ''}
${generatedComponent.html ? '- index.html - HTML template' : ''}
- package.json - Project dependencies

Generated on: ${new Date().toLocaleString()}
`;
    zip.file("README.md", readme);
    
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `component-${Date.now()}.zip`);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#18181b] to-[#0f0f0f]">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#18181b] to-[#0f0f0f] text-white overflow-hidden">
      {/* Side Panel - Enhanced for conversational UI */}
      <aside className="w-80 bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] flex flex-col border-r border-gray-800 shadow-2xl">
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 flex-shrink-0">
            <button 
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-lg transform hover:scale-105"
              onClick={handleNewChat}
            >
              ✨ New Component Chat
            </button>
          </div>
          
          <div className="px-4 flex-1 overflow-hidden flex flex-col">
            <h3 className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wider flex-shrink-0">Component Chats</h3>
            <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1">
              {chats.map((chat) => (
                <div
                  key={chat._id}
                  className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedChat?._id === chat._id 
                      ? "bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/30" 
                      : "bg-gray-800/30 hover:bg-gray-700/50 border border-transparent hover:border-gray-600"
                  }`}
                  onClick={() => handleSelectChat(chat)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm truncate ${selectedChat?._id === chat._id ? "text-orange-300 font-semibold" : "text-gray-200"}`}>
                        {chat.title || "New component"}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {chat.messages?.length || 0} messages
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* User Profile Section */}
        <div className="p-4 border-t border-gray-800 bg-gradient-to-r from-gray-900/50 to-gray-800/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center text-lg font-bold shadow-lg">
              {session?.user?.email?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{session?.user?.email?.split("@")[0] || "Guest"}</div>
              <div className="text-xs text-gray-400">Component Builder</div>
            </div>
            {session && (
              <button 
                onClick={() => signOut()} 
                className="text-xs text-red-400 hover:text-red-300 hover:underline transition-colors p-2 rounded-lg hover:bg-red-500/10"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Area - Split Layout */}
      <main className="flex-1 flex h-screen overflow-hidden">
        {/* Central Viewport - Component Preview */}
        <div className="flex-1 flex flex-col p-4 min-w-0">
          <div className="flex-1 bg-gradient-to-b from-[#232323]/80 to-[#1a1a1a]/80 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden mb-4">
            <LivePreviewModal
              show={true}
              codeToRender={generatedComponent}
            />
          </div>
          
          {/* Code Inspector */}
          <div className="h-1/3 min-h-[200px]">
            <CodeInspector
              jsxCode={generatedComponent.jsx}
              cssCode={generatedComponent.css}
              onCopy={handleCopy}
              onDownload={handleDownload}
            />
          </div>
        </div>

        {/* Right Panel - Chat Interface */}
        <div className="w-96 flex flex-col border-l border-gray-800 flex-shrink-0">
          {/* Chat Messages */}
          <div className="flex-1 bg-gradient-to-b from-[#232323]/80 to-[#1a1a1a]/80 backdrop-blur-sm border border-gray-700/50 m-4 mb-2 rounded-2xl shadow-2xl overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-b border-orange-500/30 p-3 flex-shrink-0">
                <h2 className="text-sm font-semibold text-orange-300">Component Generator Chat</h2>
                
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {!selectedChat || selectedChat.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="text-4xl mb-3">🎨</div>
                    <div className="text-lg font-bold mb-2 text-orange-300">
                      Component Builder
                    </div>
                    <div className="text-gray-400 text-sm mb-4">
                      Describe the component you want to create!
                    </div>
                    <div className="text-xs text-gray-500 max-w-sm">
                      Try: "Create a modern button component" or "Build a responsive card with image"
                    </div>
                  </div>
                ) : (
                  selectedChat.messages.map((msg, idx) => {
                    const isUser = msg.user !== "Gemini";
                    
                    return (
                      <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] ${isUser ? 'ml-4' : 'mr-4'}`}>
                          <div className={`flex items-center gap-2 mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                              isUser 
                                ? 'bg-gradient-to-r from-blue-400 to-blue-600' 
                                : 'bg-gradient-to-r from-orange-400 to-orange-600'
                            }`}>
                              {isUser ? 'U' : 'AI'}
                            </div>
                            <span className="text-xs text-gray-400 font-medium">{msg.user}</span>
                          </div>
                          
                          <div className={`rounded-xl p-3 shadow-lg ${
                            isUser 
                              ? 'bg-gradient-to-r from-blue-600/20 to-blue-700/20 border border-blue-500/30' 
                              : 'bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-gray-600/30'
                          }`}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                code({node, inline, className, children, ...props}) {
                                  if (inline) {
                                    return (
                                      <code className="bg-gray-800 px-1 py-0.5 rounded text-orange-300 text-xs font-mono" {...props}>
                                        {children}
                                      </code>
                                    );
                                  }
                                  return null;
                                },
                                pre: () => null,
                                p: ({children}) => <p className="mb-2 last:mb-0 leading-relaxed text-sm">{children}</p>,
                                h1: ({children}) => <h1 className="text-lg font-bold mb-2 text-orange-300">{children}</h1>,
                                h2: ({children}) => <h2 className="text-base font-bold mb-2 text-orange-300">{children}</h2>,
                                h3: ({children}) => <h3 className="text-sm font-bold mb-1 text-orange-300">{children}</h3>,
                                ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1 text-sm">{children}</ul>,
                                ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1 text-sm">{children}</ol>,
                                strong: ({children}) => <strong className="font-semibold text-orange-300">{children}</strong>,
                              }}
                            >
                              {msg.content?.replace(/```[\s\S]*?```/g, '')}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          {/* Enhanced Input Area with Image Support */}
          <div className="p-4 pt-2 flex-shrink-0">
            {aiError && (
              <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-xs flex items-center gap-2">
                <span>❌</span>
                {aiError}
              </div>
            )}
            
            <form onSubmit={handleSend} className="w-full">
              <div className="bg-gradient-to-r from-[#2a2a2a] to-[#232323] rounded-xl border border-gray-600/50 shadow-xl">
                {/* Image Preview Area */}
                {selectedImages.length > 0 && (
                  <div className="p-3 border-b border-gray-600/50">
                    <div className="flex flex-wrap gap-2">
                      {selectedImages.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={img.dataUrl}
                            alt={img.name}
                            className="w-16 h-16 rounded-lg object-cover border border-gray-600"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg truncate">
                            {img.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Input Area */}
                <div className="flex items-end p-2">
                  <ImageUpload
                    onImageSelect={handleImageSelect}
                    selectedImages={selectedImages}
                    onRemoveImage={handleRemoveImage}
                  />
                  
                  <textarea
                    className="flex-1 bg-transparent border-none px-3 py-2 text-white placeholder-gray-400 focus:outline-none resize-none min-h-[40px] max-h-24 text-sm"
                    placeholder="Describe the component you want to create..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                    disabled={!session || aiLoading}
                    rows={1}
                  />
                  
                  <button
                    type="submit"
                    className={`ml-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 text-sm ${
                      (!session || aiLoading || !input.trim())
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 hover:scale-105 shadow-lg"
                    }`}
                    disabled={!session || aiLoading || !input.trim()}
                  >
                    {aiLoading ? (
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>AI</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span>Send</span>
                        <span>🚀</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </form>
            
            <div className="text-xs text-gray-500 text-center mt-2">
              Conversational AI • Last 5 messages sent as context • Upload images for reference
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4a5568;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #718096;
        }
      `}</style>
    </div>
  );
}

