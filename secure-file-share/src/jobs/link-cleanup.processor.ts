import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
@Processor('link-cleanup')
export class LinkCleanupProcessor extends WorkerHost {
    private readonly logger = new Logger(LinkCleanupProcessor.name);

    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<void> {
        this.logger.log(`Processing job ${job.id}: ${job.name}`);

        switch (job.name) {
            case 'expire-links':
                await this.expireLinks();
                break;
            case 'lock-exceeded-links':
                await this.lockExceededLinks();
                break;
            default:
                this.logger.warn(`Unknown job name: ${job.name}`);
        }
    }

    private async expireLinks() {
        const now = new Date();

        const result = await this.prisma.shareLink.updateMany({
            where: {
                isActive: true,
                expireAt: {
                    lte: now,
                },
            },
            data: {
                isActive: false,
            },
        });

        this.logger.log(`Expired ${result.count} links`);
    }

    private async lockExceededLinks() {
        // Find and deactivate links that have exceeded their download limit
        const links = await this.prisma.shareLink.findMany({
            where: {
                isActive: true,
                downloadLimit: {
                    not: null,
                },
            },
        });

        let lockedCount = 0;

        for (const link of links) {
            if (link.downloadLimit && link.currentDownloadCount >= link.downloadLimit) {
                await this.prisma.shareLink.update({
                    where: { id: link.id },
                    data: { isActive: false },
                });
                lockedCount++;
            }
        }

        this.logger.log(`Locked ${lockedCount} links due to exceeded download limit`);
    }
}
