import dotenv from 'dotenv';
import path from 'path';

// Configure dotenv with explicit path to .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Export environment variables with types and default values
export const env = {
  PORT: process.env.PORT || '8000',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://qciipodlfjrfdkuypllq.supabase.co',
  SUPABASE_KEY: process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjaWlwb2RsZmpyZmRrdXlwbGxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4Mzc2MTksImV4cCI6MjA2MTQxMzYxOX0.Jec1T8vBLNtyFm1mYkXeb-TW85ciXsLjYL4iqEHoejU',
  NODE_ENV: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// Validate required environment variables
export const validateEnv = () => {
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_KEY'];
  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(', ')}. Please check your .env file.`
    );
  }
};