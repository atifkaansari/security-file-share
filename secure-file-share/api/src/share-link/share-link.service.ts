import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../file/s3.service';
import { AccessLogService } from '../access-log/access-log.service';
import { SocketGateway } from '../socket/socket.gateway';
import { CreateShareLinkDto, VerifyLinkDto } from './dto';

@Injectable()
export class ShareLinkService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly s3Service: S3Service,
        private readonly accessLogService: AccessLogService,
        private readonly socketGateway: SocketGateway,
    ) { }

    async create(dto: CreateShareLinkDto) {
        // Check if file exists
        const file = await this.prisma.file.findUnique({
            where: { id: dto.fileId },
        });

        if (!file) {
            throw new NotFoundException('File not found');
        }

        // Generate unique token
        const token = randomBytes(32).toString('hex');

        // Hash password if provided
        let hashedPassword: string | null = null;
        if (dto.password) {
            hashedPassword = await bcrypt.hash(dto.password, 10);
        }

        const shareLink = await this.prisma.shareLink.create({
            data: {
                token,
                fileId: dto.fileId,
                password: hashedPassword,
                expireAt: dto.expireAt ? new Date(dto.expireAt) : null,
                downloadLimit: dto.downloadLimit,
            },
            include: {
                file: {
                    select: {
                        id: true,
                        originalName: true,
                        size: true,
                    },
                },
            },
        });

        return {
            id: shareLink.id,
            token: shareLink.token,
            hasPassword: !!shareLink.password,
            expireAt: shareLink.expireAt,
            downloadLimit: shareLink.downloadLimit,
            file: {
                id: shareLink.file.id,
                name: shareLink.file.originalName,
                size: shareLink.file.size.toString(),
            },
        };
    }

    async verify(token: string, dto: VerifyLinkDto, ip?: string, userAgent?: string) {
        const shareLink = await this.findByToken(token);

        // Check if link is active
        if (!shareLink.isActive) {
            throw new ForbiddenException('This link is no longer active');
        }

        // Check expiry
        if (shareLink.expireAt && new Date() > shareLink.expireAt) {
            throw new ForbiddenException('This link has expired');
        }

        // Check download limit
        if (
            shareLink.downloadLimit &&
            shareLink.currentDownloadCount >= shareLink.downloadLimit
        ) {
            throw new ForbiddenException('Download limit exceeded');
        }

        // Check password
        if (shareLink.password) {
            if (!dto.password) {
                throw new BadRequestException('Password required');
            }

            const isPasswordValid = await bcrypt.compare(dto.password, shareLink.password);
            if (!isPasswordValid) {
                throw new ForbiddenException('Invalid password');
            }
        }

        // Log view action
        await this.accessLogService.log({
            linkId: shareLink.id,
            action: 'VIEW',
            ip,
            userAgent,
        });

        // Emit socket event
        this.socketGateway.emitLinkViewed({
            linkId: shareLink.id,
            token: shareLink.token,
            fileName: shareLink.file.originalName,
        });

        return {
            valid: true,
            file: {
                id: shareLink.file.id,
                name: shareLink.file.originalName,
                size: shareLink.file.size.toString(),
                mimeType: shareLink.file.mimeType,
            },
        };
    }

    async download(token: string, ip?: string, userAgent?: string) {
        const shareLink = await this.findByToken(token);

        // Same validations as verify
        if (!shareLink.isActive) {
            throw new ForbiddenException('This link is no longer active');
        }

        if (shareLink.expireAt && new Date() > shareLink.expireAt) {
            throw new ForbiddenException('This link has expired');
        }

        if (
            shareLink.downloadLimit &&
            shareLink.currentDownloadCount >= shareLink.downloadLimit
        ) {
            throw new ForbiddenException('Download limit exceeded');
        }

        // Increment download count
        await this.prisma.shareLink.update({
            where: { id: shareLink.id },
            data: {
                currentDownloadCount: { increment: 1 },
            },
        });

        // Log download action
        await this.accessLogService.log({
            linkId: shareLink.id,
            action: 'DOWNLOAD',
            ip,
            userAgent,
        });

        // Get pre-signed URL
        const downloadUrl = await this.s3Service.getDownloadSignedUrl(
            shareLink.file.s3Key,
        );

        // Emit socket event
        this.socketGateway.emitLinkDownloaded({
            linkId: shareLink.id,
            token: shareLink.token,
            fileName: shareLink.file.originalName,
        });

        return {
            downloadUrl,
            fileName: shareLink.file.originalName,
            mimeType: shareLink.file.mimeType,
        };
    }

    async findAll() {
        return this.prisma.shareLink.findMany({
            include: {
                file: {
                    select: {
                        id: true,
                        originalName: true,
                        size: true,
                    },
                },
                _count: {
                    select: { accessLogs: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async deactivate(id: string) {
        const shareLink = await this.prisma.shareLink.findUnique({
            where: { id },
        });

        if (!shareLink) {
            throw new NotFoundException('Share link not found');
        }

        await this.prisma.shareLink.update({
            where: { id },
            data: { isActive: false },
        });

        return { success: true };
    }

    private async findByToken(token: string) {
        const shareLink = await this.prisma.shareLink.findUnique({
            where: { token },
            include: {
                file: true,
            },
        });

        if (!shareLink) {
            throw new NotFoundException('Share link not found');
        }

        return shareLink;
    }
}
