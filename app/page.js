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
import { Shield, Users, Phone, ClipboardCheck, Activity, LogOut, Plus, Search, ChevronRight, AlertCircle, CheckCircle2, Clock, MessageSquare, Calendar, FileText, TrendingUp } from 'lucide-react'

const DISPOSITIONS = ['New','Voicemail','No Answer','Sale','Not Quoted','Not Quoted Callback','Callback Scheduled','Unable To Quote','Nothing To Insure','AI Answered','Wrong Number']
const SOURCES = ['Internal','Outbound','Referral','Walk-in']
const ROLE_LABEL = { super: 'Super User', agent: 'Call Agent', field: 'Field Agent', qa: 'QA Auditor' }
const ROLE_COLOR = { super: 'bg-red-100 text-red-700 border-red-200', agent: 'bg-orange-100 text-orange-700 border-orange-200', field: 'bg-yellow-100 text-yellow-700 border-yellow-200', qa: 'bg-blue-100 text-blue-700 border-blue-200' }
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sentinel CRM</h1>
            <p className="text-xs text-muted-foreground">SA Insurance Operations</p>
          </div>
        </div>
        <Card className="shadow-xl border-slate-200">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Access the operations platform</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
            </form>
            <Separator className="my-6" />
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">First time? Seed demo users for all 4 roles:</p>
              <Button variant="outline" className="w-full" onClick={handleSeed}>Seed Demo Users</Button>
              {seeded && (
                <div className="text-xs space-y-1 bg-slate-50 rounded-md p-3 border">
                  {seeded.map(s => (
                    <div key={s.email} className="flex justify-between gap-2 font-mono">
                      <span className="text-slate-600">{s.email}</span>
                      <span className="text-slate-900">{s.password}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-6">Append-only audit log · Role-based access · SA ID validation</p>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color = 'slate' }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-lg bg-${color}-100 flex items-center justify-center`}>
            <Icon className={`w-6 h-6 text-${color}-600`} />
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
              <Label>Schedule Callback</Label>
              <div className="flex gap-2">
                <Input type="datetime-local" value={cbDate} onChange={e => setCbDate(e.target.value)} className="flex-1" />
                <Input placeholder="Notes" value={cbNotes} onChange={e => setCbNotes(e.target.value)} className="flex-1" />
                <Button onClick={scheduleCb}><Calendar className="w-4 h-4 mr-1" /> Schedule</Button>
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

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (disposition && disposition !== 'all') params.set('disposition', disposition)
    try { const r = await api(`/leads?${params}`); setLeads(r.leads) } catch (e) { toast.error(e.message) }
  }, [q, disposition])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-2xl font-bold">Leads</h2>
        <Button onClick={() => setOpenCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Lead</Button>
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
    if (user.role === 'super') items.push({ key: 'audit', label: 'Audit Log', icon: FileText })
    return items
  }, [user])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Activity className="w-6 h-6 animate-spin" /></div>
  if (!user) return <LoginScreen onLogin={setUser} />

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight">Sentinel CRM</h1>
              <p className="text-xs text-muted-foreground -mt-0.5">SA Insurance Operations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={ROLE_COLOR[user.role]}>{ROLE_LABEL[user.role]}</Badge>
            <span className="text-sm font-medium hidden sm:inline">{user.name}</span>
            <Button variant="ghost" size="sm" onClick={logout}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map(item => (
              <button key={item.key} onClick={() => setView(item.key)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${view === item.key ? 'border-slate-900 text-slate-900' : 'border-transparent text-muted-foreground hover:text-slate-900'}`}>
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
        {view === 'audit' && <AuditView />}
      </main>
    </div>
  )
}

export default App
