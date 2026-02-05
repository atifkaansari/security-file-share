import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

interface UploadProgressPayload {
    fileId: string;
    fileName: string;
    progress: number;
    partNumber: number;
    totalParts: number;
}

interface LinkEventPayload {
    linkId: string;
    token: string;
    fileName: string;
}

interface AdminLogPayload {
    id: string;
    action: string;
    ip: string | null;
    userAgent: string | null;
    createdAt: Date;
    fileName: string;
    linkToken: string;
}

@WebSocketGateway({
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
    },
    namespace: '/events',
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(SocketGateway.name);

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('join:admin')
    handleJoinAdmin(client: Socket) {
        client.join('admin');
        this.logger.log(`Client ${client.id} joined admin room`);
        return { success: true };
    }

    @SubscribeMessage('leave:admin')
    handleLeaveAdmin(client: Socket) {
        client.leave('admin');
        this.logger.log(`Client ${client.id} left admin room`);
        return { success: true };
    }

    // Emit methods
    emitUploadProgress(payload: UploadProgressPayload) {
        this.server.emit('upload:progress', payload);
    }

    emitLinkViewed(payload: LinkEventPayload) {
        this.server.to('admin').emit('link:viewed', payload);
    }

    emitLinkDownloaded(payload: LinkEventPayload) {
        this.server.to('admin').emit('link:downloaded', payload);
    }

    emitAdminLog(payload: AdminLogPayload) {
        this.server.to('admin').emit('admin:log', payload);
    }
}
