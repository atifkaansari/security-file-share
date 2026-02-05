import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { FileModule } from './file/file.module';
import { ShareLinkModule } from './share-link/share-link.module';
import { AccessLogModule } from './access-log/access-log.module';
import { PackageModule } from './package/package.module';
import { SocketModule } from './socket/socket.module';
import { JobsModule } from './jobs/jobs.module';
import { AppController } from './app.controller';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60', 10) * 1000,
        limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
      },
    ]),
    PrismaModule,
    AuthModule,
    FileModule,
    ShareLinkModule,
    AccessLogModule,
    PackageModule,
    SocketModule,
    JobsModule,
  ],
  controllers: [AppController],
})
export class AppModule { }
