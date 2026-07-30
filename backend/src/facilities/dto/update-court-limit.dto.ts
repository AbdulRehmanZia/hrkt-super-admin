import { IsInt, Min } from 'class-validator';

export class UpdateCourtLimitDto {
  @IsInt()
  @Min(1)
  courtLimit: number;
}
