import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../file/s3.service';

@Injectable()
export class AdminService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly s3Service: S3Service,
    ) { }

    async getFiles(options?: {
        skip?: number;
        take?: number;
        search?: string;
    }) {
        const { skip = 0, take = 20, search } = options || {};

        const where = search
            ? {
                originalName: {
                    contains: search,
                    mode: 'insensitive' as const,
                },
            }
            : {};

        const [files, total] = await Promise.all([
            this.prisma.file.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    uploader: {
                        select: {
                            id: true,
                            email: true,
                        },
                    },
                    shareLinks: {
                        select: {
                            id: true,
                            token: true,
                            isActive: true,
                            currentDownloadCount: true,
                            _count: {
                                select: { accessLogs: true },
                            },
                        },
                    },
                },
            }),
            this.prisma.file.count({ where }),
        ]);

        return {
            data: files.map((file) => ({
                id: file.id,
                originalName: file.originalName,
                mimeType: file.mimeType,
                size: file.size.toString(),
                s3Key: file.s3Key,
                createdAt: file.createdAt,
                uploader: file.uploader,
                shareLinksCount: file.shareLinks.length,
                totalDownloads: file.shareLinks.reduce(
                    (sum, link) => sum + link.currentDownloadCount,
                    0,
                ),
            })),
            meta: {
                total,
                skip,
                take,
            },
        };
    }

    async deleteFile(id: string) {
        const file = await this.prisma.file.findUnique({
            where: { id },
        });

        if (!file) {
            throw new NotFoundException('File not found');
        }

        // Delete from S3
        await this.s3Service.deleteObject(file.s3Key);

        // Delete from database (cascade will delete share links and access logs)
        await this.prisma.file.delete({
            where: { id },
        });

        return { success: true };
    }

    async getStats() {
        const [totalFiles, totalUsers, totalDownloads, totalStorage] =
            await Promise.all([
                this.prisma.file.count(),
                this.prisma.user.count(),
                this.prisma.accessLog.count({
                    where: { action: 'DOWNLOAD' },
                }),
                this.prisma.file.aggregate({
                    _sum: { size: true },
                }),
            ]);

        return {
            totalFiles,
            totalUsers,
            totalDownloads,
            totalStorage: totalStorage._sum.size?.toString() || '0',
        };
    }

    async getLogs(options?: {
        skip?: number;
        take?: number;
        action?: 'VIEW' | 'DOWNLOAD';
        startDate?: Date;
        endDate?: Date;
    }) {
        const { skip = 0, take = 50, action, startDate, endDate } = options || {};

        const where: any = {};

        if (action) {
            where.action = action;
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = startDate;
            if (endDate) where.createdAt.lte = endDate;
        }

        const [logs, total] = await Promise.all([
            this.prisma.accessLog.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    link: {
                        include: {
                            file: {
                                select: {
                                    id: true,
                                    originalName: true,
                                },
                            },
                        },
                    },
                },
            }),
            this.prisma.accessLog.count({ where }),
        ]);

        return {
            data: logs.map((log) => ({
                id: log.id,
                action: log.action,
                ip: log.ip,
                userAgent: log.userAgent,
                createdAt: log.createdAt,
                file: {
                    id: log.link.file.id,
                    name: log.link.file.originalName,
                },
                linkToken: log.link.token,
            })),
            meta: {
                total,
                skip,
                take,
            },
        };
    }
}
