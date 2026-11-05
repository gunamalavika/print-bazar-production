import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole, Department } from '../../common/types/roles';
export interface RegisterUserDto {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role?: UserRole;
    department?: Department;
}
export interface LoginDto {
    email?: string;
    phone?: string;
    identifier?: string;
    emailOrPhone?: string;
    password: string;
}
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly logger;
    constructor(prisma: PrismaService, jwtService: JwtService);
    register(dto: RegisterUserDto): Promise<{
        user: {
            id: string;
            email: string;
            fullName: string;
            phone: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            department: import(".prisma/client").$Enums.Department | null;
            customerId: string | null;
            permissions: string[];
        };
        accessToken: string;
    }>;
    login(dto: LoginDto): Promise<{
        user: {
            id: string;
            email: string;
            fullName: string;
            phone: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            department: import(".prisma/client").$Enums.Department | null;
            customerId: string | null;
            permissions: string[];
        };
        accessToken: string;
    }>;
    getMe(userId: string): Promise<{
        id: string;
        email: string;
        fullName: string;
        phone: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        department: import(".prisma/client").$Enums.Department | null;
        customerId: string | null;
        permissions: string[];
    }>;
    private generateToken;
}
