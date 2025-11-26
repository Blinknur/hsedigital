import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ReportGenerator {
  constructor(resultsData) {
    this.data = resultsData;
  }

  generateMarkdownReport() {
    let markdown = '# Load Testing Report\n\n';
    markdown += `**Generated:** ${new Date(this.data.timestamp).toLocaleString()}\n\n`;
    markdown += `**Total Tests:** ${this.data.tests.length}\n`;
    markdown += `**Duration:** ${this.data.overall.duration.toFixed(2)}s\n\n`;

    markdown += '## Executive Summary\n\n';
    markdown += `- ✅ Tests Passed: ${this.data.overall.passed}\n`;
    markdown += `- ❌ Tests Failed: ${this.data.overall.failed}\n`;
    markdown += `- 📊 Success Rate: ${((this.data.overall.passed / this.data.overall.total) * 100).toFixed(2)}%\n\n`;

    markdown += '## Test Results\n\n';
    this.data.tests.forEach(test => {
      markdown += `### ${test.success ? '✅' : '❌'} ${test.name}\n\n`;
      markdown += `**Status:** ${test.success ? 'PASSED' : 'FAILED'}\n`;
      markdown += `**Duration:** ${test.duration.toFixed(2)}s\n`;
      markdown += `**Required:** ${test.required ? 'Yes' : 'No'}\n\n`;

      if (test.summary) {
        markdown += '#### Metrics\n\n';
        markdown += `- **Total Requests:** ${test.summary.totalRequests}\n`;
        markdown += `- **Average Latency:** ${test.summary.averageLatency.toFixed(2)}ms\n`;
        markdown += `- **Average Throughput:** ${test.summary.averageThroughput.toFixed(2)} req/s\n`;
        markdown += `- **Error Rate:** ${test.summary.errorRate}\n`;
        markdown += `- **Tests Passed:** ${test.summary.testsPassed}/${test.summary.testsPassed + test.summary.testsFailed}\n\n`;
      }

      if (test.error) {
        markdown += `**Error:** ${test.error}\n\n`;
      }

      markdown += '---\n\n';
    });

    return markdown;
  }

  generateHTMLReport() {
    const summary = this.data.tests.map(test => {
      return {
        name: test.name,
        status: test.success ? 'PASSED' : 'FAILED',
        duration: test.duration,
        summary: test.summary
      };
    });

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Load Testing Report - HSE.Digital</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f7fa;
            padding: 20px;
            color: #333;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header h1 { font-size: 32px; margin-bottom: 10px; }
        .header p { opacity: 0.9; }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .summary-card h3 { font-size: 14px; color: #666; margin-bottom: 10px; text-transform: uppercase; }
        .summary-card .value { font-size: 32px; font-weight: bold; }
        .summary-card.passed .value { color: #10b981; }
        .summary-card.failed .value { color: #ef4444; }
        .summary-card.total .value { color: #667eea; }
        .test-results {
            display: grid;
            gap: 20px;
        }
        .test-card {
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .test-card-header {
            padding: 20px;
            border-left: 5px solid #667eea;
        }
        .test-card-header.passed { border-left-color: #10b981; background: #f0fdf4; }
        .test-card-header.failed { border-left-color: #ef4444; background: #fef2f2; }
        .test-card-header h2 {
            font-size: 20px;
            margin-bottom: 5px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge.passed { background: #10b981; color: white; }
        .badge.failed { background: #ef4444; color: white; }
        .badge.required { background: #fbbf24; color: #78350f; }
        .test-card-body {
            padding: 20px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        .metric {
            padding: 15px;
            background: #f9fafb;
            border-radius: 8px;
        }
        .metric-label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 5px;
        }
        .metric-value {
            font-size: 20px;
            font-weight: 600;
            color: #111827;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Load Testing Report</h1>
            <p>HSE.Digital Platform Performance Analysis</p>
            <p>Generated: ${new Date(this.data.timestamp).toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="summary-card total">
                <h3>Total Tests</h3>
                <div class="value">${this.data.overall.total}</div>
            </div>
            <div class="summary-card passed">
                <h3>Passed</h3>
                <div class="value">${this.data.overall.passed}</div>
            </div>
            <div class="summary-card failed">
                <h3>Failed</h3>
                <div class="value">${this.data.overall.failed}</div>
            </div>
            <div class="summary-card">
                <h3>Duration</h3>
                <div class="value">${this.data.overall.duration.toFixed(0)}s</div>
            </div>
        </div>

        <div class="test-results">
            ${this.data.tests.map(test => `
                <div class="test-card">
                    <div class="test-card-header ${test.success ? 'passed' : 'failed'}">
                        <h2>
                            ${test.success ? '✅' : '❌'} ${test.name}
                            <span class="badge ${test.success ? 'passed' : 'failed'}">${test.success ? 'PASSED' : 'FAILED'}</span>
                            ${test.required ? '<span class="badge required">REQUIRED</span>' : ''}
                        </h2>
                        <p>Duration: ${test.duration.toFixed(2)}s</p>
                    </div>
                    ${test.summary ? `
                        <div class="test-card-body">
                            <div class="metrics-grid">
                                <div class="metric">
                                    <div class="metric-label">Total Requests</div>
                                    <div class="metric-value">${test.summary.totalRequests.toLocaleString()}</div>
                                </div>
                                <div class="metric">
                                    <div class="metric-label">Avg Latency</div>
                                    <div class="metric-value">${test.summary.averageLatency.toFixed(2)}ms</div>
                                </div>
                                <div class="metric">
                                    <div class="metric-label">Throughput</div>
                                    <div class="metric-value">${test.summary.averageThroughput.toFixed(0)} req/s</div>
                                </div>
                                <div class="metric">
                                    <div class="metric-label">Error Rate</div>
                                    <div class="metric-value">${test.summary.errorRate}</div>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                    ${test.error ? `
                        <div class="test-card-body">
                            <p style="color: #ef4444;"><strong>Error:</strong> ${test.error}</p>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>

        <div class="footer">
            <p>HSE.Digital Load Testing Suite © ${new Date().getFullYear()}</p>
        </div>
    </div>
</body>
</html>
    `;

    return html;
  }

  saveReports(outputDir = null) {
    const dir = outputDir || path.join(__dirname, 'results');
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    
    const markdownPath = path.join(dir, `report-${timestamp}.md`);
    fs.writeFileSync(markdownPath, this.generateMarkdownReport());
    
    const htmlPath = path.join(dir, `report-${timestamp}.html`);
    fs.writeFileSync(htmlPath, this.generateHTMLReport());

    return { markdown: markdownPath, html: htmlPath };
  }
}

export function generateReports(resultsFile) {
  const resultsPath = path.isAbsolute(resultsFile) 
    ? resultsFile 
    : path.join(__dirname, 'results', resultsFile);

  if (!fs.existsSync(resultsPath)) {
    throw new Error(`Results file not found: ${resultsPath}`);
  }

  const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
  const generator = new ReportGenerator(data);
  
  return generator.saveReports();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const resultsFile = process.argv[2];
  
  if (!resultsFile) {
    console.error('Usage: node report-generator.js <results-file>');
    process.exit(1);
  }

  try {
    const paths = generateReports(resultsFile);
    console.log('✅ Reports generated:');
    console.log(`   Markdown: ${paths.markdown}`);
    console.log(`   HTML: ${paths.html}`);
  } catch (error) {
    console.error('❌ Failed to generate reports:', error.message);
    process.exit(1);
  }
}
