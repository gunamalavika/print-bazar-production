import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  afterInit(server: Server) {
    this.logger.log('🚀 WebSocket Gateway initialized on namespace /');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─── Client Room Subscriptions ──────────────────────────────────────────

  @SubscribeMessage('join:operations')
  handleJoinOperations(@ConnectedSocket() client: Socket) {
    client.join('operations');
    this.logger.log(`Client ${client.id} joined operations room`);
    return { event: 'joined', room: 'operations' };
  }

  @SubscribeMessage('join:orders')
  handleJoinOrders(@ConnectedSocket() client: Socket) {
    client.join('orders');
    this.logger.log(`Client ${client.id} joined orders room`);
    return { event: 'joined', room: 'orders' };
  }

  @SubscribeMessage('join:order')
  handleJoinOrder(
    @MessageBody() data: { orderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data?.orderId) {
      client.join(`order:${data.orderId}`);
      this.logger.log(`Client ${client.id} joined room order:${data.orderId}`);
      return { event: 'joined', room: `order:${data.orderId}` };
    }
  }

  @SubscribeMessage('join:user')
  handleJoinUser(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data?.userId) {
      client.join(`user:${data.userId}`);
      this.logger.log(`Client ${client.id} joined user room user:${data.userId}`);
      return { event: 'joined', room: `user:${data.userId}` };
    }
  }

  // ─── EventEmitter Listeners -> Real-Time WebSocket Broadcasts ─────────

  @OnEvent('order.created')
  handleOrderCreated(payload: any) {
    this.logger.log(`WS Broadcast order:created: ${payload?.orderNumber || payload?.orderId}`);
    this.server.to('operations').to('orders').emit('order:created', {
      type: 'ORDER_CREATED',
      orderId: payload?.orderId,
      orderNumber: payload?.orderNumber,
      totalAmount: payload?.totalAmount,
      customerName: payload?.customerName,
      timestamp: new Date().toISOString(),
      payload,
    });
    // Global broadcast for operational dashboards
    this.server.emit('operations:refresh', { trigger: 'order:created', ...payload });
  }

  @OnEvent('order.status.changed')
  handleOrderStatusChanged(payload: any) {
    this.logger.log(`WS Broadcast order:updated (${payload?.toStatus}): ${payload?.orderNumber || payload?.orderId}`);
    const data = {
      type: 'ORDER_STATUS_CHANGED',
      orderId: payload?.orderId,
      orderNumber: payload?.orderNumber,
      fromStatus: payload?.fromStatus,
      toStatus: payload?.toStatus,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.server.to('operations').to('orders').emit('order:updated', data);
    if (payload?.orderId) {
      this.server.to(`order:${payload.orderId}`).emit('order:updated', data);
    }
    this.server.emit('operations:refresh', { trigger: 'order:updated', ...payload });
  }

  @OnEvent('oe.designer.assigned')
  handleDesignerAssigned(payload: any) {
    this.logger.log(`WS Broadcast oe.designer.assigned: ${payload?.orderNumber} -> Designer ${payload?.designerId}`);
    const data = {
      type: 'DESIGNER_ASSIGNED',
      orderId: payload?.orderId,
      orderNumber: payload?.orderNumber,
      designerId: payload?.designerId,
      assignedBy: payload?.assignedBy,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.server.to('operations').emit('order:assigned', data);
    if (payload?.designerId) {
      this.server.to(`user:${payload.designerId}`).emit('assignment:received', data);
    }
    this.server.emit('operations:refresh', { trigger: 'designer:assigned', ...payload });
  }

  @OnEvent('oe.operator.assigned')
  handleOperatorAssigned(payload: any) {
    this.logger.log(`WS Broadcast oe.operator.assigned: ${payload?.orderNumber} -> Operator ${payload?.operatorId}`);
    const data = {
      type: 'OPERATOR_ASSIGNED',
      orderId: payload?.orderId,
      orderNumber: payload?.orderNumber,
      operatorId: payload?.operatorId,
      assignedBy: payload?.assignedBy,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.server.to('operations').emit('order:assigned', data);
    if (payload?.operatorId) {
      this.server.to(`user:${payload.operatorId}`).emit('assignment:received', data);
    }
    this.server.emit('operations:refresh', { trigger: 'operator:assigned', ...payload });
  }

  @OnEvent('design.completed')
  handleDesignCompleted(payload: any) {
    this.logger.log(`WS Broadcast design.completed: ${payload?.orderNumber}`);
    const data = {
      type: 'DESIGN_COMPLETED',
      orderId: payload?.orderId,
      orderNumber: payload?.orderNumber,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.server.to('operations').emit('order:updated', data);
    this.server.emit('operations:refresh', { trigger: 'design:completed', ...payload });
  }

  @OnEvent('proof.approved')
  handleProofApproved(payload: any) {
    this.logger.log(`WS Broadcast proof.approved: ${payload?.orderNumber}`);
    const data = {
      type: 'PROOF_APPROVED',
      orderId: payload?.orderId,
      orderNumber: payload?.orderNumber,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.server.to('operations').emit('order:updated', data);
    this.server.emit('operations:refresh', { trigger: 'proof:approved', ...payload });
  }

  @OnEvent('qc.final.pass')
  handleQCPass(payload: any) {
    this.logger.log(`WS Broadcast qc.final.pass: ${payload?.orderNumber}`);
    this.server.to('operations').emit('qc:updated', { outcome: 'PASS', ...payload });
    this.server.emit('operations:refresh', { trigger: 'qc:pass', ...payload });
  }

  @OnEvent('qc.final.fail')
  handleQCFail(payload: any) {
    this.logger.log(`WS Broadcast qc.final.fail: ${payload?.orderNumber}`);
    this.server.to('operations').emit('qc:updated', { outcome: 'FAIL', ...payload });
    this.server.emit('operations:refresh', { trigger: 'qc:fail', ...payload });
  }
}
