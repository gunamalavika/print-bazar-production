import { execSync } from 'child_process';

console.log('--- Initializing PRINT BAZZAR 2.0 Local Environment ---');

try {
  console.log('1. Generating Prisma Client...');
  execSync('npm run prisma:generate', { stdio: 'inherit' });

  console.log('2. Applying Database Migrations (or push)...');
  execSync('npm run prisma:push --workspace=api', { stdio: 'inherit' });

  console.log('3. Seeding Database with Core Roles & Machine Work Centers...');
  execSync('npm run prisma:seed --workspace=api', { stdio: 'inherit' });

  console.log('✅ PRINT BAZZAR 2.0 environment setup complete!');
} catch (error) {
  console.error('Error during setup:', error);
  process.exit(1);
}
