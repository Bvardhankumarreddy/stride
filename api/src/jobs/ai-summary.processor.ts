import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { QUEUE_AI_SUMMARY } from './jobs.constants';

export interface AiSummaryPayload {
  sprintId: string;
  sprintName: string;
  projectName: string;
  startDate: string;
  endDate: string;
  issues: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    labels: string[];
    assignee?: string;
  }>;
}

@Processor(QUEUE_AI_SUMMARY)
export class AiSummaryProcessor extends WorkerHost {
  private readonly logger = new Logger(AiSummaryProcessor.name);

  constructor(
    private config: ConfigService,
    private http: HttpService,
  ) {
    super();
  }

  async process(job: Job<AiSummaryPayload>): Promise<{ markdown: string }> {
    const { sprintId, sprintName, projectName, startDate, endDate, issues } = job.data;
    this.logger.log(`Generating AI release notes for sprint ${sprintId}`);

    const aiUrl = this.config.get<string>('AI_SERVICE_URL', 'http://localhost:5001');

    try {
      const response = await firstValueFrom(
        this.http.post(`${aiUrl}/ai/release-notes`, {
          sprint_name: sprintName,
          project_name: projectName,
          start_date: startDate,
          end_date: endDate,
          issues,
        }),
      );

      const { markdown, title } = response.data;
      this.logger.log(`AI release notes generated for sprint ${sprintId}: "${title}"`);
      return { markdown };
    } catch (err) {
      this.logger.error(`AI summary failed for sprint ${sprintId}: ${err.message}`);
      throw err;
    }
  }
}
