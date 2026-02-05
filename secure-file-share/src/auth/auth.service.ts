import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
            },
        });

        const token = this.generateToken(user.id, user.email, user.role);

        return {
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
            accessToken: token,
        };
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const token = this.generateToken(user.id, user.email, user.role);

        return {
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
            accessToken: token,
        };
    }

    async validateUser(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        return user;
    }

    private generateToken(userId: string, email: string, role: string): string {
        return this.jwtService.sign({
            sub: userId,
            email,
            role,
        });
    }
}
