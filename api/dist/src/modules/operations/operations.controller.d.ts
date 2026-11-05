import { OperationsService, OperationsDashboardFilters, AssignDesignerDto, AssignProductionOperatorDto, CreateOperationalNoteDto, UpdatePriorityDto, ReleaseToProductionDto } from './operations.service';
import { JwtPayload } from '../../common/types/roles';
export declare class OperationsController {
    private readonly operationsService;
    constructor(operationsService: OperationsService);
    getDashboard(): Promise<{
        totalActive: number;
        unassignedOrders: number;
        newIntakeOrders: number;
        designPending: number;
        productionPending: number;
        qcPending: number;
        paymentBlocked: number;
        packingReady: number;
        dispatchReady: number;
        onHold: number;
        atRiskOverdue: number;
        unassignedDesign: number;
        unassignedProduction: number;
        statusBreakdown: Record<string, number>;
    }>;
    listOrders(query: OperationsDashboardFilters): Promise<{
        data: {
            nextAction: import("./operations.service").OperationalNextAction;
            blockers: import("./operations.service").OperationalBlocker[];
            designAssignment: {
                id: string;
                taskType: import(".prisma/client").$Enums.AssignmentTaskType;
                assignedAt: Date;
                assignedUser: {
                    id: string;
                    fullName: string;
                    role: import(".prisma/client").$Enums.UserRole;
                };
            } | null;
            productionAssignment: {
                id: string;
                taskType: import(".prisma/client").$Enums.AssignmentTaskType;
                assignedAt: Date;
                assignedUser: {
                    id: string;
                    fullName: string;
                    role: import(".prisma/client").$Enums.UserRole;
                };
            } | null;
            assignedDesigner: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            assignedOperator: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            customer: {
                id: string;
                email: string;
                fullName: string;
                phone: string;
                companyName: string | null;
            };
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.OrderStatus;
            jobCards: {
                id: string;
                status: import(".prisma/client").$Enums.JobCardStatus;
                jobNumber: string;
                currentStation: string;
                operatorId: string | null;
            }[];
            orderNumber: string;
            customerStatus: import(".prisma/client").$Enums.CustomerVisibleStatus;
            deliveryMethod: import(".prisma/client").$Enums.DeliveryMethod;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            paidAmount: import("@prisma/client/runtime/library").Decimal;
            balanceAmount: import("@prisma/client/runtime/library").Decimal;
            paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
            priority: import(".prisma/client").$Enums.Priority;
            slaStatus: import(".prisma/client").$Enums.SlaStatus;
            dueAt: Date | null;
            items: {
                id: string;
                quantity: number;
                productName: string;
                specifications: import("@prisma/client/runtime/library").JsonValue;
                approvedArtworkVersionId: string | null;
                artworkVersions: {
                    id: string;
                    status: import(".prisma/client").$Enums.ArtworkStatus;
                    storageKey: string;
                    originalFileName: string;
                    versionNumber: number;
                    mimeType: string;
                    fileSize: number;
                    widthPixels: number | null;
                    heightPixels: number | null;
                    qualityStatus: string | null;
                    proofUrl: string | null;
                    isApproved: boolean;
                }[];
            }[];
            packages: {
                id: string;
                status: import(".prisma/client").$Enums.PackageStatus;
            }[];
            qcChecklists: {
                id: string;
                type: import(".prisma/client").$Enums.QCInspectionType;
                outcome: import(".prisma/client").$Enums.QCOutcome;
            }[];
            assignments: {
                id: string;
                taskType: import(".prisma/client").$Enums.AssignmentTaskType;
                assignedAt: Date;
                assignedUser: {
                    id: string;
                    fullName: string;
                    role: import(".prisma/client").$Enums.UserRole;
                };
            }[];
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    intakeOrders(query: OperationsDashboardFilters): Promise<{
        data: {
            nextAction: import("./operations.service").OperationalNextAction;
            blockers: import("./operations.service").OperationalBlocker[];
            designAssignment: {
                id: string;
                taskType: import(".prisma/client").$Enums.AssignmentTaskType;
                assignedAt: Date;
                assignedUser: {
                    id: string;
                    fullName: string;
                    role: import(".prisma/client").$Enums.UserRole;
                };
            } | null;
            productionAssignment: {
                id: string;
                taskType: import(".prisma/client").$Enums.AssignmentTaskType;
                assignedAt: Date;
                assignedUser: {
                    id: string;
                    fullName: string;
                    role: import(".prisma/client").$Enums.UserRole;
                };
            } | null;
            assignedDesigner: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            assignedOperator: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            customer: {
                id: string;
                email: string;
                fullName: string;
                phone: string;
                companyName: string | null;
            };
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.OrderStatus;
            jobCards: {
                id: string;
                status: import(".prisma/client").$Enums.JobCardStatus;
                jobNumber: string;
                currentStation: string;
                operatorId: string | null;
            }[];
            orderNumber: string;
            customerStatus: import(".prisma/client").$Enums.CustomerVisibleStatus;
            deliveryMethod: import(".prisma/client").$Enums.DeliveryMethod;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            paidAmount: import("@prisma/client/runtime/library").Decimal;
            balanceAmount: import("@prisma/client/runtime/library").Decimal;
            paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
            priority: import(".prisma/client").$Enums.Priority;
            slaStatus: import(".prisma/client").$Enums.SlaStatus;
            dueAt: Date | null;
            items: {
                id: string;
                quantity: number;
                productName: string;
                specifications: import("@prisma/client/runtime/library").JsonValue;
                approvedArtworkVersionId: string | null;
                artworkVersions: {
                    id: string;
                    status: import(".prisma/client").$Enums.ArtworkStatus;
                    storageKey: string;
                    originalFileName: string;
                    versionNumber: number;
                    mimeType: string;
                    fileSize: number;
                    widthPixels: number | null;
                    heightPixels: number | null;
                    qualityStatus: string | null;
                    proofUrl: string | null;
                    isApproved: boolean;
                }[];
            }[];
            packages: {
                id: string;
                status: import(".prisma/client").$Enums.PackageStatus;
            }[];
            qcChecklists: {
                id: string;
                type: import(".prisma/client").$Enums.QCInspectionType;
                outcome: import(".prisma/client").$Enums.QCOutcome;
            }[];
            assignments: {
                id: string;
                taskType: import(".prisma/client").$Enums.AssignmentTaskType;
                assignedAt: Date;
                assignedUser: {
                    id: string;
                    fullName: string;
                    role: import(".prisma/client").$Enums.UserRole;
                };
            }[];
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    unassignedDesign(query: OperationsDashboardFilters): Promise<{
        data: {
            nextAction: import("./operations.service").OperationalNextAction;
            blockers: import("./operations.service").OperationalBlocker[];
            designAssignment: {
                id: string;
                taskType: import(".prisma/client").$Enums.AssignmentTaskType;
                assignedAt: Date;
                assignedUser: {
                    id: string;
                    fullName: string;
                    role: import(".prisma/client").$Enums.UserRole;
                };
            } | null;
            productionAssignment: {
                id: string;
                taskType: import(".prisma/client").$Enums.AssignmentTaskType;
                assignedAt: Date;
                assignedUser: {
                    id: string;
                    fullName: string;
                    role: import(".prisma/client").$Enums.UserRole;
                };
            } | null;
            assignedDesigner: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            assignedOperator: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            customer: {
                id: string;
                email: string;
                fullName: string;
                phone: string;
                companyName: string | null;
            };
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.OrderStatus;
            jobCards: {
                id: string;
                status: import(".prisma/client").$Enums.JobCardStatus;
                jobNumber: string;
                currentStation: string;
                operatorId: string | null;
            }[];
            orderNumber: string;
            customerStatus: import(".prisma/client").$Enums.CustomerVisibleStatus;
            deliveryMethod: import(".prisma/client").$Enums.DeliveryMethod;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            paidAmount: import("@prisma/client/runtime/library").Decimal;
            balanceAmount: import("@prisma/client/runtime/library").Decimal;
            paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
            priority: import(".prisma/client").$Enums.Priority;
            slaStatus: import(".prisma/client").$Enums.SlaStatus;
            dueAt: Date | null;
            items: {
                id: string;
                quantity: number;
                productName: string;
                specifications: import("@prisma/client/runtime/library").JsonValue;
                approvedArtworkVersionId: string | null;
                artworkVersions: {
                    id: string;
                    status: import(".prisma/client").$Enums.ArtworkStatus;
                    storageKey: string;
                    originalFileName: string;
                    versionNumber: number;
                    mimeType: string;
                    fileSize: number;
                    widthPixels: number | null;
                    heightPixels: number | null;
                    qualityStatus: string | null;
                    proofUrl: string | null;
                    isApproved: boolean;
                }[];
            }[];
            packages: {
                id: string;
                status: import(".prisma/client").$Enums.PackageStatus;
            }[];
            qcChecklists: {
                id: string;
                type: import(".prisma/client").$Enums.QCInspectionType;
                outcome: import(".prisma/client").$Enums.QCOutcome;
            }[];
            assignments: {
                id: string;
                taskType: import(".prisma/client").$Enums.AssignmentTaskType;
                assignedAt: Date;
                assignedUser: {
                    id: string;
                    fullName: string;
                    role: import(".prisma/client").$Enums.UserRole;
                };
            }[];
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    unassignedProduction(query: OperationsDashboardFilters): Promise<{
        data: {
            nextAction: import("./operations.service").OperationalNextAction;
            blockers: import("./operations.service").OperationalBlocker[];
            designAssignment: {
                id: string;
                taskType: import(".prisma/client").$Enums.AssignmentTaskType;
                assignedAt: Date;
                assignedUser: {
                    id: string;
                    fullName: string;
                    role: import(".prisma/client").$Enums.UserRole;
                };
            } | null;
            productionAssignment: {
                id: string;
                taskType: import(".prisma/client").$Enums.AssignmentTaskType;
                assignedAt: Date;
                assignedUser: {
                    id: string;
                    fullName: string;
                    role: import(".prisma/client").$Enums.UserRole;
                };
            } | null;
            assignedDesigner: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            assignedOperator: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            customer: {
                id: string;
                email: string;
                fullName: string;
                phone: string;
                companyName: string | null;
            };
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.OrderStatus;
            jobCards: {
                id: string;
                status: import(".prisma/client").$Enums.JobCardStatus;
                jobNumber: string;
                currentStation: string;
                operatorId: string | null;
            }[];
            orderNumber: string;
            customerStatus: import(".prisma/client").$Enums.CustomerVisibleStatus;
            deliveryMethod: import(".prisma/client").$Enums.DeliveryMethod;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            paidAmount: import("@prisma/client/runtime/library").Decimal;
            balanceAmount: import("@prisma/client/runtime/library").Decimal;
            paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
            priority: import(".prisma/client").$Enums.Priority;
            slaStatus: import(".prisma/client").$Enums.SlaStatus;
            dueAt: Date | null;
            items: {
                id: string;
                quantity: number;
                productName: string;
                specifications: import("@prisma/client/runtime/library").JsonValue;
                approvedArtworkVersionId: string | null;
                artworkVersions: {
                    id: string;
                    status: import(".prisma/client").$Enums.ArtworkStatus;
                    storageKey: string;
                    originalFileName: string;
                    versionNumber: number;
                    mimeType: string;
                    fileSize: number;
                    widthPixels: number | null;
                    heightPixels: number | null;
                    qualityStatus: string | null;
                    proofUrl: string | null;
                    isApproved: boolean;
                }[];
            }[];
            packages: {
                id: string;
                status: import(".prisma/client").$Enums.PackageStatus;
            }[];
            qcChecklists: {
                id: string;
                type: import(".prisma/client").$Enums.QCInspectionType;
                outcome: import(".prisma/client").$Enums.QCOutcome;
            }[];
            assignments: {
                id: string;
                taskType: import(".prisma/client").$Enums.AssignmentTaskType;
                assignedAt: Date;
                assignedUser: {
                    id: string;
                    fullName: string;
                    role: import(".prisma/client").$Enums.UserRole;
                };
            }[];
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    blockedOrders(query: OperationsDashboardFilters): Promise<{
        data: {
            nextAction: import("./operations.service").OperationalNextAction;
            blockers: import("./operations.service").OperationalBlocker[];
            designAssignment: {
                id: string;
                taskType: import(".prisma/client").$Enums.AssignmentTaskType;
                assignedAt: Date;
                assignedUser: {
                    id: string;
                    fullName: string;
                    role: import(".prisma/client").$Enums.UserRole;
                };
            } | null;
            productionAssignment: {
                id: string;
                taskType: import(".prisma/client").$Enums.AssignmentTaskType;
                assignedAt: Date;
                assignedUser: {
                    id: string;
                    fullName: string;
                    role: import(".prisma/client").$Enums.UserRole;
                };
            } | null;
            assignedDesigner: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            assignedOperator: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            customer: {
                id: string;
                email: string;
                fullName: string;
                phone: string;
                companyName: string | null;
            };
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.OrderStatus;
            jobCards: {
                id: string;
                status: import(".prisma/client").$Enums.JobCardStatus;
                jobNumber: string;
                currentStation: string;
                operatorId: string | null;
            }[];
            orderNumber: string;
            customerStatus: import(".prisma/client").$Enums.CustomerVisibleStatus;
            deliveryMethod: import(".prisma/client").$Enums.DeliveryMethod;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            paidAmount: import("@prisma/client/runtime/library").Decimal;
            balanceAmount: import("@prisma/client/runtime/library").Decimal;
            paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
            priority: import(".prisma/client").$Enums.Priority;
            slaStatus: import(".prisma/client").$Enums.SlaStatus;
            dueAt: Date | null;
            items: {
                id: string;
                quantity: number;
                productName: string;
                specifications: import("@prisma/client/runtime/library").JsonValue;
                approvedArtworkVersionId: string | null;
                artworkVersions: {
                    id: string;
                    status: import(".prisma/client").$Enums.ArtworkStatus;
                    storageKey: string;
                    originalFileName: string;
                    versionNumber: number;
                    mimeType: string;
                    fileSize: number;
                    widthPixels: number | null;
                    heightPixels: number | null;
                    qualityStatus: string | null;
                    proofUrl: string | null;
                    isApproved: boolean;
                }[];
            }[];
            packages: {
                id: string;
                status: import(".prisma/client").$Enums.PackageStatus;
            }[];
            qcChecklists: {
                id: string;
                type: import(".prisma/client").$Enums.QCInspectionType;
                outcome: import(".prisma/client").$Enums.QCOutcome;
            }[];
            assignments: {
                id: string;
                taskType: import(".prisma/client").$Enums.AssignmentTaskType;
                assignedAt: Date;
                assignedUser: {
                    id: string;
                    fullName: string;
                    role: import(".prisma/client").$Enums.UserRole;
                };
            }[];
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getOrderDetail(id: string): Promise<{
        nextAction: import("./operations.service").OperationalNextAction;
        blockers: import("./operations.service").OperationalBlocker[];
        activeDesignAssignment: ({
            assignedUser: {
                id: string;
                email: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
                department: import(".prisma/client").$Enums.Department | null;
            };
            assignedByUser: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            };
        } & {
            id: string;
            reason: string | null;
            createdAt: Date;
            orderId: string;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AssignmentStatus;
            completedAt: Date | null;
            taskType: import(".prisma/client").$Enums.AssignmentTaskType;
            assignedUserId: string;
            assignedByUserId: string;
            assignedAt: Date;
        }) | null;
        activeProductionAssignment: ({
            assignedUser: {
                id: string;
                email: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
                department: import(".prisma/client").$Enums.Department | null;
            };
            assignedByUser: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            };
        } & {
            id: string;
            reason: string | null;
            createdAt: Date;
            orderId: string;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AssignmentStatus;
            completedAt: Date | null;
            taskType: import(".prisma/client").$Enums.AssignmentTaskType;
            assignedUserId: string;
            assignedByUserId: string;
            assignedAt: Date;
        }) | null;
        assignmentHistory: ({
            assignedUser: {
                id: string;
                email: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
                department: import(".prisma/client").$Enums.Department | null;
            };
            assignedByUser: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            };
        } & {
            id: string;
            reason: string | null;
            createdAt: Date;
            orderId: string;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AssignmentStatus;
            completedAt: Date | null;
            taskType: import(".prisma/client").$Enums.AssignmentTaskType;
            assignedUserId: string;
            assignedByUserId: string;
            assignedAt: Date;
        })[];
        customer: {
            addresses: {
                id: string;
                createdAt: Date;
                phone: string;
                updatedAt: Date;
                customerId: string;
                isDefault: boolean;
                type: string;
                postalCode: string;
                contactName: string;
                street: string;
                landmark: string | null;
                city: string;
                state: string;
                country: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            email: string;
            fullName: string;
            phone: string;
            updatedAt: Date;
            companyName: string | null;
            gstin: string | null;
            userId: string | null;
        };
        operationalNotes: {
            id: string;
            createdAt: Date;
            orderId: string;
            content: string;
            authorId: string;
            authorName: string;
            authorRole: import(".prisma/client").$Enums.UserRole;
        }[];
        shippingAddress: {
            id: string;
            createdAt: Date;
            phone: string;
            updatedAt: Date;
            customerId: string;
            isDefault: boolean;
            type: string;
            postalCode: string;
            contactName: string;
            street: string;
            landmark: string | null;
            city: string;
            state: string;
            country: string;
        } | null;
        billingAddress: {
            id: string;
            createdAt: Date;
            phone: string;
            updatedAt: Date;
            customerId: string;
            isDefault: boolean;
            type: string;
            postalCode: string;
            contactName: string;
            street: string;
            landmark: string | null;
            city: string;
            state: string;
            country: string;
        } | null;
        items: ({
            product: {
                id: string;
                name: string;
                slug: string;
                sku: string;
            };
            artworkVersions: {
                id: string;
                createdAt: Date;
                status: import(".prisma/client").$Enums.ArtworkStatus;
                storageKey: string;
                orderItemId: string;
                customerNotes: string | null;
                originalFileName: string;
                versionNumber: number;
                mimeType: string;
                fileSize: number;
                checksum: string;
                resolutionDpi: number | null;
                widthMm: import("@prisma/client/runtime/library").Decimal | null;
                heightMm: import("@prisma/client/runtime/library").Decimal | null;
                widthPixels: number | null;
                heightPixels: number | null;
                actualMegapixels: number | null;
                qualityStatus: string | null;
                warningAccepted: boolean;
                hasBleed: boolean | null;
                colorProfile: string | null;
                proofUrl: string | null;
                isApproved: boolean;
                prepressNotes: string | null;
                uploadedBy: string;
                approvedAt: Date | null;
            }[];
            jobCards: ({
                machine: {
                    id: string;
                    name: string;
                    code: string;
                    type: string;
                } | null;
                issues: {
                    id: string;
                    createdAt: Date;
                    description: string;
                    jobCardId: string;
                    isResolved: boolean;
                    reasonCode: string;
                    reportedBy: string;
                    resolvedBy: string | null;
                    resolvedAt: Date | null;
                }[];
                operator: {
                    id: string;
                    fullName: string;
                    role: import(".prisma/client").$Enums.UserRole;
                } | null;
            } & {
                id: string;
                createdAt: Date;
                orderId: string;
                updatedAt: Date;
                status: import(".prisma/client").$Enums.JobCardStatus;
                approvedArtworkVersionId: string | null;
                orderItemId: string;
                priority: import(".prisma/client").$Enums.Priority;
                dueAt: Date;
                jobNumber: string;
                preHoldStatus: import(".prisma/client").$Enums.JobCardStatus | null;
                currentStation: string;
                machineId: string | null;
                operatorId: string | null;
                operationSequence: import("@prisma/client/runtime/library").JsonValue;
                technicalSpecs: import("@prisma/client/runtime/library").JsonValue;
                startedAt: Date | null;
                completedAt: Date | null;
            })[];
        } & {
            id: string;
            createdAt: Date;
            orderId: string;
            updatedAt: Date;
            sku: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            productId: string;
            totalPrice: import("@prisma/client/runtime/library").Decimal;
            productName: string;
            specifications: import("@prisma/client/runtime/library").JsonValue;
            personalizationData: import("@prisma/client/runtime/library").JsonValue | null;
            approvedArtworkVersionId: string | null;
            designNotes: string | null;
        })[];
        payments: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.PaymentStatus;
            amount: import("@prisma/client/runtime/library").Decimal;
            transactionId: string;
            method: import(".prisma/client").$Enums.PaymentMethod;
            capturedAt: Date | null;
        }[];
        invoices: {
            id: string;
            grandTotal: import("@prisma/client/runtime/library").Decimal;
            invoiceNumber: string;
            pdfUrl: string | null;
            issuedAt: Date;
        }[];
        packages: ({
            shipment: {
                id: string;
                status: import(".prisma/client").$Enums.ShipmentStatus;
                shipmentNumber: string;
                courierName: string;
                awbNumber: string;
                trackingUrl: string | null;
                dispatchedAt: Date | null;
                deliveredAt: Date | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            orderId: string;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.PackageStatus;
            packageNumber: string;
            sequenceNumber: number;
            totalPackages: number;
            grossWeightGrams: number;
            lengthCm: import("@prisma/client/runtime/library").Decimal;
            widthCm: import("@prisma/client/runtime/library").Decimal;
            heightCm: import("@prisma/client/runtime/library").Decimal;
            labelUrl: string | null;
            barcode: string;
            shipmentId: string | null;
        })[];
        statusHistory: ({
            changedBy: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
        } & {
            id: string;
            reason: string | null;
            createdAt: Date;
            orderId: string;
            department: import(".prisma/client").$Enums.Department | null;
            notes: string | null;
            fromStatus: import(".prisma/client").$Enums.OrderStatus | null;
            toStatus: import(".prisma/client").$Enums.OrderStatus;
            durationMinutes: number | null;
            changedById: string | null;
        })[];
        slaRecords: {
            id: string;
            createdAt: Date;
            orderId: string;
            updatedAt: Date;
            jobCardId: string | null;
            entityType: string;
            currentStatus: import(".prisma/client").$Enums.SlaStatus;
            targetDueAt: Date;
            isBreached: boolean;
            escalatedTo: string | null;
        }[];
        qcChecklists: ({
            inspector: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            };
        } & {
            id: string;
            createdAt: Date;
            orderId: string;
            notes: string | null;
            type: import(".prisma/client").$Enums.QCInspectionType;
            items: import("@prisma/client/runtime/library").JsonValue;
            jobCardId: string | null;
            outcome: import(".prisma/client").$Enums.QCOutcome;
            inspectorId: string;
            defects: import(".prisma/client").$Enums.DefectCategory[];
        })[];
        assignments: ({
            assignedUser: {
                id: string;
                email: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
                department: import(".prisma/client").$Enums.Department | null;
            };
            assignedByUser: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            };
        } & {
            id: string;
            reason: string | null;
            createdAt: Date;
            orderId: string;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AssignmentStatus;
            completedAt: Date | null;
            taskType: import(".prisma/client").$Enums.AssignmentTaskType;
            assignedUserId: string;
            assignedByUserId: string;
            assignedAt: Date;
        })[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        customerId: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        orderNumber: string;
        sourceChannel: import(".prisma/client").$Enums.OrderChannel;
        customerStatus: import(".prisma/client").$Enums.CustomerVisibleStatus;
        deliveryMethod: import(".prisma/client").$Enums.DeliveryMethod;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        shippingAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        paidAmount: import("@prisma/client/runtime/library").Decimal;
        balanceAmount: import("@prisma/client/runtime/library").Decimal;
        paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
        priority: import(".prisma/client").$Enums.Priority;
        slaStatus: import(".prisma/client").$Enums.SlaStatus;
        dueAt: Date | null;
        customerNotes: string | null;
        internalNotes: string | null;
        shippingAddressId: string | null;
        billingAddressId: string | null;
    }>;
    getTimeline(id: string): Promise<{
        statusHistory: ({
            changedBy: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
        } & {
            id: string;
            reason: string | null;
            createdAt: Date;
            orderId: string;
            department: import(".prisma/client").$Enums.Department | null;
            notes: string | null;
            fromStatus: import(".prisma/client").$Enums.OrderStatus | null;
            toStatus: import(".prisma/client").$Enums.OrderStatus;
            durationMinutes: number | null;
            changedById: string | null;
        })[];
        auditLogs: ({
            actor: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
        } & {
            id: string;
            actorType: string;
            action: string;
            entity: string;
            entityId: string;
            previousState: import("@prisma/client/runtime/library").JsonValue | null;
            newState: import("@prisma/client/runtime/library").JsonValue | null;
            reason: string | null;
            ipAddress: string | null;
            userAgent: string | null;
            createdAt: Date;
            actorId: string | null;
            orderId: string | null;
        })[];
        assignments: ({
            assignedUser: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            };
            assignedByUser: {
                id: string;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
            };
        } & {
            id: string;
            reason: string | null;
            createdAt: Date;
            orderId: string;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AssignmentStatus;
            completedAt: Date | null;
            taskType: import(".prisma/client").$Enums.AssignmentTaskType;
            assignedUserId: string;
            assignedByUserId: string;
            assignedAt: Date;
        })[];
        notes: {
            id: string;
            createdAt: Date;
            orderId: string;
            content: string;
            authorId: string;
            authorName: string;
            authorRole: import(".prisma/client").$Enums.UserRole;
        }[];
    }>;
    assignDesigner(id: string, body: AssignDesignerDto, user: JwtPayload): Promise<{
        assignedUser: {
            id: string;
            email: string;
            fullName: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
        assignedByUser: {
            id: string;
            fullName: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    } & {
        id: string;
        reason: string | null;
        createdAt: Date;
        orderId: string;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.AssignmentStatus;
        completedAt: Date | null;
        taskType: import(".prisma/client").$Enums.AssignmentTaskType;
        assignedUserId: string;
        assignedByUserId: string;
        assignedAt: Date;
    }>;
    assignProductionOperator(id: string, body: AssignProductionOperatorDto, user: JwtPayload): Promise<{
        assignedUser: {
            id: string;
            email: string;
            fullName: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
        assignedByUser: {
            id: string;
            fullName: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    } & {
        id: string;
        reason: string | null;
        createdAt: Date;
        orderId: string;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.AssignmentStatus;
        completedAt: Date | null;
        taskType: import(".prisma/client").$Enums.AssignmentTaskType;
        assignedUserId: string;
        assignedByUserId: string;
        assignedAt: Date;
    }>;
    addNote(id: string, body: CreateOperationalNoteDto, user: JwtPayload): Promise<{
        id: string;
        createdAt: Date;
        orderId: string;
        content: string;
        authorId: string;
        authorName: string;
        authorRole: import(".prisma/client").$Enums.UserRole;
    }>;
    updatePriority(id: string, body: UpdatePriorityDto, user: JwtPayload): Promise<{
        id: string;
        orderNumber: string;
        priority: import(".prisma/client").$Enums.Priority;
    }>;
    getDesigners(): Promise<{
        id: string;
        fullName: string;
        email: string;
        department: import(".prisma/client").$Enums.Department | null;
        isActive: boolean;
        activeAssignments: number;
    }[]>;
    getOperators(): Promise<{
        id: string;
        fullName: string;
        email: string;
        department: import(".prisma/client").$Enums.Department | null;
        isActive: boolean;
        activeJobCards: number;
        activeAssignments: number;
    }[]>;
    getOrderReadiness(id: string): Promise<import("./operations.service").OrderReadinessReport>;
    releaseToProduction(id: string, body: ReleaseToProductionDto, user: JwtPayload): Promise<{
        success: boolean;
        orderId: string;
        orderNumber: string;
        status: "PRODUCTION_QUEUE";
        sizeValidation: import("./operations.service").SizeValidationResult;
        jobCards: {
            id: string;
            createdAt: Date;
            orderId: string;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.JobCardStatus;
            approvedArtworkVersionId: string | null;
            orderItemId: string;
            priority: import(".prisma/client").$Enums.Priority;
            dueAt: Date;
            jobNumber: string;
            preHoldStatus: import(".prisma/client").$Enums.JobCardStatus | null;
            currentStation: string;
            machineId: string | null;
            operatorId: string | null;
            operationSequence: import("@prisma/client/runtime/library").JsonValue;
            technicalSpecs: import("@prisma/client/runtime/library").JsonValue;
            startedAt: Date | null;
            completedAt: Date | null;
        }[];
        releasedBy: string;
    }>;
}
