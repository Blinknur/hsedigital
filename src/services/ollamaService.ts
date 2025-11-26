
import { User, UserRole, Station, Audit, ChecklistSubmission, Incident } from '../types';

/**
 * Generates embeddings for a given piece of text using a local Ollama instance.
 * @param text The text to embed.
 * @returns The embedding vector (an array of numbers).
 */
const generateEmbeddings = async (text: string): Promise<number[]> => {
    const OLLAMA_ENDPOINT = 'http://localhost:11434/api/embeddings';
    const OLLAMA_MODEL = 'nomic-embed-text'; // A common model for embeddings

    try {
        const response = await fetch(OLLAMA_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: text,
            }),
        });
        
        if (!response.ok) {
            throw new Error(`Ollama embeddings API responded with status ${response.status}.`);
        }
        
        const data = await response.json();
        return data.embedding;
    } catch (error) {
         console.error("Error calling Ollama embeddings API:", error);
         // Specific check for CORS-related "Failed to fetch" error
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            throw new Error(`Failed to connect to Ollama. This is likely a CORS issue. Please ensure OLLAMA_ORIGINS is set correctly and restart the Ollama server.`);
        }
        throw new Error(`Could not generate embeddings. Please ensure the model '${OLLAMA_MODEL}' is installed and Ollama is running.`);
    }
};


/**
 * Generates a report using a local Ollama instance.
 * @param prompt The complete prompt to send to the model.
 * @returns The generated text from the model.
 */
const generateWithOllama = async (prompt: string): Promise<string> => {
    const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate'; // Corrected endpoint
    const OLLAMA_MODEL = 'llama3.2:3b';

    try {
        const response = await fetch(OLLAMA_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: prompt,
                stream: false, // We want the full response at once
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Ollama API Error:", errorText);
            throw new Error(`Ollama API responded with status ${response.status}.`);
        }

        const data = await response.json();
        return data.response; // For Ollama, the generated text is in the 'response' field
    } catch (error) {
        console.error("Error calling Ollama API:", error);
        
        // Specific check for CORS-related "Failed to fetch" error
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            return `### Failed to connect to Ollama. This is likely a CORS issue.

**Ollama needs to be configured to accept requests from this web application.** Please follow these steps:

1.  **Stop the Ollama server** if it's currently running.
2.  **Set the \`OLLAMA_ORIGINS\` environment variable** to allow web browser access. Open your terminal and run the appropriate command for your system:

    *   **On macOS or Linux:**
        \`\`\`bash
        export OLLAMA_ORIGINS="*"
        \`\`\`
    *   **On Windows (Command Prompt):**
        \`\`\`cmd
        set OLLAMA_ORIGINS=*
        \`\`\`
    *   **On Windows (PowerShell):**
        \`\`\`powershell
        $env:OLLAMA_ORIGINS="*"
        \`\`\`
    *To be more secure, you can replace \`*\` with the specific origin of this application.*

3.  **Restart the Ollama server** from the *same terminal* where you set the variable:
    \`\`\`bash
    ollama serve
    \`\`\`
    
4.  After restarting, please try generating the report again.

---
**Original Error:** ${error.message}`;
        }


        // Generic fallback error message
        return `### An error occurred while generating the AI report.

**Please ensure Ollama is set up correctly:**
1.  **Is Ollama running?** You can check by opening \`http://localhost:11434\` in your browser.
2.  **Is the model installed?** In your terminal, run the command: \`ollama pull ${OLLAMA_MODEL}\`

---
**Error Details:** ${error instanceof Error ? error.message : String(error)}`;
    }
};

export { generateWithOllama, generateEmbeddings };


export interface ReportData {
    role: UserRole;
    currentUser: User;
    stations: Station[];
    audits: Audit[];
    submissions: ChecklistSubmission[];
    incidents: Incident[];
}

