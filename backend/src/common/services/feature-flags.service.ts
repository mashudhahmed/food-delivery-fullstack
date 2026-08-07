import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  percentage?: number;
  userWhitelist?: string[];
  userBlacklist?: string[];
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private readonly flags = new Map<string, FeatureFlag>();

  constructor(private readonly configService: ConfigService) {
    this.loadFeatureFlags();
  }

  private loadFeatureFlags(): void {
    // Load from environment variables or database
    const flagsConfig = this.configService.get('FEATURE_FLAGS');
    if (flagsConfig) {
      try {
        const parsed = JSON.parse(flagsConfig);
        Object.entries(parsed).forEach(([key, value]) => {
          this.flags.set(key, value as FeatureFlag);
        });
        this.logger.log(`Loaded ${this.flags.size} feature flags`);
      } catch (error) {
        this.logger.error('Failed to parse feature flags:', error);
      }
    }

    // Default flags
    this.registerDefaultFlags();
  }

  private registerDefaultFlags(): void {
    const defaults: FeatureFlag[] = [
      {
        name: 'new_checkout_flow',
        enabled: false,
        percentage: 10,
      },
      {
        name: 'ai_recommendations',
        enabled: false,
        percentage: 5,
      },
      {
        name: 'dark_mode',
        enabled: true,
        userWhitelist: ['admin@quickbite.com'],
      },
      {
        name: 'instant_delivery',
        enabled: false,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      },
    ];

    defaults.forEach((flag) => {
      if (!this.flags.has(flag.name)) {
        this.flags.set(flag.name, flag);
      }
    });
  }

  isEnabled(flagName: string, userContext?: { userId?: string; email?: string }): boolean {
    const flag = this.flags.get(flagName);
    if (!flag) {
      this.logger.warn(`Feature flag "${flagName}" not found`);
      return false;
    }

    // Check if flag is globally enabled
    if (!flag.enabled) {
      return false;
    }

    // Check date range
    if (flag.startDate && new Date() < flag.startDate) {
      return false;
    }
    if (flag.endDate && new Date() > flag.endDate) {
      return false;
    }

    // Check user whitelist
    if (flag.userWhitelist && userContext?.email) {
      if (flag.userWhitelist.includes(userContext.email)) {
        return true;
      }
    }

    // Check user blacklist
    if (flag.userBlacklist && userContext?.email) {
      if (flag.userBlacklist.includes(userContext.email)) {
        return false;
      }
    }

    // Percentage-based rollout
    if (flag.percentage && userContext?.userId) {
      const hash = this.hashUserId(userContext.userId);
      return hash < flag.percentage;
    }

    return flag.enabled;
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = (hash << 5) - hash + userId.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100;
  }

  getFlag(flagName: string): FeatureFlag | undefined {
    return this.flags.get(flagName);
  }

  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  updateFlag(flagName: string, updates: Partial<FeatureFlag>): void {
    const flag = this.flags.get(flagName);
    if (!flag) {
      this.logger.warn(`Feature flag "${flagName}" not found`);
      return;
    }
    this.flags.set(flagName, { ...flag, ...updates });
    this.logger.log(`Updated feature flag "${flagName}"`);
  }
}