import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { RoomTypeService } from './room-type.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('api/room-types')
export class RoomTypeController {
  constructor(private readonly roomTypeService: RoomTypeService) {}

  @Get()
  findAll() {
    return this.roomTypeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomTypeService.findOne(id);
  }

  @UseGuards(AdminGuard)
  @Post()
  create(@Body() data: any) {
    return this.roomTypeService.create(data);
  }

  @UseGuards(AdminGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.roomTypeService.update(id, data);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roomTypeService.remove(id);
  }
}
