import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  JobCardStatus,
  OrderStatus,
  ProductionColumnType,
  UserRole,
  Priority,
  ArtworkStatus,
  AssignmentTaskType,
  AssignmentStatus,
  Prisma,
} from '@prisma/client';
import { JwtPayload } from '../../common/types/roles';

export interface BoardFiltersDto {
  search?: string;
  machineId?: string;
  operatorId?: string;
  priority?: Priority;
  slaStatus?: 'ON_TIME' | 'DUE_SOON' | 'OVERDUE';
  columnKey?: string;
}

export interface TransitionJobDto {
  targetColumnKey: string;
  targetStatus?: string;
  reason?: string;
  machineId?: string;
  operatorId?: string;
  managerOverrideReason?: string;
}

export interface CreateColumnDto {
  name: string;
  key?: string;
  description?: string;
  type?: ProductionColumnType;
  mappedStatus?: OrderStatus;
  mappedStation?: string;
  sortOrder?: number;
  color?: string;
}

export interface UpdateColumnDto {
  name?: string;
  description?: string;
  type?: ProductionColumnType;
  mappedStatus?: OrderStatus;
  mappedStation?: string;
  sortOrder?: number;
  color?: string;
  isActive?: boolean;
}

export interface KanbanCard {
  id: string;
  jobNumber: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerCompany?: string;
  productName: string;
  quantity: number;
  specifications: {
    paperGsm?: string;
    finish?: string;
    printMode?: string;
    dimensions?: string;
    sides?: string;
    selectedOptions?: Array<{ label: string; value: string }>;
    customerNotes?: string;
    raw?: Record<string, unknown>;
  };
  machine?: {
    id: string;
    name: string;
    code: string;
    type: string;
  } | null;
  operator?: {
    id: string;
    fullName: string;
    role: string;
  } | null;
  status: JobCardStatus;
  orderStatus: OrderStatus;
  currentStation: string;
  priority: Priority;
  dueAt: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
  slaStatus: 'ON_TIME' | 'DUE_SOON' | 'OVERDUE';
  slaBadgeText: string;
  timeInfo: {
    label: string;
    text: string;
  };
  allowedTransitions: string[];
  allowedActions: string[];
  holdReason?: string;
  isHeld: boolean;
  version: number;
  artwork?: {
    id: string;
    storageKey: string;
    fileUrl: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
    status: string;
    isApproved: boolean;
    proofUrl?: string | null;
  } | null;
}

export interface KanbanColumnResponse {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  type: ProductionColumnType;
  sortOrder: number;
  color?: string | null;
  mappedStatus?: OrderStatus | null;
  mappedStation?: string | null;
  cards: KanbanCard[];
  cardCount: number;
}

@Injectable()
export class ProductionBoardService {
  private readonly logger = new Logger(ProductionBoardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Fetch complete production board with columns, cards, live metrics and filter values
   */
  async getBoardData(filters: BoardFiltersDto, user: JwtPayload) {
    // 1. Fetch or initialize active columns
    let columns = await this.prisma.productionColumn.findMany({
      where: { isActive: true, key: { not: 'READY_FOR_PRODUCTION' } },
      orderBy: { sortOrder: 'asc' },
    });

    if (columns.length === 0) {
      await this.seedDefaultColumns();
      columns = await this.prisma.productionColumn.findMany({
        where: { isActive: true, key: { not: 'READY_FOR_PRODUCTION' } },
        orderBy: { sortOrder: 'asc' },
      });
    }

    // 2. Fetch active Job Cards with all necessary relations
    const jobCardsWhere: Prisma.JobCardWhereInput = {};

    // Strict individual ownership: Operator ONLY sees tasks assigned to their user ID
    if (user.role === UserRole.PRODUCTION_OPERATOR) {
      jobCardsWhere.OR = [
        { operatorId: user.sub },
        {
          order: {
            assignments: {
              some: {
                assignedUserId: user.sub,
                taskType: AssignmentTaskType.PRODUCTION,
                status: AssignmentStatus.ACTIVE,
              },
            },
          },
        },
      ];
    }

    const jobCards = await this.prisma.jobCard.findMany({
      where: jobCardsWhere,
      include: {
        order: {
          include: {
            customer: true,
            shippingAddress: true,
            qcChecklists: true,
          },
        },
        orderItem: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
            artworkVersions: true,
          },
        },
        machine: true,
        operator: true,
        issues: {
          where: { isResolved: false },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }],
    });

    // 3. Process and map cards into typed KanbanCard structures
    const now = new Date();
    const mappedCards: KanbanCard[] = [];

