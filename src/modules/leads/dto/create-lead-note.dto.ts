import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLeadNoteDto {
  @ApiProperty({ example: 'Customer called and prefers budget hotels in Cox\'s Bazar.' })
  @IsString()
  @IsNotEmpty()
  content!: string;
}

