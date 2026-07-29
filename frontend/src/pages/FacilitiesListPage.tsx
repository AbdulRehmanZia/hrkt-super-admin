import React, { useEffect, useState } from 'react';
import { Typography, Table, Button, Space, Card, Tag, Input, Select } from 'antd';
import { PlusOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const { Title } = Typography;

interface FacilityRow {
  _id: string;
  name: string;
  city: string;
  status: string;
  courtCount: number;
  activeCustomers: number;
  subscriptionStatus: string;
  subscriptionPlan: string;
  totalRevenue: number;
  lifetimeBookings: number;
  lastBookingDate: string | null;
  createdAt: string;
}

interface FacilitiesResponse {
  data: FacilityRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const statusColors: Record<string, string> = {
  active: 'green',
  inactive: 'default',
  suspended: 'red',
};

const subStatusColors: Record<string, string> = {
  active: 'processing',
  trial: 'warning',
  past_due: 'error',
  cancelled: 'default',
  none: 'default',
};

const formatLastBooking = (date: string | null): string => {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
};

export const FacilitiesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [data, setData] = useState<FacilityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [subStatusFilter, setSubStatusFilter] = useState<string | undefined>(undefined);

  const fetchFacilities = async (p: number, s?: string, st?: string, sub?: string) => {
    setLoading(true);
    try {
      let path = `/facilities?page=${p}&limit=${limit}`;
      if (s) path += `&search=${encodeURIComponent(s)}`;
      if (st) path += `&status=${st}`;
      if (sub) path += `&subscriptionStatus=${sub}`;
      const res = await api.get<FacilitiesResponse>(path, token!);
      setData(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      console.error('Failed to fetch facilities', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities(page, search, statusFilter, subStatusFilter);
  }, [page, search, statusFilter, subStatusFilter]);

  const columns = [
    {
      title: 'Facility Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: FacilityRow, b: FacilityRow) => a.name.localeCompare(b.name),
      ellipsis: true,
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
      width: 100,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 105,
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'} style={{ margin: 0 }}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Courts',
      dataIndex: 'courtCount',
      key: 'courtCount',
      align: 'center' as const,
      width: 75,
    },
    {
      title: 'Customers',
      dataIndex: 'activeCustomers',
      key: 'activeCustomers',
      align: 'center' as const,
      width: 95,
    },
    {
      title: 'Subscription',
      key: 'subscription',
      width: 160,
      render: (_: any, record: FacilityRow) => (
        <Tag color={subStatusColors[record.subscriptionStatus] || 'default'} style={{ margin: 0 }}>
          {record.subscriptionPlan.toUpperCase()} · {record.subscriptionStatus.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Revenue (PKR)',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      align: 'right' as const,
      width: 130,
      sorter: (a: FacilityRow, b: FacilityRow) => a.totalRevenue - b.totalRevenue,
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: 'Bookings',
      dataIndex: 'lifetimeBookings',
      key: 'lifetimeBookings',
      align: 'center' as const,
      width: 95,
      sorter: (a: FacilityRow, b: FacilityRow) => a.lifetimeBookings - b.lifetimeBookings,
    },
    {
      title: 'Last Booking',
      dataIndex: 'lastBookingDate',
      key: 'lastBookingDate',
      width: 115,
      sorter: (a: FacilityRow, b: FacilityRow) => {
        if (!a.lastBookingDate && !b.lastBookingDate) return 0;
        if (!a.lastBookingDate) return 1;
        if (!b.lastBookingDate) return -1;
        return new Date(a.lastBookingDate).getTime() - new Date(b.lastBookingDate).getTime();
      },
      render: (date: string | null) => (
        <span style={{ color: date ? '#434343' : '#bfbfbf', fontSize: 13 }}>
          {formatLastBooking(date)}
        </span>
      ),
    },
    {
      title: 'Action',
      key: 'actions',
      width: 80,
      align: 'center' as const,
      render: (_: any, record: FacilityRow) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/facilities/${record._id}`)}
          style={{ padding: 0 }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Facilities Directory
          </Title>
          <Typography.Text type="secondary">
            Manage onboarding, subscription status, and tenant performance
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large">
          Add Facility
        </Button>
      </div>

      <Card style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Space wrap size="middle">
          <Input
            placeholder="Search by name or city..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ width: 260 }}
            allowClear
          />
          <Select
            placeholder="Facility status"
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            allowClear
            style={{ width: 160 }}
            options={[
              { value: 'active', label: 'Status: Active' },
              { value: 'inactive', label: 'Status: Inactive' },
              { value: 'suspended', label: 'Status: Suspended' },
            ]}
          />
          <Select
            placeholder="Subscription status"
            value={subStatusFilter}
            onChange={(val) => {
              setSubStatusFilter(val);
              setPage(1);
            }}
            allowClear
            style={{ width: 190 }}
            options={[
              { value: 'active', label: 'Subscription: Active' },
              { value: 'trial', label: 'Subscription: Trial' },
              { value: 'past_due', label: 'Subscription: Past Due' },
              { value: 'cancelled', label: 'Subscription: Cancelled' },
            ]}
          />
        </Space>
      </Card>

      <Card bodyStyle={{ padding: 0 }} style={{ borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="_id"
          loading={loading}
          size="middle"
          pagination={{
            current: page,
            total,
            pageSize: limit,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (t) => `Total ${t} facilities`,
            style: { padding: '12px 24px', margin: 0 },
          }}
        />
      </Card>
    </div>
  );
};
