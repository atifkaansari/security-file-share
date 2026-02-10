import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor(private readonly configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            host: this.configService.get<string>('smtp.host'),
            port: this.configService.get<number>('smtp.port'),
            secure: this.configService.get<number>('smtp.port') === 465,
            auth: {
                user: this.configService.get<string>('smtp.user'),
                pass: this.configService.get<string>('smtp.password'),
            },
        });
    }

    async sendDownloadNotification(params: {
        to: string;
        fileName: string;
        downloadedAt: Date;
        ip?: string;
        userAgent?: string;
    }) {
        const { to, fileName, downloadedAt, ip, userAgent } = params;

        const fromEmail = this.configService.get<string>('smtp.fromEmail');
        const fromName = this.configService.get<string>('smtp.fromName');

        try {
            await this.transporter.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to,
                subject: `File Downloaded: ${fileName}`,
                html: this.getDownloadNotificationTemplate({
                    fileName,
                    downloadedAt,
                    ip,
                    userAgent,
                }),
            });
        } catch (error) {
            console.error('Failed to send email notification:', error);
            // Don't throw - we don't want email failures to break downloads
        }
    }

    private getDownloadNotificationTemplate(params: {
        fileName: string;
        downloadedAt: Date;
        ip?: string;
        userAgent?: string;
    }): string {
        const { fileName, downloadedAt, ip, userAgent } = params;

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            margin: -30px -30px 20px -30px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .info-box {
            background: #f7fafc;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info-row {
            margin: 10px 0;
        }
        .label {
            font-weight: 600;
            color: #4a5568;
        }
        .value {
            color: #2d3748;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #718096;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📥 File Download Notification</h1>
        </div>
        
        <p>Your shared file has been downloaded.</p>
        
        <div class="info-box">
            <div class="info-row">
                <span class="label">File Name:</span>
                <span class="value">${fileName}</span>
            </div>
            <div class="info-row">
                <span class="label">Downloaded At:</span>
                <span class="value">${downloadedAt.toLocaleString()}</span>
            </div>
            ${ip ? `
            <div class="info-row">
                <span class="label">IP Address:</span>
                <span class="value">${ip}</span>
            </div>
            ` : ''}
            ${userAgent ? `
            <div class="info-row">
                <span class="label">User Agent:</span>
                <span class="value">${userAgent}</span>
            </div>
            ` : ''}
        </div>
        
        <p>This is an automated notification from Secure File Share.</p>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} Secure File Share. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `.trim();
    }
}
