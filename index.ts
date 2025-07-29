import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import loadRoutes from './routes/load.routes';
import paymentRoutes from './routes/payment.routes';
import fuelRoutes from './routes/fuel.routes';
// import userRoutes from './routes/user.routes';
// import fleetRoutes from './routes/fleet.routes';
// import vettingRoutes from './routes/vetting.routes';
// import notificationRoutes from './routes/notification.routes';

// Create Express app
const app: Express = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Define a simple route for testing
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the Uber-style Logistics Platform API' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/loads', loadRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/fuel', fuelRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/fleet', fleetRoutes);
// app.use('/api/vetting', vettingRoutes);
// app.use('/api/notifications', notificationRoutes);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Join room based on user ID
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room ${userId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
  
  // Load tracking
  socket.on('trackLoad', (loadId) => {
    socket.join(`load-${loadId}`);
    console.log(`Socket ${socket.id} is tracking load ${loadId}`);
  });
  
  socket.on('stopTrackingLoad', (loadId) => {
    socket.leave(`load-${loadId}`);
    console.log(`Socket ${socket.id} stopped tracking load ${loadId}`);
  });
  
  // Location updates
  socket.on('updateLocation', (data) => {
    // Broadcast location update to all clients tracking this load
    io.to(`load-${data.loadId}`).emit('locationUpdated', data);
  });
});

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/logistics-platform';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, async () => {
  await connectDB();
  console.log(`Server running on port ${PORT}`);
});

export { io };