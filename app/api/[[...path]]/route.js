import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'sentinel-crm-dev-secret-change-me'
const MONGO_URL = process.env.MONGO_URL
const DB_NAME = process.env.DB_NAME || 'sentinel_crm'

async function db() {
  if (!global.__mongoClientPromise) {
    const client = new MongoClient(MONGO_URL)
    global.__mongoClientPromise = client.connect()
  }
  const client = await global.__mongoClientPromise
  return client.db(DB_NAME)
}

// ---------------- helpers ----------------
const json = (data, status = 200) => NextResponse.json(data, { status })
const err = (msg, status = 400) => NextResponse.json({ error: msg }, { status })

function sign(user) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' })
}

function getAuth(request) {
  const h = request.headers.get('authorization') || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  if (!token) return null
  try { return jwt.verify(token, JWT_SECRET) } catch { return null }
}

function requireAuth(request) {
  const u = getAuth(request)
  if (!u) return { error: err('Unauthorized', 401) }
  return { user: u }
}

function requireRole(user, ...roles) {
  if (!roles.includes(user.role)) return err('Forbidden: insufficient role', 403)
  return null
}

// SA ID validation (Luhn checksum + date sanity)
function validateSaId(rawId) {
  if (!rawId) return { valid: false, reason: 'ID is empty' }
  const id = String(rawId).replace(/\s+/g, '')
  if (!/^\d{13}$/.test(id)) return { valid: false, reason: 'SA ID must be exactly 13 digits' }
  const mm = parseInt(id.substr(2, 2), 10)
  const dd = parseInt(id.substr(4, 2), 10)
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return { valid: false, reason: 'Invalid date of birth' }
  let sum = 0
  for (let i = 0; i < 13; i++) {
    let n = parseInt(id[i], 10)
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9 }
    sum += n
  }
  if (sum % 10 !== 0) return { valid: false, reason: 'Invalid checksum' }
  const genderDigit = parseInt(id.substr(6, 4), 10)
  return {
    valid: true,
    normalized: id,
    gender: genderDigit < 5000 ? 'F' : 'M',
    citizenship: id[10] === '0' ? 'SA Citizen' : 'Permanent Resident',
    yy: id.substr(0, 2), mm: id.substr(2, 2), dd: id.substr(4, 2),
  }
}

async function audit(database, { actor, action, entity, entityId, before, after, meta }) {
  await database.collection('audit_logs').insertOne({
    id: uuidv4(),
    actorId: actor?.id || null,
    actorName: actor?.name || 'system',
    actorRole: actor?.role || null,
    action, entity, entityId,
    before: before || null,
    after: after || null,
    meta: meta || null,
    timestamp: new Date().toISOString(),
  })
}

const DISPOSITIONS = ['Voicemail','No Answer','Sale','Not Quoted','Not Quoted Callback','Callback Scheduled','Unable To Quote','Nothing To Insure','AI Answered','Wrong Number']
const QA_TRIGGERED = new Set(['Voicemail','No Answer','Sale'])
const LEAD_SOURCES = ['Internal','Outbound','Referral','Walk-in']
const ROLES = ['super','agent','field','qa']

