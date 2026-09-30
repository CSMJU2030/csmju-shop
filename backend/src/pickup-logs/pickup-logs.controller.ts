import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { PickupLogsService } from './pickup-logs.service.js';
import {
  CreatePickupLogDto,
  QueryPickupLogDto,
  VerifyPickupCodeDto,
} from './dto/pickup-log.dto.js';

@Controller('v1/pickup-logs')
export class PickupLogsController {
  constructor(private readonly pickupLogsService: PickupLogsService) {}

  /** ต้องมาก่อน :id */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verify(@Body() dto: VerifyPickupCodeDto) {
    return this.pickupLogsService.verify(dto);
  }

  @Get()
  findAll(@Query() query: QueryPickupLogDto) {
    return this.pickupLogsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pickupLogsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePickupLogDto) {
    return this.pickupLogsService.create(dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pickupLogsService.remove(id);
  }
}
