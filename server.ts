import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import * as xlsx from 'xlsx';
import { db } from './server/db';
import { Card, Theme, Deck } from './src/types';

dotenv.config();

const PORT = 3000;

// Memory storage for live rooms
interface RoomState {
  roomId: string;
  createdAt: Date;
  drawnCardIds: { [themeId: string]: string[] }; // Map themeId -> list of cardIds drawn
  connectedSockets: string[];
}

const liveRooms: { [roomId: string]: RoomState } = {};

function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function injectSeoAndScripts(html: string, seo: any, fullUrl: string): string {
  let extraHead = '\n  <!-- Dynamic OpenGraph and SEO tags -->\n';
  
  if (seo.ogTitle) {
    extraHead += `  <meta property="og:title" content="${escapeHtml(seo.ogTitle)}" />\n`;
  } else if (seo.title) {
    extraHead += `  <meta property="og:title" content="${escapeHtml(seo.title)}" />\n`;
  }

  if (seo.ogDescription) {
    extraHead += `  <meta property="og:description" content="${escapeHtml(seo.ogDescription)}" />\n`;
  } else if (seo.description) {
    extraHead += `  <meta property="og:description" content="${escapeHtml(seo.description)}" />\n`;
  }

  if (seo.ogImage) {
    extraHead += `  <meta property="og:image" content="${escapeHtml(seo.ogImage)}" />\n`;
  }

  if (seo.ogType) {
    extraHead += `  <meta property="og:type" content="${escapeHtml(seo.ogType)}" />\n`;
  } else {
    extraHead += `  <meta property="og:type" content="website" />\n`;
  }

  extraHead += `  <meta property="og:url" content="${escapeHtml(fullUrl)}" />\n`;

  if (seo.headerScript) {
    extraHead += `  ${seo.headerScript}\n`;
  }

  // Update original title tag if custom title exists
  if (seo.title) {
    html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(seo.title)}</title>`);
  }

  // Handle meta description replacement or inclusion
  if (seo.description) {
    const descRegex = /<meta[^>]*?name=["']description["'][^>]*?>/i;
    if (descRegex.test(html)) {
      html = html.replace(descRegex, `<meta name="description" content="${escapeHtml(seo.description)}" />`);
    } else {
      extraHead += `  <meta name="description" content="${escapeHtml(seo.description)}" />\n`;
    }
  }

  // Handle meta keywords replacement or inclusion
  if (seo.keywords) {
    const keywordsRegex = /<meta[^>]*?name=["']keywords["'][^>]*?>/i;
    if (keywordsRegex.test(html)) {
      html = html.replace(keywordsRegex, `<meta name="keywords" content="${escapeHtml(seo.keywords)}" />`);
    } else {
      extraHead += `  <meta name="keywords" content="${escapeHtml(seo.keywords)}" />\n`;
    }
  }

  html = html.replace('</head>', `${extraHead}</head>`);

  if (seo.bodyScript) {
    html = html.replace('</body>', `${seo.bodyScript}\n</body>`);
  }

  return html;
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
  // Create Socket.io server with path and CORS configuration
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  app.use(express.json());

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Get full game state for players (all default deck components)
  app.get('/api/game/state', (req, res) => {
    const decks = db.getDecks();
    const defaultDeck = decks.find(d => d.isDefault) || decks[0] || null;
    const defaultDeckId = defaultDeck ? defaultDeck.id : null;

    const allThemes = db.getThemes();
    const filteredThemes = defaultDeckId ? allThemes.filter(t => t.deckId === defaultDeckId) : [];
    
    const allCards = db.getCards();
    const filteredCards = allCards.filter(c => filteredThemes.some(t => t.id === c.themeId));

    res.json({
      decks,
      currentDeckId: defaultDeckId,
      themes: filteredThemes,
      cards: filteredCards,
      rules: db.getRules(),
      seo: db.getSEO(),
      home: db.getHome(),
      footer: db.getFooter()
    });
  });

  // In-memory rate limiting tracker for IP addresses
  const loginAttempts: { [ip: string]: { failedAttempts: number; lastAttemptTime: number } } = {};

  // Check administrator credentials with rate-limiting and throttling
  app.post('/api/admin/login', async (req, res) => {
    const ip = (req.headers['x-forwarded-for'] as string || req.ip || 'unknown-ip').split(',')[0].trim();
    const tracker = loginAttempts[ip] || { failedAttempts: 0, lastAttemptTime: 0 };
    const now = Date.now();

    // Enforce a strict 5 second cooling down period once they cross 3 failure attempts
    if (tracker.failedAttempts >= 3) {
      const timeSinceLast = now - tracker.lastAttemptTime;
      const cooldownRequired = 5000; // 5 seconds
      if (timeSinceLast < cooldownRequired) {
        const waitSecs = Math.ceil((cooldownRequired - timeSinceLast) / 1000);
        return res.status(429).json({
          success: false,
          message: `Слишком частые попытки входа! Разгадайте капчу и подождите еще ${waitSecs} сек.`
        });
      }
    }

    const { login, password } = req.body;
    const currentAdmin = db.getAdmin();

    // Apply incremental response delay (up to 6s) to completely demotivate automatic dictionary attacks
    const delay = Math.min(6000, tracker.failedAttempts * 1000);
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (login === currentAdmin.adminLogin && password === currentAdmin.adminPass) {
      delete loginAttempts[ip]; // Reset tracker on successful credentials matching
      res.json({ success: true, token: 'admin-authorized-token' });
    } else {
      tracker.failedAttempts += 1;
      tracker.lastAttemptTime = Date.now();
      loginAttempts[ip] = tracker;
      res.status(401).json({ success: false, message: 'Неверное имя пользователя или пароль' });
    }
  });

  // Get administrative database bundle
  app.get('/api/admin/bundle', (req, res) => {
    res.json({
      decks: db.getDecks(),
      themes: db.getThemes(),
      cards: db.getCards(),
      rules: db.getRules(),
      seo: db.getSEO(),
      home: db.getHome(),
      footer: db.getFooter(),
      admin: {
        adminLogin: db.getAdmin().adminLogin,
        adminPass: '••••••••' // mask real password for basic security
      }
    });
  });

  // Update administrative login/password credentials
  app.post('/api/admin/credentials', (req, res) => {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }
    db.updateAdmin({
      adminLogin: login,
      adminPass: password
    });
    res.json({ success: true, message: 'Учетные данные администратора обновлены' });
  });

  // Decks Management
  app.post('/api/admin/decks', (req, res) => {
    const { decks } = req.body;
    if (Array.isArray(decks)) {
      db.updateDecks(decks);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Неверный формат данных' });
    }
  });

  // Themes Management
  app.post('/api/admin/themes', (req, res) => {
    const { themes } = req.body;
    if (Array.isArray(themes)) {
      db.updateThemes(themes);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Неверный формат данных' });
    }
  });

  // Cards Management
  app.post('/api/admin/cards', (req, res) => {
    const { cards } = req.body;
    if (Array.isArray(cards)) {
      db.updateCards(cards);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Неверный формат данных' });
    }
  });

  // Rules Editing
  app.post('/api/admin/rules', (req, res) => {
    const { text } = req.body;
    db.updateRules({ text });
    res.json({ success: true });
  });

  // SEO Editing
  app.post('/api/admin/seo', (req, res) => {
    const { title, description, keywords } = req.body;
    db.updateSEO({ title, description, keywords });
    res.json({ success: true });
  });

  // Home Editing
  app.post('/api/admin/home', (req, res) => {
    const { title, subtitle, imageUrl, calculatorUrl, cardUrl } = req.body;
    db.updateHome({ title, subtitle, imageUrl, calculatorUrl, cardUrl });
    res.json({ success: true });
  });

  // Footer Editing
  app.post('/api/admin/footer', (req, res) => {
    const { text } = req.body;
    db.updateFooter({ text });
    res.json({ success: true });
  });

  // Statistics aggregated data with filtering capability
  app.get('/api/admin/stats', (req, res) => {
    const { from, to } = req.query;
    const rawStats = db.getStatsRaw();
    const history = rawStats.history;

    // Filter history based on dates if provided
    let filteredHistory = history;
    if (from) {
      const fromTime = new Date(from as string).getTime();
      filteredHistory = filteredHistory.filter(h => new Date(h.timestamp).getTime() >= fromTime);
    }
    if (to) {
      const toTime = new Date(to as string).getTime();
      filteredHistory = filteredHistory.filter(h => new Date(h.timestamp).getTime() <= toTime);
    }

    // Active rooms breakdown
    const activeRoomsStats = Object.keys(liveRooms).map(roomId => ({
      roomId,
      createdAt: liveRooms[roomId].createdAt.toISOString(),
      activePlayersCount: liveRooms[roomId].connectedSockets.length
    }));

    res.json({
      totalTablesCreated: rawStats.totalTablesCreated,
      totalPlayersJoined: rawStats.totalPlayersJoined,
      activeTables: activeRoomsStats,
      history: filteredHistory
    });
  });

  // Export game cards as Excel sheet (.xlsx)
  app.get('/api/admin/export-excel', (req, res) => {
    try {
      const decks = db.getDecks();
      const themes = db.getThemes();
      const cards = db.getCards();

      const excelRows = cards.map(card => {
        const theme = themes.find(t => t.id === card.themeId);
        const deck = theme ? decks.find(d => d.id === theme.deckId) : null;
        
        return {
          'ID Карточки (Не изменять!)': card.id,
          'Комплект (Набор)': deck ? deck.name : 'Без набора',
          'Тема': theme ? theme.name : 'Без темы',
          'Текст карточки (Задание)': card.text
        };
      });

      const worksheet = xlsx.utils.json_to_sheet(excelRows);
      
      // Auto-fit column widths
      worksheet['!cols'] = [
        { wch: 25 }, // ID
        { wch: 30 }, // Deck
        { wch: 30 }, // Theme
        { wch: 80 }  // Card text
      ];

      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Карточки вопросов');

      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Mama_Ya_Bogat_Cards.xlsx');
      res.send(buffer);
    } catch (err) {
      console.error('Ошибка экспорта в Excel:', err);
      res.status(500).json({ error: 'Не удалось экспортировать в Excel' });
    }
  });

  // Redirect old Word doc URL to new Excel format for backwards compatibility
  app.get('/api/admin/export-word', (req, res) => {
    res.redirect('/api/admin/export-excel');
  });

  // Import game cards from Excel sheet (.xlsx)
  app.post('/api/admin/import-excel', (req, res) => {
    const { fileData } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: 'Файл не передан' });
    }

    try {
      const buffer = Buffer.from(fileData, 'base64');
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(worksheet, { defval: '' }) as any[];

      const currentDecks = [...db.getDecks()];
      const currentThemes = [...db.getThemes()];
      const currentCards = [...db.getCards()];

      let decksCreated = 0;
      let themesCreated = 0;
      let cardsCreated = 0;
      let cardsUpdated = 0;

      const colors = ['emerald', 'sky', 'indigo', 'amber', 'rose', 'purple', 'orange', 'teal'];

      // Helper function for fuzzy column match
      const findValue = (row: any, keys: string[]) => {
        for (const k of Object.keys(row)) {
          const cleanK = k.toLowerCase().replace(/[^a-zа-я0-9]/g, '').trim();
          for (const key of keys) {
            const cleanKey = key.toLowerCase().replace(/[^a-zа-я0-9]/g, '').trim();
            if (cleanK.includes(cleanKey) || cleanKey.includes(cleanK)) {
              return row[k];
            }
          }
        }
        return '';
      };

      for (const row of rows) {
        const deckName = findValue(row, ['комплект', 'набор', 'deck', 'pack']).toString().trim();
        const themeName = findValue(row, ['тема', 'theme', 'категория', 'category']).toString().trim();
        const cardText = findValue(row, ['текст', 'карточка', 'задание', 'text', 'card', 'body']).toString().trim();
        const cardIdInput = findValue(row, ['id', 'ид', 'key']).toString().trim();

        if (!cardText) {
          continue; // Skip lines that don't have task specification
        }

        // 1. Resolve or Create Deck
        const finalDeckName = deckName || '💸 Стандартный (Мама, я богат!)';
        let targetDeck = currentDecks.find(d => d.name.toLowerCase().trim() === finalDeckName.toLowerCase().trim());
        if (!targetDeck) {
          const newDeckId = 'deck-' + Math.random().toString(36).substring(2, 11);
          targetDeck = { id: newDeckId, name: finalDeckName, isDefault: currentDecks.length === 0 };
          currentDecks.push(targetDeck);
          decksCreated++;
        }

        // 2. Resolve or Create Theme under that Deck
        const finalThemeName = themeName || 'Разное';
        let targetTheme = currentThemes.find(t => 
          t.deckId === targetDeck!.id && t.name.toLowerCase().trim() === finalThemeName.toLowerCase().trim()
        );
        if (!targetTheme) {
          const newThemeId = 'theme-' + Math.random().toString(36).substring(2, 11);
          const color = colors[(currentThemes.length + themesCreated) % colors.length];
          targetTheme = { id: newThemeId, deckId: targetDeck.id, name: finalThemeName, color };
          currentThemes.push(targetTheme);
          themesCreated++;
        }

        // 3. Resolve, Update or Create Card
        if (cardIdInput) {
          const existingCardIdx = currentCards.findIndex(c => c.id === cardIdInput);
          if (existingCardIdx !== -1) {
            currentCards[existingCardIdx] = {
              id: cardIdInput,
              themeId: targetTheme.id,
              text: cardText
            };
            cardsUpdated++;
            continue;
          }
        }

        // Generate a new Card ID if none was matched
        const newCardId = cardIdInput || 'c-' + Math.random().toString(36).substring(2, 11);
        currentCards.push({
          id: newCardId,
          themeId: targetTheme.id,
          text: cardText
        });
        cardsCreated++;
      }

      // Commit changes to the databases
      db.updateDecks(currentDecks);
      db.updateThemes(currentThemes);
      db.updateCards(currentCards);

      res.json({
        success: true,
        summary: {
          decksCreated,
          themesCreated,
          cardsCreated,
          cardsUpdated,
          totalCards: currentCards.length
        }
      });
    } catch (err) {
      console.error('Ошибка импорта из Excel:', err);
      res.status(500).json({ error: 'Не удалось обработать Excel файл' });
    }
  });

  // --- Real-time Socket.io state machine ---
  io.on('connection', (socket: Socket) => {
    // Player joins a game table / room
    socket.on('join-room', (roomId: string) => {
      socket.join(roomId);

      // Create room state if absent
      if (!liveRooms[roomId]) {
        liveRooms[roomId] = {
          roomId,
          createdAt: new Date(),
          drawnCardIds: {},
          connectedSockets: []
        };
        db.logTableCreated(roomId);
      }

      const room = liveRooms[roomId];
      if (!room.connectedSockets.includes(socket.id)) {
        room.connectedSockets.push(socket.id);
        db.logPlayerJoined(roomId);
      }

      // Notify other players
      io.to(roomId).emit('player-joined', {
        activePlayersCount: room.connectedSockets.length
      });

      // Send initial room setup
      socket.emit('room-sync', {
        roomId,
        drawnCardIds: room.drawnCardIds,
        activePlayersCount: room.connectedSockets.length
      });
    });

    // Drawing a random card for a specific theme, server-authoritative
    socket.on('draw-card', (payload: { roomId: string; themeId: string }) => {
      const { roomId, themeId } = payload;
      const room = liveRooms[roomId];
      if (!room) return;

      // Find all cards for this theme
      const allCards = db.getCards();
      const themeCards = allCards.filter(c => c.themeId === themeId);
      
      if (themeCards.length === 0) {
        socket.emit('draw-card-response', { success: false, reason: 'no-cards' });
        return;
      }

      // Get already drawn card IDs for this theme in this room
      if (!room.drawnCardIds[themeId]) {
        room.drawnCardIds[themeId] = [];
      }
      
      let drawnIds = room.drawnCardIds[themeId];
      let availableCards = themeCards.filter(c => !drawnIds.includes(c.id));

      let reshut = false;
      // If we have run out of cards, let's reset/reshuffle the deck for this theme!
      if (availableCards.length === 0) {
        room.drawnCardIds[themeId] = [];
        drawnIds = [];
        availableCards = themeCards;
        reshut = true;
      }

      // Select random card
      const randomIndex = Math.floor(Math.random() * availableCards.length);
      const selectedCard = availableCards[randomIndex];

      // Add to drawn cards list
      room.drawnCardIds[themeId].push(selectedCard.id);
      db.logCardPulled(roomId, selectedCard.id);

      // Broadcast the event to all users in the room
      io.to(roomId).emit('card-drawn-broadcast', {
        themeId,
        card: selectedCard,
        drawnCardIds: room.drawnCardIds,
        reshuffled: reshut
      });
    });

    // Resetting drawn status for all card decks in this table
    socket.on('reset-room-cards', (roomId: string) => {
      const room = liveRooms[roomId];
      if (!room) return;
      room.drawnCardIds = {};
      io.to(roomId).emit('room-cards-reset', { drawnCardIds: {} });
    });

    // Player disconnects
    socket.on('disconnect', () => {
      for (const roomId of Object.keys(liveRooms)) {
        const room = liveRooms[roomId];
        const index = room.connectedSockets.indexOf(socket.id);
        if (index !== -1) {
          room.connectedSockets.splice(index, 1);
          
          // Notify room members
          io.to(roomId).emit('player-left', {
            activePlayersCount: room.connectedSockets.length
          });

          // Cleanup empty rooms after 1 minute of inactivity
          if (room.connectedSockets.length === 0) {
            setTimeout(() => {
              if (liveRooms[roomId] && liveRooms[roomId].connectedSockets.length === 0) {
                delete liveRooms[roomId];
              }
            }, 60000);
          }
          break;
        }
      }
    });
  });

  // --- Serve Frontend Application ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    
    // Intercept html requests to dynamically inject header and body scripts in dev environment
    app.use(async (req, res, next) => {
      if (req.headers.accept?.includes('text/html')) {
        try {
          const url = req.originalUrl;
          let html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
          html = await vite.transformIndexHtml(url, html);
          
          const seo = db.getSEO();
          const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
          html = injectSeoAndScripts(html, seo, fullUrl);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
          return;
        } catch (e) {
          vite.ssrFixStacktrace(e as Error);
          return next(e);
        }
      }
      next();
    });
    
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // We disable automatic serving of index.html in express.static to handle it ourselves via custom wildcards
    app.use(express.static(distPath, { index: false }));
    app.get('*', (req, res) => {
      try {
        const filePath = path.join(distPath, 'index.html');
        if (fs.existsSync(filePath)) {
          let html = fs.readFileSync(filePath, 'utf-8');
          const seo = db.getSEO();
          const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
          html = injectSeoAndScripts(html, seo, fullUrl);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
        } else {
          res.status(404).send('Not Found');
        }
      } catch (err) {
        res.status(500).send('Internal Server Error');
      }
    });
  }

  // Use httpServer instead of app to correctly host Socket.IO along with HTTP server
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server starting up successfully! Running node server on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start full-stack server', err);
});
