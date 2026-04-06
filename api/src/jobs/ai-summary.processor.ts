import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AiService } from '../ai/ai.service';
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

  constructor(private ai: AiService) {
    super();
  }

  async process(job: Job<AiSummaryPayload>): Promise<{ markdown: string } | null> {
    const { sprintId, sprintName, projectName, startDate, endDate, issues } = job.data;
    this.logger.log(`Generating AI release notes for sprint ${sprintId}`);

    const result = await this.ai.generateReleaseNotes({ sprintName, projectName, startDate, endDate, issues });

    if (!result) {
      this.logger.warn(`AI release notes unavailable for sprint ${sprintId} (API key missing or error)`);
      return null;
    }

    this.logger.log(`AI release notes generated for sprint ${sprintId}: "${result.title}"`);
    return { markdown: result.markdown };
  }
}
