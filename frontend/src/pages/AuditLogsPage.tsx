import React, { useEffect, useState } from 'react';
import { Typography, Table, Card, Input, Select, Tag, Button, message } from 'antd';
import {
  HistoryOutlined,
  SearchOutlined,
  ClearOutlined,
  BankOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const { Title, Text } = Typography;

interface AuditLogRow {
  _id: string;
  performedBy: string;
  action: string;
  details: string;
  createdAt: string;
  facility?: {
    _id: string;
    name: string;
    city: string;
  };
}

interface AuditLogsResponse {
  data: AuditLogRow[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const getActionTag = (action: string) => {
  switch (action) {
    case 'COURT_LIMIT_CHANGE':
      return <Tag color="blue">COURT LIMIT CHANGE</Tag>;
    case 'ADMIN_CREDENTIALS_UPDATE':
      return <Tag color="purple">ADMIN CREDENTIALS RESET</Tag>;
    case 'STATUS_CHANGE':
      return <Tag color="volcano">STATUS CHANGE</Tag>;
    case 'PAYMENT_REMINDER_SENT':
      return <Tag color="gold">REMINDER SENT</Tag>;
    case 'INVOICE_MARKED_PAID':
      return <Tag color="green">INVOICE MARKED PAID</Tag>;
    default:
      return <Tag color="orange">{action}</Tag>;
  }
};

export const AuditLogsPage: React.FC = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string | undefined>(undefined);

  const fetchLogs = async (p: number, s?: string, act?: string) => {
    setLoading(true);
    try {
      let path = `/audit-logs?page=${p}&limit=10`;
      if (s) path += `&search=${encodeURIComponent(s)}`;
      if (act) path += `&action=${act}`;

      const res = await api.get<AuditLogsResponse>(path, token!);
      setLogs(res.data);
      setTotal(res.meta.total);
    } catch (err: any) {
      message.error(err?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page, search, actionFilter);
  }, [page, search, actionFilter, token]);

  const handleClearFilters = () => {
    setSearch('');
    setActionFilter(undefined);
    setPage(1);
  };

  const columns = [
    {
      title: 'Facility Name',
      key: 'facility',
      width: 200,
      render: (_: any, r: AuditLogRow) => (
        <div>
          <Text strong style={{ fontSize: 14, color: '#111827' }}>
            {r.facility?.name || 'System / Platform'}
          </Text>
          {r.facility?.city && (
            <div style={{ fontSize: 12, color: '#6B7280' }}>
              <BankOutlined style={{ marginRight: 4 }} /> {r.facility.city}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Action Type',
      dataIndex: 'action',
      key: 'action',
      width: 190,
      render: (act: string) => getActionTag(act),
    },
    {
      title: 'Details',
      dataIndex: 'details',
      key: 'details',
      render: (details: string) => <Text style={{ color: '#374151' }}>{details}</Text>,
    },
    {
      title: 'Performed By',
      dataIndex: 'performedBy',
      key: 'performedBy',
      width: 180,
      render: (by: string) => (
        <span style={{ fontSize: 13, color: '#4B5563' }}>
          <UserOutlined style={{ marginRight: 4, color: '#9CA3AF' }} /> {by}
        </span>
      ),
    },
    {
      title: 'Timestamp',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (dt: string) => (
        <Text style={{ color: '#6B7280', fontSize: 13 }}>
          {new Date(dt).toLocaleString('en-PK', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <HistoryOutlined style={{ fontSize: 24, color: '#00C27A' }} />
          <Title level={2} style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#111827' }}>
            System Audit Log Trail
          </Title>
        </div>
        <Text type="secondary" style={{ fontSize: 14, color: '#6B7280' }}>
          Immutable records of operator actions, court limit changes, credential resets, and billing reminders
        </Text>
      </div>

      <Card className="hrkt-card" bodyStyle={{ padding: 0 }} style={{ overflow: 'hidden' }}>
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <Input
            placeholder="Search by facility, operator email, or details..."
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ width: 340, borderRadius: 8, height: 40 }}
            allowClear
          />

          <Select
            placeholder="Filter by action type"
            value={actionFilter}
            onChange={(val) => {
              setActionFilter(val);
              setPage(1);
            }}
            allowClear
            style={{ width: 250, height: 40 }}
            options={[
              { value: 'COURT_LIMIT_CHANGE', label: 'Court Limit Change' },
              { value: 'ADMIN_CREDENTIALS_UPDATE', label: 'Admin Credentials Reset' },
              { value: 'STATUS_CHANGE', label: 'Facility Status Toggle' },
              { value: 'PAYMENT_REMINDER_SENT', label: 'Payment Reminder Sent' },
              { value: 'INVOICE_MARKED_PAID', label: 'Invoice Marked Paid' },
            ]}
          />

          {(search || actionFilter) && (
            <Button
              icon={<ClearOutlined />}
              onClick={handleClearFilters}
              style={{ borderRadius: 8, height: 40 }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        <Table
          dataSource={logs}
          columns={columns}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 900 }}
          pagination={{
            current: page,
            total,
            pageSize: 10,
            onChange: (p) => setPage(p),
            showTotal: (t) => `Total ${t} audit log records`,
            style: { padding: '16px 24px', margin: 0 },
          }}
        />
      </Card>
    </div>
  );
};
