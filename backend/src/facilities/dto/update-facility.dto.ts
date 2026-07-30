import { IsString, IsNotEmpty, IsInt, Min, IsOptional } from 'class-validator';

export class UpdateFacilityDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  city?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  courtLimit?: number;
}
