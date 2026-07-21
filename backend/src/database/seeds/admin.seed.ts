import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../../users/entities/user.entity';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@quickbite.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const adminName = process.env.ADMIN_NAME || 'Super Admin';

  const existingAdmin = await userRepository.findOne({ 
    where: { email: adminEmail } 
  });
  
  if (existingAdmin) {
    console.log('✅ Admin already exists');
    await app.close();
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = userRepository.create({
    fullName: adminName,
    email: adminEmail,
    phone: '+880000000000',
    address: 'System Administrator',
    passwordHash: hashedPassword,
    role: UserRole.ADMIN,
    status: UserStatus.APPROVED,
  });

  await userRepository.save(admin);

  console.log('\n✅ Admin created successfully!');
  console.log('📧 Email:', adminEmail);
  console.log('🔑 Password:', adminPassword);
  console.log('⚠️  Please change your password after first login.\n');

  await app.close();
}

bootstrap();