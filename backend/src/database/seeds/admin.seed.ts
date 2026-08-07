import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { UsersService } from '../../users/users.service';
import { UserRole, UserStatus } from '../../users/entities/user.entity';
import * as bcrypt from 'bcryptjs';

async function seed() {
  // 1. Create the app context
  const app = await NestFactory.createApplicationContext(AppModule);

  // 2. Get the UsersService
  const usersService = app.get(UsersService);

  console.log('🌱 Starting Admin Seeding...');

  try {
    // Check if admin already exists
    const existingAdmin = await usersService['userRepository'].findOne({
      where: { email: 'admin@fooddelivery.com' },
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists. Skipping...');
      await app.close();
      return;
    }

    // 3. Manually create the admin user
    const hashedPassword = await bcrypt.hash('Admin@123456', 12);

    // FIXED: Used the actual User entity creation syntax that satisfies TypeScript
    const adminUser = usersService['userRepository'].create({
      email: 'admin@fooddelivery.com',
      passwordHash: hashedPassword,
      fullName: 'System Administrator',
      phone: '+8801711111111',
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED, // <--- CRITICAL FIX: Use the enum UserStatus.APPROVED
      isDeleted: false,
    });

    await usersService['userRepository'].save(adminUser);

    console.log('✅ Admin user seeded successfully!');
    console.log('📧 Email: admin@fooddelivery.com');
    console.log('🔑 Password: Admin@123456');

  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
  } finally {
    await app.close();
  }
}

seed();