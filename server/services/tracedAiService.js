import { GoogleGenAI } from '@google/genai';
import { withSpan, addSpanAttributes, recordException, addSpanEvent } from '../utils/tracing.js';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateAIContent = async (prompt, options = {}) => {
    return await withSpan(
        'ai.generate_content',
        {
            'ai.provider': 'google',
            'ai.model': options.model || 'gemini-2.5-flash',
            'ai.operation': 'generate_content',
            'ai.prompt_length': prompt.length
        },
        async (span) => {
            const model = options.model || 'gemini-2.5-flash';
            const startTime = Date.now();

            try {
                addSpanEvent('ai_request_started', {
                    model,
                    promptLength: prompt.length
                });

                const response = await ai.models.generateContent({
                    model,
                    contents: prompt,
                });

                const duration = Date.now() - startTime;
                const responseText = response.text;

                span.setAttribute('ai.response_length', responseText.length);
                span.setAttribute('ai.duration_ms', duration);
                span.setAttribute('ai.success', true);

                addSpanEvent('ai_response_received', {
                    responseLength: responseText.length,
                    duration
                });

                return { text: responseText };
            } catch (error) {
                const duration = Date.now() - startTime;
                
                span.setAttribute('ai.duration_ms', duration);
                span.setAttribute('ai.success', false);
                span.setAttribute('ai.error', error.message);

                recordException(error, {
                    'ai.provider': 'google',
                    'ai.model': model,
                    'ai.prompt_length': prompt.length
                });

                console.error("AI Service Error:", error);
                throw new Error("AI Service unavailable");
            }
        }
    );
};

export const generateAIContentStream = async (prompt, options = {}) => {
    return await withSpan(
        'ai.generate_content_stream',
        {
            'ai.provider': 'google',
            'ai.model': options.model || 'gemini-2.5-flash',
            'ai.operation': 'generate_content_stream',
            'ai.prompt_length': prompt.length,
            'ai.streaming': true
        },
        async (span) => {
            const model = options.model || 'gemini-2.5-flash';

            try {
                addSpanEvent('ai_stream_request_started', {
                    model,
                    promptLength: prompt.length
                });

                const stream = await ai.models.generateContentStream({
                    model,
                    contents: prompt,
                });

                span.setAttribute('ai.success', true);
                addSpanEvent('ai_stream_initiated');

                return stream;
            } catch (error) {
                span.setAttribute('ai.success', false);
                span.setAttribute('ai.error', error.message);

                recordException(error, {
                    'ai.provider': 'google',
                    'ai.model': model,
                    'ai.prompt_length': prompt.length,
                    'ai.streaming': true
                });

                console.error("AI Streaming Service Error:", error);
                throw new Error("AI Streaming Service unavailable");
            }
        }
    );
};
