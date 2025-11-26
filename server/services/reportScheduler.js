import cron from 'cron';
import { createTracedPrismaClient } from '../utils/tracedPrismaClient.js';
import { logger } from '../utils/logger.js';
import { reportService } from './reportService.js';
import { sendEmail } from './tracedEmailService.js';

const prisma = createTracedPrismaClient();

class ReportScheduler {
  constructor() {
    this.jobs = new Map();
  }

  async init() {
    const schedules = await prisma.reportSchedule.findMany({
      where: { isActive: true },
      include: { organization: true },
    });

    for (const schedule of schedules) {
      this.scheduleJob(schedule);
    }

    logger.info({ count: schedules.length }, 'Report scheduler initialized');
  }

  scheduleJob(schedule) {
    try {
      const job = new cron.CronJob(
        schedule.cronExpression,
        async () => {
          await this.executeScheduledReport(schedule.id);
        },
        null,
        true,
        'America/New_York'
      );

      this.jobs.set(schedule.id, job);
      
      const nextRun = job.nextDate().toJSDate();
      prisma.reportSchedule.update({
        where: { id: schedule.id },
        data: { nextRunAt: nextRun },
      }).catch(err => logger.error({ err, scheduleId: schedule.id }, 'Failed to update nextRunAt'));

      logger.info({ scheduleId: schedule.id, cronExpression: schedule.cronExpression, nextRun }, 'Report scheduled');
    } catch (error) {
      logger.error({ error, scheduleId: schedule.id }, 'Failed to schedule report job');
    }
  }

  async executeScheduledReport(scheduleId) {
    try {
      const schedule = await prisma.reportSchedule.findUnique({
        where: { id: scheduleId },
        include: { organization: true },
      });

      if (!schedule) {
        logger.warn({ scheduleId }, 'Schedule not found');
        return;
      }

      logger.info({ scheduleId, reportType: schedule.reportType }, 'Executing scheduled report');

      const report = await prisma.report.create({
        data: {
          organizationId: schedule.organizationId,
          name: schedule.name,
          type: schedule.reportType,
          format: 'pdf',
          status: 'pending',
          filters: schedule.filters,
          parameters: schedule.parameters,
          scheduledAt: new Date(),
        },
      });

      const generatedReport = await reportService.generateReport(report.id);

      await prisma.reportSchedule.update({
        where: { id: scheduleId },
        data: { lastRunAt: new Date() },
      });

      if (schedule.recipients && schedule.recipients.length > 0) {
        await this.sendReportToRecipients(generatedReport, schedule.recipients, schedule.organization);
      }

      logger.info({ scheduleId, reportId: report.id }, 'Scheduled report executed successfully');
    } catch (error) {
      logger.error({ error, scheduleId }, 'Failed to execute scheduled report');
    }
  }

  async sendReportToRecipients(report, recipients, organization) {
    const subject = `${organization.name} - ${report.name} Report`;
    const message = `
      Your scheduled report "${report.name}" has been generated successfully.
      
      Report ID: ${report.id}
      Generated: ${report.generatedAt}
      
      You can download the report from the HSE Digital platform or use the link below:
      ${report.fileUrl}
      
      ---
      HSE Digital
    `;

    for (const email of recipients) {
      try {
        await sendEmail(email, subject, message);
        logger.info({ email, reportId: report.id }, 'Report email sent');
      } catch (error) {
        logger.error({ error, email, reportId: report.id }, 'Failed to send report email');
      }
    }
  }

  async addSchedule(scheduleData) {
    const schedule = await prisma.reportSchedule.create({
      data: scheduleData,
      include: { organization: true },
    });

    if (schedule.isActive) {
      this.scheduleJob(schedule);
    }

    return schedule;
  }

  async updateSchedule(scheduleId, updates) {
    const schedule = await prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: updates,
      include: { organization: true },
    });

    if (this.jobs.has(scheduleId)) {
      const job = this.jobs.get(scheduleId);
      job.stop();
      this.jobs.delete(scheduleId);
    }

    if (schedule.isActive) {
      this.scheduleJob(schedule);
    }

    return schedule;
  }

  async deleteSchedule(scheduleId) {
    if (this.jobs.has(scheduleId)) {
      const job = this.jobs.get(scheduleId);
      job.stop();
      this.jobs.delete(scheduleId);
    }

    await prisma.reportSchedule.delete({ where: { id: scheduleId } });
    logger.info({ scheduleId }, 'Report schedule deleted');
  }

  stopAll() {
    for (const [scheduleId, job] of this.jobs.entries()) {
      job.stop();
      logger.info({ scheduleId }, 'Report job stopped');
    }
    this.jobs.clear();
  }
}

export const reportScheduler = new ReportScheduler();
