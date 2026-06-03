import { IsString, IsOptional, IsEnum, IsArray, IsDateString, IsBoolean, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CampaignTypeDto {
  promotional  = 'promotional',
  loyalty      = 'loyalty',
  reactivation = 'reactivation',
  birthday     = 'birthday',
  seasonal     = 'seasonal',
  awareness    = 'awareness',
}

export enum CampaignChannelDto {
  whatsapp  = 'whatsapp',
  email     = 'email',
  instagram = 'instagram',
  facebook  = 'facebook',
  sms       = 'sms',
}

export class CreateCampaignDto {
  @ApiProperty() @IsString() @MinLength(3) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: CampaignTypeDto }) @IsEnum(CampaignTypeDto) type: CampaignTypeDto;
  @ApiProperty({ type: [String], enum: CampaignChannelDto }) @IsArray() channels: CampaignChannelDto[];

  @ApiPropertyOptional() @IsOptional() @IsString() targetSegment?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetTier?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() subject?: string;
  @ApiProperty() @IsString() @MinLength(10) message: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ctaText?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ctaUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: CampaignTypeDto }) @IsOptional() @IsEnum(CampaignTypeDto) type?: CampaignTypeDto;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() channels?: CampaignChannelDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() targetSegment?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetTier?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subject?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() message?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ctaText?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ctaUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
}

export class ReviewCampaignDto {
  @ApiProperty() @IsBoolean() approved: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() reviewNotes?: string;
}

export class ProposeAiCampaignDto {
  @ApiProperty() @IsString() @MinLength(3) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: CampaignTypeDto }) @IsEnum(CampaignTypeDto) type: CampaignTypeDto;
  @ApiProperty({ type: [String] }) @IsArray() channels: CampaignChannelDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() targetSegment?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetTier?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subject?: string;
  @ApiProperty() @IsString() message: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ctaText?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ctaUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
  @ApiProperty() @IsString() aiReason: string;
}
