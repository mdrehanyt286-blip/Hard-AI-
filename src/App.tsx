/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Settings, 
  MessageSquare, 
  Mic, 
  Image as ImageIcon, 
  Newspaper, 
  Globe, 
  Send, 
  X,
  Volume2,
  VolumeX,
  Camera,
  History,
  Info,
  Menu,
  ChevronRight,
  Code,
  FileText,
  Upload,
  Link2,
  Copy,
  Check,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { AIOrb } from './components/AIOrb';
import { SUPPORTED_LANGUAGES, Message, VoiceMode, AppMode } from './types';
import { useSpeechRecognition, useSpeechSynthesis } from './hooks/useVoice';
import { generateAIResponse } from './lib/gemini';
import { cn } from './lib/utils';
import { CodeBlock } from './components/CodeBlock';

export default function App() {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(SUPPORTED_LANGUAGES[1]); // English default
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('female');
  const [appMode, setAppMode] = useState<AppMode>('both');
  const [autoVoice, setAutoVoice] = useState(true);
  const [codingMode, setCodingMode] = useState(false);
  const [unfilteredMode, setUnfilteredMode] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string; type: string } | null>(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');

  const scrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const genericFileInputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const { speak, stopSpeaking } = useSpeechSynthesis();
  
  useEffect(() => {
    localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  const appStatus = {
    hasKey: !!apiKey || !!process.env.GEMINI_API_KEY,
    mode: unfilteredMode ? 'Hacker' : codingMode ? 'Coder' : 'Standard'
  };

  const handleAIResponse = useCallback(async (text: string, image?: { data: string; mimeType: string }, file?: { name: string; content: string }) => {
    setIsProcessing(true);
    
    // Add user message to UI
    const userMsg: Message = {
      role: 'user',
      content: text,
      type: image ? 'image' : file ? 'file' : 'text',
      imageUrl: image?.data,
      fileName: file?.name,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await generateAIResponse(
        text, 
        selectedLanguage.name, 
        undefined, 
        image, 
        codingMode, 
        unfilteredMode, 
        file?.content,
        apiKey
      );
      
      const assistantMsg: Message = {
        role: 'assistant',
        content: response.text,
        type: 'text',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Speak if enabled
      if (autoVoice && (appMode === 'voice' || appMode === 'both')) {
        setIsSpeakingState(true);
        speak(response.text, voiceMode, selectedLanguage.code);
        setTimeout(() => setIsSpeakingState(false), response.text.length * 60 + 1000);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please check your connection or API key.",
        type: 'text',
        timestamp: Date.now()
      }]);
    } finally {
      setIsProcessing(false);
      setAttachedImage(null);
      setAttachedFile(null);
    }
  }, [selectedLanguage, autoVoice, appMode, voiceMode, speak, codingMode, unfilteredMode]);

  const { isListening, startListening, stopListening } = useSpeechRecognition(
    (text) => handleAIResponse(text),
    selectedLanguage.code
  );

  // Auto scroll logic
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current;
      scrollRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior
      });
    }
  }, []);

  const lastMessageCount = useRef(messages.length);
  useEffect(() => {
    // Only auto-scroll if a new message is added
    if (messages.length > lastMessageCount.current) {
      const lastMessage = messages[messages.length - 1];
      
      // If we are at the bottom OR it's a user message, scroll automatically
      // We use a slightly more generous check for "at bottom" here
      if (atBottom || lastMessage.role === 'user') {
        setTimeout(() => {
          scrollToBottom();
          setHasUnreadMessages(false);
        }, 100);
      } else {
        // If user is scrolled up, show unread indicator
        setHasUnreadMessages(true);
      }
      lastMessageCount.current = messages.length;
    }
  }, [messages, atBottom, scrollToBottom]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    // Tolerance for detecting "at bottom"
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 150;
    
    setAtBottom(isAtBottom);
    if (isAtBottom) {
      setHasUnreadMessages(false);
    }
  };

  const scrollToMessage = (index: number) => {
    messageRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setShowMobileSidebar(false);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() && !attachedImage && !attachedFile) return;
    
    const text = inputText || (attachedImage ? "Please analyze this image." : attachedFile ? `Please analyze the file "${attachedFile.name}".` : "");
    handleAIResponse(text, attachedImage || undefined, attachedFile || undefined);
    setInputText('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const data = readerEvent.target?.result as string;
        setAttachedImage({ data, mimeType: file.type });
        setAttachedFile(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const content = readerEvent.target?.result as string;
        setAttachedFile({ 
          name: file.name, 
          content: content, 
          type: file.type 
        });
        setAttachedImage(null);
      };
      reader.readAsText(file); // Reading as text for AI analysis
    }
  };

  const toggleVoiceMode = () => {
    if (isSpeakingState) {
      stopSpeaking();
      setIsSpeakingState(false);
    } else {
      // Re-speak last assistant message if possible
      const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
      if (lastAssistantMsg) {
        setIsSpeakingState(true);
        speak(lastAssistantMsg.content, voiceMode, selectedLanguage.code);
        setTimeout(() => setIsSpeakingState(false), lastAssistantMsg.content.length * 60 + 1000);
      }
    }
  };

  return (
    <div className="flex h-[100dvh] bg-[#0a0a0f] text-gray-100 overflow-hidden font-sans selection:bg-cyan-500/30" id="app-root">
      {/* Sidebar - Desktop & Mobile */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-[#0f0f18] border-r border-gray-800 flex-col transition-transform duration-300 md:relative md:translate-x-0 md:flex",
        showMobileSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )} id="sidebar">
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            <Globe className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">REHAN<span className="text-cyan-400">AI</span></h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section>
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 px-1">
              <History className="w-3.5 h-3.5 text-cyan-500/70" /> Recent Activity
            </h2>
            <div className="space-y-1.5 px-1">
              {messages.length === 0 ? (
                <p className="text-xs text-gray-600 italic px-2">No activity yet</p>
              ) : (
                messages.filter(m => m.role === 'user').slice(-5).map((m, i) => (
                  <button 
                    key={i} 
                    onClick={() => {
                      const idx = messages.findIndex(msg => msg.timestamp === m.timestamp);
                      if (idx !== -1) scrollToMessage(idx);
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-cyan-500/10 transition-all text-sm text-gray-400 truncate border border-transparent hover:border-cyan-500/20"
                  >
                    {m.content}
                  </button>
                ))
              )}
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 px-1">
              <Code className="w-3.5 h-3.5 text-amber-500/70" /> Expert Modes
            </h2>
            <div className="space-y-2.5 px-1">
              <button 
                onClick={() => setCodingMode(!codingMode)}
                className={cn(
                  "flex items-center justify-between w-full p-2.5 rounded-xl border transition-all group outline-none shadow-sm",
                  codingMode 
                    ? "bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-amber-900/10" 
                    : "bg-gray-800/30 border-gray-800 text-gray-400 hover:border-amber-500/50 hover:bg-amber-500/5"
                )}
              >
                <div className="flex items-center gap-3">
                   <Code className="w-4 h-4" />
                   <span className="text-sm font-semibold">Coding Expert</span>
                </div>
                <div className={cn("w-2 h-2 rounded-full", codingMode ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" : "bg-gray-700")} />
              </button>

              <button 
                onClick={() => setUnfilteredMode(!unfilteredMode)}
                className={cn(
                  "flex items-center justify-between w-full p-2.5 rounded-xl border transition-all group outline-none shadow-sm",
                  unfilteredMode 
                    ? "bg-purple-500/10 border-purple-500/50 text-purple-400 shadow-purple-900/10" 
                    : "bg-gray-800/30 border-gray-800 text-gray-400 hover:border-purple-500/50 hover:bg-purple-500/5"
                )}
              >
                <div className="flex items-center gap-3">
                   <Settings className="w-4 h-4" />
                   <span className="text-sm font-semibold">Unfiltered Mode</span>
                </div>
                <div className={cn("w-2 h-2 rounded-full", unfilteredMode ? "bg-purple-500 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.6)]" : "bg-gray-700")} />
              </button>

              <button 
                onClick={() => setShowSettings(true)}
                className="flex items-center justify-between w-full p-2.5 rounded-xl border border-gray-800 bg-gray-800/30 text-gray-400 hover:border-green-500/50 hover:bg-green-500/5 transition-all group outline-none shadow-sm"
              >
                <div className="flex items-center gap-3">
                   <Key className="w-4 h-4" />
                   <span className="text-sm font-semibold">API Settings</span>
                </div>
                <div className={cn("w-2 h-2 rounded-full", appStatus.hasKey ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]")} />
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Newspaper className="w-3 h-3" /> Quick News
            </h2>
            <div className="space-y-2">
              {['Tech', 'Sports', 'Global'].map((cat) => (
                <button 
                  key={cat}
                  onClick={() => handleAIResponse(`Tell me the latest ${cat} news summary.`, undefined)}
                  className="flex items-center justify-between w-full p-2 rounded border border-gray-800 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group"
                >
                  <span className="text-sm font-medium">{cat}</span>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-cyan-400" />
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-gray-800 space-y-2">
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium">Settings</span>
          </button>
          <div className="flex items-center gap-3 p-3 text-xs text-gray-500">
            <Info className="w-4 h-4" />
            <span>v2.4.0 Engine Active</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-gradient-to-b from-[#0a0a0f] to-[#12121a]" id="main-content">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-gray-800 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowMobileSidebar(!showMobileSidebar)}>
              <Menu className="w-6 h-6 text-gray-400" />
            </button>
            <h1 className="text-lg font-bold">REHAN<span className="text-cyan-400">AI</span></h1>
          </div>
          <button onClick={() => setShowSettings(true)}>
             <Settings className="w-6 h-6 text-gray-400" />
          </button>
        </header>

        {/* Sidebar Overlay */}
        <AnimatePresence>
          {showMobileSidebar && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileSidebar(false)}
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
            />
          )}
        </AnimatePresence>

        {/* View Mode: Voice vs Chat */}
        <div className={cn(
          "flex-1 flex flex-col items-center transition-all w-full min-h-0 overflow-hidden",
          appMode === 'voice' && !messages.length ? "justify-center" : "justify-start"
        )}>
          <AnimatePresence mode="wait">
            {appMode === 'voice' && !messages.length ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-12 text-center"
                id="voice-idle-view"
              >
                <div className="space-y-4">
                  <h2 className="text-4xl font-bold tracking-tight text-white mb-2 italic">How can I help you today?</h2>
                  <p className="text-gray-400 max-w-md mx-auto text-lg">Speak in Hindi, English, or 20+ other languages. Just tap the orb and start talking.</p>
                </div>
                
                <AIOrb 
                  isListening={isListening} 
                  isProcessing={isProcessing} 
                  isSpeaking={isSpeakingState}
                  onClick={isListening ? stopListening : startListening}
                />
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full flex-1 max-w-4xl flex flex-col min-h-0"
                id="chat-view"
              >
                {/* Chat Header Controls */}
                <div className="flex items-center justify-between mb-4 px-2">
                   <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                        </span>
                        <span className="text-[10px] font-bold text-cyan-500 tracking-widest uppercase">Live</span>
                      </div>
                      <div className="flex gap-1.5 overflow-hidden">
                        {codingMode && (
                          <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-tight whitespace-nowrap">
                            Expert
                          </span>
                        )}
                        {unfilteredMode && (
                          <span className="text-[10px] font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 animate-pulse uppercase tracking-tight whitespace-nowrap">
                            Unfiltered
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 hidden sm:inline">{selectedLanguage.name} • {voiceMode}</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <button 
                        onClick={toggleVoiceMode}
                        className={cn(
                          "p-2 rounded-full transition-all",
                          isSpeakingState ? "bg-cyan-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                        )}
                      >
                        {isSpeakingState ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                      </button>
                      <button 
                        onClick={() => setMessages([])} 
                        className="p-2 rounded-full bg-gray-800 text-gray-400 hover:text-red-400 transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                   </div>
                </div>

                {/* Message Log */}
                <div className="flex-1 relative overflow-hidden flex flex-col w-full h-full min-h-0">
                  <div 
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-x-hidden overflow-y-auto space-y-6 pb-10 pt-4 px-4 md:px-8 touch-pan-y overscroll-contain scroll-smooth"
                    id="message-log"
                  >
                    {messages.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
                        <MessageSquare className="w-16 h-16 text-cyan-500/50" />
                        <p>Start a conversation. You can type or speak.</p>
                      </div>
                    )}
                    {messages.map((msg, i) => (
                      <motion.div 
                        key={i}
                        ref={(el) => { messageRefs.current[i] = el; }}
                        initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "flex gap-4 p-5 rounded-2xl max-w-[95%] sm:max-w-[85%] shadow-lg transition-all",
                          msg.role === 'user' 
                            ? "ml-auto bg-gradient-to-br from-cyan-600/20 to-cyan-800/10 border border-cyan-500/30 backdrop-blur-sm self-end" 
                            : "mr-auto bg-gradient-to-br from-gray-800/60 to-gray-900/40 border border-gray-700/50 backdrop-blur-sm self-start"
                        )}
                      >
                        <div className="flex-1 space-y-2">
                          {msg.imageUrl && (
                            <img src={msg.imageUrl} alt="Uploaded" className="max-w-full rounded-lg mb-2 border border-gray-700" />
                          )}
                          {msg.fileName && (
                            <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10 mb-2">
                               <FileText className="w-5 h-5 text-amber-500" />
                               <span className="text-xs font-medium truncate">{msg.fileName}</span>
                            </div>
                          )}
                          <div className="prose prose-invert prose-p:leading-relaxed prose-sm max-w-none overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-cyan-500/20">
                            <ReactMarkdown
                              components={{
                                code({ node, inline, className, children, ...props }: any) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  return !inline && match ? (
                                    <CodeBlock
                                      language={match[1]}
                                      value={String(children).replace(/\n$/, '')}
                                      {...props}
                                    />
                                  ) : (
                                    <code className={cn("bg-gray-800 px-1.5 py-0.5 rounded text-cyan-400 font-mono text-xs", className)} {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                          <div className="text-[10px] text-gray-500 mt-2 font-mono">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {isProcessing && (
                      <div className="flex gap-4 p-4 mr-auto bg-gray-800/40 border border-gray-700/50 rounded-2xl">
                        <div className="flex gap-1">
                          {[1, 2, 3].map(i => (
                            <motion.div 
                              key={i}
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                              className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Scroll to Bottom Button */}
                  <AnimatePresence>
                    {(!atBottom || hasUnreadMessages) && messages.length > 0 && (
                      <motion.button
                        initial={{ opacity: 0, y: 10, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, scale: 0.8, x: '-50%' }}
                        onClick={() => {
                          scrollToBottom();
                          setHasUnreadMessages(false);
                        }}
                        className="absolute bottom-4 left-1/2 p-2 bg-cyan-600/80 backdrop-blur-md text-white rounded-full shadow-lg z-20 hover:bg-cyan-500 group"
                      >
                         <ChevronRight className="w-5 h-5 rotate-90" />
                         {hasUnreadMessages && (
                           <span className="absolute -top-1 -right-1 flex h-3 w-3">
                             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                             <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-white/20 shadow-sm"></span>
                           </span>
                         )}
                         {hasUnreadMessages && (
                           <motion.span 
                             initial={{ opacity: 0, y: 5 }}
                             animate={{ opacity: 1, y: 0 }}
                             className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-800 text-[10px] text-white px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                             New message
                           </motion.span>
                         )}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Bar Area */}
        <div className={cn(
          "relative w-full bg-[#0a0a0f] border-t border-gray-800/50 p-2 sm:p-4 md:p-8 z-30 shrink-0",
          appMode === 'voice' && !messages.length ? "hidden" : "block"
        )}>
          <div className="max-w-4xl mx-auto px-1 sm:px-0">
            <div className="flex flex-wrap gap-2 mb-2 px-1">
              {attachedImage && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 p-2 bg-gray-800 rounded-lg border border-cyan-500/30"
                >
                  <img src={attachedImage.data} className="w-12 h-12 rounded object-cover" />
                  <span className="text-xs font-medium text-cyan-400">Image Ready</span>
                  <button onClick={() => setAttachedImage(null)} className="p-1 hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
              {attachedFile && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 p-2 bg-gray-800 rounded-lg border border-amber-500/30"
                >
                  <div className="w-12 h-12 flex items-center justify-center bg-amber-500/10 rounded">
                    <FileText className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-amber-400 truncate max-w-[120px]">{attachedFile.name}</span>
                    <span className="text-[10px] text-gray-500">File Ready</span>
                  </div>
                  <button onClick={() => setAttachedFile(null)} className="p-1 hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </div>
            
            <form onSubmit={handleSendMessage} className="relative flex items-center gap-1.5 sm:gap-2 bg-[#1a1a25]/90 backdrop-blur-xl rounded-[2rem] p-1.5 pl-3 sm:p-2 sm:pl-4 border border-gray-700/50 hover:border-cyan-500/50 focus-within:border-cyan-500/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all group/form mb-4 border-b-4 border-b-cyan-500/20">
              <div className="flex items-center gap-1">
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-cyan-400 transition-all hover:scale-110 active:scale-95 flex"
                  title="Upload Image"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <button 
                  type="button" 
                  onClick={() => genericFileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-amber-400 transition-all hover:scale-110 active:scale-95 flex"
                  title="Upload File"
                >
                  <Upload className="w-5 h-4 sm:h-5" />
                </button>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
              <input 
                type="file" 
                ref={genericFileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isListening ? "Listening..." : "Ask me..."}
                className="flex-1 min-w-0 bg-transparent border-none focus:ring-0 text-white text-[16px] placeholder-gray-500 py-2 sm:py-3 px-1"
              />
              
              <div className="flex items-center gap-1.5 shrink-0 pr-1">
                <button 
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={cn(
                    "p-2 sm:p-2.5 rounded-full transition-all flex-shrink-0",
                    isListening ? "bg-red-500 text-white animate-pulse" : "bg-gray-800/50 text-gray-400 hover:text-white"
                  )}
                >
                  <Mic className="w-5 h-5" />
                </button>
                <button 
                  type="submit"
                  disabled={!inputText.trim() && !attachedImage && !attachedFile}
                  className={cn(
                    "p-2 sm:p-2.5 rounded-full transition-all flex-shrink-0 shadow-lg border",
                    !inputText.trim() && !attachedImage && !attachedFile 
                      ? "bg-gray-800/50 border-gray-700/50 text-gray-500 cursor-not-allowed opacity-50 shadow-none" 
                      : "bg-gradient-to-tr from-cyan-600 to-blue-500 border-cyan-400/50 text-white hover:brightness-110 hover:scale-110 active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.5)]"
                  )}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#14141d] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-cyan-500" />
                  AI Configuration
                </h2>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
                {/* Language Select */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block">Interaction Language</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setSelectedLanguage(lang)}
                        className={cn(
                          "px-3 py-2 rounded-xl text-sm font-medium border transition-all text-left",
                          selectedLanguage.code === lang.code 
                            ? "bg-cyan-500/10 border-cyan-500 text-cyan-400" 
                            : "bg-[#1a1a25] border-gray-700 text-gray-400 hover:border-gray-500"
                        )}
                      >
                        <div className="text-[10px] opacity-70 mb-0.5">{lang.name}</div>
                        <div>{lang.nativeName}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block">Voice Personality</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setVoiceMode('male')}
                      className={cn(
                        "flex-1 p-4 rounded-2xl border transition-all flex flex-col items-center gap-2",
                        voiceMode === 'male' ? "bg-cyan-500/10 border-cyan-500 text-cyan-400" : "bg-[#1a1a25] border-gray-700 text-gray-400"
                      )}
                    >
                      <Mic className="w-6 h-6" />
                      <span className="font-bold">Male Agent</span>
                    </button>
                    <button 
                      onClick={() => setVoiceMode('female')}
                      className={cn(
                        "flex-1 p-4 rounded-2xl border transition-all flex flex-col items-center gap-2",
                        voiceMode === 'female' ? "bg-cyan-500/10 border-cyan-500 text-cyan-400" : "bg-[#1a1a25] border-gray-700 text-gray-400"
                      )}
                    >
                      <Mic className="w-6 h-6" />
                      <span className="font-bold">Female Agent</span>
                    </button>
                  </div>
                </div>

                {/* App Mode */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block">Interface Mode</label>
                  <div className="flex gap-2">
                    {['chat', 'voice', 'both'].map((mode) => (
                      <button 
                        key={mode}
                        onClick={() => setAppMode(mode as AppMode)}
                        className={cn(
                          "flex-1 p-3 rounded-xl border capitalize transition-all",
                          appMode === mode ? "bg-cyan-500/10 border-cyan-500 text-cyan-400" : "bg-[#1a1a25] border-gray-700 text-gray-400"
                        )}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-800 space-y-4">
                  <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-800 space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Environment Status</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Server API Key</span>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold uppercase", process.env.GEMINI_API_KEY ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>
                        {process.env.GEMINI_API_KEY ? 'Detected' : 'Missing'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Key className="w-3 h-3" /> Gemini API Token
                    </label>
                    <div className="relative">
                      <input 
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Paste your Gemini API key here..."
                        className="w-full bg-[#1a1a25] border border-gray-700 rounded-xl px-4 py-3 text-sm focus:border-cyan-500 outline-none transition-all placeholder:text-gray-600"
                      />
                      {apiKey && (
                        <button 
                          onClick={() => setApiKey('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:text-red-400 text-gray-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 px-1">
                      Token is stored locally in your browser. If not provided, the default server key will be used (if available).
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Unfiltered Mode (Hacker Persona)</p>
                      <p className="text-sm text-gray-500">No filters, hacker personality</p>
                    </div>
                    <button 
                      onClick={() => setUnfilteredMode(!unfilteredMode)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        unfilteredMode ? "bg-red-500" : "bg-gray-700"
                      )}
                    >
                      <motion.div 
                        animate={{ x: unfilteredMode ? 26 : 2 }}
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-Voice Response</p>
                      <p className="text-sm text-gray-500">Automatically speak answers</p>
                    </div>
                    <button 
                      onClick={() => setAutoVoice(!autoVoice)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        autoVoice ? "bg-cyan-500" : "bg-gray-700"
                      )}
                    >
                      <motion.div 
                        animate={{ x: autoVoice ? 26 : 2 }}
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-black/20 border-t border-gray-800">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 rounded-2xl font-bold shadow-lg shadow-cyan-900/20 transition-all"
                >
                  Apply Configuration
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
