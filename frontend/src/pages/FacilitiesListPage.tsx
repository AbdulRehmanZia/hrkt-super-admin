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
  totalBookings: number;
  createdAt: string;
}

interface FacilitiesResponse {
  data: FacilityRow[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const statusColors: Record<string, string> = {
  active: 'green',
  inactive: 'default',
  suspended: 'red',
};

const subStatusColors: Record<string, string> = {
  active: 'blue',
  trial: 'orange',
  past_due: 'red',
  cancelled: 'default',
  none: 'default',
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

  const fetchFacilities = async (p: number, s?: string, st?: string) => {
    setLoading(true);
    try {
      let path = `/facilities?page=${p}&limit=${limit}`;
      if (s) path += `&search=${encodeURIComponent(s)}`;
      if (st) path += `&status=${st}`;
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
    fetchFacilities(page, search, statusFilter);
  }, [page, search, statusFilter]);

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: FacilityRow, b: FacilityRow) => a.name.localeCompare(b.name),
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Courts',
      dataIndex: 'courtCount',
      key: 'courtCount',
      align: 'center' as const,
    },
    {
      title: 'Customers',
      dataIndex: 'activeCustomers',
      key: 'activeCustomers',
      align: 'center' as const,
    },
    {
      title: 'Subscription',
      key: 'subscription',
      render: (_: any, record: FacilityRow) => (
        <Tag color={subStatusColors[record.subscriptionStatus] || 'default'}>
          {record.subscriptionPlan.toUpperCase()} — {record.subscriptionStatus.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Revenue (PKR)',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      align: 'right' as const,
      sorter: (a: FacilityRow, b: FacilityRow) => a.totalRevenue - b.totalRevenue,
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: 'Bookings',
      dataIndex: 'totalBookings',
      key: 'totalBookings',
      align: 'center' as const,
      sorter: (a: FacilityRow, b: FacilityRow) => a.totalBookings - b.totalBookings,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: FacilityRow) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/facilities/${record._id}`)}
          >
            View
          </Button>
        </Space>
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
        <Title level={2} style={{ margin: 0 }}>
          Facilities
        </Title>
        <Button type="primary" icon={<PlusOutlined />}>
          Add Facility
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="Search by name or city"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ width: 280 }}
            allowClear
          />
          <Select
            placeholder="Filter by status"
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            allowClear
            style={{ width: 180 }}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'suspended', label: 'Suspended' },
            ]}
          />
        </Space>
      </Card>

      <Card>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: page,
            total,
            pageSize: limit,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (t) => `${t} facilities`,
          }}
        />
      </Card>
    </div>
  );
};
