import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './s3.service';
import { InitUploadDto, CompleteUploadDto, AbortUploadDto } from './dto';

@Injectable()
export class FileService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly s3Service: S3Service,
    ) { }

    async initUpload(dto: InitUploadDto, uploaderId?: string) {
        const s3Key = `uploads/${uuidv4()}/${dto.fileName}`;

        // Create file record
        const file = await this.prisma.file.create({
            data: {
                originalName: dto.fileName,
                mimeType: dto.mimeType,
                size: BigInt(dto.fileSize),
                s3Key,
                uploaderId,
            },
        });

        // Initiate multipart upload
        const uploadId = await this.s3Service.initiateMultipartUpload(
            s3Key,
            dto.mimeType,
        );

        if (!uploadId) {
            throw new Error('Failed to initiate multipart upload');
        }

        // Generate signed URLs for each part
        const totalParts = dto.totalParts || Math.ceil(dto.fileSize / (5 * 1024 * 1024)); // 5MB per part
        const uploadUrls: { partNumber: number; url: string }[] = [];

        for (let i = 1; i <= totalParts; i++) {
            const url = await this.s3Service.getUploadPartSignedUrl(
                s3Key,
                uploadId,
                i,
            );
            uploadUrls.push({ partNumber: i, url });
        }

        return {
            fileId: file.id,
            uploadId,
            s3Key,
            uploadUrls,
        };
    }

    async completeUpload(dto: CompleteUploadDto) {
        const file = await this.prisma.file.findUnique({
            where: { id: dto.fileId },
        });

        if (!file) {
            throw new NotFoundException('File not found');
        }

        await this.s3Service.completeMultipartUpload(
            file.s3Key,
            dto.uploadId,
            dto.parts,
        );

        return {
            success: true,
            fileId: file.id,
            fileName: file.originalName,
        };
    }

    async abortUpload(dto: AbortUploadDto) {
        const file = await this.prisma.file.findUnique({
            where: { id: dto.fileId },
        });

        if (!file) {
            throw new NotFoundException('File not found');
        }

        await this.s3Service.abortMultipartUpload(file.s3Key, dto.uploadId);

        // Delete file record
        await this.prisma.file.delete({
            where: { id: dto.fileId },
        });

        return { success: true };
    }

    async findById(id: string) {
        const file = await this.prisma.file.findUnique({
            where: { id },
        });

        if (!file) {
            throw new NotFoundException('File not found');
        }

        return file;
    }

    async findAll() {
        return this.prisma.file.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async delete(id: string) {
        const file = await this.findById(id);

        // Delete from S3
        await this.s3Service.deleteObject(file.s3Key);

        // Delete from database
        await this.prisma.file.delete({
            where: { id },
        });

        return { success: true };
    }

    async getDownloadUrl(id: string) {
        const file = await this.findById(id);
        const url = await this.s3Service.getDownloadSignedUrl(file.s3Key);

        return {
            url,
            fileName: file.originalName,
            mimeType: file.mimeType,
        };
    }
}
