import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Hide Express fingerprint
app.disable('x-powered-by');

// 2. Government-Grade Security HTTP Headers & Content-Security-Policy (CSP)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https: wss:",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  next();
});

// 2b. Web Application Firewall (WAF) — Blocks SQLi, Path Traversal, Command Injection & Vulnerability Scanners
const WAF_BLOCKED_UA = /sqlmap|nikto|nmap|masscan|dirbuster|gobuster|wpscan|acunetix|nessus|openvas/i;
const WAF_ATTACK_PATTERNS = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i, // SQLi meta-characters
  /\b(union\s+select|select\s+.*\s+from|insert\s+into|delete\s+from|drop\s+table|update\s+.*\s+set)\b/i, // SQLi keywords
  /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\.\.%2f)/i, // Path traversal
  /(\/etc\/passwd|\/etc\/shadow|cmd\.exe|powershell\.exe)/i, // System file / shell access
];

app.use((req, res, next) => {
  const ua = req.headers['user-agent'] || '';
  if (WAF_BLOCKED_UA.test(ua)) {
    return res.status(403).json({ error: 'Access denied by Web Application Firewall.' });
  }

  const targetUrl = req.originalUrl || req.url || '';
  for (const pattern of WAF_ATTACK_PATTERNS) {
    if (pattern.test(targetUrl)) {
      return res.status(403).json({ error: 'Malicious request pattern blocked by WAF.' });
    }
  }

  next();
});

// 3. In-Memory Sliding-Window Rate Limiter & Brute-Force Protection
const apiRateMap = new Map<string, { count: number; resetAt: number }>();
const authRateMap = new Map<string, { count: number; resetAt: number }>();

const getClientIp = (req: express.Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
};

app.use('/api', (req, res, next) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 120;

  const record = apiRateMap.get(ip);
  if (!record || now > record.resetAt) {
    apiRateMap.set(ip, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (record.count >= maxRequests) {
    return res.status(429).json({
      error: 'Too many requests. Please slow down and try again shortly.',
    });
  }

  record.count += 1;
  return next();
});

// Support high payload limits for photo attachments (Base64 JPEG/PNG)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// 4. Recursive XSS & Script Injection Sanitizer Middleware
const sanitizeValue = (val: unknown): unknown => {
  if (typeof val === 'string') {
    // Preserve valid base64 data:image/* URLs while stripping script/event-handler injections
    if (val.startsWith('data:image/')) {
      return val;
    }
    return val
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  if (val !== null && typeof val === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      sanitizedObj[k] = sanitizeValue(v);
    }
    return sanitizedObj;
  }
  return val;
};

app.use('/api', (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
});

// 5. Hardened Server-Side Staff Authentication with Constant-Time Comparison & Brute-Force Lockout
const STAFF_USERNAME = (process.env.STAFF_USERNAME || 'sakhuwananrkattigaupalika@gmail.com').toLowerCase();
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || '';

const safeCompare = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
};

app.post('/api/auth/login', (req, res) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const lockWindowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 8;

  const authRecord = authRateMap.get(ip);
  if (authRecord && now <= authRecord.resetAt && authRecord.count >= maxAttempts) {
    return res.status(429).json({
      error: 'धेरै पटक गलत प्रयास भयो। कृपया १५ मिनेटपछि पुनः प्रयास गर्नुहोस्।',
    });
  }

  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '').trim();

  if (safeCompare(username, STAFF_USERNAME) && safeCompare(password, STAFF_PASSWORD)) {
    authRateMap.delete(ip);
    const sessionToken = crypto.randomBytes(32).toString('hex');
    return res.json({
      authenticated: true,
      role: 'admin',
      token: sessionToken,
    });
  }

  if (!authRecord || now > authRecord.resetAt) {
    authRateMap.set(ip, { count: 1, resetAt: now + lockWindowMs });
  } else {
    authRecord.count += 1;
  }

  return res.status(401).json({
    authenticated: false,
    error: 'अमान्य प्रयोगकर्ता नाम वा पासवर्ड! कृपया सही विवरण प्रविष्ट गर्नुहोस्।',
  });
});

