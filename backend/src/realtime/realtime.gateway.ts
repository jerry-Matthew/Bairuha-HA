
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    path: '/socket.io',
})
export class RealtimeGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private logger: Logger = new Logger('RealtimeGateway');

    afterInit(server: Server) {
        this.logger.log('WebSocket Gateway initialized');
    }

    handleConnection(client: Socket, ...args: any[]) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('join_user_room')
    handleJoinUserRoom(
        @MessageBody() userId: string,
        @ConnectedSocket() client: Socket,
    ) {
        client.join(`user:${userId}`);
        this.logger.log(`Client ${client.id} joined user room: user:${userId}`);
    }

    // Method to be called by other services to broadcast events
    broadcastEntityStateChanged(payload: any) {
        this.server.emit('entity_state_changed', payload);
    }

    broadcastEntitiesCreated(payload: any) {
        this.server.emit('entities_created', payload);
    }
}
