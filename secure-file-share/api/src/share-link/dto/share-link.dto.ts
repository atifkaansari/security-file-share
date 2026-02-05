import {
    IsString,
    IsOptional,
    IsInt,
    IsDateString,
    Min,
    MinLength,
} from 'class-validator';

export class CreateShareLinkDto {
    @IsString()
    fileId: string;

    @IsString()
    @MinLength(4)
    @IsOptional()
    password?: string;

    @IsDateString()
    @IsOptional()
    expireAt?: string;

    @IsInt()
    @Min(1)
    @IsOptional()
    downloadLimit?: number;
}

export class VerifyLinkDto {
    @IsString()
    @IsOptional()
    password?: string;
}