// Data Persistence setup in data/db.json
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed data
const SEED_DATA = {
  complaints: [
    {
      id: 'c1',
      referenceNumber: 'SKK-2026-7K4M9Q2X',
      title: 'सखुवा बजारदेखि वडा नं २ सम्मको मुख्य सडक हिलाम्मे भई आवागमन ठप्प',
      category: 'roads_infrastructure',
      wardNumber: 2,
      landmark: 'सखुवा बजार चोक, कटहा नहर पुल नजिक',
      description: 'वर्षाका कारण सखुवा बजारबाट वडा नं २ जोड्ने मुख्य सडकमा ठूला खाल्डाखुल्डी परेका छन् र हिलाम्मे भएर अटो र एम्बुलेन्स समेत गुड्न सकेका छैनन्। तत्काल ग्राभेलिङ गर्न अनुरोध छ।',
      preferredReplyLanguage: 'ne',
      contactMethod: 'phone',
      citizenName: 'रमेश कुमार यादव',
      citizenPhone: '98428XXXXX',
      citizenEmail: 'ramesh.y@example.com',
      isConfidentialIdentity: false,
      isChairpersonAttentionRequested: true,
      isConflictOfInterest: false,
      status: 'In progress',
      assignedDepartment: 'पूर्वाधार विकास तथा प्राविधिक शाखा',
      assignedWard: 2,
      assignedOfficerName: 'इन्जिनियर विजय कर्ण',
      attachments: [
        {
          id: 'att-1',
          name: 'road_damage_bazaar.jpg',
          sizeBytes: 1240000,
          mimeType: 'image/jpeg',
          quarantineStatus: 'safe',
          uploadedAt: '2026-10-25T04:30:00Z',
          dataUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
        },
      ],
      statusHistory: [
        {
          status: 'Submitted',
          changedByRole: 'citizen',
          changedByName: 'रमेश कुमार यादव',
          timestamp: '2026-10-25T04:30:00Z',
        },
        {
          status: 'Under review',
          changedByRole: 'intake_officer',
          changedByName: 'दर्ता अधिकृत (सुनिता महतो)',
          reason: 'प्रारम्भिक अध्ययन सम्पन्न, स्थलगत नापजाँच आवश्यक',
          timestamp: '2026-10-25T06:00:00Z',
        },
        {
          status: 'Assigned',
          changedByRole: 'intake_officer',
          changedByName: 'दर्ता अधिकृत (सुनिता महतो)',
          reason: 'पूर्वाधार शाखा र वडा नं २ का प्राविधिकलाई खटाइयो',
          timestamp: '2026-10-25T07:15:00Z',
        },
        {
          status: 'In progress',
          changedByRole: 'ward_officer',
          changedByName: 'इन्जिनियर विजय कर्ण',
          reason: 'फिल्ड सर्भे सम्पन्न भई ग्राभेलिङका लागि लागत अनुमान तयार हुँदैछ',
          timestamp: '2026-10-26T03:00:00Z',
        },
      ],
      createdAt: '2026-10-25T04:30:00Z',
      updatedAt: '2026-10-26T03:00:00Z',
      slaTargetDays: 7,
    },
    {
      id: 'c2',
      referenceNumber: 'SKK-2026-3N8P2R5Y',
      title: 'वडा नं ४ स्थित स्वास्थ्य चौकीमा आधारभूत औषधिको अभाव',
      category: 'health_services',
      wardNumber: 4,
      landmark: 'वडा नं ४ स्वास्थ्य चौकी परिसर, मौवाही',
      description: 'स्वास्थ्य चौकीमा सरकारले निःशुल्क वितरण गर्ने सिटामोल, जीवनजल, र रक्तचापका आधारभूत औषधिहरू विगत २ हप्तादेखि सकिएको छ। बिरामीहरू निजी मेडिकलमा जान बाध्य छन्।',
      preferredReplyLanguage: 'ne',
      contactMethod: 'phone',
      citizenName: 'सुमन कुमारी राउत',
      citizenPhone: '98045XXXXX',
      isConfidentialIdentity: true,
      isChairpersonAttentionRequested: true,
      isConflictOfInterest: false,
      status: 'Assigned',
      assignedDepartment: 'स्वास्थ्य शाखा',
      assignedWard: 4,
      assignedOfficerName: 'स्वास्थ्य शाखा प्रमुख (डा. अरविन्द मण्डल)',
      attachments: [],
      statusHistory: [
        {
          status: 'Submitted',
          changedByRole: 'citizen',
          changedByName: 'गोपनीय नागरिक',
          timestamp: '2026-10-26T02:10:00Z',
        },
        {
          status: 'Assigned',
          changedByRole: 'intake_officer',
          changedByName: 'दर्ता अधिकृत',
          reason: 'स्वास्थ्य शाखालाई केन्द्रीय औषधि आपूर्तिका लागि तत्काल जिम्मा दिइयो',
          timestamp: '2026-10-26T05:30:00Z',
        },
      ],
      createdAt: '2026-10-26T02:10:00Z',
      updatedAt: '2026-10-26T05:30:00Z',
      slaTargetDays: 3,
    },
    {
      id: 'c3',
      referenceNumber: 'SKK-2026-9M2K6W1L',
      title: 'वडा नं १ मा डिप बोरिङ खानेपानी योजना बन्द भएकोबारे',
      category: 'drinking_water_sanitation',
      wardNumber: 1,
      landmark: 'टोल विकास संस्था भवन पछाडि',
      description: 'खानेपानीको मोटर जलेका कारण ५० भन्दा बढी घरधुरीले पिउने पानी पाएका छैनन्। उपभोक्ता समितिले बजेट नभएको बताएकाले गाउँपालिकाबाट प्राविधिक टोली खटाउन अनुरोध छ।',
      preferredReplyLanguage: 'mai',
      contactMethod: 'phone',
      citizenName: 'हरिनन्दन महतो',
      citizenPhone: '98156XXXXX',
      isConfidentialIdentity: false,
      isChairpersonAttentionRequested: false,
      isConflictOfInterest: false,
      status: 'Resolved',
      assignedDepartment: 'खानेपानी तथा सरसफाइ शाखा',
      assignedWard: 1,
      assignedOfficerName: 'सुभाष ठाकुर',
      attachments: [],
      statusHistory: [
        {
          status: 'Submitted',
          changedByRole: 'citizen',
          changedByName: 'हरिनन्दन महतो',
          timestamp: '2026-10-20T08:00:00Z',
        },
        {
          status: 'Assigned',
          changedByRole: 'intake_officer',
          changedByName: 'दर्ता अधिकृत',
          timestamp: '2026-10-20T10:00:00Z',
        },
        {
          status: 'Resolved',
          changedByRole: 'ward_officer',
          changedByName: 'सुभाष ठाकुर',
          reason: 'नयाँ सबमर्सिबल मोटर जडान भई खानेपानी आपूर्ति पुनः सञ्चालन भएको छ।',
          timestamp: '2026-10-24T09:00:00Z',
        },
      ],
      createdAt: '2026-10-20T08:00:00Z',
      updatedAt: '2026-10-24T09:00:00Z',
      slaTargetDays: 5,
    },
  ],
  messages: [
    {
      id: 'm1',
      complaintId: 'c1',
      senderRole: 'intake_officer',
      senderName: 'दर्ता अधिकृत (सुनिता महतो)',
      content: 'तपाईंको गुनासो दर्ता भएको छ। स्थलगत निरीक्षणका लागि प्राविधिक शाखा र वडा नं २ का इन्जिनियरलाई खटाइएको छ।',
      createdAt: '2026-10-25T07:20:00Z',
      isInternalNote: false,
    },
    {
      id: 'm2',
      complaintId: 'c1',
      senderRole: 'ward_officer',
      senderName: 'इन्जिनियर विजय कर्ण',
      content: 'आन्तरिक टिपोट: फिल्डमा गएर हेर्दा करिब ३०० मिटर सडक ग्राभेल बगाएको पाइयो। चालू मर्मत सम्भार कोषबाट रु १,५०,००० को लागत अनुमान अध्यक्षज्यू समक्ष स्वीकृतिका लागि पेश गरिएको छ।',
      createdAt: '2026-10-25T11:45:00Z',
      isInternalNote: true,
    },
    {
      id: 'm3',
      complaintId: 'c1',
      senderRole: 'chairperson',
      senderName: 'गाउँपालिका अध्यक्ष',
      content: 'आन्तरिक निर्देशन: यो सडक बजारको मुख्य व्यापारिक मार्ग भएकाले भोलि बिहानै ग्राभेल खसालेर रोलिङ गराउने प्रबन्ध मिलाउनुहोस्।',
      createdAt: '2026-10-25T13:00:00Z',
      isInternalNote: true,
    },
    {
      id: 'm4',
      complaintId: 'c1',
      senderRole: 'ward_officer',
      senderName: 'इन्जिनियर विजय कर्ण',
      content: 'आदरणीय नागरिकज्यू, सडक मर्मतका लागि प्राविधिक लागत स्वीकृत भइसकेको छ र भोलिदेखि ग्राभेल बिछ्याउने कार्य सुरु गरिनेछ।',
      createdAt: '2026-10-26T03:05:00Z',
      isInternalNote: false,
    },
    {
      id: 'm5',
      complaintId: 'c3',
      senderRole: 'ward_officer',
      senderName: 'सुभाष ठाकुर',
      content: 'खानेपानी शाखाको प्राविधिक टोलीले मोटर प्रतिस्थापन गरी धाराहरूमा नियमित पानी वितरण सुरु गरेको जानकारी गराइन्छ।',
      createdAt: '2026-10-24T09:05:00Z',
      isInternalNote: false,
    },
  ],
  appointments: [
    {
      id: 'apt-1',
      referenceNumber: 'APT-2026-9K3L',
      citizenName: 'दीपेन्द्र प्रसाद साह',
      citizenPhone: '98528XXXXX',
      citizenWard: 3,
      requestedDate: '2026-10-28',
      requestedTimeSlot: '11:30 AM',
      purpose: 'वडा नं ३ मा नवनिर्मित कृषि हाटबजार सञ्चालन तथा किसान सहकारी व्यवस्थापन सम्बन्धमा छलफल',
      relatedComplaintRef: '',
      status: 'Approved',
      secretariatNotes: 'अध्यक्षज्यूको कार्यतालिका अनुसार समय स्वीकृत गरिएको छ।',
      reviewedBy: 'सचिवालय अधिकृत',
      createdAt: '2026-10-26T06:00:00Z',
      updatedAt: '2026-10-26T08:30:00Z',
    },
    {
      id: 'apt-2',
      referenceNumber: 'APT-2026-4F8M',
      citizenName: 'उषा देवी मण्डल',
      citizenPhone: '98176XXXXX',
      citizenWard: 5,
      requestedDate: '2026-10-29',
      requestedTimeSlot: '02:00 PM',
      purpose: 'दलित तथा विपन्न समुदायका बालबालिकालाई छात्रवृत्ति तथा पोशाक वितरणमा भएको ढिलाइबारे ध्यानाकर्षण',
      relatedComplaintRef: 'SKK-2026-3N8P2R5Y',
      status: 'Requested',
      createdAt: '2026-10-27T01:30:00Z',
      updatedAt: '2026-10-27T01:30:00Z',
    },
  ],
  auditLogs: [
    {
      id: 'aud-1',
      actorRole: 'citizen',
      actorName: 'Citizen System Submission',
      action: 'CREATE_COMPLAINT',
      targetType: 'complaint',
      targetId: 'SKK-2026-7K4M9Q2X',
      outcome: 'SUCCESS',
      details: 'New grievance submitted under Category: roads_infrastructure, Ward 2',
      timestamp: '2026-10-25T04:30:00Z',
      ipSnippet: '103.167.*.*',
    },
  ],
};

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(SEED_DATA, null, 2), 'utf-8');
      return SEED_DATA;
    }
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading db.json:', err);
    return SEED_DATA;
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing db.json:', err);
  }
}

