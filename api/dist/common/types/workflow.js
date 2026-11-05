"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CUSTOMER_STATUS_LABELS = exports.STATUS_MAPPING = exports.CustomerVisibleStatus = exports.OrderStatus = void 0;
const client_1 = require("@prisma/client");
Object.defineProperty(exports, "OrderStatus", { enumerable: true, get: function () { return client_1.OrderStatus; } });
var CustomerVisibleStatus;
(function (CustomerVisibleStatus) {
    CustomerVisibleStatus["ORDER_CREATED"] = "ORDER_CREATED";
    CustomerVisibleStatus["PAYMENT_PENDING"] = "PAYMENT_PENDING";
    CustomerVisibleStatus["PAYMENT_CONFIRMED"] = "PAYMENT_CONFIRMED";
    CustomerVisibleStatus["ORDER_RECEIVED"] = "ORDER_RECEIVED";
    CustomerVisibleStatus["ARTWORK_BEING_CHECKED"] = "ARTWORK_BEING_CHECKED";
    CustomerVisibleStatus["DESIGN_IN_PROGRESS"] = "DESIGN_IN_PROGRESS";
    CustomerVisibleStatus["APPROVAL_REQUIRED"] = "APPROVAL_REQUIRED";
    CustomerVisibleStatus["PREPARING_ORDER"] = "PREPARING_ORDER";
    CustomerVisibleStatus["IN_PRODUCTION"] = "IN_PRODUCTION";
    CustomerVisibleStatus["QUALITY_CHECK_AND_PACKING"] = "QUALITY_CHECK_AND_PACKING";
    CustomerVisibleStatus["READY_TO_SHIP"] = "READY_TO_SHIP";
    CustomerVisibleStatus["READY_FOR_PICKUP"] = "READY_FOR_PICKUP";
    CustomerVisibleStatus["OUT_FOR_DELIVERY"] = "OUT_FOR_DELIVERY";
    CustomerVisibleStatus["DELIVERED"] = "DELIVERED";
    CustomerVisibleStatus["CANCELLED"] = "CANCELLED";
    CustomerVisibleStatus["ON_HOLD"] = "ON_HOLD";
})(CustomerVisibleStatus || (exports.CustomerVisibleStatus = CustomerVisibleStatus = {}));
exports.STATUS_MAPPING = {
    [client_1.OrderStatus.ORDER_CREATED]: CustomerVisibleStatus.ORDER_CREATED,
    [client_1.OrderStatus.PAYMENT_PENDING]: CustomerVisibleStatus.PAYMENT_PENDING,
    [client_1.OrderStatus.PAYMENT_CONFIRMED]: CustomerVisibleStatus.PAYMENT_CONFIRMED,
    [client_1.OrderStatus.ORDER_REVIEW]: CustomerVisibleStatus.ORDER_RECEIVED,
    [client_1.OrderStatus.ARTWORK_REVIEW]: CustomerVisibleStatus.ARTWORK_BEING_CHECKED,
    [client_1.OrderStatus.DESIGN_REQUIRED]: CustomerVisibleStatus.DESIGN_IN_PROGRESS,
    [client_1.OrderStatus.ARTWORK_APPROVED]: CustomerVisibleStatus.PREPARING_ORDER,
    [client_1.OrderStatus.CUSTOMER_APPROVAL_REQUIRED]: CustomerVisibleStatus.APPROVAL_REQUIRED,
    [client_1.OrderStatus.PRE_PRODUCTION_QC]: CustomerVisibleStatus.PREPARING_ORDER,
    [client_1.OrderStatus.PRODUCTION_QUEUE]: CustomerVisibleStatus.PREPARING_ORDER,
    [client_1.OrderStatus.PRINTING]: CustomerVisibleStatus.IN_PRODUCTION,
    [client_1.OrderStatus.FINISHING]: CustomerVisibleStatus.IN_PRODUCTION,
    [client_1.OrderStatus.QUALITY_CHECK]: CustomerVisibleStatus.QUALITY_CHECK_AND_PACKING,
    [client_1.OrderStatus.PACKING]: CustomerVisibleStatus.QUALITY_CHECK_AND_PACKING,
    [client_1.OrderStatus.READY_FOR_DISPATCH]: CustomerVisibleStatus.READY_TO_SHIP,
    [client_1.OrderStatus.OUT_FOR_DELIVERY]: CustomerVisibleStatus.OUT_FOR_DELIVERY,
    [client_1.OrderStatus.DELIVERED]: CustomerVisibleStatus.DELIVERED,
    [client_1.OrderStatus.CANCELLED]: CustomerVisibleStatus.CANCELLED,
    [client_1.OrderStatus.ON_HOLD]: CustomerVisibleStatus.ON_HOLD,
};
exports.CUSTOMER_STATUS_LABELS = {
    [CustomerVisibleStatus.ORDER_CREATED]: 'Order Placed',
    [CustomerVisibleStatus.PAYMENT_PENDING]: 'Payment Pending',
    [CustomerVisibleStatus.PAYMENT_CONFIRMED]: 'Payment Confirmed',
    [CustomerVisibleStatus.ORDER_RECEIVED]: 'Order Received & Under Review',
    [CustomerVisibleStatus.ARTWORK_BEING_CHECKED]: 'Artwork Preflight Check',
    [CustomerVisibleStatus.DESIGN_IN_PROGRESS]: 'Design in Progress',
    [CustomerVisibleStatus.APPROVAL_REQUIRED]: 'Proof Approval Required',
    [CustomerVisibleStatus.PREPARING_ORDER]: 'Preparing for Production',
    [CustomerVisibleStatus.IN_PRODUCTION]: 'Printing & Finishing',
    [CustomerVisibleStatus.QUALITY_CHECK_AND_PACKING]: 'Quality Inspection & Packing',
    [CustomerVisibleStatus.READY_TO_SHIP]: 'Packed & Ready to Dispatch',
    [CustomerVisibleStatus.READY_FOR_PICKUP]: 'Ready for Store Pickup',
    [CustomerVisibleStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
    [CustomerVisibleStatus.DELIVERED]: 'Delivered Successfully',
    [CustomerVisibleStatus.CANCELLED]: 'Order Cancelled',
    [CustomerVisibleStatus.ON_HOLD]: 'Order Temporarily on Hold',
};
//# sourceMappingURL=workflow.js.map