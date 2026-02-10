import { Module, forwardRef } from '@nestjs/common';
import { ShareLinkService } from './share-link.service';
import { ShareLinkController } from './share-link.controller';
import { FileModule } from '../file/file.module';
import { AccessLogModule } from '../access-log/access-log.module';
import { SocketModule } from '../socket/socket.module';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [
        FileModule,
        forwardRef(() => AccessLogModule),
        forwardRef(() => SocketModule),
        EmailModule,
    ],
    controllers: [ShareLinkController],
    providers: [ShareLinkService],
    exports: [ShareLinkService],
})
export class ShareLinkModule { }
