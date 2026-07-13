import { Elysia } from 'elysia';
import { staticPlugin } from '@elysiajs/static';
import { Database } from 'bun:sqlite';

// --- persistence ---
const db = new Database('cookies.db');
db.run(`CREATE TABLE IF NOT EXISTS state (
  key   TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
)`);
db.run(`INSERT OR IGNORE INTO state (key, value) VALUES ('total', 0)`);

const stmtGet = db.query<{ value: number }, [string]>(
  'SELECT value FROM state WHERE key = ?'
);
const stmtAdd = db.query(
  'UPDATE state SET value = value + ? WHERE key = ?'
);

const getTotal = (): number => stmtGet.get('total')?.value ?? 0;

// --- server ---
let userCount = 0;

new Elysia()
  .use(staticPlugin({ assets: 'public', prefix: '/' }))
  .ws('/ws', {
    open(ws) {
      userCount++;
      ws.subscribe('room');
      ws.send(JSON.stringify({ type: 'state', total: getTotal(), users: userCount }));
      ws.publish('room', JSON.stringify({ type: 'users', users: userCount }));
    },
    message(ws, msg) {
      const data = (typeof msg === 'string' ? JSON.parse(msg) : msg) as any;
      if (data?.type === 'click' && typeof data.amount === 'number' && data.amount > 0) {
        const capped = Math.min(Math.floor(data.amount), 10_000);
        stmtAdd.run(capped, 'total');
        const total = getTotal();
        const out = JSON.stringify({ type: 'update', total, delta: capped });
        ws.send(out);          // echo back to sender
        ws.publish('room', out); // broadcast to everyone else
      }
    },
    close(ws) {
      userCount = Math.max(0, userCount - 1);
      ws.unsubscribe('room');
      ws.publish('room', JSON.stringify({ type: 'users', users: userCount }));
    }
  })
  .listen(3000, () => console.log('🍪 http://localhost:3000'));
