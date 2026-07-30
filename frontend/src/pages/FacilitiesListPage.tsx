import React, { useEffect, useState } from 'react';
import { Typography, Table, Button, Space, Card, Input, Select } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { CreateFacilityModal, type FacilityEditTarget } from '../components/CreateFacilityModal';

const { Title, Text } = Typography;

interface FacilityRow {
  _id: string;
  name: string;
  city: string;
  courtLimit: number;
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

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return <span className="hrkt-badge hrkt-badge-green">Active</span>;
    case 'suspended':
      return <span className="hrkt-badge hrkt-badge-red">Suspended</span>;
    default:
      return <span className="hrkt-badge hrkt-badge-gray">{status}</span>;
  }
};

const getSubBadge = (plan: string, status: string) => {
  const label = `${plan.toUpperCase()} · ${status.toUpperCase()}`;
  if (status === 'trial') {
    return <span className="hrkt-badge hrkt-badge-orange">{label}</span>;
  } else if (plan === 'enterprise') {
    return <span className="hrkt-badge hrkt-badge-blue">{label}</span>;
  } else if (status === 'active') {
    return <span className="hrkt-badge hrkt-badge-green">{label}</span>;
  }
  return <span className="hrkt-badge hrkt-badge-gray">{label}</span>;
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

  const [sortBy, setSortBy] = useState<string | undefined>(undefined);

  // Modal open & edit states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FacilityEditTarget | null>(null);

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

  const sortedData = React.useMemo(() => {
    if (!sortBy) return data;
    const sorted = [...data];
    if (sortBy === 'revenue_desc') {
      return sorted.sort((a, b) => b.totalRevenue - a.totalRevenue);
    } else if (sortBy === 'revenue_asc') {
      return sorted.sort((a, b) => a.totalRevenue - b.totalRevenue);
    } else if (sortBy === 'bookings_desc') {
      return sorted.sort((a, b) => b.lifetimeBookings - a.lifetimeBookings);
    } else if (sortBy === 'name_asc') {
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [data, sortBy]);

  const columns = [
    {
      title: 'Facility Name',
      dataIndex: 'name',
      key: 'name',
      width: 190,
      render: (name: string) => <Text strong style={{ color: '#111827', whiteSpace: 'nowrap' }}>{name}</Text>,
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
      width: 130,
      render: (city: string) => <span style={{ color: '#4B5563', whiteSpace: 'nowrap' }}>{city}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => getStatusBadge(status),
    },
    {
      title: 'Courts',
      dataIndex: 'courtCount',
      key: 'courtCount',
      align: 'center' as const,
      width: 65,
      render: (val: number) => <Text strong style={{ color: '#111827' }}>{val}</Text>,
    },
    {
      title: 'Customers',
      dataIndex: 'activeCustomers',
      key: 'activeCustomers',
      align: 'center' as const,
      width: 80,
      render: (val: number) => <Text style={{ color: '#4B5563' }}>{val}</Text>,
    },
    {
      title: 'Subscription',
      key: 'subscription',
      width: 150,
      render: (_: any, record: FacilityRow) => getSubBadge(record.subscriptionPlan, record.subscriptionStatus),
    },
    {
      title: 'Revenue (PKR)',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      align: 'right' as const,
      width: 110,
      render: (val: number) => <Text strong style={{ color: '#111827' }}>{val.toLocaleString()}</Text>,
    },
    {
      title: 'Bookings',
      dataIndex: 'lifetimeBookings',
      key: 'lifetimeBookings',
      align: 'center' as const,
      width: 80,
    },
    {
      title: 'Action',
      key: 'actions',
      width: 110,
      align: 'center' as const,
      render: (_: any, record: FacilityRow) => (
        <Space size={2}>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined style={{ color: '#00C27A' }} />}
            onClick={() => navigate(`/facilities/${record._id}`)}
            style={{ color: '#00C27A', fontWeight: 500, padding: '0 4px' }}
          >
            View
          </Button>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined style={{ color: '#6B7280' }} />}
            onClick={() => {
              setEditTarget({
                _id: record._id,
                name: record.name,
                city: record.city,
                courtLimit: record.courtLimit,
              });
              setIsModalOpen(true);
            }}
            style={{ color: '#6B7280', padding: '0 4px' }}
          >
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#111827' }}>
            Facilities Directory
          </Title>
          <Text type="secondary" style={{ fontSize: 14, color: '#6B7280' }}>
            Manage onboarding, subscription status, and tenant performance
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setIsModalOpen(true)}
          style={{ backgroundColor: '#00C27A', borderColor: '#00C27A', height: 44, borderRadius: 10, fontWeight: 600 }}
        >
          Add Facility
        </Button>
      </div>

      {/* Top Filter Bar Layered Surface */}
      <Card className="hrkt-card" bodyStyle={{ padding: 16 }} style={{ marginBottom: 20, background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
        <Space wrap size="middle">
          <Input
            placeholder="Search by name or city..."
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ width: 280, borderRadius: 8, height: 40 }}
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
            style={{ width: 170, height: 40 }}
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
            style={{ width: 200, height: 40 }}
            options={[
              { value: 'active', label: 'Subscription: Active' },
              { value: 'trial', label: 'Subscription: Trial' },
              { value: 'past_due', label: 'Subscription: Past Due' },
              { value: 'cancelled', label: 'Subscription: Cancelled' },
            ]}
          />
          <Select
            placeholder="Sort by"
            value={sortBy}
            onChange={(val) => setSortBy(val)}
            allowClear
            style={{ width: 190, height: 40 }}
            options={[
              { value: 'revenue_desc', label: 'Sort: Highest Revenue' },
              { value: 'revenue_asc', label: 'Sort: Lowest Revenue' },
              { value: 'bookings_desc', label: 'Sort: Most Bookings' },
              { value: 'name_asc', label: 'Sort: Name (A-Z)' },
            ]}
          />
          {(search || statusFilter || subStatusFilter || sortBy) && (
            <Button
              icon={<ClearOutlined />}
              onClick={() => {
                setSearch('');
                setStatusFilter(undefined);
                setSubStatusFilter(undefined);
                setSortBy(undefined);
                setPage(1);
              }}
              style={{ borderRadius: 8, height: 40 }}
            >
              Clear Filters
            </Button>
          )}
        </Space>
      </Card>

      {/* Table Card */}
      <Card className="hrkt-card" bodyStyle={{ padding: 0 }} style={{ overflow: 'hidden' }}>
        <Table
          dataSource={sortedData}
          columns={columns}
          rowKey="_id"
          loading={loading}
          size="small"
          scroll={{ x: 'max-content' }}
          pagination={{
            current: page,
            total,
            pageSize: limit,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (t) => `Total ${t} facilities`,
            style: { padding: '16px 24px', margin: 0 },
          }}
        />
      </Card>

      {/* Onboard / Edit Facility Modal Component */}
      <CreateFacilityModal
        open={isModalOpen}
        facilityToEdit={editTarget}
        onClose={() => {
          setIsModalOpen(false);
          setEditTarget(null);
        }}
        onSuccess={() => {
          setIsModalOpen(false);
          setEditTarget(null);
          fetchFacilities(page, search, statusFilter, subStatusFilter);
        }}
      />
    </div>
  );
};
