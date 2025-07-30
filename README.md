# 🚀 Component & Multi-Component Generator Platform

## 📖 Overview

A stateful, AI-driven micro-frontend playground where authenticated users can iteratively generate, preview, tweak, and export React components with full chat history and code preservation across sessions.


## 🧰 Tech Stack

- **Frontend**: Next.js 14 with React 18
- **Authentication**: NextAuth.js with JWT sessions
- **Database**: MongoDB with Mongoose ODM
- **AI Integration**: OpenRouter API (gemini)
- **Styling**: Tailwind CSS
- **State Management**: React Context + useState/useReducer
- **Deployment**: Vercel
- **Code Highlighting**: Prism

## ✨ Features Implemented

### 🔐 Authentication & Persistence ✅
- **Secure Authentication**: Email/password signup and login using NextAuth.js
- **Session Management**: JWT-based sessions with secure password hashing
- **Previous Sessions**: Load and resume any saved work with full chat history
- **New Session Creation**: Initialize fresh workspace with clean state

### 💬 Conversational UI for Generation ✅
- **Side-panel Chat**: Text and image input support for AI prompts
- **AI Integration**: Real-time component generation using OpenRouter API
- **Live Preview**: Instant rendering of generated components in central viewport
- **Streaming Responses**: Real-time AI response streaming for better UX

### 📄 Code Inspection & Export ✅
- **Syntax Highlighting**: Tabbed interface showing JSX/TSX and CSS code
- **Copy Functionality**: One-click code copying to clipboard
- **Download Export**: Complete project download as ZIP file
- **Code Formatting**: Properly formatted and structured code output

### 🔄 Iterative Refinement ✅
- **Conversational Updates**: Refine components through natural language
- **Delta Application**: Smart patching of existing components
- **Version History**: Track changes across iterations
- **Context Preservation**: AI maintains context of previous generations

### 💾 Statefulness & Resume ✅
- **Auto-save**: Automatic saving after every chat turn and code change
- **Session Persistence**: Complete state restoration on login/reload
- **Full History Recovery**: Chat history, code, and preview state preserved
- **Graceful Error Recovery**: Robust error handling and state recovery

### 🎨 Chat-Driven Overrides ✅
- **Targeted Updates**: AI can modify specific elements or properties
- **Natural Language Edits**: "Make the button red" style commands
- **Contextual Understanding**: AI maintains component structure while applying changes

## 🏗️ Architecture

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   NextAuth.js   │    │    MongoDB      │
│                 │◄──►│                 │◄──►│                 │
│  - Pages/API    │    │  - JWT Sessions │    │  - User Data    │
│  - Components   │    │  - Auth Providers│   │  - Chat History │
│  - State Mgmt   │    │  - Middleware   │    │  - Components   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                              ▲
         ▼                                              │
┌─────────────────┐    ┌─────────────────┐             │
│  OpenRouter API │    │     Vercel      │             │
│                 │    │                 │             │
│  - LLM Models   │    │  - Hosting      │             │
│  - Completions  │    │  - Edge Runtime │             │
│  - Streaming    │    │  - Serverless   │─────────────┘
└─────────────────┘    └─────────────────┘
```


## 🔑 Key Technical Decisions

### 1. **Next.js Full-Stack Approach**
- **Why**: Simplified deployment, API routes, SSR capabilities
- **Trade-off**: Coupled frontend/backend vs microservices flexibility

### 2. **NextAuth.js for Authentication**
- **Why**: Production-ready, secure, extensible
- **Trade-off**: Opinionated structure vs custom implementation

### 3. **MongoDB for Persistence**
- **Why**: Flexible schema for evolving chat/component data
- **Trade-off**: Document queries vs SQL relationships

### 4. **Iframe Sandbox for Component Preview**
- **Why**: Security isolation, style encapsulation
- **Trade-off**: Communication complexity vs direct rendering

### 5. **Auto-save without Redis**
- **Why**: Simplified architecture, fewer dependencies
- **Trade-off**: Direct DB writes vs caching layer performance


## 🔮 Future Enhancements

### Phase 2 Features
- [ ] Interactive Property Editor with visual controls
- [ ] Multi-component project generation
- [ ] Component library and sharing
- [ ] Advanced code refactoring tools
- [ ] Team collaboration features
- [ ] Plugin system for custom AI models

### Performance Optimizations
- [ ] Redis caching layer
- [ ] Component preview optimization
- [ ] Database query optimization
- [ ] CDN integration for assets

## 🐛 Known Issues & Limitations

1. **Component Preview**: Complex components with external dependencies may not render
2. **Mobile Experience**: Optimized for desktop, mobile could be improved
3. **Large Sessions**: Performance may degrade with very large chat histories
4. **AI Hallucinations**: Generated code may occasionally have syntax errors


---

**Built with ❤️ using Next.js, MongoDB, and AI**