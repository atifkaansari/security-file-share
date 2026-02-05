import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SocketGateway } from '../socket/socket.gateway';
import { AccessAction } from '@prisma/client';

interface LogParams {
    linkId: string;
    action: 'VIEW' | 'DOWNLOAD';
    ip?: string;
    userAgent?: string;
}

@Injectable()
export class AccessLogService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly socketGateway: SocketGateway,
    ) { }

    async log(params: LogParams) {
        const log = await this.prisma.accessLog.create({
            data: {
                linkId: params.linkId,
                action: params.action as AccessAction,
                ip: params.ip,
                userAgent: params.userAgent,
            },
            include: {
                link: {
                    include: {
                        file: {
                            select: {
                                originalName: true,
                            },
                        },
                    },
                },
            },
        });

        // Emit to admin log stream
        this.socketGateway.emitAdminLog({
            id: log.id,
            action: log.action,
            ip: log.ip,
            userAgent: log.userAgent,
            createdAt: log.createdAt,
            fileName: log.link.file.originalName,
            linkToken: log.link.token,
        });

        return log;
    }

    async findAll(options?: {
        skip?: number;
        take?: number;
        linkId?: string;
    }) {
        const { skip = 0, take = 50, linkId } = options || {};

        const where = linkId ? { linkId } : {};

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
            data: logs,
            meta: {
                total,
                skip,
                take,
            },
        };
    }
}
