import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { ChatMessage, ChatTrace } from '../types';

const SAMPLE_QUESTIONS = [
  'Positions without candidates?',
  'Candidates with Kubernetes?',
  'Which positions have salary above 15K?',
];

const STORAGE_KEY = 'chat-messages';
const HEIGHT_STORAGE_KEY = 'chat-height';
const DEFAULT_HEIGHT = 500;
const MIN_HEIGHT = 300;
const MAX_HEIGHT = 800;

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedTraces, setExpandedTraces] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Resizing state
  const [height, setHeight] = useState(() => {
    const saved = sessionStorage.getItem(HEIGHT_STORAGE_KEY);
    return saved ? Math.min(Math.max(parseInt(saved, 10), MIN_HEIGHT), MAX_HEIGHT) : DEFAULT_HEIGHT;
  });
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Save messages to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Save height to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(HEIGHT_STORAGE_KEY, String(height));
  }, [height]);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;
      const panelRect = panelRef.current.getBoundingClientRect();
      const newHeight = panelRect.bottom - e.clientY;
      setHeight(Math.min(Math.max(newHeight, MIN_HEIGHT), MAX_HEIGHT));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleClearChat = () => {
    setMessages([]);
    setExpandedTraces(new Set());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');

    const userMessage: ChatMessage = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await api.sendChatMessage(question);
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.answer || '',
        trace: response.trace,
        error: response.error,
        suggestion: response.suggestion,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        error: err instanceof Error ? err.message : 'Failed to send message',
        suggestion: 'Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const toggleTrace = (index: number) => {
    setExpandedTraces((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? 'bg-gray-600 hover:bg-gray-700 rotate-0'
            : 'bg-purple-600 hover:bg-purple-700 hover:scale-110'
        }`}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
        {/* Unread indicator */}
        {!isOpen && messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {messages.filter(m => m.role === 'assistant').length}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      <div
        ref={panelRef}
        className={`fixed bottom-24 right-6 z-50 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col origin-bottom-right ${
          isOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none'
        } ${isResizing ? '' : 'transition-all duration-300'}`}
        style={{ height: `${height}px`, maxHeight: 'calc(100vh - 150px)' }}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute -top-1 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center group"
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full group-hover:bg-purple-400 transition-colors" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-purple-600 to-purple-700 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="font-semibold text-white">Ask Questions</span>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="text-white/70 hover:text-white text-sm"
            >
              Clear
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="text-gray-300 mb-3">
                <svg className="w-10 h-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm mb-3">Ask about your data:</p>
              <div className="flex flex-col gap-1.5 w-full">
                {SAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="px-3 py-2 text-xs bg-gray-100 hover:bg-purple-100 hover:text-purple-700 text-gray-600 rounded-lg transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <MessageBubble
              key={index}
              message={msg}
              isExpanded={expandedTraces.has(index)}
              onToggleTrace={() => toggleTrace(index)}
            />
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <div className="animate-spin h-3 w-3 border-2 border-gray-300 border-t-purple-500 rounded-full" />
              <span>Thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 p-3 bg-gray-50 rounded-b-2xl">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              disabled={loading}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 bg-white"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  isExpanded: boolean;
  onToggleTrace: () => void;
}

function MessageBubble({ message, isExpanded, onToggleTrace }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
          isUser
            ? 'bg-purple-600 text-white rounded-br-sm'
            : message.error
              ? 'bg-red-50 border border-red-200 rounded-bl-sm'
              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        }`}
      >
        {message.error && (
          <div className="text-red-600 font-medium text-xs">{message.error}</div>
        )}
        {message.suggestion && (
          <div className="text-gray-500 text-xs mt-0.5">{message.suggestion}</div>
        )}
        {message.content && (
          <div className={`${isUser ? '' : 'whitespace-pre-wrap'}`}>{message.content}</div>
        )}
        {message.trace && (
          <div className="mt-1.5 pt-1.5 border-t border-gray-300/30">
            <button
              onClick={onToggleTrace}
              className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
            >
              {isExpanded ? '▼' : '▶'} View trace ({message.trace.rowCount} rows)
            </button>
            {isExpanded && <TraceView trace={message.trace} />}
          </div>
        )}
      </div>
    </div>
  );
}

function TraceView({ trace }: { trace: ChatTrace }) {
  return (
    <div className="mt-1.5 space-y-1.5 text-xs">
      <div>
        <div className="font-medium text-gray-600">SQL:</div>
        <pre className="bg-gray-800 text-green-400 p-1.5 rounded text-[10px] overflow-x-auto max-h-20">
          {trace.sql}
        </pre>
      </div>
      <div className="flex gap-3 text-gray-500">
        <span>Rows: {trace.rowCount}</span>
        <span>Time: {trace.executionTimeMs}ms</span>
      </div>
      {trace.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-[10px] border border-gray-200 rounded">
            <thead className="bg-gray-50">
              <tr>
                {Object.keys(trace.rows[0] as object).map((key) => (
                  <th key={key} className="px-1.5 py-0.5 text-left font-medium text-gray-600 border-b">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trace.rows.slice(0, 5).map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {Object.values(row as object).map((val, j) => (
                    <td key={j} className="px-1.5 py-0.5 border-b border-gray-100 truncate max-w-[100px]">
                      {val === null ? <span className="text-gray-400">null</span> : String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {trace.rows.length > 5 && (
            <div className="text-gray-500 text-[10px] mt-0.5">
              +{trace.rows.length - 5} more rows
            </div>
          )}
        </div>
      )}
    </div>
  );
}
