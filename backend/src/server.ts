import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import barangRouter from './routes/barang';
import transaksiRouter from './routes/transaksi';
import userRouter from './routes/user';
import { errorHandler } from './middleware/error';

dotenv.config();

const app = express();
const server = http.createServer(app);
const origins = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean);
export const io = new Server(server, { cors: { origin: origins ?? process.env.CORS_ORIGIN } });

io.on('connection', (socket) => {
  socket.on('join', (room: string) => socket.join(room));
});

app.use(helmet());
app.use(cors({ origin: origins ?? process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/barang', barangRouter);
app.use('/api/transaksi', transaksiRouter);
app.use('/api/user', userRouter);

app.use(errorHandler);

const port = Number(process.env.PORT || 3000);
server.listen(port, () => console.log(`API running on :${port}`));