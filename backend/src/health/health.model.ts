import { ApiProperty } from '@nestjs/swagger';

export class HealthModel {
  @ApiProperty({ enum: ['ok'] })
  status!: 'ok';
  service!: string;
  @ApiProperty({ enum: ['up', 'down'] })
  database!: 'up' | 'down';
}
