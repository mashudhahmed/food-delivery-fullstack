import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();

    try {
      const token = this.extractToken(client);

      if (!token) {
        throw new WsException('Missing authentication token');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Attach user to socket for later use
      client.data.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        status: payload.status,
      };

      return true;
    } catch (err) {
      this.logger.warn(`WebSocket auth failed: ${err.message}`);
      throw new WsException('Unauthorized');
    }
  }

  private extractToken(client: Socket): string | null {
    // 1. From handshake auth (recommended)
    const authToken = client.handshake.auth?.token;
    if (authToken) return authToken;

    // 2. From Authorization header
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // 3. From query (fallback – less secure, keep for compatibility)
    const queryToken = client.handshake.query?.token as string;
    if (queryToken) return queryToken;

    return null;
  }
}