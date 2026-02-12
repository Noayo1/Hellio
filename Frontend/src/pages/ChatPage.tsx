import { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import type { ChatMessage, ChatTrace } from '../types';

const SAMPLE_QUESTIONS = [
  'List open position counts by department',
  'Which positions do not have any candidates?',
  'Which positions have more than 2 candidates?',
  'List all candidates with Kubernetes experience',
];

const STORAGE_KEY = 'chat-messages';

export default function ChatPage() {
  // Load messages from sessionStorage on mount
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

  // Save messages to sessionStorage when they change
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleClearChat = () => {
    setMessages([]);
    setExpandedTraces(new Set());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');

    // Add user message
    const userMessage: ChatMessage = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await api.sendChatMessage(question);

      // Add assistant message
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

  const handleSampleQuestion = (question: string) => {
    setInput(question);
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
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="mb-4 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Chat with your data</h1>
          <p className="text-gray-500 mt-1">
            Ask questions about candidates and positions in natural language
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Clear conversation
          </button>
        )}
      </div>

      {/* Sample questions */}
      {messages.length === 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2">Try these questions:</p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSampleQuestion(q)}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((msg, index) => (
          <MessageBubble
            key={index}
            message={msg}
            isExpanded={expandedTraces.has(index)}
            onToggleTrace={() => toggleTrace(index)}
          />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full" />
            <span>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about candidates or positions..."
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </form>
    </div>
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
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-600 text-white'
            : message.error
              ? 'bg-red-50 border border-red-200'
              : 'bg-gray-100 text-gray-900'
        }`}
      >
        {/* Error message */}
        {message.error && (
          <div className="text-red-600 font-medium">{message.error}</div>
        )}

        {/* Suggestion */}
        {message.suggestion && (
          <div className="text-gray-500 text-sm mt-1">{message.suggestion}</div>
        )}

        {/* Content */}
        {message.content && (
          <div className={isUser ? '' : 'whitespace-pre-wrap'}>{message.content}</div>
        )}

        {/* Trace toggle */}
        {message.trace && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <button
              onClick={onToggleTrace}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
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

interface TraceViewProps {
  trace: ChatTrace;
}

function TraceView({ trace }: TraceViewProps) {
  return (
    <div className="mt-2 space-y-2 text-sm">
      {/* SQL Query */}
      <div>
        <div className="font-medium text-gray-700">SQL Query:</div>
        <pre className="bg-gray-800 text-green-400 p-2 rounded text-xs overflow-x-auto">
          {trace.sql}
        </pre>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-gray-500">
        <span>Rows: {trace.rowCount}</span>
        <span>Time: {trace.executionTimeMs}ms</span>
      </div>

      {/* Results table */}
      {trace.rows.length > 0 && (
        <div>
          <div className="font-medium text-gray-700">Results:</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border border-gray-200 rounded">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(trace.rows[0] as object).map((key) => (
                    <th key={key} className="px-2 py-1 text-left font-medium text-gray-600 border-b">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trace.rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {Object.values(row as object).map((val, j) => (
                      <td key={j} className="px-2 py-1 border-b border-gray-100">
                        {val === null ? <span className="text-gray-400">null</span> : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {trace.rows.length > 10 && (
              <div className="text-gray-500 text-xs mt-1">
                Showing 10 of {trace.rows.length} rows
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
