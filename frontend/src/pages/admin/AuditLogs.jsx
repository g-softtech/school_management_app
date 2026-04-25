import { useState, useEffect, useCallback } from 'react';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import api from '../../services/api';
import { formatDateTime } from '../../utils/helpers';

const METHOD_COLORS = { POST: 'success', PATCH: 'warning', PUT: 'warning', DELETE: 'danger', GET: 'info' };

export default function AdminAuditLogs() {
  const [logs, setLogs]         = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [method, setMethod]     = useState('');
  const [role, setRole]         = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit-logs', { params: { page, limit: 15, method: method || undefined, userRole: role || undefined } });
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } catch {}
    finally { setLoading(false); }
  }, [page, method, role]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const columns = [
    { key: 'userId',   label: 'User', render: (v) => v?.name || <span className="text-secondary-400 text-xs">System</span> },
    { key: 'userRole', label: 'Role', render: (v) => v ? <Badge variant="info">{v}</Badge> : '—' },
    { key: 'method',   label: 'Method', render: (v) => <Badge variant={METHOD_COLORS[v] || 'gray'}>{v}</Badge> },
    { key: 'resource', label: 'Resource', render: (v) => <span className="font-mono text-xs text-secondary-600 truncate max-w-48 block">{v}</span> },
    { key: 'statusCode', label: 'Status', render: (v) => <Badge variant={v < 300 ? 'success' : v < 400 ? 'warning' : 'danger'}>{v}</Badge> },
    { key: 'ip',       label: 'IP', render: (v) => <span className="font-mono text-xs">{v}</span> },
    { key: 'createdAt', label: 'Time', render: (v) => <span className="text-xs text-secondary-500">{formatDateTime(v)}</span> },
  ];

  return (
    <div className="space-y-5">
      <div><h1 className="page-title">Audit Logs</h1><p className="page-subtitle">System activity trail</p></div>

      <div className="card p-4 flex flex-wrap gap-3">
        <div>
          <label className="input-label text-xs">Method</label>
          <select className="input-field py-1.5 text-sm w-28" value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {['POST','PATCH','PUT','DELETE','GET'].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="input-label text-xs">Role</label>
          <select className="input-field py-1.5 text-sm w-28" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {['admin','teacher','student','parent'].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <Table columns={columns} data={logs} loading={loading} emptyMessage="No logs found" />
      <Pagination {...pagination} onPage={setPage} />
    </div>
  );
}