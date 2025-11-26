
import { GoogleGenAI } from "@google/genai";
import { Audit, ChecklistSubmission, Incident } from '../types';

const BACKEND_URL = 'http://localhost:3001';

/**
 * CLIENT-SIDE GENERATION (Fallback/Demo Mode)
 * WARNING: This exposes the API key in the network tab. Use only for development.
 */
const generateViaClient = async (prompt: string): Promise<string> => {
    console.warn("⚠️ Using Client-Side AI (Insecure). Ensure a Backend is running for production.");
    const apiKey = process.env.API_KEY;
    
    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
        throw new Error("API Key is missing or invalid. Please set a valid key in .env or start the backend server.");
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || '';
    } catch (error) {
        console.error("Client-Side AI Error:", error);
        throw error;
    }
};

/**
 * SERVER-SIDE GENERATION (Secure Mode)
 * Proxies the request to the Node.js backend.
 */
const generateViaBackend = async (prompt: string): Promise<string> => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/ai/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}`);
        }

        const data = await response.json();
        return data.text;
    } catch (error) {
        console.warn("Backend connection failed. Falling back to client-side...", error);
        // Fallback to client-side if backend is unreachable
        return generateViaClient(prompt);
    }
};

/**
 * Checks if the backend is reachable.
 */
export const checkBackendHealth = async (): Promise<boolean> => {
    try {
        const res = await fetch(`${BACKEND_URL}/api/health`, { method: 'GET', signal: AbortSignal.timeout(2000) });
        return res.ok;
    } catch {
        return false;
    }
};

/**
 * Main entry point for generating content.
 * Automatically selects the best method (Server vs Client).
 */
const generateContent = async (prompt: string): Promise<string> => {
    // Try Backend First
    return generateViaBackend(prompt).catch(err => {
         let errorMessage = "An unexpected error occurred while contacting the AI service.";
        if (err instanceof Error) {
             errorMessage = `### AI Service Error\n${err.message}`;
        }
        return errorMessage;
    });
};

export interface BiReportData {
    kpis: {
        complianceScore: string;
        openCapas: number;
        avgCapaClosureDays: string;
        incidentRate: string;
    };
    regionalCompliance: { name: string; compliance: number }[];
    incidentDistribution: { name: string; value: number }[];
    submissions: ChecklistSubmission[];
    audits: Audit[];
    incidents: Incident[];
}

/**
 * Generates a Business Intelligence report based on dashboard data.
 * @param data The structured data from the BI dashboard.
 * @returns A Markdown-formatted string with insights and analysis.
 */
export const generateBiReport = async (data: BiReportData): Promise<string> => {
    const prompt = `
        You are an expert Business Intelligence analyst for a network of fuel stations. 
        Your task is to provide a concise, data-driven executive summary in Markdown format based on the following JSON data.

        **Data Snapshot:**
        \`\`\`json
        ${JSON.stringify({ kpis: data.kpis, regionalCompliance: data.regionalCompliance, incidentDistribution: data.incidentDistribution }, null, 2)}
        \`\`\`

        **Instructions:**
        1.  **Start with an Executive Summary:** A single, powerful paragraph that summarizes the overall performance, mentioning the key KPIs (compliance, open CAPAs, incident rate).
        2.  **Identify Key Insights:**
            -   Analyze the regional compliance data. Which region is the top performer and which is lagging?
            -   Look at the incident distribution. What is the most common type of incident?
            -   Comment on the average time to close corrective actions. Is it efficient?
        3.  **Provide Actionable Recommendations:** Based on your analysis, suggest 2-3 specific, actionable recommendations. For example: "Focus training resources on Region X to improve their compliance score" or "Investigate the root cause of the high number of 'Spill' incidents."
        4.  **Keep it Professional and Concise:** The target audience is senior management. Use clear headings, bullet points, and bold text to structure your report for readability.
    `;

    return generateContent(prompt);
};
