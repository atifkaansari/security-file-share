export interface FileType {
    id: string;
    originalName: string;
    mimeType: string;
    size: string;
    s3Key: string;
    createdAt: string;
}

export interface ShareLinkType {
    id: string;
    token: string;
    fileId: string;
    expireAt: string | null;
    downloadLimit: number | null;
    currentDownloadCount: number;
    isActive: boolean;
    createdAt: string;
    file: {
        id: string;
        originalName: string;
        size: string;
    };
}

export interface UploadProgress {
    fileName: string;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error';
}

export interface AdminLogType {
    id: string;
    action: 'VIEW' | 'DOWNLOAD';
    ip: string;
    userAgent: string;
    createdAt: string;
    fileName: string;
    linkToken: string;
}
