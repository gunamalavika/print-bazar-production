"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var EventsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const event_emitter_1 = require("@nestjs/event-emitter");
let EventsGateway = EventsGateway_1 = class EventsGateway {
    server;
    logger = new common_1.Logger(EventsGateway_1.name);
    afterInit(server) {
        this.logger.log('🚀 WebSocket Gateway initialized on namespace /');
    }
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }
    handleJoinOperations(client) {
        client.join('operations');
        this.logger.log(`Client ${client.id} joined operations room`);
        return { event: 'joined', room: 'operations' };
    }
    handleJoinOrders(client) {
        client.join('orders');
        this.logger.log(`Client ${client.id} joined orders room`);
        return { event: 'joined', room: 'orders' };
    }
    handleJoinOrder(data, client) {
        if (data?.orderId) {
            client.join(`order:${data.orderId}`);
            this.logger.log(`Client ${client.id} joined room order:${data.orderId}`);
            return { event: 'joined', room: `order:${data.orderId}` };
        }
    }
    handleJoinUser(data, client) {
        if (data?.userId) {
            client.join(`user:${data.userId}`);
            this.logger.log(`Client ${client.id} joined user room user:${data.userId}`);
            return { event: 'joined', room: `user:${data.userId}` };
        }
    }
    handleOrderCreated(payload) {
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
        this.server.emit('operations:refresh', { trigger: 'order:created', ...payload });
    }
    handleOrderStatusChanged(payload) {
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
    handleDesignerAssigned(payload) {
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
    handleOperatorAssigned(payload) {
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
    handleDesignCompleted(payload) {
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
    handleProofApproved(payload) {
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
    handleQCPass(payload) {
        this.logger.log(`WS Broadcast qc.final.pass: ${payload?.orderNumber}`);
        this.server.to('operations').emit('qc:updated', { outcome: 'PASS', ...payload });
        this.server.emit('operations:refresh', { trigger: 'qc:pass', ...payload });
    }
    handleQCFail(payload) {
        this.logger.log(`WS Broadcast qc.final.fail: ${payload?.orderNumber}`);
        this.server.to('operations').emit('qc:updated', { outcome: 'FAIL', ...payload });
        this.server.emit('operations:refresh', { trigger: 'qc:fail', ...payload });
    }
};
exports.EventsGateway = EventsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], EventsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join:operations'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleJoinOperations", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join:orders'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleJoinOrders", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join:order'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleJoinOrder", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join:user'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleJoinUser", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleOrderCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.status.changed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleOrderStatusChanged", null);
__decorate([
    (0, event_emitter_1.OnEvent)('oe.designer.assigned'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleDesignerAssigned", null);
__decorate([
    (0, event_emitter_1.OnEvent)('oe.operator.assigned'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleOperatorAssigned", null);
__decorate([
    (0, event_emitter_1.OnEvent)('design.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleDesignCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('proof.approved'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleProofApproved", null);
__decorate([
    (0, event_emitter_1.OnEvent)('qc.final.pass'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleQCPass", null);
__decorate([
    (0, event_emitter_1.OnEvent)('qc.final.fail'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleQCFail", null);
exports.EventsGateway = EventsGateway = EventsGateway_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
            credentials: true,
        },
        namespace: '/',
    })
], EventsGateway);
//# sourceMappingURL=events.gateway.js.map