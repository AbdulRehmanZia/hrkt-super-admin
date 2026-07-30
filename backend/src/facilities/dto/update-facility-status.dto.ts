import { IsEnum } from 'class-validator';
import { FacilityStatus } from '../../schemas';

export class UpdateFacilityStatusDto {
  @IsEnum(FacilityStatus)
  status: FacilityStatus;
}
