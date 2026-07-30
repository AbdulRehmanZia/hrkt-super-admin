import React, { useState } from 'react';
import { Card, Typography, Button, Form, Input, Alert } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const { Title, Text } = Typography;

interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If user was redirected from a protected page, send them back there after login
  const from = (location.state as any)?.from?.pathname || '/';

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<LoginResponse>('/auth/login', {
        email: values.email,
        password: values.password,
      });
      login(data.access_token, data.user);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#F1F5F9',
        padding: 16,
      }}
    >
      <Card
        className="hrkt-card"
        style={{ width: 420, borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)' }}
        bodyStyle={{ padding: 36 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="/hrkt green-01.svg"
            alt="HRKT Logo"
            style={{ height: 48, width: 'auto', marginBottom: 20, objectFit: 'contain' }}
          />
          <Title level={3} style={{ marginBottom: 6, fontSize: 22, fontWeight: 700, color: '#111827' }}>
            HRKT Super Admin
          </Title>
          <Text type="secondary" style={{ fontSize: 13, color: '#64748B' }}>
            Sign in to access platform administration panel
          </Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 24, borderRadius: 8 }}
            closable
            onClose={() => setError(null)}
          />
        )}

        <Form name="login" onFinish={onFinish} layout="vertical" autoComplete="off">
          <Form.Item
            name="email"
            label={<Text strong style={{ color: '#334155', fontSize: 13 }}>Email Address</Text>}
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input
              id="login-email"
              prefix={<UserOutlined style={{ color: '#94A3B8' }} />}
              placeholder="Email address"
              size="large"
              style={{ borderRadius: 8, height: 42 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<Text strong style={{ color: '#334155', fontSize: 13 }}>Password</Text>}
            rules={[{ required: true, message: 'Password is required' }]}
          >
            <Input.Password
              id="login-password"
              prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
              placeholder="Password"
              size="large"
              style={{ borderRadius: 8, height: 42 }}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 28, marginBottom: 0 }}>
            <Button
              id="login-submit"
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
              style={{
                backgroundColor: '#00C27A',
                borderColor: '#00C27A',
                height: 42,
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
