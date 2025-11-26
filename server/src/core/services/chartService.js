import puppeteer from 'puppeteer';
import { logger } from '../../shared/utils/logger.js';

class ChartService {
  async generateChartImage(chartConfig) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setViewport({ width: 800, height: 600 });
      
      const html = this._generateChartHTML(chartConfig);
      await page.setContent(html);
      await page.waitForSelector('#chart', { timeout: 5000 });
      
      const chartElement = await page.$('#chart');
      const imageBuffer = await chartElement.screenshot({ type: 'png' });
      
      return imageBuffer;
    } catch (error) {
      logger.error({ error, chartConfig }, 'Failed to generate chart image');
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  _generateChartHTML(config) {
    const { type, data, options = {} } = config;
    
    return `
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    body { margin: 0; padding: 20px; background: white; }
    #chart { width: 760px; height: 560px; }
  </style>
</head>
<body>
  <canvas id="chart"></canvas>
  <script>
    const ctx = document.getElementById('chart').getContext('2d');
    new Chart(ctx, {
      type: '${type}',
      data: ${JSON.stringify(data)},
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          title: {
            display: true,
            text: '${options.title || ''}',
            font: { size: 16 }
          },
          legend: {
            display: true,
            position: 'top'
          }
        }
      }
    });
  </script>
</body>
</html>
    `;
  }
}

export const chartService = new ChartService();
