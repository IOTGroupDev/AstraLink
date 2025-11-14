import { Module } from '@nestjs/common';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ServicesModule } from '../services/services.module';
import { ConnectionEventListener } from './listeners/connection-event.listener';

@Module({
  imports: [PrismaModule, ServicesModule],
  controllers: [ConnectionsController],
  providers: [ConnectionsService, ConnectionEventListener],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}
