
import React, { useState, useRef, useEffect } from 'react';
import { generateEmbeddings, generateWithOllama } from '../../services/ollamaService';
import { ICONS } from '../../constants';
import { Vector } from '../../types';

type Message = {
    role: 'user' | 'agent';
    content: string;
};

// Helper function to calculate cosine similarity between two vectors
const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }
    return dotProduct / (magnitudeA * magnitudeB);
};

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
    vectorStore: Vector[];
}

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose, vectorStore }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const isReady = vectorStore.length > 0;

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([
                { 
                    role: 'agent', 
                    content: isReady 
                        ? "Hello! I'm Audit Guru. How can I help you with compliance and company standards today?"
                        : "Hello! My knowledge base isn't set up yet. An administrator needs to add company documents in the Settings area before I can answer questions."
                }
            ]);
        }
    }, [isOpen, isReady, messages.length]);

    const handleQuerySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || isLoading || !isReady) return;

        const userMessage: Message = { role: 'user', content: query };
        setMessages(prev => [...prev, userMessage]);
        setQuery('');
        setIsLoading(true);

        try {
            // 1. Embed the user's query
            const queryEmbedding = await generateEmbeddings(query);

            // 2. Find the most relevant chunks from the vector store
            const rankedChunks = vectorStore.map(vector => ({
                ...vector,
                similarity: cosineSimilarity(queryEmbedding, vector.embedding),
            })).sort((a, b) => b.similarity - a.similarity);

            const topK = 3;
            const context = rankedChunks.slice(0, topK).map(chunk => chunk.content).join('\n---\n');

            // 3. Construct the prompt
            const prompt = `
                You are "Audit Guru," an expert assistant.
                Based *only* on the context provided below, answer the user's question.
                If the answer is not found in the context, say "I could not find information about that in the provided documents."

                **Context:**
                ${context}

                **User's Question:**
                ${query}
            `;

            // 4. Generate the response
            const response = await generateWithOllama(prompt);
            setMessages(prev => [...prev, { role: 'agent', content: response }]);
        } catch (error) {
            console.error(error);
             const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setMessages(prev => [...prev, { role: 'agent', content: `Sorry, I encountered an error: ${errorMessage}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end print:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className={`bg-white w-full max-w-md h-full flex flex-col shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b bg-slate-50 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 text-white flex items-center justify-center flex-shrink-0">
                            {React.cloneElement(ICONS.owl, {className: "w-6 h-6"})}
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Audit Guru</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 p-1 rounded-full">
                        {React.cloneElement(ICONS.close, { className: "w-6 h-6" })}
                    </button>
                </div>

                {/* Chat messages */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'agent' && <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center flex-shrink-0">{React.cloneElement(ICONS.owl, {className: "w-5 h-5"})}</div>}
                            <div className={`max-w-xl p-3 rounded-lg ${msg.role === 'agent' ? 'bg-slate-100 text-slate-800' : 'bg-blue-600 text-white'}`}>
                                <p className="text-sm" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br />') }}></p>
                            </div>
                        </div>
                    ))}
                    {isLoading && messages.length > 0 && messages[messages.length-1].role === 'user' && (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center flex-shrink-0">{React.cloneElement(ICONS.owl, {className: "w-5 h-5"})}</div>
                            <div className="max-w-xl p-3 rounded-lg bg-slate-100 text-slate-800">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse"></div>
                                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Chat input form */}
                <div className="p-4 border-t bg-slate-50 flex-shrink-0">
                    <form onSubmit={handleQuerySubmit} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder={isReady ? "Ask about compliance..." : "Knowledge base not configured"}
                            className="flex-1 p-2 border rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100"
                            disabled={isLoading || !isReady}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !query.trim() || !isReady}
                            className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:bg-slate-400"
                        >
                            Send
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Chatbot;
