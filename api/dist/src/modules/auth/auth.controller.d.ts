import { AuthService, RegisterUserDto, LoginDto } from './auth.service';
import { JwtPayload } from '../../common/types/roles';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(body: RegisterUserDto): Promise<{
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
    login(body: LoginDto): Promise<{
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
    logout(): Promise<{
        success: boolean;
        message: string;
    }>;
    getProfile(user: JwtPayload): Promise<{
        id: string;
        email: string;
        fullName: string;
        phone: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        department: import(".prisma/client").$Enums.Department | null;
        customerId: string | null;
        permissions: string[];
    }>;
}
