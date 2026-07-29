import React from 'react';
import { Typography, Card, Button, Descriptions, Tag } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';

const { Title } = Typography;

export const FacilityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // TODO: Replace with data fetched from NestJS backend endpoint GET /facilities/:id
  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/facilities')}
        style={{ marginBottom: 16 }}
      >
        Back to Facilities
      </Button>

      <Title level={2}>Facility Detail</Title>

      <Card title={`Facility ID: ${id || 'N/A'}`}>
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Facility Name">Placeholder Facility</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color="green">Active</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Multi-tenant Isolation Key (facilityId)">
            <code>{id || 'N/A'}</code>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};
