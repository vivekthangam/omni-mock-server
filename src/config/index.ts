import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  grpcPort: parseInt(process.env.GRPC_PORT || '50051', 10),
  httpsPort: parseInt(process.env.HTTPS_PORT || '8443', 10),
  jwtSecret: process.env.JWT_SECRET || 'omnimock-super-secret-jwt-key-change-me',
  enableMtls: process.env.ENABLE_MTLS === 'true',
  nodeEnv: process.env.NODE_ENV || 'development',
};