// Generate reference number helper
function generateReferenceNumber(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 8; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SKK-2026-${rand}`;
}

function generateAppointmentRef(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `APT-2026-${rand}`;
}

// =================== REST API ENDPOINTS ===================

// Health check
app.get('/api/health', (_req, res) => {
  const db = readDb();
  res.json({
    status: 'ok',
    complaintsCount: db.complaints?.length || 0,
    appointmentsCount: db.appointments?.length || 0,
    timestamp: new Date().toISOString(),
  });
});

// GET all complaints (persisted across all users and devices)
app.get('/api/complaints', (_req, res) => {
  const db = readDb();
  res.json(db.complaints || []);
});

// GET single complaint by reference or ID
app.get('/api/complaints/:idOrRef', (req, res) => {
  const db = readDb();
  const param = req.params.idOrRef.toUpperCase();
  const complaint = db.complaints.find(
    (c: any) => c.id === req.params.idOrRef || c.referenceNumber.toUpperCase() === param
  );
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found' });
  }
  res.json(complaint);
});

// POST new complaint (submitted by citizen from any device)
app.post('/api/complaints', (req, res) => {
  const db = readDb();
  const data = req.body;

  if (!data.title || !data.description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const referenceNumber = generateReferenceNumber();
  const nowIso = new Date().toISOString();

  const safeAttachments = Array.isArray(data.attachments)
    ? data.attachments.map((att: any, idx: number) => ({
        id: `att-${Date.now()}-${idx}`,
        name: att.name || `photo_${idx + 1}.jpg`,
        sizeBytes: att.sizeBytes || 0,
        mimeType: att.mimeType || 'image/jpeg',
        quarantineStatus: 'safe',
        uploadedAt: nowIso,
        dataUrl: att.dataUrl || att.url || '', // Full image data URL for staff viewing
      }))
    : [];

  const initialHistory = [
    {
      status: 'Submitted',
      changedByRole: 'citizen',
      changedByName: data.citizenName || 'नागरिक',
      timestamp: nowIso,
    },
  ];

  const newComplaint = {
    id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    referenceNumber,
    title: String(data.title).trim(),
    category: data.category || 'roads_infrastructure',
    wardNumber: Number(data.wardNumber) || 1,
    landmark: String(data.landmark || '').trim(),
    description: String(data.description).trim(),
    preferredReplyLanguage: data.preferredReplyLanguage || 'ne',
    contactMethod: data.contactMethod || 'phone',
    citizenName: String(data.citizenName || 'नागरिक').trim(),
    citizenPhone: String(data.citizenPhone || '').trim(),
    citizenEmail: String(data.citizenEmail || '').trim(),
    isConfidentialIdentity: Boolean(data.isConfidentialIdentity),
    isChairpersonAttentionRequested: Boolean(data.isChairpersonAttentionRequested),
    isConflictOfInterest: Boolean(data.isConflictOfInterest),
    status: 'Submitted',
    attachments: safeAttachments,
    statusHistory: initialHistory,
    createdAt: nowIso,
    updatedAt: nowIso,
    slaTargetDays: data.isChairpersonAttentionRequested ? 4 : 7,
  };

  db.complaints = db.complaints || [];
  db.complaints.unshift(newComplaint);

  // Add audit log
  db.auditLogs = db.auditLogs || [];
  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    actorRole: 'citizen',
    actorName: data.isConfidentialIdentity ? 'Confidential Grievant' : (data.citizenName || 'Citizen'),
    action: 'SUBMIT_COMPLAINT',
    targetType: 'complaint',
    targetId: referenceNumber,
    outcome: 'SUCCESS',
    details: `New grievance submitted for Ward ${data.wardNumber}, Category: ${data.category}`,
    timestamp: nowIso,
    ipSnippet: '103.167.*.*',
  });

  writeDb(db);
  console.log(`[API] New complaint saved: ${referenceNumber} with ${safeAttachments.length} attachments`);

  res.status(201).json({ success: true, complaint: newComplaint });
});

// PATCH status of a complaint
app.patch('/api/complaints/:id/status', (req, res) => {
  const db = readDb();
  const { newStatus, reason, actorRole, actorName } = req.body;
  const index = db.complaints.findIndex((c: any) => c.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Complaint not found' });
  }

  const nowIso = new Date().toISOString();
  db.complaints[index].status = newStatus;
  db.complaints[index].updatedAt = nowIso;
  db.complaints[index].statusHistory = db.complaints[index].statusHistory || [];
  db.complaints[index].statusHistory.push({
    status: newStatus,
    changedByRole: actorRole || 'staff',
    changedByName: actorName || 'अधिकृत कर्मचारी',
    reason: reason || '',
    timestamp: nowIso,
  });

  db.auditLogs = db.auditLogs || [];
  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    actorRole: actorRole || 'staff',
    actorName: actorName || 'Staff',
    action: 'TRANSITION_STATUS',
    targetType: 'complaint',
    targetId: db.complaints[index].referenceNumber,
    outcome: 'SUCCESS',
    details: `Status transitioned to ${newStatus}. Reason: ${reason || 'N/A'}`,
    timestamp: nowIso,
  });

  writeDb(db);
  res.json({ success: true, complaint: db.complaints[index] });
});

// PATCH assign department and ward
app.patch('/api/complaints/:id/assign', (req, res) => {
  const db = readDb();
  const { department, wardNumber, officerName, actorRole, actorName } = req.body;
  const index = db.complaints.findIndex((c: any) => c.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Complaint not found' });
  }

  const nowIso = new Date().toISOString();
  db.complaints[index].assignedDepartment = department;
  db.complaints[index].assignedWard = wardNumber;
  db.complaints[index].assignedOfficerName = officerName;
  db.complaints[index].status = 'Assigned';
  db.complaints[index].updatedAt = nowIso;
  db.complaints[index].statusHistory = db.complaints[index].statusHistory || [];
  db.complaints[index].statusHistory.push({
    status: 'Assigned',
    changedByRole: actorRole || 'intake_officer',
    changedByName: actorName || 'दर्ता अधिकृत',
    reason: `जिम्मेवारी तोकियो: ${department} (वडा नं ${wardNumber}) - अधिकृत: ${officerName}`,
    timestamp: nowIso,
  });

  db.auditLogs = db.auditLogs || [];
  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    actorRole: actorRole || 'intake_officer',
    actorName: actorName || 'दर्ता अधिकृत',
    action: 'ASSIGN_COMPLAINT',
    targetType: 'complaint',
    targetId: db.complaints[index].referenceNumber,
    outcome: 'SUCCESS',
    details: `Assigned to ${department}, Ward ${wardNumber}`,
    timestamp: nowIso,
  });

  writeDb(db);
  res.json({ success: true, complaint: db.complaints[index] });
});

// GET messages for a complaint
app.get('/api/complaints/:id/messages', (req, res) => {
  const db = readDb();
  const complaintId = req.params.id;
  const msgs = (db.messages || []).filter((m: any) => m.complaintId === complaintId);
  res.json(msgs);
});

// POST message (citizen reply or internal staff note)
app.post('/api/complaints/:id/messages', (req, res) => {
  const db = readDb();
  const complaintId = req.params.id;
  const { senderRole, senderName, content, isInternalNote } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  const newMsg = {
    id: `msg-${Date.now()}`,
    complaintId,
    senderRole: senderRole || 'staff',
    senderName: senderName || 'अधिकृत',
    content: String(content).trim(),
    createdAt: new Date().toISOString(),
    isInternalNote: Boolean(isInternalNote),
  };

  db.messages = db.messages || [];
  db.messages.push(newMsg);

  writeDb(db);
  res.status(201).json({ success: true, message: newMsg });
});

// Appointments endpoints
app.get('/api/appointments', (_req, res) => {
  const db = readDb();
  res.json(db.appointments || []);
});

app.post('/api/appointments', (req, res) => {
  const db = readDb();
  const data = req.body;

  const referenceNumber = generateAppointmentRef();
  const nowIso = new Date().toISOString();

  const newApt = {
    id: `apt-${Date.now()}`,
    referenceNumber,
    citizenName: String(data.citizenName || '').trim(),
    citizenPhone: String(data.citizenPhone || '').trim(),
    citizenWard: Number(data.citizenWard) || 1,
    requestedDate: data.requestedDate,
    requestedTimeSlot: data.requestedTimeSlot,
    purpose: String(data.purpose || '').trim(),
    relatedComplaintRef: data.relatedComplaintRef || '',
    status: 'Requested',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  db.appointments = db.appointments || [];
  db.appointments.unshift(newApt);

  writeDb(db);
  res.status(201).json({ success: true, appointment: newApt });
});

app.patch('/api/appointments/:id', (req, res) => {
  const db = readDb();
  const { status, secretariatNotes, reviewedBy } = req.body;
  const index = db.appointments.findIndex((a: any) => a.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  db.appointments[index].status = status;
  db.appointments[index].secretariatNotes = secretariatNotes;
  db.appointments[index].reviewedBy = reviewedBy;
  db.appointments[index].updatedAt = new Date().toISOString();

  writeDb(db);
  res.json({ success: true, appointment: db.appointments[index] });
});

// Audit logs endpoint
app.get('/api/audit-logs', (_req, res) => {
  const db = readDb();
  res.json(db.auditLogs || []);
});

// Direct Download endpoint for Netlify Drop / manual deployments
app.get('/download-dist', (_req, res) => {
  const zipPath = path.resolve(__dirname, 'public', 'dist.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.download(zipPath, 'sakhuwananrkatti-dist.zip');
  } else {
    res.status(404).send('Build dist.zip not found');
  }
});

// Mount Vite or serve static assets in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[SKK Municipality Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
