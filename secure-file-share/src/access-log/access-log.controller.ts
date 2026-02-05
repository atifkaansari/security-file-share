import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessLogService } from './access-log.service';

@Controller('admin/logs')
@UseGuards(AuthGuard('jwt'))
export class AccessLogController {
    constructor(private readonly accessLogService: AccessLogService) { }

    @Get()
    async findAll(
        @Query('skip') skip?: string,
        @Query('take') take?: string,
        @Query('linkId') linkId?: string,
    ) {
        return this.accessLogService.findAll({
            skip: skip ? parseInt(skip, 10) : undefined,
            take: take ? parseInt(take, 10) : undefined,
            linkId,
        });
    }
}
