import { Module, forwardRef } from '@nestjs/common';
import { AccessLogService } from './access-log.service';
import { AccessLogController } from './access-log.controller';
import { SocketModule } from '../socket/socket.module';

@Module({
    imports: [forwardRef(() => SocketModule)],
    controllers: [AccessLogController],
    providers: [AccessLogService],
    exports: [AccessLogService],
})
export class AccessLogModule { }