export const generateDashboardReport = async (data: ReportData): Promise<string> => {
    
    let prompt = '';
    let relevantData: object = {};

    switch (data.role) {
        case UserRole.Admin:
            prompt = `
              You are an expert HSE (Health, Safety, Environment) analyst providing an executive summary to the General Manager of a fuel station network.
              Based on the following JSON data for the entire company, generate a concise report in Markdown format.
              The report should include:
              1.  An overall performance summary (mentioning compliance rate and incident trends).
              2.  Identification of the highest and lowest performing regions or stations.
              3.  The top 2-3 key risk areas, citing specific recurring issues (e.g., equipment failures, overdue critical CAPAs).
              4.  Highlight any escalated Corrective Actions that are significantly overdue (due date is in the past) and suggest who is responsible.
              5.  Provide 2 actionable strategic recommendations for leadership to focus on in the next quarter.
            `;
            relevantData = { stations: data.stations, audits: data.audits, submissions: data.submissions, incidents: data.incidents };
            break;

        case UserRole.ComplianceManager:
            const region = data.currentUser.region;
            const regionStations = data.stations.filter(s => s.region === region);
            const regionStationIds = regionStations.map(s => s.id);
            relevantData = {
                stations: regionStations,
                audits: data.audits.filter(a => regionStationIds.includes(a.stationId)),
                submissions: data.submissions.filter(s => regionStationIds.includes(s.stationId)),
                incidents: data.incidents.filter(i => regionStationIds.includes(i.stationId)),
            };
            prompt = `
              You are an operations analyst reporting to the Area Manager of the '${region}' region in a fuel station network.
              Based on the following JSON data for your region, generate a performance report in Markdown format.
              The report should include:
              1.  The region's overall compliance score.
              2.  A performance ranking of the stations within the region.
              3.  Common non-compliance themes or issues observed across the region's stations.
              4.  A list of any Corrective Actions that are pending your review or are escalated (significantly past their due date).
              5.  A clear, prioritized action plan for you for the upcoming month, focusing on escalated items first.
            `;
            break;

        case UserRole.StationManager:
            const station = data.stations.find(s => s.id === data.currentUser.assignedStationIds?.[0]);
            relevantData = {
                station: station,
                audits: data.audits.filter(a => a.stationId === station?.id),
                submissions: data.submissions.filter(s => s.stationId === station?.id),
                incidents: data.incidents.filter(i => i.stationId === station?.id),
            };
            prompt = `
              You are a senior compliance officer assisting the Station Manager of '${station?.name}'.
              Based on the following JSON data for this station ONLY, generate a daily operational briefing in Markdown format.
              The report must include:
              1.  The station's current compliance score and its trend over the last few submissions.
              2.  A list of all open or overdue Corrective Actions (CAPAs) for this station.
              3.  The most recent non-compliant items from checklists.
              4.  A simple, prioritized to-do list for the station team for the next 7 days.
            `;
            break;
    }

    const fullPrompt = `${prompt}\n\n**Data:**\n${JSON.stringify(relevantData)}`;

    return generateWithOllama(fullPrompt);
};

export const generateAnalyticsReport = async (filteredData: { audits: Audit[], submissions: ChecklistSubmission[], stations: Station[] }): Promise<string> => {
    const prompt = `
        You are a senior business intelligence analyst for an oil marketing company.
        Based on the provided JSON data, which has been filtered for a specific date range, region, or station, generate a comprehensive executive summary in Markdown format.

        The summary should contain three sections:
        
        ### 1. Executive Overview
        - Start with a single sentence summarizing the overall compliance and audit performance for the selected scope.
        - Mention the calculated overall compliance score.
        - Note the total number of audits conducted and the number of open corrective actions (CAPAs) within this scope.

        ### 2. Key Findings & Trends
        - Identify the top 3 recurring issues or non-compliant categories from the data.
        - Describe any noticeable performance trends (e.g., improving/declining compliance over time).
        - Point out the highest and lowest performing stations if the data covers multiple stations.

        ### 3. Actionable Recommendations
        - Provide 2-3 specific, data-driven recommendations.
        - For each recommendation, briefly state the desired outcome (e.g., "Conduct targeted training on spill kit management to reduce Fuel Operations non-compliance by 15%.").

        Ensure the tone is professional, objective, and data-focused.
    `;

    const fullPrompt = `${prompt}\n\n**Filtered Data:**\n${JSON.stringify(filteredData)}`;
    return generateWithOllama(fullPrompt);
};


export const getHSEInsights = async (data: { submissions: ChecklistSubmission[], incidents: Incident[] }): Promise<string> => {
    
    const prompt = `
      You are an expert HSE (Health, Safety, Environment) analyst.
      Based on the following JSON data, generate a concise report in Markdown format about HSE insights.
      The data includes checklist submissions and incident reports.
      The report should include:
      1.  A brief, high-level summary of the overall safety and compliance posture.
      2.  Identification of the top 1-2 key risk areas, citing specific recurring issues from non-compliant checklist items or incident patterns.
      3.  Provide 1-2 actionable recommendations to mitigate these risks.
      Keep the language concise and focused on actionable insights.
    `;

    const relevantData = { submissions: data.submissions, incidents: data.incidents };
    const fullPrompt = `${prompt}\n\n**Data:**\n${JSON.stringify(relevantData)}`;

    return generateWithOllama(fullPrompt);
};
