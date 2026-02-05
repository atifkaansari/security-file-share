import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Param,
    UseGuards,
    Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ShareLinkService } from './share-link.service';
import { CreateShareLinkDto, VerifyLinkDto } from './dto';

@Controller('links')
export class ShareLinkController {
    constructor(private readonly shareLinkService: ShareLinkService) { }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    async create(@Body() dto: CreateShareLinkDto) {
        return this.shareLinkService.create(dto);
    }

    @Post(':token/verify')
    async verify(
        @Param('token') token: string,
        @Body() dto: VerifyLinkDto,
        @Req() req: Request,
    ) {
        const ip = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        return this.shareLinkService.verify(token, dto, ip, userAgent);
    }

    @Get(':token/download')
    async download(@Param('token') token: string, @Req() req: Request) {
        const ip = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        return this.shareLinkService.download(token, ip, userAgent);
    }

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async findAll() {
        return this.shareLinkService.findAll();
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'))
    async deactivate(@Param('id') id: string) {
        return this.shareLinkService.deactivate(id);
    }
}
