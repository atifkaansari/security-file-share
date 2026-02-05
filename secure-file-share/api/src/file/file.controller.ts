import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileService } from './file.service';
import { InitUploadDto, CompleteUploadDto, AbortUploadDto } from './dto';

@Controller('files')
export class FileController {
    constructor(private readonly fileService: FileService) { }

    @Post('init-upload')
    @UseGuards(AuthGuard('jwt'))
    async initUpload(@Body() dto: InitUploadDto, @Request() req) {
        return this.fileService.initUpload(dto, req.user?.id);
    }

    @Post('complete-upload')
    @UseGuards(AuthGuard('jwt'))
    async completeUpload(@Body() dto: CompleteUploadDto) {
        return this.fileService.completeUpload(dto);
    }

    @Post('abort-upload')
    @UseGuards(AuthGuard('jwt'))
    async abortUpload(@Body() dto: AbortUploadDto) {
        return this.fileService.abortUpload(dto);
    }

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async findAll() {
        return this.fileService.findAll();
    }

    @Get(':id')
    @UseGuards(AuthGuard('jwt'))
    async findOne(@Param('id') id: string) {
        return this.fileService.findById(id);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'))
    async delete(@Param('id') id: string) {
        return this.fileService.delete(id);
    }
}
