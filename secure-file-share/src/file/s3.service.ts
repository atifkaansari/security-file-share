import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    S3Client,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
    GetObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
    private readonly s3Client: S3Client;
    private readonly bucketName: string;

    constructor(private readonly configService: ConfigService) {
        this.s3Client = new S3Client({
            region: this.configService.get<string>('aws.region'),
            credentials: {
                accessKeyId: this.configService.get<string>('aws.accessKeyId') || '',
                secretAccessKey: this.configService.get<string>('aws.secretAccessKey') || '',
            },
        });
        this.bucketName = this.configService.get<string>('aws.s3BucketName') || '';
    }

    async initiateMultipartUpload(key: string, contentType: string) {
        const command = new CreateMultipartUploadCommand({
            Bucket: this.bucketName,
            Key: key,
            ContentType: contentType,
        });

        const response = await this.s3Client.send(command);
        return response.UploadId;
    }

    async getUploadPartSignedUrl(
        key: string,
        uploadId: string,
        partNumber: number,
        expiresIn = 3600,
    ): Promise<string> {
        const command = new UploadPartCommand({
            Bucket: this.bucketName,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber,
        });

        return getSignedUrl(this.s3Client, command, { expiresIn });
    }

    async completeMultipartUpload(
        key: string,
        uploadId: string,
        parts: { ETag: string; PartNumber: number }[],
    ) {
        const command = new CompleteMultipartUploadCommand({
            Bucket: this.bucketName,
            Key: key,
            UploadId: uploadId,
            MultipartUpload: { Parts: parts },
        });

        return this.s3Client.send(command);
    }

    async abortMultipartUpload(key: string, uploadId: string) {
        const command = new AbortMultipartUploadCommand({
            Bucket: this.bucketName,
            Key: key,
            UploadId: uploadId,
        });

        return this.s3Client.send(command);
    }

    async getDownloadSignedUrl(key: string, expiresIn = 3600): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        });

        return getSignedUrl(this.s3Client, command, { expiresIn });
    }

    async deleteObject(key: string) {
        const command = new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        });

        return this.s3Client.send(command);
    }
}