    for (const job of jobCards) {
      const specs = (job.technicalSpecs as Record<string, unknown>) || {};
      const rawSpecs = (specs.specifications as Record<string, unknown>) || {};

      // Calculate SLA Status
      const dueTime = new Date(job.dueAt).getTime();
      const diffMs = dueTime - now.getTime();
      const diffMinutes = Math.round(diffMs / (1000 * 60));

      let slaStatus: 'ON_TIME' | 'DUE_SOON' | 'OVERDUE' = 'ON_TIME';
      let slaBadgeText = 'On Time';

      if (diffMinutes < 0) {
        slaStatus = 'OVERDUE';
        const overdueMins = Math.abs(diffMinutes);
        const hours = Math.floor(overdueMins / 60);
        const mins = overdueMins % 60;
        slaBadgeText = hours > 0 ? `Overdue +${hours}h ${mins}m` : `Overdue +${mins}m`;
      } else if (diffMinutes <= 180) {
        // Within 3 hours
        slaStatus = 'DUE_SOON';
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        slaBadgeText = hours > 0 ? `Due in ${hours}h ${mins}m` : `Due in ${mins}m`;
      } else {
        const hours = Math.floor(diffMinutes / 60);
        slaBadgeText = `Due in ${hours}h`;
      }

      // Format Time Information
      let timeLabel = 'Waiting';
      let timeText = 'Ready for production';

      if (job.status === JobCardStatus.PRINTING && job.startedAt) {
        const elapsedMs = now.getTime() - new Date(job.startedAt).getTime();
        const elapsedMins = Math.floor(elapsedMs / (1000 * 60));
        const hours = Math.floor(elapsedMins / 60);
        const mins = elapsedMins % 60;
        timeLabel = 'Printing';
        timeText = hours > 0 ? `${hours}h ${mins}m in progress` : `${mins}m in progress`;
      } else if (job.status === JobCardStatus.FINISHING && job.startedAt) {
        timeLabel = 'Finishing';
        timeText = 'Under post-press processing';
      } else if (job.status === JobCardStatus.QC_INSPECTION) {
        timeLabel = 'Final QC';
        timeText = 'Awaiting physical inspection';
      } else if (job.order.status === OrderStatus.PACKING) {
        timeLabel = 'Packing';
        timeText = 'Staged at parcel station';
      } else if (job.order.status === OrderStatus.READY_FOR_DISPATCH) {
        timeLabel = 'Dispatch';
        timeText = 'Manifest ready';
      } else if (job.order.status === OrderStatus.OUT_FOR_DELIVERY || job.order.status === OrderStatus.DELIVERED) {
        timeLabel = 'Dispatched';
        timeText = 'Shipped via carrier';
      }

      // Determine Allowed Actions & Drag Transitions for Current Actor's Role
      const { allowedActions, allowedTransitions } = this.resolveRoleCapabilities(
        job,
        user.role,
      );

      const isHeld = job.status === JobCardStatus.ON_HOLD || job.order.status === OrderStatus.ON_HOLD;
      const latestIssue = job.issues[0];

      // Extract approved or active artwork for production download
      const artworkVersions = job.orderItem?.artworkVersions || [];
      const approvedArtwork =
        artworkVersions.find((a) => a.isApproved || a.status === ArtworkStatus.PROOF_APPROVED || a.status === ArtworkStatus.PREFLIGHT_PASSED) ||
        artworkVersions[0];

      let fileUrl = approvedArtwork?.storageKey || '';
      if (fileUrl && !fileUrl.startsWith('http')) {
        if (fileUrl.startsWith('/uploads')) {
          // already formatted
        } else if (fileUrl.startsWith('uploads/')) {
          fileUrl = `/${fileUrl}`;
        } else if (fileUrl.startsWith('artwork/')) {
          fileUrl = `/uploads/${fileUrl}`;
        } else if (fileUrl.startsWith('/')) {
          fileUrl = `/uploads/artwork${fileUrl}`;
        } else {
          fileUrl = `/uploads/artwork/${fileUrl}`;
        }
      }

      const artwork = approvedArtwork
        ? {
            id: approvedArtwork.id,
            storageKey: approvedArtwork.storageKey,
            fileUrl,
            originalFileName: approvedArtwork.originalFileName || 'approved_artwork.pdf',
            mimeType: approvedArtwork.mimeType || 'application/pdf',
            fileSize: approvedArtwork.fileSize || 0,
            status: approvedArtwork.status,
            isApproved: approvedArtwork.isApproved || approvedArtwork.status === ArtworkStatus.PROOF_APPROVED,
            proofUrl: approvedArtwork.proofUrl,
          }
        : null;

      // Extract clean customer-selected specifications
      const selectedOptions: Array<{ label: string; value: string }> = [];
      const seenLabels = new Set<string>();

      const addOption = (label: string, value: any) => {
        if (value === null || value === undefined || typeof value === 'object') return;
        const strVal = String(value).trim();
        if (!strVal) return;
        const cleanLabel = String(label)
          .replace(/_/g, ' ')
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .trim();
        const norm = cleanLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seenLabels.has(norm)) return;
        // Exclude financial and internal system keys
        const blocked = [
          'price', 'cost', 'fee', 'tax', 'gst', 'subtotal', 'total', 'grandtotal',
          'artworkrequirement', 'designservicerequirement', 'referenceimagerequirement',
          'workflowroute', 'artworksource', 'artworkurl', 'artworkstoragekey',
          'referenceimage', 'referenceimageurl', 'designnotes', 'customernotes',
          'ismultivariant', 'variantlines', 'specificationssnapshot', 'fieldvalues', 'raw'
        ];
        if (blocked.some((b) => norm.includes(b))) return;
        seenLabels.add(norm);
        selectedOptions.push({
          label: cleanLabel.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          value: strVal,
        });
      };

      const itemSpecs = (job.orderItem?.specifications as Record<string, unknown>) || rawSpecs;
      if (Array.isArray(itemSpecs.options)) {
        for (const opt of itemSpecs.options as any[]) {
          const l = opt?.fieldLabel || opt?.optionName || opt?.optionCode;
          const v = opt?.value || opt?.valueName || opt?.optionLabel;
          if (l && v) addOption(l, v);
        }
      }
      if (Array.isArray(itemSpecs.selectedOptionsSummary)) {
        for (const opt of itemSpecs.selectedOptionsSummary as any[]) {
          const l = opt?.fieldLabel || opt?.optionName;
          const v = opt?.value || opt?.valueName;
          if (l && v) addOption(l, v);
        }
      }
      const snap = (itemSpecs.specificationsSnapshot as Record<string, unknown>) || {};
      for (const [k, v] of Object.entries(snap)) {
        if (typeof v === 'string' || typeof v === 'number') {
          addOption(k, v);
        }
      }
      for (const [k, v] of Object.entries(itemSpecs)) {
        if (typeof v === 'string' || typeof v === 'number') {
          addOption(k, v);
        }
      }

