import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { LinkCleanupProcessor } from './link-cleanup.processor';

@Module({
    imports: [
        BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                connection: {
                    host: configService.get<string>('redis.host'),
                    port: configService.get<number>('redis.port'),
                },
            }),
            inject: [ConfigService],
        }),
        BullModule.registerQueue({
            name: 'link-cleanup',
        }),
    ],
    providers: [LinkCleanupProcessor],
})
export class JobsModule implements OnModuleInit {
    constructor(
        @InjectQueue('link-cleanup') private readonly linkCleanupQueue: Queue,
    ) { }

    async onModuleInit() {
        // Add recurring jobs
        await this.linkCleanupQueue.add(
            'expire-links',
            {},
            {
                repeat: {
                    pattern: '0 * * * *', // Every hour
                },
                removeOnComplete: true,
                removeOnFail: 100,
            },
        );

        await this.linkCleanupQueue.add(
            'lock-exceeded-links',
            {},
            {
                repeat: {
                    pattern: '*/15 * * * *', // Every 15 minutes
                },
                removeOnComplete: true,
                removeOnFail: 100,
            },
        );
    }
}
