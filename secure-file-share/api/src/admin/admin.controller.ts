import {
    Controller,
    Get,
    Delete,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('files')
    async getFiles(
        @Query('skip') skip?: string,
        @Query('take') take?: string,
        @Query('search') search?: string,
    ) {
        return this.adminService.getFiles({
            skip: skip ? parseInt(skip, 10) : undefined,
            take: take ? parseInt(take, 10) : undefined,
            search,
        });
    }

    @Delete('files/:id')
    @HttpCode(HttpStatus.OK)
    async deleteFile(@Param('id') id: string) {
        return this.adminService.deleteFile(id);
    }

    @Get('stats')
    async getStats() {
        return this.adminService.getStats();
    }

    @Get('logs')
    async getLogs(
        @Query('skip') skip?: string,
        @Query('take') take?: string,
        @Query('action') action?: 'VIEW' | 'DOWNLOAD',
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.adminService.getLogs({
            skip: skip ? parseInt(skip, 10) : undefined,
            take: take ? parseInt(take, 10) : undefined,
            action,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        });
    }
}
