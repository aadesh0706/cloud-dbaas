import React, { useState, useRef, useEffect } from 'react';
import { 
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  CommandLineIcon,
  CircleStackIcon,
  EyeIcon,
  LinkIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { aiAssistantAPI } from '../services/api';
import toast from 'react-hot-toast';

const AIAssistantChat = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [capabilities, setCapabilities] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadCapabilities();
      addWelcomeMessage();
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadCapabilities = async () => {
    try {
      const caps = await aiAssistantAPI.getCapabilities();
      setCapabilities(caps);
    } catch (error) {
      console.error('Failed to load capabilities:', error);
    }
  };

  const addWelcomeMessage = () => {
    const welcomeMessage = {
      id: Date.now(),
      type: 'assistant',
      content: `👋 Hi! I'm your AI Database Assistant. I can help you:

🗄️ **Create databases** - "Create a MySQL database for my blog"
📊 **Explore schemas** - "Show me my users table structure"  
🔍 **Query data** - "Find users who signed up this month"
🔗 **Generate code** - "How do I connect from Node.js?"
⚡ **Optimize performance** - "Why is my database slow?"

What would you like to do today?`,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await aiAssistantAPI.chat(currentMessage);
      
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: response.message || 'I processed your request!',
        data: response.database || response.schema || response.connectionInfo,
        codeExamples: response.codeExamples,
        nextSteps: response.nextSteps,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (response.success && response.database) {
        toast.success(`Database "${response.database.name}" created successfully!`);
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: '❌ I encountered an error processing your request. Please try again or contact support.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('AI Assistant error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderMessage = (message) => {
    const isUser = message.type === 'user';
    
    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isUser 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-100 text-gray-800 border'
        }`}>
          {!isUser && (
            <div className="flex items-center mb-2">
              <SparklesIcon className="h-4 w-4 text-blue-500 mr-1" />
              <span className="text-xs font-medium text-gray-600">AI Assistant</span>
            </div>
          )}
          
          <div className="whitespace-pre-wrap text-sm">
            {message.content}
          </div>

          {/* Render database info */}
          {message.data && message.data.id && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center mb-2">
                <CircleStackIcon className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-sm font-medium text-green-800">Database Created</span>
              </div>
              <div className="text-xs space-y-1 text-gray-700">
                <div><strong>Name:</strong> {message.data.name}</div>
                <div><strong>Engine:</strong> {message.data.engine} {message.data.version}</div>
                <div><strong>ID:</strong> {message.data.id}</div>
              </div>
            </div>
          )}

          {/* Render connection info */}
          {message.data && message.data.connectionString && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center mb-2">
                <LinkIcon className="h-4 w-4 text-blue-600 mr-1" />
                <span className="text-sm font-medium text-blue-800">Connection Details</span>
              </div>
              <div className="text-xs font-mono bg-gray-800 text-green-400 p-2 rounded">
                {message.data.connectionString}
              </div>
            </div>
          )}

          {/* Render code examples */}
          {message.codeExamples && (
            <div className="mt-3 p-3 bg-gray-50 border rounded-lg">
              <div className="flex items-center mb-2">
                <CommandLineIcon className="h-4 w-4 text-gray-600 mr-1" />
                <span className="text-sm font-medium text-gray-800">Code Examples</span>
              </div>
              {Object.entries(message.codeExamples).map(([lang, code]) => (
                <div key={lang} className="mb-2">
                  <div className="text-xs font-medium text-gray-600 mb-1">{lang.toUpperCase()}</div>
                  <pre className="text-xs bg-gray-800 text-green-400 p-2 rounded overflow-x-auto">
                    {code}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {/* Render next steps */}
          {message.nextSteps && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center mb-2">
                <ChartBarIcon className="h-4 w-4 text-yellow-600 mr-1" />
                <span className="text-sm font-medium text-yellow-800">Next Steps</span>
              </div>
              <ul className="text-xs space-y-1 text-gray-700">
                {message.nextSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="mr-2">•</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-xs text-gray-500 mt-2">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  const quickPrompts = [
    "Create a MySQL database for my blog",
    "Show me all my database schemas", 
    "How do I connect from Node.js?",
    "Create a PostgreSQL database for analytics"
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-3/4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center">
            <SparklesIcon className="h-6 w-6 text-blue-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">AI Database Assistant</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map(renderMessage)}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-100 px-4 py-2 rounded-lg border">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                  <span className="text-sm text-gray-600">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        {messages.length <= 1 && (
          <div className="p-4 border-t border-gray-100">
            <div className="text-xs text-gray-600 mb-2">Quick actions:</div>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputMessage(prompt)}
                  className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your databases..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows="2"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantChat;