      mappedCards.push({
        id: job.id,
        jobNumber: job.jobNumber,
        orderId: job.orderId,
        orderNumber: job.order.orderNumber,
        customerName: job.order.customer?.fullName || 'B2B Client',
        customerCompany: job.order.customer?.companyName || undefined,
        productName: (specs.productName as string) || job.orderItem?.productName || 'Print Product',
        quantity: (specs.quantity as number) || job.orderItem?.quantity || 1,
        specifications: {
          paperGsm: (rawSpecs['paper_gsm'] as string) || (rawSpecs['gsm'] as string) || (selectedOptions.find(o => o.label.toLowerCase().includes('paper') || o.label.toLowerCase().includes('substrate'))?.value) || undefined,
          finish: (rawSpecs['lamination'] as string) || (rawSpecs['finish'] as string) || (selectedOptions.find(o => o.label.toLowerCase().includes('finish') || o.label.toLowerCase().includes('lamination'))?.value) || undefined,
          printMode: (rawSpecs['print_sides'] as string) || (rawSpecs['color_mode'] as string) || (selectedOptions.find(o => o.label.toLowerCase().includes('print') || o.label.toLowerCase().includes('side'))?.value) || undefined,
          dimensions: (rawSpecs['dimensions'] as string) || (rawSpecs['size'] as string) || (selectedOptions.find(o => o.label.toLowerCase().includes('dimension') || o.label.toLowerCase().includes('size'))?.value) || undefined,
          sides: (rawSpecs['sides'] as string) || undefined,
          selectedOptions,
          customerNotes: (itemSpecs.customerNotes as string) || (itemSpecs.designNotes as string) || (job.order as any)?.customerNotes || undefined,
          raw: rawSpecs,
        },
        machine: job.machine
          ? {
              id: job.machine.id,
              name: job.machine.name,
              code: job.machine.code,
              type: job.machine.type,
            }
          : null,
        operator: job.operator
          ? {
              id: job.operator.id,
              fullName: job.operator.fullName,
              role: job.operator.role,
            }
          : null,
        status: job.status,
        orderStatus: job.order.status,
        currentStation: job.currentStation,
        priority: job.priority,
        dueAt: job.dueAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        slaStatus,
        slaBadgeText,
        timeInfo: {
          label: timeLabel,
          text: timeText,
        },
        allowedTransitions,
        allowedActions,
        holdReason: isHeld ? latestIssue?.description || 'Job placed on hold' : undefined,
        isHeld,
        version: job.updatedAt.getTime(),
        artwork,
      });
    }

    // 4. Apply Board Filters if supplied
    let filteredCards = mappedCards;

    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      filteredCards = filteredCards.filter(
        (c) =>
          c.orderNumber.toLowerCase().includes(q) ||
          c.jobNumber.toLowerCase().includes(q) ||
          c.customerName.toLowerCase().includes(q) ||
          c.productName.toLowerCase().includes(q) ||
          (c.customerCompany && c.customerCompany.toLowerCase().includes(q)) ||
          (c.machine && c.machine.name.toLowerCase().includes(q)),
      );
    }

    if (filters.machineId && filters.machineId !== 'ALL') {
      filteredCards = filteredCards.filter((c) => c.machine?.id === filters.machineId);
    }

    if (user.role === UserRole.PRODUCTION_OPERATOR) {
      filteredCards = filteredCards.filter((c) => c.operator?.id === user.sub);
    } else if (filters.operatorId && filters.operatorId !== 'ALL') {
      filteredCards = filteredCards.filter((c) => c.operator?.id === filters.operatorId);
    }

    if (filters.priority && (filters.priority as string) !== 'ALL') {
      filteredCards = filteredCards.filter((c) => c.priority === filters.priority);
    }

    if (filters.slaStatus && (filters.slaStatus as string) !== 'ALL') {
      filteredCards = filteredCards.filter((c) => c.slaStatus === filters.slaStatus);
    }

    // 5. Partition Cards into Configured Columns
    const resultColumns: KanbanColumnResponse[] = columns.map((col) => {
      const matchingCards = filteredCards.filter((card) => this.isCardInColumn(card, col));
      return {
        id: col.id,
        key: col.key,
        name: col.name,
        description: col.description,
        type: col.type,
        sortOrder: col.sortOrder,
        color: col.color,
        mappedStatus: col.mappedStatus,
        mappedStation: col.mappedStation,
        cards: matchingCards,
        cardCount: matchingCards.length,
      };
    });

    // 6. Aggregate Top Metrics
    const activeJobs = mappedCards.filter(
      (c) => c.orderStatus !== OrderStatus.DELIVERED && c.orderStatus !== OrderStatus.CANCELLED,
    ).length;
    const printing = mappedCards.filter((c) => c.status === JobCardStatus.PRINTING).length;
    const finishing = mappedCards.filter((c) => c.status === JobCardStatus.FINISHING).length;
    const finalQc = mappedCards.filter(
      (c) => c.status === JobCardStatus.QC_INSPECTION || c.orderStatus === OrderStatus.QUALITY_CHECK,
    ).length;
    const packing = mappedCards.filter((c) => c.orderStatus === OrderStatus.PACKING).length;
    const readyForDispatch = mappedCards.filter(
      (c) => c.orderStatus === OrderStatus.READY_FOR_DISPATCH,
    ).length;
    const dispatched = mappedCards.filter(
      (c) => c.orderStatus === OrderStatus.OUT_FOR_DELIVERY || c.orderStatus === OrderStatus.DELIVERED,
    ).length;
    const onHold = mappedCards.filter((c) => c.isHeld).length;

    // 7. Available Machines & Operators for Filter Dropdowns
    const availableMachines = await this.prisma.machineWorkCenter.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true, type: true },
      orderBy: { name: 'asc' },
    });

    const availableOperators = await this.prisma.user.findMany({
      where: {
        role: {
          in: [
            UserRole.PRODUCTION_OPERATOR,
            UserRole.FINAL_QC_INSPECTOR,
            UserRole.PACKING_OPERATOR,
            UserRole.DISPATCH_LOGISTICS,
            UserRole.ADMIN_MANAGER,
          ],
        },
      },
      select: { id: true, fullName: true, role: true, department: true },
      orderBy: { fullName: 'asc' },
    });

    return {
      columns: resultColumns,
      metrics: {
        activeJobs,
        printing,
        finishing,
        finalQc,
        packing,
        readyForDispatch,
        dispatched,
        onHold,
      },
      shiftInfo: {
        shiftName: 'Shift A (General Day Shift)',
        liveStatus: 'PRESS ONLINE',
        activePressCount: availableMachines.length,
        operatorCount: availableOperators.length,
      },
      availableMachines,
      availableOperators,
    };
  }

  /**
   * Matches a card into its appropriate visual column
   */
  private isCardInColumn(card: KanbanCard, col: { key: string; type: ProductionColumnType; mappedStatus?: OrderStatus | null; mappedStation?: string | null }) {
    // If column is a dedicated Hold column (e.g. MATERIAL_HOLD, MACHINE_ISSUE, REWORK)
    if (col.type === ProductionColumnType.HOLD) {
      return card.isHeld && (card.holdReason?.toUpperCase().includes(col.key) || col.key === 'HOLD');
    }

    // Default System Column mapping
    switch (col.key) {
      case 'QC_APPROVED':
        return (
          !card.isHeld &&
          (card.status === JobCardStatus.QUEUED ||
            card.status === JobCardStatus.ASSIGNED ||
            card.orderStatus === OrderStatus.PRODUCTION_QUEUE) &&
          card.status !== JobCardStatus.PRINTING &&
          card.status !== JobCardStatus.FINISHING &&
          card.status !== JobCardStatus.QC_INSPECTION &&
          card.orderStatus !== OrderStatus.QUALITY_CHECK &&
          card.orderStatus !== OrderStatus.PACKING &&
          card.orderStatus !== OrderStatus.READY_FOR_DISPATCH &&
          card.orderStatus !== OrderStatus.OUT_FOR_DELIVERY &&
          card.orderStatus !== OrderStatus.DELIVERED
        );

      case 'PRINTING':
        return (
          !card.isHeld &&
          (card.status === JobCardStatus.PRINTING ||
            (card.orderStatus === OrderStatus.PRINTING && card.status !== JobCardStatus.FINISHING))
        );

      case 'FINISHING':
        return (
          !card.isHeld &&
          (card.status === JobCardStatus.FINISHING ||
            card.status === JobCardStatus.PRINTING_COMPLETED ||
            card.orderStatus === OrderStatus.FINISHING) &&
          card.status !== JobCardStatus.QC_INSPECTION &&
          card.orderStatus !== OrderStatus.QUALITY_CHECK &&
          card.orderStatus !== OrderStatus.PACKING &&
          card.orderStatus !== OrderStatus.READY_FOR_DISPATCH &&
          card.orderStatus !== OrderStatus.OUT_FOR_DELIVERY &&
          card.orderStatus !== OrderStatus.DELIVERED
        );

      case 'FINAL_QC':
        return (
          !card.isHeld &&
          (card.status === JobCardStatus.QC_INSPECTION ||
            card.orderStatus === OrderStatus.QUALITY_CHECK) &&
          card.orderStatus !== OrderStatus.PACKING &&
          card.orderStatus !== OrderStatus.READY_FOR_DISPATCH &&
          card.orderStatus !== OrderStatus.OUT_FOR_DELIVERY &&
          card.orderStatus !== OrderStatus.DELIVERED
        );

      case 'PACKING':
        return (
          !card.isHeld &&
          card.orderStatus === OrderStatus.PACKING
        );

      case 'READY_FOR_DISPATCH':
        return (
          !card.isHeld &&
          card.orderStatus === OrderStatus.READY_FOR_DISPATCH
        );

      case 'DISPATCHED':
        return (
          !card.isHeld &&
          (card.orderStatus === OrderStatus.OUT_FOR_DELIVERY ||
            card.orderStatus === OrderStatus.DELIVERED)
        );

      default:
        // Custom column mapped to specific status or station
        if (col.mappedStatus && card.orderStatus === col.mappedStatus) return true;
        if (col.mappedStation && card.currentStation === col.mappedStation) return true;
        return false;
    }
  }

  /**
   * Determine allowed drag transitions and action buttons per role and job state
   */
  private resolveRoleCapabilities(
    job: { status: JobCardStatus; currentStation: string; order: { status: OrderStatus } },
    role: UserRole,
  ) {
    const allowedTransitions: string[] = [];
    const allowedActions: string[] = [];

    // Admin has override capability to move to any adjacent or custom column
    if (role === UserRole.ADMIN_MANAGER) {
      allowedTransitions.push(
        'QC_APPROVED',
        'PRINTING',
        'FINISHING',
        'FINAL_QC',
        'PACKING',
        'READY_FOR_DISPATCH',
        'DISPATCHED',
        'HOLD',
      );
      allowedActions.push(
        'CLAIM',
        'START_PRINTING',
        'PAUSE',
        'RESUME',
        'COMPLETE_PRINTING',
        'COMPLETE_FINISHING',
        'QC_PASS',
        'QC_FAIL',
        'START_PACKING',
        'COMPLETE_PACKING',
        'DISPATCH',
        'HOLD',
        'OVERRIDE',
      );
      return { allowedActions, allowedTransitions };
    }

    // Role-specific operational authorities:
    if (role === UserRole.PRODUCTION_OPERATOR) {
      if (job.status === JobCardStatus.QUEUED || job.status === JobCardStatus.ASSIGNED) {
        allowedTransitions.push('PRINTING', 'HOLD');
        allowedActions.push('CLAIM', 'START_PRINTING');
      } else if (job.status === JobCardStatus.PRINTING) {
        allowedTransitions.push('FINISHING', 'HOLD');
        allowedActions.push('PAUSE', 'COMPLETE_PRINTING');
      } else if (job.status === JobCardStatus.FINISHING || job.status === JobCardStatus.PRINTING_COMPLETED) {
        allowedTransitions.push('FINAL_QC', 'HOLD');
        allowedActions.push('COMPLETE_FINISHING');
      }
    }

    if (role === UserRole.FINAL_QC_INSPECTOR) {
      if (job.status === JobCardStatus.QC_INSPECTION || job.order.status === OrderStatus.QUALITY_CHECK) {
        allowedTransitions.push('PACKING', 'HOLD', 'REWORK');
        allowedActions.push('INSPECT', 'QC_PASS', 'QC_FAIL');
      }
    }

    if (role === UserRole.PACKING_OPERATOR) {
      if (job.order.status === OrderStatus.PACKING) {
        allowedTransitions.push('READY_FOR_DISPATCH', 'HOLD');
        allowedActions.push('START_PACKING', 'COMPLETE_PACKING');
      }
    }

    if (role === UserRole.DISPATCH_LOGISTICS) {
      if (job.order.status === OrderStatus.READY_FOR_DISPATCH) {
        allowedTransitions.push('DISPATCHED');
        allowedActions.push('CREATE_MANIFEST', 'DISPATCH');
      }
    }

    return { allowedActions, allowedTransitions };
  }

  /**
   * Execute atomic Kanban transition with rigorous state machine and RBAC validation
   */
  async transitionJob(jobId: string, dto: TransitionJobDto, user: JwtPayload) {
    const job = await this.prisma.jobCard.findUnique({
      where: { id: jobId },
      include: {
        order: {
          include: {
            qcChecklists: true,
          },
        },
        machine: true,
        operator: true,
      },
    });

    if (!job) {
      throw new NotFoundException(`JobCard '${jobId}' not found.`);
    }

    // Security check: Individual operator ownership enforcement first
    if (user.role === UserRole.PRODUCTION_OPERATOR) {
      const isAssigned =
        job.operatorId === user.sub ||
        (await this.prisma.orderAssignment.findFirst({
          where: {
            orderId: job.orderId,
            assignedUserId: user.sub,
            taskType: AssignmentTaskType.PRODUCTION,
            status: AssignmentStatus.ACTIVE,
          },
        }));

      if (!isAssigned) {
        throw new ForbiddenException('You cannot transition a production job assigned to another operator.');
      }
    }

    const targetColumnKey = dto.targetColumnKey || (dto as any).toStationKey || '';
    const { reason, machineId, operatorId, managerOverrideReason } = dto;
    const isManager = user.role === UserRole.ADMIN_MANAGER;

    if (!targetColumnKey) {
      throw new BadRequestException('targetColumnKey is required');
    }

    // 1. Manager Override Policy Check
    if (managerOverrideReason && !isManager) {
      throw new ForbiddenException('Only ADMIN_MANAGER can supply a manager override reason.');
    }

    if (isManager && managerOverrideReason && managerOverrideReason.trim().length < 10) {
      throw new BadRequestException('Manager override requires a structured reason of at least 10 characters.');
    }

    // 2. Validate Hold States: Hold transitions REQUIRE a reason
    const isHoldTarget =
      targetColumnKey.includes('HOLD') ||
      targetColumnKey.includes('REWORK') ||
      targetColumnKey.includes('ISSUE');

    if (isHoldTarget && (!reason || reason.trim().length < 3)) {
      throw new BadRequestException('Placing a job on Hold requires a specific, valid reason.');
    }

    // 3. Authoritative Role & Step Gate Validation (unless valid manager override)
    if (!isManager || !managerOverrideReason) {
      this.validateTransitionPermissions(job, targetColumnKey, user.role);
    }

    // 4. Determine New Status & Station Values
    let newJobStatus: JobCardStatus = job.status;
    let newOrderStatus: OrderStatus = job.order.status;
    let newStation: string = job.currentStation;
    let startedAt: Date | undefined = undefined;
    let completedAt: Date | undefined = undefined;

    switch (targetColumnKey) {
      case 'PRINTING':
        newJobStatus = JobCardStatus.PRINTING;
        newOrderStatus = OrderStatus.PRINTING;
        newStation = 'PRINTING';
        startedAt = job.startedAt || new Date();
        break;

      case 'FINISHING':
        newJobStatus = JobCardStatus.FINISHING;
        newOrderStatus = OrderStatus.FINISHING;
        newStation = 'FINISHING';
        break;

      case 'FINAL_QC':
        newJobStatus = JobCardStatus.QC_INSPECTION;
        newOrderStatus = OrderStatus.QUALITY_CHECK;
        newStation = 'FINAL_QC';
        break;

      case 'PACKING':
        newJobStatus = JobCardStatus.COMPLETED;
        newOrderStatus = OrderStatus.PACKING;
        newStation = 'PACKING';
        completedAt = new Date();
        break;

      case 'READY_FOR_DISPATCH':
        newJobStatus = JobCardStatus.COMPLETED;
        newOrderStatus = OrderStatus.READY_FOR_DISPATCH;
        newStation = 'DISPATCH';
        break;

      case 'DISPATCHED':
        newJobStatus = JobCardStatus.COMPLETED;
        newOrderStatus = OrderStatus.OUT_FOR_DELIVERY;
        newStation = 'DISPATCH';
        break;

      case 'MATERIAL_HOLD':
      case 'MACHINE_ISSUE':
      case 'HOLD':
      case 'REWORK':
        newJobStatus = JobCardStatus.ON_HOLD;
        newOrderStatus = OrderStatus.ON_HOLD;
        break;

      case 'QC_APPROVED':
        newJobStatus = JobCardStatus.QUEUED;
        newOrderStatus = OrderStatus.PRODUCTION_QUEUE;
        newStation = 'PRINTING';
        break;

      default:
        // Check if custom column exists in DB
        const customCol = await this.prisma.productionColumn.findUnique({
          where: { key: targetColumnKey },
        });
        if (customCol) {
          if (customCol.type === ProductionColumnType.HOLD) {
            newJobStatus = JobCardStatus.ON_HOLD;
            newOrderStatus = OrderStatus.ON_HOLD;
          } else if (customCol.mappedStatus) {
            newOrderStatus = customCol.mappedStatus;
          }
          if (customCol.mappedStation) {
            newStation = customCol.mappedStation;
          }
        }
        break;
    }

    // 5. Database Transaction for Atomic State Update & Audit Log
    const result = await this.prisma.$transaction(async (tx) => {
      // Update Job Card
      const updatedJob = await tx.jobCard.update({
        where: { id: job.id },
        data: {
          status: newJobStatus,
          currentStation: newStation,
          ...(startedAt ? { startedAt } : {}),
          ...(completedAt ? { completedAt } : {}),
          ...(machineId ? { machineId } : {}),
          ...(operatorId ? { operatorId } : user.role === UserRole.PRODUCTION_OPERATOR ? { operatorId: user.sub } : {}),
          ...(isHoldTarget ? { preHoldStatus: job.status } : {}),
        },
      });

      // Update Parent Order
      await tx.order.update({
        where: { id: job.orderId },
        data: {
          status: newOrderStatus,
        },
      });

      // Status history entry
      await tx.orderStatusHistory.create({
        data: {
          orderId: job.orderId,
          fromStatus: job.order.status,
          toStatus: newOrderStatus,
          changedById: user.sub,
          department: user.department,
          reason: reason || managerOverrideReason || `Kanban drag to ${targetColumnKey}`,
        },
      });

      // If Hold issue, create JobIssue
      if (isHoldTarget && reason) {
        await tx.jobIssue.create({
          data: {
            jobCardId: job.id,
            reasonCode: targetColumnKey,
            description: reason,
            reportedBy: user.sub,
          },
        });
      }

      // If job moves to packing or beyond, mark active PRODUCTION assignment as completed
      if (['PACKING', 'READY_FOR_DISPATCH', 'DISPATCHED'].includes(targetColumnKey)) {
        await tx.orderAssignment.updateMany({
          where: {
            orderId: job.orderId,
            taskType: AssignmentTaskType.PRODUCTION,
            status: AssignmentStatus.ACTIVE,
          },
          data: {
            status: AssignmentStatus.COMPLETED,
            completedAt: new Date(),
            reason: `Production step completed: moved to ${targetColumnKey}`,
          },
        });
      }

      return updatedJob;
    });

    // 6. Record Immutable Audit Event
    await this.auditService.log({
      actorId: user.sub,
      actorType: 'USER',
      action: managerOverrideReason ? 'KANBAN_MANAGER_OVERRIDE' : 'KANBAN_DRAG',
      entity: 'JobCard',
      entityId: job.id,
      orderId: job.orderId,
      previousState: {
        jobStatus: job.status,
        orderStatus: job.order.status,
        station: job.currentStation,
      },
      newState: {
        jobStatus: newJobStatus,
        orderStatus: newOrderStatus,
        station: newStation,
        targetColumnKey,
      },
      reason: reason || managerOverrideReason || `Transitioned to ${targetColumnKey}`,
    });

    // 7. Emit Real-time Event
    this.eventEmitter.emit('production.job.transitioned', {
      jobCardId: job.id,
      jobNumber: job.jobNumber,
      orderId: job.orderId,
      targetColumnKey,
      actorId: user.sub,
    });

    return result;
  }

  /**
   * Enforces business rules and role permission boundaries for transitions
   */
  private validateTransitionPermissions(
    job: { status: JobCardStatus; currentStation: string; order: { status: OrderStatus; qcChecklists: Array<{ type: string; outcome: string }> } },
    targetKey: string,
    role: UserRole,
  ) {
    if (targetKey === 'PRINTING') {
      if (role !== UserRole.PRODUCTION_OPERATOR) {
        throw new ForbiddenException('Only PRODUCTION_OPERATOR can start printing runs.');
      }
      if (job.status !== JobCardStatus.QUEUED && job.status !== JobCardStatus.ASSIGNED && job.status !== JobCardStatus.ON_HOLD) {
        throw new BadRequestException('Cannot move to PRINTING: Job must be in QC APPROVED or ON_HOLD state.');
      }
    } else if (targetKey === 'FINISHING') {
      if (role !== UserRole.PRODUCTION_OPERATOR) {
        throw new ForbiddenException('Only PRODUCTION_OPERATOR can handover jobs to Finishing.');
      }
      if (job.status !== JobCardStatus.PRINTING && job.status !== JobCardStatus.ON_HOLD) {
        throw new BadRequestException('Cannot move to FINISHING: Job must complete printing first.');
      }
    } else if (targetKey === 'FINAL_QC') {
      if (role !== UserRole.PRODUCTION_OPERATOR && role !== UserRole.FINAL_QC_INSPECTOR) {
        throw new ForbiddenException('Only PRODUCTION_OPERATOR or FINAL_QC_INSPECTOR can route jobs to Final QC.');
      }
      if (job.status !== JobCardStatus.FINISHING && job.status !== JobCardStatus.PRINTING_COMPLETED && job.status !== JobCardStatus.PRINTING && job.status !== JobCardStatus.ON_HOLD) {
        throw new BadRequestException('Cannot move to FINAL QC: Job must complete printing and finishing first.');
      }
    } else if (targetKey === 'PACKING') {
      if (role !== UserRole.FINAL_QC_INSPECTOR) {
        throw new ForbiddenException('Only FINAL_QC_INSPECTOR can approve release to PACKING after physical inspection.');
      }
      const passedQc = job.order.qcChecklists.some(
        (q) => q.type === 'FINAL_QC' && q.outcome === 'PASS',
      );
      if (!passedQc) {
        throw new BadRequestException('This job must have a PASSED Final QC inspection before moving to Packing.');
      }
    } else if (targetKey === 'READY_FOR_DISPATCH') {
      if (role !== UserRole.PACKING_OPERATOR) {
        throw new ForbiddenException('Only PACKING_OPERATOR can complete packaging and stage for dispatch.');
      }
      if (job.order.status !== OrderStatus.PACKING) {
        throw new BadRequestException('Job must be in PACKING station before moving to READY FOR DISPATCH.');
      }
    } else if (targetKey === 'DISPATCHED') {
      if (role !== UserRole.DISPATCH_LOGISTICS) {
        throw new ForbiddenException('Only DISPATCH_LOGISTICS can dispatch shipments.');
      }
      if (job.order.status !== OrderStatus.READY_FOR_DISPATCH) {
        throw new BadRequestException('Job must be packaged and in READY FOR DISPATCH before handover.');
      }
    }
  }

  /**
   * Column Management: Create Custom Column
   */
  async createColumn(dto: CreateColumnDto, user: JwtPayload) {
    if (user.role !== UserRole.ADMIN_MANAGER) {
      throw new ForbiddenException('Only ADMIN_MANAGER is authorized to configure production columns.');
    }

    const key = dto.key || dto.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');

    const existing = await this.prisma.productionColumn.findUnique({
      where: { key },
    });
    if (existing) {
      throw new BadRequestException(`Column with key '${key}' already exists.`);
    }

    const maxSort = await this.prisma.productionColumn.aggregate({
      _max: { sortOrder: true },
    });
    const sortOrder = dto.sortOrder ?? (maxSort._max.sortOrder || 0) + 10;

    const created = await this.prisma.productionColumn.create({
      data: {
        key,
        name: dto.name,
        description: dto.description,
        type: dto.type || ProductionColumnType.CUSTOM,
        mappedStatus: dto.mappedStatus,
        mappedStation: dto.mappedStation,
        sortOrder,
        color: dto.color || '#64748B',
        createdById: user.sub,
      },
    });

    await this.auditService.log({
      actorId: user.sub,
      actorType: 'USER',
      action: 'PRODUCTION_COLUMN_CREATED',
      entity: 'ProductionColumn',
      entityId: created.id,
      newState: created as unknown as Record<string, unknown>,
      reason: `Created production column ${created.name}`,
    });

    return created;
  }

  /**
   * Column Management: Update Column
   */
  async updateColumn(id: string, dto: UpdateColumnDto, user: JwtPayload) {
    if (user.role !== UserRole.ADMIN_MANAGER) {
      throw new ForbiddenException('Only ADMIN_MANAGER is authorized to update production columns.');
    }

    const existing = await this.prisma.productionColumn.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Column '${id}' not found.`);
    }

    const updated = await this.prisma.productionColumn.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.mappedStatus !== undefined ? { mappedStatus: dto.mappedStatus } : {}),
        ...(dto.mappedStation !== undefined ? { mappedStation: dto.mappedStation } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.color ? { color: dto.color } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.auditService.log({
      actorId: user.sub,
      actorType: 'USER',
      action: 'PRODUCTION_COLUMN_UPDATED',
      entity: 'ProductionColumn',
      entityId: updated.id,
      previousState: existing as unknown as Record<string, unknown>,
      newState: updated as unknown as Record<string, unknown>,
      reason: `Updated column ${updated.name}`,
    });

    return updated;
  }

  /**
   * Column Management: Reorder Columns
   */
  async reorderColumns(columnOrders: Array<{ id: string; sortOrder: number }>, user: JwtPayload) {
    if (user.role !== UserRole.ADMIN_MANAGER) {
      throw new ForbiddenException('Only ADMIN_MANAGER is authorized to reorder production columns.');
    }

    await this.prisma.$transaction(
      columnOrders.map((item) =>
        this.prisma.productionColumn.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    await this.auditService.log({
      actorId: user.sub,
      actorType: 'USER',
      action: 'PRODUCTION_COLUMNS_REORDERED',
      entity: 'ProductionColumn',
      entityId: 'ALL',
      newState: { columnOrders },
      reason: 'Reordered production Kanban columns',
    });

    return { success: true, message: 'Columns reordered successfully.' };
  }

  /**
   * Column Management: Safe Archive Column
   */
  async archiveColumn(id: string, user: JwtPayload) {
    if (user.role !== UserRole.ADMIN_MANAGER) {
      throw new ForbiddenException('Only ADMIN_MANAGER is authorized to archive production columns.');
    }

    const column = await this.prisma.productionColumn.findUnique({ where: { id } });
    if (!column) {
      throw new NotFoundException(`Column '${id}' not found.`);
    }

    if (column.type === ProductionColumnType.SYSTEM) {
      throw new BadRequestException('System default workflow columns cannot be archived.');
    }

    // Safety check: verify no active jobs exist in this column
    const board = await this.getBoardData({}, user);
    const targetCol = board.columns.find((c) => c.id === id);
    if (targetCol && targetCol.cardCount > 0) {
      throw new BadRequestException(
        `This column contains ${targetCol.cardCount} active jobs. Move these jobs before deactivating the column.`,
      );
    }

    const archived = await this.prisma.productionColumn.update({
      where: { id },
      data: {
        isActive: false,
        type: ProductionColumnType.ARCHIVED,
      },
    });

    await this.auditService.log({
      actorId: user.sub,
      actorType: 'USER',
      action: 'PRODUCTION_COLUMN_ARCHIVED',
      entity: 'ProductionColumn',
      entityId: archived.id,
      reason: `Archived custom column ${archived.name}`,
    });

    return archived;
  }

  /**
   * Default 7 Production Kanban Columns Seed
   */
  private async seedDefaultColumns() {
    const defaultColumns = [
      {
        key: 'QC_APPROVED',
        name: 'QC APPROVED',
        description: 'Pre-Production QC 100% Passed. Ready for machine queue.',
        type: ProductionColumnType.SYSTEM,
        mappedStatus: OrderStatus.PRODUCTION_QUEUE,
        mappedStation: 'PRINTING',
        sortOrder: 10,
        color: '#3B82F6',
        isActive: true,
      },
      {
        key: 'PRINTING',
        name: 'PRINTING',
        description: 'Digital & Offset sheet press run in progress.',
        type: ProductionColumnType.SYSTEM,
        mappedStatus: OrderStatus.PRINTING,
        mappedStation: 'PRINTING',
        sortOrder: 20,
        color: '#F59E0B',
        isActive: true,
      },
      {
        key: 'FINISHING',
        name: 'FINISHING',
        description: 'Lamination, die-cutting, folding & blade trimming.',
        type: ProductionColumnType.SYSTEM,
        mappedStatus: OrderStatus.FINISHING,
        mappedStation: 'FINISHING',
        sortOrder: 30,
        color: '#8B5CF6',
        isActive: true,
      },
      {
        key: 'FINAL_QC',
        name: 'FINAL QC',
        description: 'Physical output inspection, color & registration audit.',
        type: ProductionColumnType.SYSTEM,
        mappedStatus: OrderStatus.QUALITY_CHECK,
        mappedStation: 'FINAL_QC',
        sortOrder: 40,
        color: '#10B981',
        isActive: true,
      },
      {
        key: 'PACKING',
        name: 'PACKING',
        description: 'Carton packaging, weigh station & shipping labeling.',
        type: ProductionColumnType.SYSTEM,
        mappedStatus: OrderStatus.PACKING,
        mappedStation: 'PACKING',
        sortOrder: 50,
        color: '#06B6D4',
        isActive: true,
      },
      {
        key: 'READY_FOR_DISPATCH',
        name: 'READY FOR DISPATCH',
        description: 'Packaged orders staged for courier manifest & pickup.',
        type: ProductionColumnType.SYSTEM,
        mappedStatus: OrderStatus.READY_FOR_DISPATCH,
        mappedStation: 'DISPATCH',
        sortOrder: 60,
        color: '#F97316',
        isActive: true,
      },
      {
        key: 'DISPATCHED',
        name: 'DISPATCHED',
        description: 'Waybill assigned and handed over to logistics carrier.',
        type: ProductionColumnType.SYSTEM,
        mappedStatus: OrderStatus.OUT_FOR_DELIVERY,
        mappedStation: 'DISPATCH',
        sortOrder: 70,
        color: '#64748B',
        isActive: true,
      },
    ];

    for (const col of defaultColumns) {
      await this.prisma.productionColumn.upsert({
        where: { key: col.key },
        update: {
          name: col.name,
          description: col.description,
          sortOrder: col.sortOrder,
          color: col.color,
          mappedStatus: col.mappedStatus,
          mappedStation: col.mappedStation,
        },
        create: col,
      });
    }
  }
}
