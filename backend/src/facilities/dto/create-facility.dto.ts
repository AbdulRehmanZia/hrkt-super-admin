import { IsEmail, IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateFacilityDto {
  @IsString()
  @IsNotEmpty({ message: 'Facility name is required' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  city: string;

  @IsInt({ message: 'Court limit must be an integer' })
  @Min(1, { message: 'Court limit must be at least 1' })
  courtLimit: number;

  @IsIn(['starter', 'pro', 'enterprise'], {
    message: 'Subscription plan must be starter, pro, or enterprise',
  })
  @IsNotEmpty({ message: 'Subscription plan is required' })
  subscriptionPlan: string;

  @IsString()
  @IsNotEmpty({ message: 'Admin name is required' })
  adminName: string;

  @IsEmail({}, { message: 'Enter a valid admin email address' })
  @IsNotEmpty({ message: 'Admin email is required' })
  adminEmail: string;
}
