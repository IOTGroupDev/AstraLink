import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { GeoService } from './geo.service';
import { CitySuggestQueryDto } from './dto/city-suggest-query.dto';

@ApiTags('geo')
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Public()
  @Get('cities')
  @ApiOperation({ summary: 'Suggest cities with coordinates and timezone' })
  async cities(@Query() query: CitySuggestQueryDto) {
    return this.geoService.suggestCities(query.q, query.lang ?? 'ru');
  }
}
