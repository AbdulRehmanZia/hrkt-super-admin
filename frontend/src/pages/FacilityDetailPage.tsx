import React from 'react';
import { Typography, Card, Button, Tag, Result } from 'antd';
import { ArrowLeftOutlined, LoadingOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';

const { Title } = Typography;

export const FacilityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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

      <Card>
        <Result
          icon={<LoadingOutlined style={{ fontSize: 48, color: '#1677ff' }} />}
          title="Detail view coming soon"
          subTitle="Full facility analytics, booking history, customers, and controls will be wired up in the next step."
          extra={
            <Button type="primary" onClick={() => navigate('/facilities')}>
              Back to List
            </Button>
          }
        />
      </Card>
    </div>
  );
};
