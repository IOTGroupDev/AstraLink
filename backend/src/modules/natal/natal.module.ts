import { Module } from '@nestjs/common';
import { NatalController } from './natal.controller';
import { NatalService } from './natal.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { SupabaseModule } from '@/supabase/supabase.module';
import { ServicesModule } from '@/services/services.module';
import { GeoModule } from '@/modules/geo/geo.module';

@Module({
  imports: [PrismaModule, SupabaseModule, ServicesModule, GeoModule],
  controllers: [NatalController],
  providers: [NatalService],
  exports: [NatalService],
})
export class NatalModule {}
