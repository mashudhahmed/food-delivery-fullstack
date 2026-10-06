// src/database/seeds/seed-demo-users.ts
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../../.env.local') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { UsersService } from '../../users/users.service';
import { UserRole, UserStatus } from '../../users/entities/user.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

const DEMO_USERS = [
  {
    email: 'admin@quickbite.com',
    fullName: 'Platform Admin',
    role: UserRole.ADMIN,
    phone: '+8801700000001',
    password: 'Admin@123456',
  },
  {
    email: 'owner@quickbite.com',
    fullName: 'Chef Marco (Owner)',
    role: UserRole.OWNER,
    phone: '+8801700000002',
    password: 'Owner@123456',
  },
  {
    email: 'agent@quickbite.com',
    fullName: 'Rider Rahim (Agent)',
    role: UserRole.AGENT,
    phone: '+8801700000003',
    password: 'Agent@123456',
  },
  {
    email: 'customer@quickbite.com',
    fullName: 'Sarah Customer',
    role: UserRole.CUSTOMER,
    phone: '+8801700000004',
    password: 'Customer@123456',
  },
];

async function seedDemoUsers() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const userRepo = usersService['userRepository'];
  const restaurantRepo = app.get<Repository<Restaurant>>(getRepositoryToken(Restaurant));

  console.log('🌱 Seeding / verifying demo users for all 4 roles...');

  try {
    for (const demo of DEMO_USERS) {
      let user = await userRepo.findOne({ where: { email: demo.email } });
      const passwordHash = await bcrypt.hash(demo.password, 12);

      if (user) {
        // Update password and ensure approved status
        user.passwordHash = passwordHash;
        user.status = UserStatus.APPROVED;
        user.isDeleted = false;
        user.role = demo.role;
        user = await userRepo.save(user);
        console.log(`✅ Updated existing demo user: ${demo.role.toUpperCase()} (${demo.email})`);
      } else {
        user = userRepo.create({
          email: demo.email,
          fullName: demo.fullName,
          phone: demo.phone,
          role: demo.role,
          status: UserStatus.APPROVED,
          passwordHash,
          isDeleted: false,
        });
        user = await userRepo.save(user);
        console.log(`✅ Created demo user: ${demo.role.toUpperCase()} (${demo.email})`);
      }

      // If owner, ensure at least one open restaurant is owned by this user
      if (demo.role === UserRole.OWNER) {
        const owned = await restaurantRepo.findOne({ where: { ownerId: user.id } });
        if (!owned) {
          // Check if there's any restaurant without owner or update first restaurant
          const firstRestaurant = await restaurantRepo.findOne({ where: { isDeleted: false } });
          if (firstRestaurant) {
            firstRestaurant.ownerId = user.id;
            firstRestaurant.isOpen = true;
            await restaurantRepo.save(firstRestaurant);
            console.log(`🍽️ Assigned restaurant "${firstRestaurant.name}" to owner ${demo.email}`);
          }
        }
      }
    }

    console.log('\n=============================================');
    console.log('DEMO ACCOUNTS READY (EACH TYPE ONE):');
    console.log('1. Admin:    admin@quickbite.com    | Admin@123456');
    console.log('2. Owner:    owner@quickbite.com    | Owner@123456');
    console.log('3. Agent:    agent@quickbite.com    | Agent@123456');
    console.log('4. Customer: customer@quickbite.com | Customer@123456');
    console.log('=============================================\n');
  } catch (error: any) {
    console.error('❌ Error seeding demo users:', error.message);
  } finally {
    await app.close();
  }
}

seedDemoUsers();
