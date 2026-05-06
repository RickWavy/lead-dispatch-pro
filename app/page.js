'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Shield, Users, Phone, ClipboardCheck, Activity, LogOut, Plus, Search, ChevronRight, AlertCircle, CheckCircle2, Clock, MessageSquare, Calendar, FileText, TrendingUp, DollarSign, Trophy, Bell, BarChart3, Wrench, UserCog, LifeBuoy, Upload, Download, Send } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const DISPOSITIONS = ['New','Voicemail','No Answer','Sale','Not Quoted','Not Quoted Callback','Callback Scheduled','Unable To Quote','Nothing To Insure','AI Answered','Wrong Number']
const SOURCES = ['Internal','Outbound','Referral','Walk-in']
const ROLE_LABEL = { super: 'Super User', agent: 'Call Agent', field: 'Field Agent', qa: 'QA Auditor' }
const ROLE_COLOR = { super: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', agent: 'bg-amber-500/15 text-amber-300 border-amber-500/40', field: 'bg-orange-500/15 text-orange-300 border-orange-500/40', qa: 'bg-blue-500/15 text-blue-300 border-blue-500/40' }
const DISP_COLOR = {
  'Sale': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Voicemail': 'bg-amber-100 text-amber-700 border-amber-200',
  'No Answer': 'bg-amber-100 text-amber-700 border-amber-200',
  'Callback Scheduled': 'bg-blue-100 text-blue-700 border-blue-200',
  'Wrong Number': 'bg-rose-100 text-rose-700 border-rose-200',
  'New': 'bg-slate-100 text-slate-700 border-slate-200',
}

async function api(path, opts = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('crm_token') : null
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('admin@sentinel.co.za')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const [seeded, setSeeded] = useState(null)

  const handleSeed = async () => {
    try {
      const r = await api('/auth/seed', { method: 'POST' })
      setSeeded(r.seeded || [])
      toast.success(r.seeded ? 'Demo users seeded' : 'Already seeded')
    } catch (e) { toast.error(e.message) }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      localStorage.setItem('crm_token', r.token)
      localStorage.setItem('crm_user', JSON.stringify(r.user))
      onLogin(r.user)
    } catch (e) { toast.error(e.message) } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-amber-950/40 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-24 h-24 rounded-2xl bg-zinc-950 border-2 border-yellow-500/50 flex items-center justify-center shadow-2xl shadow-yellow-500/30 overflow-hidden">
            <img src="/logo.webp" alt="UFS" className="w-full h-full object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-yellow-400">UFS</h1>
            <p className="text-xs text-zinc-300 uppercase tracking-widest">Operations Platform</p>
          </div>
        </div>
        <Card className="shadow-2xl border-yellow-500/30 bg-zinc-900/80 backdrop-blur text-zinc-100">
          <CardHeader>
            <CardTitle className="text-yellow-400">Sign in</CardTitle>
            <CardDescription className="text-zinc-300">Access the operations platform</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-200">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-zinc-800 border-zinc-700 text-zinc-100" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-200">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-zinc-800 border-zinc-700 text-zinc-100" />
              </div>
              <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
            </form>
            <Separator className="my-6 bg-zinc-700" />
            <div className="space-y-3">
              <p className="text-xs text-zinc-300">First time? Seed demo users for all 4 roles:</p>
              <Button variant="outline" className="w-full border-yellow-500/50 bg-transparent text-yellow-400 hover:bg-yellow-500/15 hover:text-yellow-300" onClick={handleSeed}>Seed Demo Users</Button>
              {seeded && (
                <div className="text-xs space-y-1 bg-zinc-800/80 rounded-md p-3 border border-zinc-700">
                  {seeded.map(s => (
                    <div key={s.email} className="flex justify-between gap-2 font-mono">
                      <span className="text-zinc-400">{s.email}</span>
                      <span className="text-yellow-400">{s.password}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-zinc-400 mt-6">Append-only audit log · Role-based access · SA ID validation</p>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color = 'slate' }) {
  const colorMap = {
    slate: 'bg-yellow-100 text-yellow-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
  }
  return (
    <Card className="border-yellow-200/60 bg-white">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-lg ${colorMap[color] || colorMap.slate} flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Dashboard({ user }) {
  const [stats, setStats] = useState(null)
  useEffect(() => { api('/dashboard').then(setStats).catch(e => toast.error(e.message)) }, [])
  if (!stats) return <div className="text-sm text-muted-foreground">Loading...</div>
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Welcome back, {user.name.split(' ')[0]}</h2>
        <p className="text-muted-foreground">{user.role === 'super' ? 'Full operational overview' : user.role === 'qa' ? 'Quality assurance queue' : 'Your performance snapshot'}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={user.role === 'super' || user.role === 'qa' ? 'Total Leads' : 'My Leads'} value={stats.total} icon={Users} />
        <StatCard label="Sales" value={stats.sales} icon={TrendingUp} color="emerald" />
        <StatCard label="Conversion Rate" value={`${stats.conversionRate}%`} icon={Activity} color="blue" />
        <StatCard label="QA Pending" value={stats.qaPending} icon={ClipboardCheck} color="amber" />
      </div>
      <Card>
        <CardHeader><CardTitle>Disposition Breakdown</CardTitle></CardHeader>
        <CardContent>
          {stats.dispositions.length === 0 ? <p className="text-sm text-muted-foreground">No leads yet.</p> : (
            <div className="space-y-2">
              {stats.dispositions.map(d => (
                <div key={d.disposition} className="flex items-center justify-between p-3 rounded-md bg-slate-50">
                  <span className="font-medium text-sm">{d.disposition}</span>
                  <Badge variant="outline" className={DISP_COLOR[d.disposition] || 'bg-slate-100 text-slate-700'}>{d.count}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function LeadCreateDialog({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', saId: '', address: '', vehicleMake: '', vehicleModel: '', vehicleYear: '', caseNumber: '', productType: '', accountNumber: '', debitDate: '', source: 'Internal' })
  const [saIdInfo, setSaIdInfo] = useState(null)
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const checkSaId = async (id) => {
    set('saId', id)
    if (!id || id.replace(/\s/g, '').length !== 13) { setSaIdInfo(null); return }
    try {
      const r = await api('/validate/sa-id', { method: 'POST', body: JSON.stringify({ id }) })
      setSaIdInfo(r)
    } catch { setSaIdInfo(null) }
  }

  const submit = async () => {
    setLoading(true)
    try {
      await api('/leads', { method: 'POST', body: JSON.stringify(form) })
      toast.success('Lead created')
      onOpenChange(false)
      setForm({ firstName: '', lastName: '', phone: '', saId: '', address: '', vehicleMake: '', vehicleModel: '', vehicleYear: '', caseNumber: '', productType: '', accountNumber: '', debitDate: '', source: 'Internal' })
      setSaIdInfo(null)
      onCreated?.()
    } catch (e) { toast.error(e.message) } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Lead</DialogTitle>
          <DialogDescription>Capture customer details. SA ID is validated via checksum.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>First Name *</Label><Input value={form.firstName} onChange={e => set('firstName', e.target.value)} /></div>
          <div className="space-y-1"><Label>Last Name *</Label><Input value={form.lastName} onChange={e => set('lastName', e.target.value)} /></div>
          <div className="space-y-1"><Label>Phone *</Label><Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0821234567" /></div>
          <div className="space-y-1">
            <Label>SA ID Number</Label>
            <Input value={form.saId} onChange={e => checkSaId(e.target.value)} placeholder="13 digits" />
            {saIdInfo && (saIdInfo.valid ? (
              <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Valid · {saIdInfo.gender} · {saIdInfo.citizenship}</p>
            ) : (
              <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {saIdInfo.reason}</p>
            ))}
          </div>
          <div className="space-y-1 col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => set('address', e.target.value)} /></div>
          <div className="space-y-1"><Label>Vehicle Make</Label><Input value={form.vehicleMake} onChange={e => set('vehicleMake', e.target.value)} /></div>
          <div className="space-y-1"><Label>Vehicle Model</Label><Input value={form.vehicleModel} onChange={e => set('vehicleModel', e.target.value)} /></div>
          <div className="space-y-1"><Label>Year</Label><Input value={form.vehicleYear} onChange={e => set('vehicleYear', e.target.value)} /></div>
          <div className="space-y-1"><Label>Case Number</Label><Input value={form.caseNumber} onChange={e => set('caseNumber', e.target.value)} /></div>
          <div className="space-y-1"><Label>Product Type</Label><Input value={form.productType} onChange={e => set('productType', e.target.value)} /></div>
          <div className="space-y-1"><Label>Account Number</Label><Input value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} /></div>
          <div className="space-y-1"><Label>Debit Date</Label><Input type="date" value={form.debitDate} onChange={e => set('debitDate', e.target.value)} /></div>
          <div className="space-y-1">
            <Label>Source</Label>
            <Select value={form.source} onValueChange={v => set('source', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>{loading ? 'Creating...' : 'Create Lead'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LeadDetailDialog({ leadId, open, onOpenChange, user, onChange }) {
  const [lead, setLead] = useState(null)
  const [audit, setAudit] = useState([])
  const [users, setUsers] = useState([])
  const [comment, setComment] = useState('')
  const [cbDate, setCbDate] = useState('')
  const [cbNotes, setCbNotes] = useState('')
  const [qaFeedback, setQaFeedback] = useState('')

  const load = useCallback(async () => {
    if (!leadId) return
    try {
      const r = await api(`/leads/${leadId}`)
      setLead(r.lead)
      setQaFeedback(r.lead.qaFeedback || '')
      const a = await api(`/leads/${leadId}/audit`); setAudit(a.logs)
      if (user.role === 'super') { const u = await api('/users'); setUsers(u.users) }
    } catch (e) { toast.error(e.message) }
  }, [leadId, user.role])

  useEffect(() => { if (open) load() }, [open, load])

  if (!lead) return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent /></Dialog>

  const updateDisposition = async (disposition) => {
    try { await api(`/leads/${leadId}`, { method: 'PATCH', body: JSON.stringify({ disposition }) }); toast.success('Disposition updated'); load(); onChange?.() } catch (e) { toast.error(e.message) }
  }
  const addComment = async () => {
    if (!comment.trim()) return
    try { await api(`/leads/${leadId}/comments`, { method: 'POST', body: JSON.stringify({ text: comment }) }); setComment(''); toast.success('Comment added'); load() } catch (e) { toast.error(e.message) }
  }
  const scheduleCb = async () => {
    if (!cbDate) { toast.error('Pick a date/time'); return }
    try { await api(`/leads/${leadId}/callback`, { method: 'POST', body: JSON.stringify({ scheduledAt: new Date(cbDate).toISOString(), notes: cbNotes }) }); setCbDate(''); setCbNotes(''); toast.success('Callback scheduled'); load(); onChange?.() } catch (e) { toast.error(e.message) }
  }
  const scheduleFitment = async () => {
    if (!cbDate) { toast.error('Pick a fitment date/time'); return }
    try { await api(`/leads/${leadId}/fitment`, { method: 'POST', body: JSON.stringify({ scheduledAt: new Date(cbDate).toISOString(), notes: cbNotes }) }); setCbDate(''); setCbNotes(''); toast.success('Fitment scheduled'); load(); onChange?.() } catch (e) { toast.error(e.message) }
  }
  const assignTo = async (userId) => {
    try { await api(`/leads/${leadId}/assign`, { method: 'POST', body: JSON.stringify({ assigneeId: userId }) }); toast.success('Reassigned'); load(); onChange?.() } catch (e) { toast.error(e.message) }
  }
  const updateQa = async (qaStatus) => {
    try { await api(`/qa/${leadId}`, { method: 'PATCH', body: JSON.stringify({ qaStatus, qaFeedback }) }); toast.success('QA updated'); load(); onChange?.() } catch (e) { toast.error(e.message) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {lead.firstName} {lead.lastName}
            <Badge variant="outline" className={DISP_COLOR[lead.disposition] || 'bg-slate-100'}>{lead.disposition}</Badge>
            {lead.qaStatus && <Badge variant="outline" className="bg-blue-100 text-blue-700">QA: {lead.qaStatus}</Badge>}
          </DialogTitle>
          <DialogDescription>{lead.phone} · Source: {lead.source} · Assigned: {lead.assigneeName || 'Unassigned'}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="comments">Comments ({lead.comments?.length || 0})</TabsTrigger>
            <TabsTrigger value="audit">Audit ({audit.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="SA ID" value={lead.saId ? `${lead.saId} (${lead.saIdMeta?.gender}, ${lead.saIdMeta?.citizenship})` : '—'} />
              <Field label="Address" value={lead.address || '—'} />
              <Field label="Vehicle" value={[lead.vehicleMake, lead.vehicleModel, lead.vehicleYear].filter(Boolean).join(' ') || '—'} />
              <Field label="Case Number" value={lead.caseNumber || '—'} />
              <Field label="Product" value={lead.productType || '—'} />
              <Field label="Account" value={lead.accountNumber || '—'} />
              <Field label="Debit Date" value={lead.debitDate || '—'} />
              <Field label="Created" value={new Date(lead.createdAt).toLocaleString()} />
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <div className="space-y-2">
              <Label>Set Disposition</Label>
              <div className="flex flex-wrap gap-2">
                {DISPOSITIONS.filter(d => d !== 'New' && d !== 'Callback Scheduled').map(d => (
                  <Button key={d} variant="outline" size="sm" onClick={() => updateDisposition(d)} disabled={lead.disposition === d}>{d}</Button>
                ))}
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Schedule Callback / Fitment</Label>
              <div className="flex gap-2">
                <Input type="datetime-local" value={cbDate} onChange={e => setCbDate(e.target.value)} className="flex-1" />
                <Input placeholder="Notes" value={cbNotes} onChange={e => setCbNotes(e.target.value)} className="flex-1" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={scheduleCb}><Calendar className="w-4 h-4 mr-1" /> Callback</Button>
                <Button size="sm" variant="outline" onClick={scheduleFitment}><Wrench className="w-4 h-4 mr-1" /> Fitment</Button>
              </div>
            </div>
            {user.role === 'super' && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Reassign to user</Label>
                  <Select onValueChange={assignTo}>
                    <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                    <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({ROLE_LABEL[u.role]})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}
            {(user.role === 'qa' || user.role === 'super') && lead.qaStatus && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>QA Feedback</Label>
                  <Textarea value={qaFeedback} onChange={e => setQaFeedback(e.target.value)} placeholder="Audit notes..." />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateQa('Completed')} className="bg-emerald-600 hover:bg-emerald-700">Mark Completed</Button>
                    <Button size="sm" variant="destructive" onClick={() => updateQa('Error Found')}>Error Found</Button>
                    <Button size="sm" variant="outline" onClick={() => updateQa('Pending')}>Reset to Pending</Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="comments" className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Add a note..." value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()} />
              <Button onClick={addComment}><Plus className="w-4 h-4" /></Button>
            </div>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {(lead.comments || []).slice().reverse().map(c => (
                  <div key={c.id} className="bg-slate-50 rounded-md p-3 text-sm">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span className="font-medium">{c.authorName} · {ROLE_LABEL[c.authorRole]}</span>
                      <span>{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p>{c.text}</p>
                  </div>
                ))}
                {(!lead.comments || lead.comments.length === 0) && <p className="text-sm text-muted-foreground">No comments yet.</p>}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="audit">
            <ScrollArea className="h-80">
              <div className="space-y-2">
                {audit.map(l => (
                  <div key={l.id} className="text-xs border-l-2 border-slate-300 pl-3 py-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold">{l.action}</span>
                      <span className="text-muted-foreground">{new Date(l.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-muted-foreground">{l.actorName} ({l.actorRole})</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

const Field = ({ label, value }) => (
  <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>
)

function LeadsView({ user }) {
  const [leads, setLeads] = useState([])
  const [q, setQ] = useState('')
  const [disposition, setDisposition] = useState('all')
  const [openCreate, setOpenCreate] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const [openImport, setOpenImport] = useState(false)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (disposition && disposition !== 'all') params.set('disposition', disposition)
    try { const r = await api(`/leads?${params}`); setLeads(r.leads) } catch (e) { toast.error(e.message) }
  }, [q, disposition])

  useEffect(() => { load() }, [load])

  const exportLeads = async (format) => {
    try {
      const token = localStorage.getItem('crm_token')
      const res = await fetch(`/api/leads/export?format=${format}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `leads-${Date.now()}.${format}`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
      toast.success(`Exported as ${format.toUpperCase()}`)
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-2xl font-bold">Leads</h2>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setOpenImport(true)}><Upload className="w-4 h-4 mr-1" /> Import</Button>
          <Select onValueChange={exportLeads}>
            <SelectTrigger className="w-[140px]"><Download className="w-4 h-4 mr-1" /><SelectValue placeholder="Export" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setOpenCreate(true)} className="bg-yellow-500 hover:bg-yellow-400 text-black"><Plus className="w-4 h-4 mr-1" /> New Lead</Button>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, phone, ID, case..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <Select value={disposition} onValueChange={setDisposition}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Disposition" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dispositions</SelectItem>
            {DISPOSITIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Disposition</TableHead><TableHead>QA</TableHead><TableHead>Assignee</TableHead><TableHead>Created</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map(l => (
              <TableRow key={l.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setDetailId(l.id)}>
                <TableCell className="font-medium">{l.firstName} {l.lastName}</TableCell>
                <TableCell className="font-mono text-sm">{l.phone}</TableCell>
                <TableCell><Badge variant="outline" className={DISP_COLOR[l.disposition] || 'bg-slate-100'}>{l.disposition}</Badge></TableCell>
                <TableCell>{l.qaStatus ? <Badge variant="outline" className="bg-blue-100 text-blue-700">{l.qaStatus}</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                <TableCell className="text-sm">{l.assigneeName || <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleDateString()}</TableCell>
                <TableCell><ChevronRight className="w-4 h-4 text-muted-foreground" /></TableCell>
              </TableRow>
            ))}
            {leads.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-12">No leads. Create your first lead to begin.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <LeadCreateDialog open={openCreate} onOpenChange={setOpenCreate} onCreated={load} />
      <LeadDetailDialog leadId={detailId} open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)} user={user} onChange={load} />
      <ImportLeadsDialog open={openImport} onOpenChange={setOpenImport} onImported={load} />
    </div>
  )
}

function ImportLeadsDialog({ open, onOpenChange, onImported }) {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!file) { toast.error('Select a file'); return }
    setBusy(true); setResult(null)
    try {
      const fd = new FormData(); fd.append('file', file)
      const token = localStorage.getItem('crm_token')
      const res = await fetch('/api/leads/import', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setResult(data)
      toast.success(`Imported ${data.created} of ${data.total}`)
      onImported?.()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setFile(null); setResult(null) } onOpenChange(v) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Leads</DialogTitle>
          <DialogDescription>Upload .csv, .xlsx, .xls or .json. Required columns: <code>firstName</code>, <code>lastName</code>, <code>phone</code>. Optional: saId, address, vehicleMake, vehicleModel, vehicleYear, caseNumber, productType, accountNumber, debitDate, source.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input type="file" accept=".csv,.xlsx,.xls,.json" onChange={e => setFile(e.target.files?.[0] || null)} />
          {file && <p className="text-sm text-muted-foreground">Selected: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)</p>}
          {result && (
            <div className="bg-slate-50 border rounded-md p-3 text-sm space-y-1">
              <p>Total rows: <strong>{result.total}</strong></p>
              <p className="text-emerald-700">Created: <strong>{result.created}</strong></p>
              <p className="text-amber-700">Skipped: <strong>{result.skipped}</strong></p>
              {result.errors?.length > 0 && (
                <details className="text-xs text-red-700"><summary className="cursor-pointer">{result.errors.length} error(s)</summary><ul className="mt-1 space-y-0.5">{result.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}</ul></details>
              )}
            </div>
          )}
          <div className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2">
            <strong>Tip:</strong> Export an existing leads file first (CSV/XLSX) to see the exact column headers expected.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={submit} disabled={busy || !file}>{busy ? 'Importing...' : 'Import'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function HelpDeskView({ user }) {
  const [tickets, setTickets] = useState([])
  const [waSettings, setWaSettings] = useState(null)
  const [messages, setMessages] = useState([])
  const [openCreate, setOpenCreate] = useState(false)
  const [form, setForm] = useState({ subject: '', description: '', severity: 'medium' })
  const [tab, setTab] = useState('tickets')

  const load = async () => {
    try {
      const t = await api('/helpdesk'); setTickets(t.tickets)
      if (user.role === 'super') {
        const s = await api('/settings/whatsapp'); setWaSettings(s)
        const m = await api('/messages'); setMessages(m.messages)
      }
    } catch (e) { toast.error(e.message) }
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!form.subject.trim()) { toast.error('Subject required'); return }
    try { await api('/helpdesk', { method: 'POST', body: JSON.stringify(form) }); toast.success('Ticket created'); setOpenCreate(false); setForm({ subject: '', description: '', severity: 'medium' }); load() } catch (e) { toast.error(e.message) }
  }
  const updateTicket = async (id, updates) => { try { await api(`/helpdesk/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }); toast.success('Updated'); load() } catch (e) { toast.error(e.message) } }
  const retryMsg = async (id) => { try { await api(`/messages/${id}/retry`, { method: 'POST' }); toast.success('Re-queued'); load() } catch (e) { toast.error(e.message) } }

  const sevColor = (s) => ({ low: 'bg-slate-100 text-slate-700', medium: 'bg-blue-100 text-blue-700', high: 'bg-amber-100 text-amber-700', critical: 'bg-red-100 text-red-700' }[s] || 'bg-slate-100')
  const stColor = (s) => ({ Open: 'bg-amber-100 text-amber-700', 'In Progress': 'bg-blue-100 text-blue-700', Resolved: 'bg-emerald-100 text-emerald-700' }[s] || 'bg-slate-100')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Help Desk</h2>
          <p className="text-sm text-muted-foreground">Report system errors. {user.role === 'super' && 'Manage tickets and the WhatsApp outbound queue.'}</p>
        </div>
        <Button onClick={() => setOpenCreate(true)} className="bg-yellow-500 hover:bg-yellow-400 text-black"><Plus className="w-4 h-4 mr-1" /> New Ticket</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="tickets">Tickets ({tickets.length})</TabsTrigger>
          {user.role === 'super' && <TabsTrigger value="whatsapp">WhatsApp Queue ({messages.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="tickets">
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead>Reporter</TableHead><TableHead>Created</TableHead>{user.role === 'super' && <TableHead>Actions</TableHead>}</TableRow></TableHeader>
              <TableBody>
                {tickets.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.subject}</TableCell>
                    <TableCell><Badge variant="outline" className={sevColor(t.severity)}>{t.severity}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={stColor(t.status)}>{t.status}</Badge></TableCell>
                    <TableCell className="text-sm">{t.creatorName} <span className="text-muted-foreground text-xs">({t.creatorRole})</span></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</TableCell>
                    {user.role === 'super' && (
                      <TableCell>
                        <Select value={t.status} onValueChange={(v) => updateTicket(t.id, { status: v })}>
                          <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Open">Open</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Resolved">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {tickets.length === 0 && <TableRow><TableCell colSpan={user.role === 'super' ? 6 : 5} className="text-center text-sm text-muted-foreground py-12">No tickets yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {user.role === 'super' && (
          <TabsContent value="whatsapp" className="space-y-4">
            {waSettings && (
              <Card>
                <CardHeader><CardTitle className="text-base">WhatsApp Provider</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={waSettings.configured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                      {waSettings.configured ? `Configured (${waSettings.provider})` : `Not configured (${waSettings.provider})`}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Configure via env: <code>WHATSAPP_PROVIDER</code> = <code>twilio</code> or <code>meta</code>, plus provider keys, plus <code>SUPERVISOR_WHATSAPP</code> for the supervisor recipient. Until configured, all messages stay queued.</p>
                  <p className="text-xs">Queued: <strong>{waSettings.counts.queued}</strong> · Sent: <strong className="text-emerald-700">{waSettings.counts.sent}</strong> · Failed: <strong className="text-red-700">{waSettings.counts.failed}</strong></p>
                </CardContent>
              </Card>
            )}
            <Card>
              <Table>
                <TableHeader><TableRow><TableHead>To</TableHead><TableHead>Body</TableHead><TableHead>Status</TableHead><TableHead>Attempts</TableHead><TableHead>Created</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {messages.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs">{m.to}</TableCell>
                      <TableCell className="text-xs max-w-md truncate">{m.body}</TableCell>
                      <TableCell><Badge variant="outline" className={m.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : m.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>{m.status}</Badge></TableCell>
                      <TableCell className="text-xs">{m.attempts}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{m.status !== 'sent' && <Button size="sm" variant="ghost" onClick={() => retryMsg(m.id)}><Send className="w-3 h-3" /></Button>}</TableCell>
                    </TableRow>
                  ))}
                  {messages.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-12">Outbound queue empty.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report an Issue</DialogTitle><DialogDescription>This notifies all super users in-app and (when configured) via WhatsApp.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>Subject *</Label><Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What happened? Steps to reproduce, error code, etc." /></div>
            <div>
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancel</Button>
            <Button onClick={create}>Submit Ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CallbacksView({ user }) {
  const [cbs, setCbs] = useState([])
  const [users, setUsers] = useState([])
  const [detailId, setDetailId] = useState(null)
  const load = async () => { try { const r = await api('/callbacks'); setCbs(r.callbacks); if (user.role === 'super') { const u = await api('/users'); setUsers(u.users) } } catch (e) { toast.error(e.message) } }
  useEffect(() => { load() }, [])
  const assign = async (cbId, userId) => { try { await api(`/callbacks/${cbId}/assign`, { method: 'POST', body: JSON.stringify({ assigneeId: userId }) }); toast.success('Assigned'); load() } catch (e) { toast.error(e.message) } }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Callbacks</h2>
      <p className="text-sm text-muted-foreground">All callbacks are visible globally. Only Super Users can assign ownership.</p>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Lead</TableHead><TableHead>Phone</TableHead><TableHead>Scheduled</TableHead><TableHead>State</TableHead><TableHead>Assignee</TableHead>{user.role === 'super' && <TableHead>Assign</TableHead>}<TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {cbs.map(cb => (
              <TableRow key={cb.id}>
                <TableCell className="font-medium">{cb.leadName}</TableCell>
                <TableCell className="font-mono text-sm">{cb.leadPhone}</TableCell>
                <TableCell className="text-sm">{new Date(cb.scheduledAt).toLocaleString()}</TableCell>
                <TableCell><Badge variant="outline">{cb.state}</Badge></TableCell>
                <TableCell className="text-sm">{cb.assigneeName || <span className="text-muted-foreground">—</span>}</TableCell>
                {user.role === 'super' && (
                  <TableCell>
                    <Select onValueChange={(v) => assign(cb.id, v)}>
                      <SelectTrigger className="w-[160px] h-8"><SelectValue placeholder="Assign..." /></SelectTrigger>
                      <SelectContent>{users.filter(u => u.role === 'agent' || u.role === 'field').map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                )}
                <TableCell><Button size="sm" variant="ghost" onClick={() => setDetailId(cb.leadId)}>Open</Button></TableCell>
              </TableRow>
            ))}
            {cbs.length === 0 && <TableRow><TableCell colSpan={user.role === 'super' ? 7 : 6} className="text-center text-sm text-muted-foreground py-12">No callbacks scheduled.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <LeadDetailDialog leadId={detailId} open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)} user={user} onChange={load} />
    </div>
  )
}

function QAView({ user }) {
  const [items, setItems] = useState([])
  const [detailId, setDetailId] = useState(null)
  const load = async () => { try { const r = await api('/qa/queue'); setItems(r.items) } catch (e) { toast.error(e.message) } }
  useEffect(() => { load() }, [])
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">QA Queue</h2>
      <p className="text-sm text-muted-foreground">Auto-triggered for Voicemail, No Answer, and Sale dispositions.</p>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Lead</TableHead><TableHead>Disposition</TableHead><TableHead>QA Status</TableHead><TableHead>Assignee</TableHead><TableHead>Updated</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map(l => (
              <TableRow key={l.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setDetailId(l.id)}>
                <TableCell className="font-medium">{l.firstName} {l.lastName}</TableCell>
                <TableCell><Badge variant="outline" className={DISP_COLOR[l.disposition]}>{l.disposition}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={l.qaStatus === 'Error Found' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>{l.qaStatus}</Badge></TableCell>
                <TableCell className="text-sm">{l.assigneeName || '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(l.updatedAt).toLocaleString()}</TableCell>
                <TableCell><ChevronRight className="w-4 h-4 text-muted-foreground" /></TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-12">QA queue is empty.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <LeadDetailDialog leadId={detailId} open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)} user={user} onChange={load} />
    </div>
  )
}

function AuditView() {
  const [logs, setLogs] = useState([])
  useEffect(() => { api('/audit').then(r => setLogs(r.logs)).catch(e => toast.error(e.message)) }, [])
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Audit Log</h2>
        <p className="text-sm text-muted-foreground">Append-only · immutable · tamper-proof history of every action.</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {logs.map(l => (
                <div key={l.id} className="text-sm border-l-2 border-slate-900 pl-4 py-2 hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">{l.action}</span>
                    <span className="text-xs text-muted-foreground">{new Date(l.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="mt-1"><strong>{l.actorName}</strong> <span className="text-muted-foreground">({l.actorRole})</span> on <span className="font-mono text-xs">{l.entity}#{l.entityId?.slice(0, 8)}</span></p>
                </div>
              ))}
              {logs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No audit entries yet.</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function ProductsView() {
  const [products, setProducts] = useState([])
  const [providers, setProviders] = useState([])
  const [tab, setTab] = useState('products')
  const [openProd, setOpenProd] = useState(false)
  const [openProv, setOpenProv] = useState(false)
  const [pf, setPf] = useState({ name: '', code: '', description: '', providerId: '', basePrice: 0, commissionAmount: 0, splitClosingPct: 60, splitCreatorPct: 25, splitFieldPct: 15 })
  const [pvf, setPvf] = useState({ name: '', code: '', contactEmail: '', contactPhone: '', notes: '' })

  const load = async () => {
    try {
      const p = await api('/products'); setProducts(p.products)
      const v = await api('/providers'); setProviders(v.providers)
    } catch (e) { toast.error(e.message) }
  }
  useEffect(() => { load() }, [])

  const createProd = async () => {
    if (!pf.name.trim()) { toast.error('Name required'); return }
    try {
      await api('/products', { method: 'POST', body: JSON.stringify({ ...pf, providerId: pf.providerId || null }) })
      toast.success('Product added'); setOpenProd(false); setPf({ name: '', code: '', description: '', providerId: '', basePrice: 0, commissionAmount: 0, splitClosingPct: 60, splitCreatorPct: 25, splitFieldPct: 15 }); load()
    } catch (e) { toast.error(e.message) }
  }
  const createProv = async () => {
    if (!pvf.name.trim()) { toast.error('Name required'); return }
    try {
      await api('/providers', { method: 'POST', body: JSON.stringify(pvf) })
      toast.success('Provider added'); setOpenProv(false); setPvf({ name: '', code: '', contactEmail: '', contactPhone: '', notes: '' }); load()
    } catch (e) { toast.error(e.message) }
  }
  const toggleActive = async (kind, item) => {
    try {
      await api(`/${kind}/${item.id}`, { method: 'PATCH', body: JSON.stringify({ active: !item.active }) })
      toast.success(item.active ? 'Deactivated' : 'Activated'); load()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Products & Service Providers</h2>
          <p className="text-sm text-muted-foreground">Manage product catalog and provider relationships.</p>
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="products">Products ({products.length})</TabsTrigger>
          <TabsTrigger value="providers">Service Providers ({providers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setOpenProd(true)}><Plus className="w-4 h-4 mr-1" /> New Product</Button>
          </div>
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Provider</TableHead><TableHead>Base Price</TableHead><TableHead>Commission</TableHead><TableHead>Split (C/Cr/F)</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {products.map(p => (
                  <TableRow key={p.id} className={!p.active ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs">{p.code || '—'}</TableCell>
                    <TableCell className="text-sm">{p.providerName || '—'}</TableCell>
                    <TableCell>R {Number(p.basePrice || 0).toFixed(2)}</TableCell>
                    <TableCell>R {Number(p.commissionAmount || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs font-mono">{p.splitClosingPct ?? 60}/{p.splitCreatorPct ?? 25}/{p.splitFieldPct ?? 15}</TableCell>
                    <TableCell><Badge variant="outline" className={p.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}>{p.active ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => toggleActive('products', p)}>{p.active ? 'Deactivate' : 'Activate'}</Button></TableCell>
                  </TableRow>
                ))}
                {products.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-12">No products yet. Add your first product.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setOpenProv(true)}><Plus className="w-4 h-4 mr-1" /> New Provider</Button>
          </div>
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {providers.map(p => (
                  <TableRow key={p.id} className={!p.active ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs">{p.code || '—'}</TableCell>
                    <TableCell className="text-sm">{p.contactEmail || '—'}</TableCell>
                    <TableCell className="text-sm font-mono">{p.contactPhone || '—'}</TableCell>
                    <TableCell><Badge variant="outline" className={p.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}>{p.active ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => toggleActive('providers', p)}>{p.active ? 'Deactivate' : 'Activate'}</Button></TableCell>
                  </TableRow>
                ))}
                {providers.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-12">No providers yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={openProd} onOpenChange={setOpenProd}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Product</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={pf.name} onChange={e => setPf({ ...pf, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code</Label><Input value={pf.code} onChange={e => setPf({ ...pf, code: e.target.value })} /></div>
              <div>
                <Label>Provider</Label>
                <Select value={pf.providerId || 'none'} onValueChange={v => setPf({ ...pf, providerId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {providers.filter(p => p.active).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={pf.description} onChange={e => setPf({ ...pf, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Base Price (R)</Label><Input type="number" value={pf.basePrice} onChange={e => setPf({ ...pf, basePrice: e.target.value })} /></div>
              <div><Label>Commission Amount (R, flat)</Label><Input type="number" value={pf.commissionAmount} onChange={e => setPf({ ...pf, commissionAmount: e.target.value })} /></div>
            </div>
            <div className="space-y-1">
              <Label>Commission Split (must sum to 100)</Label>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs text-muted-foreground">Closing %</Label><Input type="number" value={pf.splitClosingPct} onChange={e => setPf({ ...pf, splitClosingPct: e.target.value })} /></div>
                <div><Label className="text-xs text-muted-foreground">Creator %</Label><Input type="number" value={pf.splitCreatorPct} onChange={e => setPf({ ...pf, splitCreatorPct: e.target.value })} /></div>
                <div><Label className="text-xs text-muted-foreground">Field %</Label><Input type="number" value={pf.splitFieldPct} onChange={e => setPf({ ...pf, splitFieldPct: e.target.value })} /></div>
              </div>
              <p className="text-xs text-muted-foreground">Sum: {Number(pf.splitClosingPct || 0) + Number(pf.splitCreatorPct || 0) + Number(pf.splitFieldPct || 0)}%</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenProd(false)}>Cancel</Button>
            <Button onClick={createProd}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openProv} onOpenChange={setOpenProv}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Service Provider</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={pvf.name} onChange={e => setPvf({ ...pvf, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code</Label><Input value={pvf.code} onChange={e => setPvf({ ...pvf, code: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={pvf.contactPhone} onChange={e => setPvf({ ...pvf, contactPhone: e.target.value })} /></div>
            </div>
            <div><Label>Email</Label><Input type="email" value={pvf.contactEmail} onChange={e => setPvf({ ...pvf, contactEmail: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={pvf.notes} onChange={e => setPvf({ ...pvf, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenProv(false)}>Cancel</Button>
            <Button onClick={createProv}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CommissionsView({ user }) {
  const [commissions, setCommissions] = useState([])
  const [board, setBoard] = useState([])
  const [monthKey, setMonthKey] = useState('')
  const [tab, setTab] = useState(user.role === 'super' ? 'all' : 'mine')

  const load = async () => {
    try {
      const c = await api('/commissions'); setCommissions(c.commissions)
      const b = await api('/commissions/leaderboard'); setBoard(b.leaderboard); setMonthKey(b.monthKey)
    } catch (e) { toast.error(e.message) }
  }
  useEffect(() => { load() }, [])

  const approve = async (id) => { try { await api(`/commissions/${id}/approve`, { method: 'POST' }); toast.success('Approved'); load() } catch (e) { toast.error(e.message) } }
  const reject = async (id) => { try { await api(`/commissions/${id}/reject`, { method: 'POST' }); toast.success('Rejected'); load() } catch (e) { toast.error(e.message) } }

  // own totals (approved only)
  const myMonth = board.find(b => b.userId === user.id)?.month || 0
  const myAll = board.find(b => b.userId === user.id)?.allTime || 0
  const totalPendingValue = commissions.filter(c => c.status === 'Pending Approval').reduce((s, c) => s + c.totalCommission, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Commissions</h2>
        <p className="text-sm text-muted-foreground">{user.role === 'super' ? 'Approve sale commissions and review leaderboard.' : 'Your earned commissions and team leaderboard.'}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {user.role === 'super' ? (
          <>
            <StatCard label="Total Records" value={commissions.length} icon={FileText} />
            <StatCard label="Pending Value" value={`R ${totalPendingValue.toFixed(2)}`} icon={Clock} color="amber" />
            <StatCard label="Top Earner (M)" value={board[0]?.name || '—'} icon={Trophy} color="emerald" />
          </>
        ) : (
          <>
            <StatCard label="This Month" value={`R ${myMonth.toFixed(2)}`} icon={DollarSign} color="emerald" />
            <StatCard label="All-Time" value={`R ${myAll.toFixed(2)}`} icon={TrendingUp} color="blue" />
            <StatCard label="My Records" value={commissions.length} icon={FileText} />
          </>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {user.role === 'super' && <TabsTrigger value="all">All Commissions ({commissions.length})</TabsTrigger>}
          {user.role !== 'super' && <TabsTrigger value="mine">My Commissions ({commissions.length})</TabsTrigger>}
          <TabsTrigger value="board">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value={user.role === 'super' ? 'all' : 'mine'}>
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Lead</TableHead><TableHead>Product</TableHead><TableHead>Total</TableHead><TableHead>Splits</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead>{user.role === 'super' && <TableHead></TableHead>}</TableRow></TableHeader>
              <TableBody>
                {commissions.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.leadName}</TableCell>
                    <TableCell className="text-sm">{c.productType || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="font-semibold">R {Number(c.totalCommission || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {(c.splits || []).map((s, i) => (
                          <div key={i} className="text-xs flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] py-0">{s.role}</Badge>
                            <span>{s.userName}</span>
                            <span className="font-mono text-emerald-700">R{Number(s.amount).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={c.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : c.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>{c.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                    {user.role === 'super' && (
                      <TableCell>
                        {c.status === 'Pending Approval' && (
                          <div className="flex gap-1">
                            <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700" onClick={() => approve(c.id)}>Approve</Button>
                            <Button size="sm" variant="destructive" className="h-7" onClick={() => reject(c.id)}>Reject</Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {commissions.length === 0 && <TableRow><TableCell colSpan={user.role === 'super' ? 7 : 6} className="text-center text-sm text-muted-foreground py-12">No commissions yet. Sales will auto-generate commission records.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="board">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Leaderboard <span className="text-xs text-muted-foreground font-normal">({monthKey})</span></CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead className="w-12">#</TableHead><TableHead>Agent</TableHead><TableHead>This Month</TableHead><TableHead>All-Time</TableHead><TableHead>Approved Deals</TableHead></TableRow></TableHeader>
                <TableBody>
                  {board.map((row, idx) => (
                    <TableRow key={row.userId} className={row.userId === user.id ? 'bg-blue-50' : ''}>
                      <TableCell className="font-bold text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}</TableCell>
                      <TableCell className="font-medium">{row.name}{row.userId === user.id && <span className="ml-2 text-xs text-blue-600">(you)</span>}</TableCell>
                      <TableCell className="font-semibold text-emerald-700">R {row.month.toFixed(2)}</TableCell>
                      <TableCell>R {row.allTime.toFixed(2)}</TableCell>
                      <TableCell className="text-sm">{row.deals}</TableCell>
                    </TableRow>
                  ))}
                  {board.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-12">No approved commissions yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function NotificationBell() {
  const [items, setItems] = useState([])
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)

  const load = async () => {
    try {
      const r = await api('/notifications'); setItems(r.items)
      const c = await api('/notifications/unread-count'); setCount(c.count)
    } catch {}
  }
  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  const markRead = async (id) => { try { await api(`/notifications/${id}/read`, { method: 'PATCH' }); load() } catch {} }
  const readAll = async () => { try { await api('/notifications/read-all', { method: 'POST' }); load() } catch {} }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {count > 0 && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{count > 9 ? '9+' : count}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notifications {count > 0 && <span className="text-xs text-muted-foreground">({count} unread)</span>}</h3>
          {count > 0 && <Button variant="ghost" size="sm" onClick={readAll}>Mark all read</Button>}
        </div>
        <ScrollArea className="h-80">
          {items.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No notifications</p> : (
            <div>
              {items.map(n => (
                <div key={n.id} onClick={() => !n.read && markRead(n.id)} className={`p-3 border-b cursor-pointer hover:bg-slate-50 ${!n.read ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-start gap-2">
                    {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />}
                    <div className="flex-1">
                      <p className="text-sm">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

function FitmentsView({ user }) {
  const [items, setItems] = useState([])
  const [detailId, setDetailId] = useState(null)
  const load = async () => { try { const r = await api('/fitments'); setItems(r.fitments) } catch (e) { toast.error(e.message) } }
  useEffect(() => { load() }, [])

  const updateStatus = async (id, status) => { try { await api(`/fitments/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); toast.success(`Marked ${status}`); load() } catch (e) { toast.error(e.message) } }

  const ageBadge = (f) => {
    const ms = new Date(f.scheduledAt).getTime() - Date.now()
    const hrs = ms / (1000 * 60 * 60)
    if (f.status !== 'Scheduled') return null
    if (hrs < 0) return <Badge variant="outline" className="bg-red-100 text-red-700">Overdue</Badge>
    if (hrs < 24) return <Badge variant="outline" className="bg-amber-100 text-amber-700">&lt; 24h</Badge>
    return <Badge variant="outline" className="bg-blue-100 text-blue-700">{Math.round(hrs / 24)}d</Badge>
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Fitments</h2>
        <p className="text-sm text-muted-foreground">Track scheduled fitments. Get warnings within 24 hours and missed alerts.</p>
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Lead</TableHead><TableHead>Phone</TableHead><TableHead>Product</TableHead><TableHead>Scheduled</TableHead><TableHead>Status</TableHead><TableHead>Time</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map(f => (
              <TableRow key={f.id}>
                <TableCell className="font-medium cursor-pointer" onClick={() => setDetailId(f.leadId)}>{f.leadName}</TableCell>
                <TableCell className="font-mono text-sm">{f.leadPhone}</TableCell>
                <TableCell className="text-sm">{f.productType || '—'}</TableCell>
                <TableCell className="text-sm">{new Date(f.scheduledAt).toLocaleString()}</TableCell>
                <TableCell><Badge variant="outline" className={f.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : f.status === 'Missed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>{f.status}</Badge></TableCell>
                <TableCell>{ageBadge(f)}</TableCell>
                <TableCell>
                  {f.status === 'Scheduled' && (
                    <div className="flex gap-1">
                      <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus(f.id, 'Completed')}>Complete</Button>
                      <Button size="sm" variant="destructive" className="h-7" onClick={() => updateStatus(f.id, 'Missed')}>Miss</Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-12">No fitments scheduled. Schedule from a lead detail dialog after a sale.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <LeadDetailDialog leadId={detailId} open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)} user={user} onChange={load} />
    </div>
  )
}

function UsersView({ currentUser }) {
  const [users, setUsers] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'agent' })
  const [credModal, setCredModal] = useState(null)
  const load = async () => { try { const r = await api('/users'); setUsers(r.users) } catch (e) { toast.error(e.message) } }
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!form.name || !form.email || !form.password) { toast.error('Name, email, password required'); return }
    try {
      const r = await api('/users', { method: 'POST', body: JSON.stringify(form) })
      toast.success('User created'); setOpen(false)
      setCredModal({ title: 'User Created', email: r.user.email, password: r.plaintextPassword, role: r.user.role, name: r.user.name })
      setForm({ name: '', email: '', password: '', role: 'agent' }); load()
    } catch (e) { toast.error(e.message) }
  }
  const toggleActive = async (u) => { try { await api(`/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ active: !u.active }) }); toast.success('Updated'); load() } catch (e) { toast.error(e.message) } }
  const changeRole = async (u, role) => { try { await api(`/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ role }) }); toast.success('Role updated'); load() } catch (e) { toast.error(e.message) } }
  const resetPassword = async (u, custom) => {
    try {
      const r = await api(`/users/${u.id}/reset-password`, { method: 'POST', body: JSON.stringify(custom ? { password: custom } : {}) })
      setCredModal({ title: 'Password Reset', email: r.email, password: r.plaintextPassword, role: u.role, name: u.name })
      toast.success('Password reset')
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-sm text-muted-foreground">Create users, change roles, deactivate accounts. Passwords are revealed once at creation/reset for handover.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> New User</Button>
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id} className={!u.active ? 'opacity-50' : ''}>
                <TableCell className="font-medium">{u.name}{u.id === currentUser.id && <span className="ml-2 text-xs text-blue-600">(you)</span>}</TableCell>
                <TableCell className="font-mono text-sm">{u.email}</TableCell>
                <TableCell>
                  {u.id === currentUser.id ? (
                    <Badge variant="outline" className={ROLE_COLOR[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                  ) : (
                    <Select value={u.role} onValueChange={(v) => changeRole(u, v)}>
                      <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(ROLE_LABEL).map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell><Badge variant="outline" className={u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}>{u.active ? 'Active' : 'Inactive'}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  {u.id !== currentUser.id && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => resetPassword(u)}>Reset Password</Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(u)}>{u.active ? 'Deactivate' : 'Activate'}</Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New User</DialogTitle><DialogDescription>The password you set will be shown back for handover.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Password *</Label><Input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Plaintext — will be hashed at rest" /></div>
            <div>
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(ROLE_LABEL).map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!credModal} onOpenChange={(v) => !v && setCredModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600" /> {credModal?.title}</DialogTitle><DialogDescription>Copy these credentials now. They will not be shown again.</DialogDescription></DialogHeader>
          {credModal && (
            <div className="space-y-3">
              <div className="bg-slate-50 border rounded-lg p-4 space-y-2 font-mono text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Name:</span><span className="font-semibold">{credModal.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email:</span><span className="font-semibold">{credModal.email}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Role:</span><Badge variant="outline" className={ROLE_COLOR[credModal.role]}>{ROLE_LABEL[credModal.role]}</Badge></div>
                <Separator />
                <div className="flex justify-between items-center"><span className="text-muted-foreground">Password:</span><span className="font-bold text-lg bg-amber-100 px-3 py-1 rounded">{credModal.password}</span></div>
              </div>
              <Button className="w-full" variant="outline" onClick={() => { navigator.clipboard.writeText(`${credModal.email} / ${credModal.password}`); toast.success('Copied to clipboard') }}>Copy email + password</Button>
            </div>
          )}
          <DialogFooter><Button onClick={() => setCredModal(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const PIE_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#64748b']

function AnalyticsView() {
  const [data, setData] = useState(null)
  useEffect(() => { api('/analytics').then(setData).catch(e => toast.error(e.message)) }, [])
  if (!data) return <div className="text-sm text-muted-foreground">Loading analytics...</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Analytics</h2>
        <p className="text-sm text-muted-foreground">Operational insights across leads, sales, QA and commissions.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Leads" value={data.totalLeads} icon={Users} />
        <StatCard label="Sales" value={data.sales} icon={TrendingUp} color="emerald" />
        <StatCard label="Conversion" value={`${data.conversionRate}%`} icon={Activity} color="blue" />
        <StatCard label="Approved Comm." value={`R ${(data.commissions.find(c => c.status === 'Approved')?.total || 0).toFixed(2)}`} icon={DollarSign} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Sales — last 30 days</CardTitle></CardHeader>
          <CardContent>
            {data.salesByDay.length === 0 ? <p className="text-sm text-muted-foreground py-12 text-center">No sales in the last 30 days.</p> : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.salesByDay}>
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top Agents by Sales</CardTitle></CardHeader>
          <CardContent>
            {data.topAgents.length === 0 ? <p className="text-sm text-muted-foreground py-12 text-center">No sales yet.</p> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.topAgents} layout="vertical">
                  <XAxis type="number" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" fontSize={11} width={100} />
                  <Tooltip />
                  <Bar dataKey="sales" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Disposition Breakdown</CardTitle></CardHeader>
          <CardContent>
            {data.dispositions.length === 0 ? <p className="text-sm text-muted-foreground py-12 text-center">No data.</p> : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.dispositions} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => `${e.name}: ${e.value}`}>
                    {data.dispositions.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Lead Aging (open leads)</CardTitle></CardHeader>
          <CardContent>
            {data.aging.every(b => b.count === 0) ? <p className="text-sm text-muted-foreground py-12 text-center">No open leads.</p> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.aging}>
                  <XAxis dataKey="bucket" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {data.qa.length > 0 && (
          <Card>
            <CardHeader><CardTitle>QA Status</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={data.qa} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => `${e.name}: ${e.value}`}>
                    {data.qa.map((_, i) => <Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Commissions Status</CardTitle></CardHeader>
          <CardContent>
            {data.commissions.length === 0 ? <p className="text-sm text-muted-foreground py-12 text-center">No commissions yet.</p> : (
              <div className="space-y-2">
                {data.commissions.map(c => (
                  <div key={c.status} className="flex items-center justify-between p-3 rounded-md bg-slate-50">
                    <div>
                      <span className="font-medium">{c.status}</span>
                      <span className="text-sm text-muted-foreground ml-2">({c.count} record{c.count !== 1 ? 's' : ''})</span>
                    </div>
                    <span className="font-mono font-semibold">R {c.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [view, setView] = useState('dashboard')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = localStorage.getItem('crm_token')
    const u = localStorage.getItem('crm_user')
    if (t && u) {
      api('/auth/me').then(r => setUser(r.user)).catch(() => { localStorage.clear() }).finally(() => setLoading(false))
    } else setLoading(false)
  }, [])

  const logout = () => { localStorage.clear(); setUser(null) }

  const navItems = useMemo(() => {
    if (!user) return []
    const items = [
      { key: 'dashboard', label: 'Dashboard', icon: Activity },
      { key: 'leads', label: 'Leads', icon: Users },
      { key: 'callbacks', label: 'Callbacks', icon: Phone },
    ]
    if (user.role === 'qa' || user.role === 'super') items.push({ key: 'qa', label: 'QA Queue', icon: ClipboardCheck })
    if (user.role !== 'qa') items.push({ key: 'commissions', label: 'Commissions', icon: DollarSign })
    items.push({ key: 'fitments', label: 'Fitments', icon: Wrench })
    if (user.role === 'super') items.push({ key: 'analytics', label: 'Analytics', icon: BarChart3 })
    if (user.role === 'super') items.push({ key: 'products', label: 'Products', icon: MessageSquare })
    if (user.role === 'super') items.push({ key: 'users', label: 'Users', icon: UserCog })
    items.push({ key: 'helpdesk', label: 'Help Desk', icon: LifeBuoy })
    if (user.role === 'super') items.push({ key: 'audit', label: 'Audit Log', icon: FileText })
    return items
  }, [user])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Activity className="w-6 h-6 animate-spin" /></div>
  if (!user) return <LoginScreen onLogin={setUser} />

  return (
    <div className="min-h-screen bg-amber-50/40">
      <header className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border-b-2 border-yellow-500 sticky top-0 z-40 shadow-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-yellow-500/50 flex items-center justify-center overflow-hidden">
              <img src="/logo.webp" alt="UFS" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-yellow-400 text-lg">UFS</h1>
              <p className="text-[10px] text-zinc-300 -mt-0.5 uppercase tracking-widest">Operations Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Badge variant="outline" className={`${ROLE_COLOR[user.role]} border`}>{ROLE_LABEL[user.role]}</Badge>
            <span className="text-sm font-medium text-zinc-100 hidden sm:inline">{user.name}</span>
            <Button variant="ghost" size="sm" onClick={logout} className="text-zinc-200 hover:text-yellow-400 hover:bg-zinc-800"><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map(item => (
              <button key={item.key} onClick={() => setView(item.key)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${view === item.key ? 'border-yellow-500 text-yellow-400' : 'border-transparent text-zinc-300 hover:text-yellow-400'}`}>
                <item.icon className="w-4 h-4" />{item.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {view === 'dashboard' && <Dashboard user={user} />}
        {view === 'leads' && <LeadsView user={user} />}
        {view === 'callbacks' && <CallbacksView user={user} />}
        {view === 'qa' && <QAView user={user} />}
        {view === 'commissions' && <CommissionsView user={user} />}
        {view === 'fitments' && <FitmentsView user={user} />}
        {view === 'analytics' && <AnalyticsView />}
        {view === 'products' && <ProductsView />}
        {view === 'users' && <UsersView currentUser={user} />}
        {view === 'helpdesk' && <HelpDeskView user={user} />}
        {view === 'audit' && <AuditView />}
      </main>
    </div>
  )
}

export default App
