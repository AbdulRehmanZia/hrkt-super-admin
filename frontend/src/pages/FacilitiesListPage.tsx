import React from 'react';
import { Typography, Table, Button, Space, Card } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

export const FacilitiesListPage: React.FC = () => {
  const navigate = useNavigate();

  // TODO: Replace with data fetched from NestJS backend endpoint GET /facilities
  const mockData: any[] = [];

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/facilities/${record.id}`)}
          >
            View Details
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

      <Card>
        <Table
          dataSource={mockData}
          columns={columns}
          rowKey="id"
          locale={{ emptyText: 'No facilities found. Create one to get started!' }}
        />
      </Card>
    </div>
  );
};
