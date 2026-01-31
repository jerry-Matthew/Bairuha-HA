
import { Controller, Post, Body, Res, Req, HttpStatus, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, SignupDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(private authService: AuthService) { }

    @Post('login')
    async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
        try {
            this.logger.log(`Login attempt for: ${body.email}`);
            const user = await this.authService.validateUser(body.email, body.password);
            if (!user) {
                this.logger.warn(`User validation failed for ${body.email}`);
                throw new UnauthorizedException('Invalid email or password');
            }
            this.logger.log('User validated, generating token');
            const result = await this.authService.login(user);

            // Set refresh token in HttpOnly cookie
            res.cookie('refresh_token', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax', // Use 'lax' for local dev, 'strict' or 'none' for prod depending on setup
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            return {
                accessToken: result.accessToken,
                user: result.user
            };
        } catch (error) {
            this.logger.error('Login error', error instanceof Error ? error.stack : String(error));
            throw error;
        }
    }

    @Post('refresh')
    async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
        const refreshToken = req.cookies['refresh_token'];
        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token not found');
        }

        const result = await this.authService.refresh(refreshToken);

        // Rotate refresh token (optional security practice, but good)
        res.cookie('refresh_token', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return {
            accessToken: result.accessToken,
            user: result.user
        };
    }

    @Post('signup')
    async signup(@Body() body: SignupDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.signup(body.email, body.password, body.name);

        res.cookie('refresh_token', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return {
            accessToken: result.accessToken,
            user: result.user
        };
    }

    @Post('logout')
    async logout(@Res({ passthrough: true }) res: Response) {
        res.clearCookie('refresh_token', { path: '/' });
        return { message: 'Logged out successfully' };
    }
}
