
import React, { useState } from 'react';
import { generateEmbeddings } from '../../services/ollamaService';
import { Vector } from '../../types';

interface KnowledgeBaseSettingsProps {
    onUpdateVectorStore: (vectorStore: Vector[]) => void;
}

const KnowledgeBaseSettings: React.FC<KnowledgeBaseSettingsProps> = ({ onUpdateVectorStore }) => {
    const [knowledgeBaseText, setKnowledgeBaseText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Paste your company\'s audit standards, safety manuals, or any other compliance documents below.');

    const handleIngest = async () => {
        if (!knowledgeBaseText.trim()) {
            setStatusMessage('Error: Knowledge base content cannot be empty.');
            return;
        }
        setIsLoading(true);
        setStatusMessage('Ingesting knowledge... This may take a few moments.');
        
        try {
            // Simple text splitting by paragraphs
            const chunks = knowledgeBaseText.split(/\n\s*\n/).filter(chunk => chunk.trim().length > 10);
            if (chunks.length === 0) {
                setStatusMessage('Error: No valid text chunks found. Try adding more content or paragraphs.');
                setIsLoading(false);
                return;
            }
            
            setStatusMessage(`Found ${chunks.length} chunks. Generating embeddings...`);

            const newVectors: Vector[] = [];
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                 setStatusMessage(`Embedding chunk ${i + 1} of ${chunks.length}...`);
                const embedding = await generateEmbeddings(chunk);
                newVectors.push({ content: chunk, embedding });
            }

            onUpdateVectorStore(newVectors);
            setStatusMessage(`Success! ${newVectors.length} documents embedded. The Audit Guru is now updated.`);
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setStatusMessage(`Error during ingestion: ${errorMessage}. Please check your Ollama setup and ensure the 'nomic-embed-text' model is available.`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-xl font-semibold">Audit Guru Knowledge Base</h4>
            </div>
            <p className="text-slate-600 mb-4 text-sm">
                This tool allows you to update the knowledge base for the "Audit Guru" chatbot. The agent will use this text to answer questions about compliance and company standards.
                This process happens locally in your browser and requires Ollama to be running with the `nomic-embed-text` model.
            </p>
            <textarea
                value={knowledgeBaseText}
                onChange={e => setKnowledgeBaseText(e.target.value)}
                placeholder="Paste your company standards here..."
                rows={15}
                className="w-full p-2 border rounded-md shadow-sm bg-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
                disabled={isLoading}
            />
            <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-slate-700 font-medium">{statusMessage}</p>
                <button
                    onClick={handleIngest}
                    disabled={isLoading}
                    className="px-6 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:bg-slate-400 flex items-center"
                >
                    {isLoading ? 'Ingesting...' : 'Update Knowledge Base'}
                </button>
            </div>
        </div>
    );
};

export default KnowledgeBaseSettings;
