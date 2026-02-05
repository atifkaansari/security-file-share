import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class InitUploadDto {
    @IsString()
    fileName: string;

    @IsString()
    mimeType: string;

    @IsInt()
    @Min(1)
    fileSize: number;

    @IsInt()
    @Min(1)
    @IsOptional()
    totalParts?: number;
}

export class CompleteUploadDto {
    @IsString()
    fileId: string;

    @IsString()
    uploadId: string;

    parts: { ETag: string; PartNumber: number }[];
}

export class AbortUploadDto {
    @IsString()
    fileId: string;

    @IsString()
    uploadId: string;
}