// ---------------- router ----------------
async function handler(request, { params }) {
  const segs = (params?.path || []).filter(Boolean)
  const path = '/' + segs.join('/')
  const method = request.method
  const database = await db()

  // ---------- public ----------
  if (method === 'GET' && path === '/health') return json({ ok: true, ts: new Date().toISOString() })

  if (method === 'POST' && path === '/auth/seed') {
    const users = database.collection('users')
    const existing = await users.countDocuments()
    if (existing > 0) return json({ ok: true, message: 'Already seeded', count: existing })
    const seeds = [
      { name: 'Sipho Admin', email: 'admin@sentinel.co.za', role: 'super', password: 'admin123' },
      { name: 'Naledi Agent', email: 'agent@sentinel.co.za', role: 'agent', password: 'agent123' },
      { name: 'Themba Field', email: 'field@sentinel.co.za', role: 'field', password: 'field123' },
      { name: 'Lerato QA', email: 'qa@sentinel.co.za', role: 'qa', password: 'qa123' },
    ]
    for (const s of seeds) {
      await users.insertOne({
        id: uuidv4(), name: s.name, email: s.email, role: s.role,
        passwordHash: await bcrypt.hash(s.password, 10),
        active: true, createdAt: new Date().toISOString(),
      })
    }
    return json({ ok: true, seeded: seeds.map(s => ({ email: s.email, role: s.role, password: s.password })) })
  }

  if (method === 'POST' && path === '/auth/login') {
    const body = await request.json().catch(() => ({}))
    const { email, password } = body
    if (!email || !password) return err('Email and password required')
    const user = await database.collection('users').findOne({ email: String(email).toLowerCase().trim() })
    if (!user || !user.active) return err('Invalid credentials', 401)
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return err('Invalid credentials', 401)
    const token = sign(user)
    return json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  }

  if (method === 'POST' && path === '/validate/sa-id') {
    const body = await request.json().catch(() => ({}))
    return json(validateSaId(body.id))
  }

  // ---------- auth required from here ----------
  const a = requireAuth(request)
  if (a.error) return a.error
  const user = a.user

  if (method === 'GET' && path === '/auth/me') return json({ user })

  // ---------- LEADS ----------
  if (method === 'GET' && path === '/leads') {
    const url = new URL(request.url)
    const q = url.searchParams.get('q')
    const disposition = url.searchParams.get('disposition')
    const source = url.searchParams.get('source')
    const filter = {}
    if (disposition) filter.disposition = disposition
    if (source) filter.source = source
    // role scoping: agent/field see only their own assignments; super and qa see all
    if (user.role === 'agent' || user.role === 'field') filter.assigneeId = user.id
    if (q) {
      const rx = new RegExp(q.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i')
      filter.$or = [
        { firstName: rx }, { lastName: rx }, { phone: rx },
        { saId: rx }, { caseNumber: rx }, { accountNumber: rx },
        { vehicleMake: rx }, { vehicleModel: rx },
      ]
    }
    const leads = await database.collection('leads').find(filter).sort({ createdAt: -1 }).limit(500).toArray()
    return json({ leads: leads.map(l => ({ ...l, _id: undefined })) })
  }

  if (method === 'POST' && path === '/leads') {
    const body = await request.json().catch(() => ({}))
    const { firstName, lastName, phone, saId } = body
    if (!firstName || !lastName || !phone) return err('First name, last name and phone are required')
    let saIdInfo = null
    if (saId && String(saId).trim()) {
      const v = validateSaId(saId)
      if (!v.valid) return err(`Invalid SA ID: ${v.reason}`)
      saIdInfo = v
    }
    if (body.source && !LEAD_SOURCES.includes(body.source)) return err('Invalid source')
    const lead = {
      id: uuidv4(),
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      phone: String(phone).trim(),
      saId: saIdInfo?.normalized || null,
      saIdMeta: saIdInfo ? { gender: saIdInfo.gender, citizenship: saIdInfo.citizenship } : null,
      address: body.address || null,
      vehicleMake: body.vehicleMake || null,
      vehicleModel: body.vehicleModel || null,
      vehicleYear: body.vehicleYear || null,
      caseNumber: body.caseNumber || null,
      productType: body.productType || null,
      accountNumber: body.accountNumber || null,
      debitDate: body.debitDate || null,
      source: body.source || 'Internal',
      disposition: 'New',
      assigneeId: body.assigneeId || (user.role === 'agent' || user.role === 'field' ? user.id : null),
      assigneeName: null,
      creatorId: user.id,
      creatorName: user.name,
      qaStatus: null,
      qaFeedback: null,
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    if (lead.assigneeId) {
      const a = await database.collection('users').findOne({ id: lead.assigneeId })
      lead.assigneeName = a?.name || null
    }
    await database.collection('leads').insertOne(lead)
    await audit(database, { actor: user, action: 'LEAD_CREATED', entity: 'lead', entityId: lead.id, after: lead })
    return json({ lead: { ...lead, _id: undefined } })
  }

  // /leads/:id
  const leadIdMatch = path.match(/^\/leads\/([^\/]+)$/)
  if (leadIdMatch) {
    const leadId = leadIdMatch[1]
    const lead = await database.collection('leads').findOne({ id: leadId })
    if (!lead) return err('Lead not found', 404)
    if ((user.role === 'agent' || user.role === 'field') && lead.assigneeId !== user.id) return err('Forbidden', 403)
    if (method === 'GET') return json({ lead: { ...lead, _id: undefined } })
    if (method === 'PATCH') {
      const body = await request.json().catch(() => ({}))
      const updates = {}
      const allowed = ['firstName','lastName','phone','address','vehicleMake','vehicleModel','vehicleYear','caseNumber','productType','accountNumber','debitDate','source','disposition']
      for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k]
      if (updates.disposition && !DISPOSITIONS.includes(updates.disposition) && updates.disposition !== 'New') return err('Invalid disposition')
      // QA auto-trigger
      if (updates.disposition && QA_TRIGGERED.has(updates.disposition) && !lead.qaStatus) {
        updates.qaStatus = 'Pending'
      }
      updates.updatedAt = new Date().toISOString()
      await database.collection('leads').updateOne({ id: leadId }, { $set: updates })

      // Commission auto-generation on Sale (if not already created)
      if (updates.disposition === 'Sale' && lead.disposition !== 'Sale') {
        const existingComm = await database.collection('commissions').findOne({ leadId })
        if (!existingComm) {
          // Match product by productType (flat amount + per-product split percentages)
          let totalCommission = 0
          let splitClosing = 60, splitCreator = 25, splitField = 15
          let productRef = null
          if (lead.productType) {
            const prod = await database.collection('products').findOne({ name: lead.productType, active: true })
            if (prod) {
              productRef = { id: prod.id, name: prod.name }
              totalCommission = Number(prod.commissionAmount) || 0
              if (prod.splitClosingPct != null) splitClosing = Number(prod.splitClosingPct)
              if (prod.splitCreatorPct != null) splitCreator = Number(prod.splitCreatorPct)
              if (prod.splitFieldPct != null) splitField = Number(prod.splitFieldPct)
            }
          }
          // build splits — only include parties that exist
          const splits = []
          const closingId = lead.assigneeId || lead.creatorId
          const closingUser = closingId ? await database.collection('users').findOne({ id: closingId }) : null
          const creatorUser = (lead.creatorId && lead.creatorId !== closingId) ? await database.collection('users').findOne({ id: lead.creatorId }) : null
          const isFieldClose = closingUser && closingUser.role === 'field'
          const round2 = (n) => Math.round(n * 100) / 100
          if (closingUser) {
            // if no creator separate, closing absorbs creator share
            const closingShare = creatorUser ? splitClosing : (splitClosing + splitCreator)
            splits.push({ role: 'closing', userId: closingUser.id, userName: closingUser.name, percent: closingShare, amount: round2(totalCommission * closingShare / 100) })
          }
          if (creatorUser) splits.push({ role: 'creator', userId: creatorUser.id, userName: creatorUser.name, percent: splitCreator, amount: round2(totalCommission * splitCreator / 100) })
          if (isFieldClose && splitField > 0) splits.push({ role: 'field', userId: closingUser.id, userName: closingUser.name, percent: splitField, amount: round2(totalCommission * splitField / 100) })
          const commission = {
            id: uuidv4(), leadId, leadName: `${lead.firstName} ${lead.lastName}`,
            productType: lead.productType || null, productRef,
            totalCommission: round2(totalCommission),
            splits, status: 'Pending Approval', approvedBy: null, approvedAt: null,
            createdAt: new Date().toISOString(),
          }
          await database.collection('commissions').insertOne(commission)
          await audit(database, { actor: user, action: 'COMMISSION_GENERATED', entity: 'commission', entityId: commission.id, after: commission })
        }
      }
      await audit(database, { actor: user, action: 'LEAD_UPDATED', entity: 'lead', entityId: leadId, before: lead, after: { ...lead, ...updates } })
      // notification
      if (updates.disposition) {
        await database.collection('notifications').insertOne({
          id: uuidv4(), type: 'DISPOSITION_CHANGED', leadId, message: `Lead ${lead.firstName} ${lead.lastName} → ${updates.disposition}`, actorId: user.id, createdAt: new Date().toISOString(), read: false,
        })
      }
      const updated = await database.collection('leads').findOne({ id: leadId })
      return json({ lead: { ...updated, _id: undefined } })
    }
  }

  // assign lead (super only)
  const assignMatch = path.match(/^\/leads\/([^\/]+)\/assign$/)
  if (assignMatch && method === 'POST') {
    const r = requireRole(user, 'super'); if (r) return r
    const body = await request.json().catch(() => ({}))
    const lead = await database.collection('leads').findOne({ id: assignMatch[1] })
    if (!lead) return err('Lead not found', 404)
    const target = await database.collection('users').findOne({ id: body.assigneeId })
    if (!target) return err('Assignee not found', 404)
    await database.collection('leads').updateOne({ id: lead.id }, { $set: { assigneeId: target.id, assigneeName: target.name, updatedAt: new Date().toISOString() } })
    await audit(database, { actor: user, action: 'LEAD_ASSIGNED', entity: 'lead', entityId: lead.id, before: { assigneeId: lead.assigneeId }, after: { assigneeId: target.id, assigneeName: target.name } })
    await database.collection('notifications').insertOne({ id: uuidv4(), type: 'LEAD_ASSIGNED', leadId: lead.id, userId: target.id, message: `You have been assigned lead ${lead.firstName} ${lead.lastName}`, createdAt: new Date().toISOString(), read: false })
    return json({ ok: true })
  }

  // comments (append-only)
  const commentMatch = path.match(/^\/leads\/([^\/]+)\/comments$/)
  if (commentMatch && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    if (!body.text || !String(body.text).trim()) return err('Comment text required')
    const lead = await database.collection('leads').findOne({ id: commentMatch[1] })
    if (!lead) return err('Lead not found', 404)
    if ((user.role === 'agent' || user.role === 'field') && lead.assigneeId !== user.id) return err('Forbidden', 403)
    const comment = { id: uuidv4(), text: String(body.text).trim(), authorId: user.id, authorName: user.name, authorRole: user.role, createdAt: new Date().toISOString(), kind: body.kind || 'note' }
    await database.collection('leads').updateOne({ id: lead.id }, { $push: { comments: comment } })
    await audit(database, { actor: user, action: 'COMMENT_ADDED', entity: 'lead', entityId: lead.id, after: comment })
    return json({ comment })
  }

  // audit history of a lead
  const auditMatch = path.match(/^\/leads\/([^\/]+)\/audit$/)
  if (auditMatch && method === 'GET') {
    const logs = await database.collection('audit_logs').find({ entityId: auditMatch[1] }).sort({ timestamp: -1 }).limit(500).toArray()
    return json({ logs: logs.map(l => ({ ...l, _id: undefined })) })
  }

  // ---------- CALLBACKS ----------
  if (method === 'GET' && path === '/callbacks') {
    // Global visibility per spec — all roles SEE callbacks; only super assigns
    const cbs = await database.collection('callbacks').find({}).sort({ scheduledAt: 1 }).limit(500).toArray()
    return json({ callbacks: cbs.map(c => ({ ...c, _id: undefined })) })
  }

  const cbScheduleMatch = path.match(/^\/leads\/([^\/]+)\/callback$/)
  if (cbScheduleMatch && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    if (!body.scheduledAt) return err('scheduledAt required (ISO datetime)')
    const lead = await database.collection('leads').findOne({ id: cbScheduleMatch[1] })
    if (!lead) return err('Lead not found', 404)
    const cb = {
      id: uuidv4(), leadId: lead.id, leadName: `${lead.firstName} ${lead.lastName}`, leadPhone: lead.phone,
      scheduledAt: body.scheduledAt, notes: body.notes || null,
      state: 'Pending Assignment', assigneeId: null, assigneeName: null,
      creatorId: user.id, creatorName: user.name, createdAt: new Date().toISOString(),
    }
    await database.collection('callbacks').insertOne(cb)
    await database.collection('leads').updateOne({ id: lead.id }, { $set: { disposition: 'Callback Scheduled', updatedAt: new Date().toISOString() } })
    await audit(database, { actor: user, action: 'CALLBACK_SCHEDULED', entity: 'callback', entityId: cb.id, after: cb })
    await database.collection('notifications').insertOne({ id: uuidv4(), type: 'CALLBACK_SCHEDULED', leadId: lead.id, message: `Callback scheduled for ${lead.firstName} ${lead.lastName} at ${cb.scheduledAt}`, createdAt: new Date().toISOString(), read: false })
    return json({ callback: cb })
  }

  const cbAssignMatch = path.match(/^\/callbacks\/([^\/]+)\/assign$/)
  if (cbAssignMatch && method === 'POST') {
    const r = requireRole(user, 'super'); if (r) return r
    const body = await request.json().catch(() => ({}))
    const cb = await database.collection('callbacks').findOne({ id: cbAssignMatch[1] })
    if (!cb) return err('Callback not found', 404)
    const target = await database.collection('users').findOne({ id: body.assigneeId })
    if (!target) return err('Assignee not found', 404)
    await database.collection('callbacks').updateOne({ id: cb.id }, { $set: { assigneeId: target.id, assigneeName: target.name, state: 'Assigned' } })
    await audit(database, { actor: user, action: 'CALLBACK_ASSIGNED', entity: 'callback', entityId: cb.id, before: { assigneeId: cb.assigneeId, state: cb.state }, after: { assigneeId: target.id, state: 'Assigned' } })
    await database.collection('notifications').insertOne({ id: uuidv4(), type: 'CALLBACK_ASSIGNED', userId: target.id, leadId: cb.leadId, message: `Callback for ${cb.leadName} assigned to you`, createdAt: new Date().toISOString(), read: false })
    return json({ ok: true })
  }

  // ---------- QA ----------
  if (method === 'GET' && path === '/qa/queue') {
    if (!['qa','super'].includes(user.role)) return err('Forbidden', 403)
    const items = await database.collection('leads').find({ qaStatus: { $in: ['Pending','Error Found'] } }).sort({ updatedAt: -1 }).toArray()
    return json({ items: items.map(l => ({ ...l, _id: undefined })) })
  }

  const qaMatch = path.match(/^\/qa\/([^\/]+)$/)
  if (qaMatch && method === 'PATCH') {
    if (!['qa','super'].includes(user.role)) return err('Forbidden', 403)
    const body = await request.json().catch(() => ({}))
    const allowed = ['Pending','Completed','Error Found']
    if (body.qaStatus && !allowed.includes(body.qaStatus)) return err('Invalid QA status')
    const lead = await database.collection('leads').findOne({ id: qaMatch[1] })
    if (!lead) return err('Lead not found', 404)
    const updates = { qaStatus: body.qaStatus || lead.qaStatus, qaFeedback: body.qaFeedback ?? lead.qaFeedback, updatedAt: new Date().toISOString() }
    await database.collection('leads').updateOne({ id: lead.id }, { $set: updates })
    await audit(database, { actor: user, action: 'QA_UPDATED', entity: 'lead', entityId: lead.id, before: { qaStatus: lead.qaStatus, qaFeedback: lead.qaFeedback }, after: updates })
    if (lead.assigneeId) {
      await database.collection('notifications').insertOne({ id: uuidv4(), type: 'QA_UPDATE', userId: lead.assigneeId, leadId: lead.id, message: `QA update on ${lead.firstName} ${lead.lastName}: ${updates.qaStatus}`, createdAt: new Date().toISOString(), read: false })
    }
    return json({ ok: true })
  }

  // ---------- USERS list (for assignment dropdowns) ----------
  if (method === 'GET' && path === '/users') {
    const r = requireRole(user, 'super'); if (r) return r
    const users = await database.collection('users').find({}).project({ passwordHash: 0 }).toArray()
    return json({ users: users.map(u => ({ ...u, _id: undefined })) })
  }

  // ---------- AUDIT LOG (super only) ----------
  if (method === 'GET' && path === '/audit') {
    const r = requireRole(user, 'super'); if (r) return r
    const logs = await database.collection('audit_logs').find({}).sort({ timestamp: -1 }).limit(300).toArray()
    return json({ logs: logs.map(l => ({ ...l, _id: undefined })) })
  }

  // ---------- DASHBOARD ----------
  if (method === 'GET' && path === '/dashboard') {
    const leads = database.collection('leads')
    const baseFilter = (user.role === 'agent' || user.role === 'field') ? { assigneeId: user.id } : {}
    const total = await leads.countDocuments(baseFilter)
    const sales = await leads.countDocuments({ ...baseFilter, disposition: 'Sale' })
    const callbacks = await leads.countDocuments({ ...baseFilter, disposition: 'Callback Scheduled' })
    const qaPending = await leads.countDocuments({ ...baseFilter, qaStatus: 'Pending' })
    const qaErrors = await leads.countDocuments({ ...baseFilter, qaStatus: 'Error Found' })
    // disposition breakdown
    const agg = await leads.aggregate([{ $match: baseFilter }, { $group: { _id: '$disposition', count: { $sum: 1 } } }]).toArray()
    return json({
      total, sales, callbacks, qaPending, qaErrors,
      conversionRate: total ? Math.round((sales / total) * 1000) / 10 : 0,
      dispositions: agg.map(a => ({ disposition: a._id || 'New', count: a.count })),
    })
  }

  // ---------- NOTIFICATIONS ----------
  if (method === 'GET' && path === '/notifications') {
    const filter = { $or: [{ userId: user.id }, { userId: { $exists: false } }, { userId: null }] }
    const items = await database.collection('notifications').find(filter).sort({ createdAt: -1 }).limit(50).toArray()
    return json({ items: items.map(i => ({ ...i, _id: undefined })) })
  }

  // ---------- PRODUCTS ----------
  if (method === 'GET' && path === '/products') {
    const items = await database.collection('products').find({}).sort({ createdAt: -1 }).toArray()
    return json({ products: items.map(i => ({ ...i, _id: undefined })) })
  }
  if (method === 'POST' && path === '/products') {
    const r = requireRole(user, 'super'); if (r) return r
    const body = await request.json().catch(() => ({}))
    if (!body.name) return err('Product name required')
    const product = {
      id: uuidv4(),
      name: String(body.name).trim(),
      code: body.code || null,
      description: body.description || null,
      providerId: body.providerId || null,
      providerName: null,
      basePrice: body.basePrice != null ? Number(body.basePrice) : 0,
      commissionPercent: body.commissionPercent != null ? Number(body.commissionPercent) : 0,
      commissionAmount: body.commissionAmount != null ? Number(body.commissionAmount) : 0,
      splitClosingPct: body.splitClosingPct != null ? Number(body.splitClosingPct) : 60,
      splitCreatorPct: body.splitCreatorPct != null ? Number(body.splitCreatorPct) : 25,
      splitFieldPct: body.splitFieldPct != null ? Number(body.splitFieldPct) : 15,
      active: body.active !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    if (product.providerId) {
      const p = await database.collection('providers').findOne({ id: product.providerId })
      product.providerName = p?.name || null
    }
    await database.collection('products').insertOne(product)
    await audit(database, { actor: user, action: 'PRODUCT_CREATED', entity: 'product', entityId: product.id, after: product })
    return json({ product: { ...product, _id: undefined } })
  }
  const productMatch = path.match(/^\/products\/([^\/]+)$/)
  if (productMatch) {
    const r = requireRole(user, 'super'); if (r) return r
    const pid = productMatch[1]
    const existing = await database.collection('products').findOne({ id: pid })
    if (!existing) return err('Product not found', 404)
    if (method === 'PATCH') {
      const body = await request.json().catch(() => ({}))
      const updates = {}
      const allowed = ['name','code','description','providerId','basePrice','commissionPercent','commissionAmount','splitClosingPct','splitCreatorPct','splitFieldPct','active']
      for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k]
      if (updates.basePrice != null) updates.basePrice = Number(updates.basePrice)
      if (updates.commissionPercent != null) updates.commissionPercent = Number(updates.commissionPercent)
      if (updates.commissionAmount != null) updates.commissionAmount = Number(updates.commissionAmount)
      if (updates.splitClosingPct != null) updates.splitClosingPct = Number(updates.splitClosingPct)
      if (updates.splitCreatorPct != null) updates.splitCreatorPct = Number(updates.splitCreatorPct)
      if (updates.splitFieldPct != null) updates.splitFieldPct = Number(updates.splitFieldPct)
      if (updates.providerId !== undefined) {
        const p = updates.providerId ? await database.collection('providers').findOne({ id: updates.providerId }) : null
        updates.providerName = p?.name || null
      }
      updates.updatedAt = new Date().toISOString()
      await database.collection('products').updateOne({ id: pid }, { $set: updates })
      await audit(database, { actor: user, action: 'PRODUCT_UPDATED', entity: 'product', entityId: pid, before: existing, after: { ...existing, ...updates } })
      return json({ ok: true })
    }
    if (method === 'DELETE') {
      await database.collection('products').updateOne({ id: pid }, { $set: { active: false, updatedAt: new Date().toISOString() } })
      await audit(database, { actor: user, action: 'PRODUCT_DEACTIVATED', entity: 'product', entityId: pid, before: existing })
      return json({ ok: true })
    }
  }

  // ---------- SERVICE PROVIDERS ----------
  if (method === 'GET' && path === '/providers') {
    const items = await database.collection('providers').find({}).sort({ createdAt: -1 }).toArray()
    return json({ providers: items.map(i => ({ ...i, _id: undefined })) })
  }
  if (method === 'POST' && path === '/providers') {
    const r = requireRole(user, 'super'); if (r) return r
    const body = await request.json().catch(() => ({}))
    if (!body.name) return err('Provider name required')
    const provider = {
      id: uuidv4(),
      name: String(body.name).trim(),
      code: body.code || null,
      contactEmail: body.contactEmail || null,
      contactPhone: body.contactPhone || null,
      notes: body.notes || null,
      active: body.active !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await database.collection('providers').insertOne(provider)
    await audit(database, { actor: user, action: 'PROVIDER_CREATED', entity: 'provider', entityId: provider.id, after: provider })
    return json({ provider: { ...provider, _id: undefined } })
  }
  const providerMatch = path.match(/^\/providers\/([^\/]+)$/)
  if (providerMatch) {
    const r = requireRole(user, 'super'); if (r) return r
    const pid = providerMatch[1]
    const existing = await database.collection('providers').findOne({ id: pid })
    if (!existing) return err('Provider not found', 404)
    if (method === 'PATCH') {
      const body = await request.json().catch(() => ({}))
      const updates = {}
      const allowed = ['name','code','contactEmail','contactPhone','notes','active']
      for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k]
      updates.updatedAt = new Date().toISOString()
      await database.collection('providers').updateOne({ id: pid }, { $set: updates })
      await audit(database, { actor: user, action: 'PROVIDER_UPDATED', entity: 'provider', entityId: pid, before: existing, after: { ...existing, ...updates } })
      return json({ ok: true })
    }
    if (method === 'DELETE') {
      await database.collection('providers').updateOne({ id: pid }, { $set: { active: false, updatedAt: new Date().toISOString() } })
      await audit(database, { actor: user, action: 'PROVIDER_DEACTIVATED', entity: 'provider', entityId: pid, before: existing })
      return json({ ok: true })
    }
  }

  // ---------- COMMISSIONS ----------
  if (method === 'GET' && path === '/commissions') {
    const all = await database.collection('commissions').find({}).sort({ createdAt: -1 }).limit(500).toArray()
    let items = all
    if (user.role === 'agent' || user.role === 'field') {
      items = all.filter(c => (c.splits || []).some(s => s.userId === user.id))
              .map(c => ({ ...c, splits: (c.splits || []).filter(s => s.userId === user.id) }))
    }
    return json({ commissions: items.map(i => ({ ...i, _id: undefined })) })
  }

  if (method === 'GET' && path === '/commissions/leaderboard') {
    const all = await database.collection('commissions').find({ status: 'Approved' }).toArray()
    const now = new Date()
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
    const totals = {} // userId -> { name, allTime, month }
    for (const c of all) {
      const cMonth = (c.approvedAt || c.createdAt || '').slice(0, 7)
      for (const s of (c.splits || [])) {
        if (!s.userId) continue
        if (!totals[s.userId]) totals[s.userId] = { userId: s.userId, name: s.userName, allTime: 0, month: 0, deals: 0 }
        totals[s.userId].allTime += Number(s.amount) || 0
        totals[s.userId].deals += 1
        if (cMonth === monthKey) totals[s.userId].month += Number(s.amount) || 0
      }
    }
    const board = Object.values(totals).map(t => ({ ...t, allTime: Math.round(t.allTime * 100) / 100, month: Math.round(t.month * 100) / 100 }))
    board.sort((a, b) => b.allTime - a.allTime)
    return json({ leaderboard: board, monthKey })
  }

  const commApproveMatch = path.match(/^\/commissions\/([^\/]+)\/approve$/)
  if (commApproveMatch && method === 'POST') {
    const r = requireRole(user, 'super'); if (r) return r
    const cid = commApproveMatch[1]
    const c = await database.collection('commissions').findOne({ id: cid })
    if (!c) return err('Commission not found', 404)
    if (c.status === 'Approved') return json({ ok: true, message: 'Already approved' })
    const updates = { status: 'Approved', approvedBy: user.id, approvedByName: user.name, approvedAt: new Date().toISOString() }
    await database.collection('commissions').updateOne({ id: cid }, { $set: updates })
    await audit(database, { actor: user, action: 'COMMISSION_APPROVED', entity: 'commission', entityId: cid, before: { status: c.status }, after: updates })
    for (const s of (c.splits || [])) {
      if (s.userId) {
        await database.collection('notifications').insertOne({ id: uuidv4(), type: 'COMMISSION_APPROVED', userId: s.userId, message: `Commission of R${s.amount} approved for lead ${c.leadName}`, createdAt: new Date().toISOString(), read: false })
      }
    }
    return json({ ok: true })
  }

  const commRejectMatch = path.match(/^\/commissions\/([^\/]+)\/reject$/)
  if (commRejectMatch && method === 'POST') {
    const r = requireRole(user, 'super'); if (r) return r
    const cid = commRejectMatch[1]
    const c = await database.collection('commissions').findOne({ id: cid })
    if (!c) return err('Commission not found', 404)
    const updates = { status: 'Rejected', approvedBy: user.id, approvedByName: user.name, approvedAt: new Date().toISOString() }
    await database.collection('commissions').updateOne({ id: cid }, { $set: updates })
    await audit(database, { actor: user, action: 'COMMISSION_REJECTED', entity: 'commission', entityId: cid, before: { status: c.status }, after: updates })
    return json({ ok: true })
  }

  // ---------- FITMENTS ----------
  if (method === 'GET' && path === '/fitments') {
    const baseFilter = (user.role === 'agent' || user.role === 'field') ? { assigneeId: user.id } : {}
    const items = await database.collection('fitments').find(baseFilter).sort({ scheduledAt: 1 }).limit(500).toArray()
    return json({ fitments: items.map(i => ({ ...i, _id: undefined })) })
  }
  const fitmentScheduleMatch = path.match(/^\/leads\/([^\/]+)\/fitment$/)
  if (fitmentScheduleMatch && method === 'POST') {
    const body = await request.json().catch(() => ({}))
    if (!body.scheduledAt) return err('scheduledAt required (ISO datetime)')
    const lead = await database.collection('leads').findOne({ id: fitmentScheduleMatch[1] })
    if (!lead) return err('Lead not found', 404)
    if ((user.role === 'agent' || user.role === 'field') && lead.assigneeId !== user.id) return err('Forbidden', 403)
    const fitment = {
      id: uuidv4(), leadId: lead.id, leadName: `${lead.firstName} ${lead.lastName}`, leadPhone: lead.phone,
      productType: lead.productType || null, scheduledAt: body.scheduledAt, address: body.address || lead.address || null,
      notes: body.notes || null, status: 'Scheduled', completedAt: null,
      assigneeId: lead.assigneeId, assigneeName: lead.assigneeName,
      creatorId: user.id, creatorName: user.name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    await database.collection('fitments').insertOne(fitment)
    await audit(database, { actor: user, action: 'FITMENT_SCHEDULED', entity: 'fitment', entityId: fitment.id, after: fitment })
    if (lead.assigneeId) {
      await database.collection('notifications').insertOne({ id: uuidv4(), type: 'FITMENT_SCHEDULED', userId: lead.assigneeId, leadId: lead.id, message: `Fitment scheduled for ${fitment.leadName} at ${fitment.scheduledAt}`, createdAt: new Date().toISOString(), read: false })
    }
    return json({ fitment })
  }
  const fitmentMatch = path.match(/^\/fitments\/([^\/]+)$/)
  if (fitmentMatch && method === 'PATCH') {
    const fid = fitmentMatch[1]
    const body = await request.json().catch(() => ({}))
    const f = await database.collection('fitments').findOne({ id: fid })
    if (!f) return err('Fitment not found', 404)
    if ((user.role === 'agent' || user.role === 'field') && f.assigneeId !== user.id) return err('Forbidden', 403)
    const allowed = ['scheduledAt','status','notes','address']
    const updates = {}
    for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k]
    if (updates.status === 'Completed') updates.completedAt = new Date().toISOString()
    updates.updatedAt = new Date().toISOString()
    await database.collection('fitments').updateOne({ id: fid }, { $set: updates })
    await audit(database, { actor: user, action: 'FITMENT_UPDATED', entity: 'fitment', entityId: fid, before: f, after: { ...f, ...updates } })
    return json({ ok: true })
  }

  // ---------- NOTIFICATIONS extras ----------
  if (method === 'GET' && path === '/notifications/unread-count') {
    const filter = { read: false, $or: [{ userId: user.id }, { userId: { $exists: false } }, { userId: null }] }
    const count = await database.collection('notifications').countDocuments(filter)
    return json({ count })
  }
  const notifReadMatch = path.match(/^\/notifications\/([^\/]+)\/read$/)
  if (notifReadMatch && method === 'PATCH') {
    await database.collection('notifications').updateOne({ id: notifReadMatch[1] }, { $set: { read: true, readAt: new Date().toISOString() } })
    return json({ ok: true })
  }
  if (method === 'POST' && path === '/notifications/read-all') {
    const filter = { read: false, $or: [{ userId: user.id }, { userId: { $exists: false } }, { userId: null }] }
    await database.collection('notifications').updateMany(filter, { $set: { read: true, readAt: new Date().toISOString() } })
    return json({ ok: true })
  }

  // ---------- USERS management (super) ----------
  if (method === 'POST' && path === '/users') {
    const r = requireRole(user, 'super'); if (r) return r
    const body = await request.json().catch(() => ({}))
    if (!body.email || !body.password || !body.name || !body.role) return err('name, email, password, role are required')
    if (!ROLES.includes(body.role)) return err('Invalid role')
    const existing = await database.collection('users').findOne({ email: String(body.email).toLowerCase().trim() })
    if (existing) return err('Email already in use')
    const newUser = {
      id: uuidv4(), name: String(body.name).trim(), email: String(body.email).toLowerCase().trim(),
      role: body.role, passwordHash: await bcrypt.hash(body.password, 10),
      active: true, createdAt: new Date().toISOString(),
    }
    await database.collection('users').insertOne(newUser)
    await audit(database, { actor: user, action: 'USER_CREATED', entity: 'user', entityId: newUser.id, after: { ...newUser, passwordHash: '[hidden]' } })
    return json({ user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, active: newUser.active } })
  }
  const userMatch = path.match(/^\/users\/([^\/]+)$/)
  if (userMatch && method === 'PATCH') {
    const r = requireRole(user, 'super'); if (r) return r
    const target = await database.collection('users').findOne({ id: userMatch[1] })
    if (!target) return err('User not found', 404)
    if (target.id === user.id) return err('Cannot modify your own account', 400)
    const body = await request.json().catch(() => ({}))
    const updates = {}
    if (body.name !== undefined) updates.name = String(body.name).trim()
    if (body.role !== undefined) {
      if (!ROLES.includes(body.role)) return err('Invalid role')
      updates.role = body.role
    }
    if (body.active !== undefined) updates.active = !!body.active
    if (body.password) updates.passwordHash = await bcrypt.hash(body.password, 10)
    await database.collection('users').updateOne({ id: target.id }, { $set: updates })
    await audit(database, { actor: user, action: 'USER_UPDATED', entity: 'user', entityId: target.id, before: { role: target.role, active: target.active, name: target.name }, after: updates })
    return json({ ok: true })
  }

  // ---------- ANALYTICS (super) ----------
  if (method === 'GET' && path === '/analytics') {
    const r = requireRole(user, 'super'); if (r) return r
    const leads = database.collection('leads')
    const totalLeads = await leads.countDocuments({})
    const sales = await leads.countDocuments({ disposition: 'Sale' })
    // disposition breakdown
    const dispAgg = await leads.aggregate([{ $group: { _id: '$disposition', count: { $sum: 1 } } }]).toArray()
    const dispositions = dispAgg.map(a => ({ name: a._id || 'New', value: a.count }))
    // qa breakdown
    const qaAgg = await leads.aggregate([{ $match: { qaStatus: { $ne: null } } }, { $group: { _id: '$qaStatus', count: { $sum: 1 } } }]).toArray()
    const qa = qaAgg.map(a => ({ name: a._id, value: a.count }))
    // sales by day (last 30 days)
    const since = new Date(); since.setDate(since.getDate() - 30)
    const recent = await leads.find({ disposition: 'Sale', updatedAt: { $gte: since.toISOString() } }).toArray()
    const dayMap = {}
    for (const l of recent) {
      const d = (l.updatedAt || l.createdAt).slice(0, 10)
      dayMap[d] = (dayMap[d] || 0) + 1
    }
    const salesByDay = Object.entries(dayMap).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date))
    // top agents by sales
    const allUsers = await database.collection('users').find({}).toArray()
    const userMap = Object.fromEntries(allUsers.map(u => [u.id, u.name]))
    const salesAgg = await leads.aggregate([
      { $match: { disposition: 'Sale', assigneeId: { $ne: null } } },
      { $group: { _id: '$assigneeId', count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 10 },
    ]).toArray()
    const topAgents = salesAgg.map(a => ({ name: userMap[a._id] || a._id, sales: a.count }))
    // lead aging (days since created, bucketed)
    const allLeads = await leads.find({ disposition: { $nin: ['Sale','Wrong Number','Nothing To Insure'] } }).project({ createdAt: 1 }).toArray()
    const now = Date.now()
    const ageBuckets = { '0-1d': 0, '2-7d': 0, '8-30d': 0, '30d+': 0 }
    for (const l of allLeads) {
      const days = (now - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      if (days <= 1) ageBuckets['0-1d']++
      else if (days <= 7) ageBuckets['2-7d']++
      else if (days <= 30) ageBuckets['8-30d']++
      else ageBuckets['30d+']++
    }
    const aging = Object.entries(ageBuckets).map(([bucket, count]) => ({ bucket, count }))
    // commissions
    const commissionsAgg = await database.collection('commissions').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$totalCommission' } } },
    ]).toArray()
    return json({
      totalLeads, sales, conversionRate: totalLeads ? Math.round((sales / totalLeads) * 1000) / 10 : 0,
      dispositions, qa, salesByDay, topAgents, aging,
      commissions: commissionsAgg.map(c => ({ status: c._id, count: c.count, total: Math.round(c.total * 100) / 100 })),
    })
  }

  return err(`Not found: ${method} ${path}`, 404)
}

export const GET = handler
export const POST = handler
export const PATCH = handler
export const PUT = handler
export const DELETE = handler
