import { Module } from '@nestjs/common';
import { SwissController } from './swiss.controller';
import { SwissService } from './swiss.service';
import { ServicesModule } from '../../services/services.module';

@Module({
  imports: [ServicesModule],
  controllers: [SwissController],
  providers: [SwissService],
  exports: [SwissService],
})
export class SwissModule {}
