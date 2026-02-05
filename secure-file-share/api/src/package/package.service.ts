import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PackageService {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: { name: string; description?: string }) {
        return this.prisma.package.create({
            data,
        });
    }

    async findAll() {
        return this.prisma.package.findMany({
            include: {
                files: {
                    select: {
                        id: true,
                        originalName: true,
                        size: true,
                    },
                },
                _count: {
                    select: { files: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(id: string) {
        return this.prisma.package.findUnique({
            where: { id },
            include: {
                files: true,
            },
        });
    }

    async addFile(packageId: string, fileId: string) {
        return this.prisma.file.update({
            where: { id: fileId },
            data: { packageId },
        });
    }

    async removeFile(fileId: string) {
        return this.prisma.file.update({
            where: { id: fileId },
            data: { packageId: null },
        });
    }

    async delete(id: string) {
        // Remove package reference from files first
        await this.prisma.file.updateMany({
            where: { packageId: id },
            data: { packageId: null },
        });

        return this.prisma.package.delete({
            where: { id },
        });
    }
}
