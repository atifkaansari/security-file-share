import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { S3Service } from './s3.service';

@Module({
    controllers: [FileController],
    providers: [FileService, S3Service],
    exports: [FileService, S3Service],
})
export class FileModule { }
