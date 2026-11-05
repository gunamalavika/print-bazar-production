import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private readonly logger;
    afterInit(server: Server): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinOperations(client: Socket): {
        event: string;
        room: string;
    };
    handleJoinOrders(client: Socket): {
        event: string;
        room: string;
    };
    handleJoinOrder(data: {
        orderId: string;
    }, client: Socket): {
        event: string;
        room: string;
    } | undefined;
    handleJoinUser(data: {
        userId: string;
    }, client: Socket): {
        event: string;
        room: string;
    } | undefined;
    handleOrderCreated(payload: any): void;
    handleOrderStatusChanged(payload: any): void;
    handleDesignerAssigned(payload: any): void;
    handleOperatorAssigned(payload: any): void;
    handleDesignCompleted(payload: any): void;
    handleProofApproved(payload: any): void;
    handleQCPass(payload: any): void;
    handleQCFail(payload: any): void;
}
