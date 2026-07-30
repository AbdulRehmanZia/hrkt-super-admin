import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Alert,
  Typography,
  Divider,
  Button,
  message,
} from 'antd';
import {
  BankOutlined,
  UserOutlined,
  MailOutlined,
  CopyOutlined,
  CheckCircleFilled,
  EditOutlined,
} from '@ant-design/icons';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const { Text, Paragraph } = Typography;

export interface FacilityEditTarget {
  _id: string;
  name: string;
  city: string;
  courtLimit: number;
}

interface CreateFacilityModalProps {
  open: boolean;
  facilityToEdit?: FacilityEditTarget | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface CreateFacilityResponse {
  facility: {
    _id: string;
    name: string;
    city: string;
  };
  admin: {
    id: string;
    name: string;
    email: string;
    tempPassword: string;
  };
}

export const CreateFacilityModal: React.FC<CreateFacilityModalProps> = ({
  open,
  facilityToEdit,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!facilityToEdit;

  useEffect(() => {
    if (open) {
      if (facilityToEdit) {
        form.setFieldsValue({
          name: facilityToEdit.name,
          city: facilityToEdit.city,
          courtLimit: facilityToEdit.courtLimit,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, facilityToEdit, form]);

  // One-time credentials dialog state after successful creation
  const [createdData, setCreatedData] = useState<CreateFacilityResponse | null>(null);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      setError(null);

      if (isEditMode && facilityToEdit) {
        // Reused Form for Editing (Spec Section 4.3)
        await api.patch(`/facilities/${facilityToEdit._id}`, values, token!);
        message.success('Facility details updated successfully!');
        form.resetFields();
        onSuccess();
        onClose();
      } else {
        // Creation Mode
        const res = await api.post<CreateFacilityResponse>('/facilities', values, token!);
        setCreatedData(res);
        form.resetFields();
        onSuccess();
      }
    } catch (err: any) {
      if (err?.message) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    form.resetFields();
    setError(null);
    onClose();
  };

  const handleCopyCredentials = () => {
    if (!createdData) return;
    const text = `Facility: ${createdData.facility.name}\nAdmin Email: ${createdData.admin.email}\nTemporary Password: ${createdData.admin.tempPassword}`;
    navigator.clipboard.writeText(text);
    message.success('Credentials copied to clipboard!');
  };

  return (
    <>
      {/* Creation / Edit Form Modal (Spec 4.3 Reused Form) */}
      <Modal
        open={open && !createdData}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isEditMode ? (
              <EditOutlined style={{ color: '#1677ff', fontSize: 20 }} />
            ) : (
              <BankOutlined style={{ color: '#1677ff', fontSize: 20 }} />
            )}
            <span>{isEditMode ? 'Edit Facility Details' : 'Onboard New Facility'}</span>
          </div>
        }
        onCancel={handleModalClose}
        onOk={handleSubmit}
        confirmLoading={loading}
        okText={isEditMode ? 'Save Changes' : 'Create Facility'}
        width={540}
        destroyOnClose
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          {isEditMode
            ? 'Update general facility parameters (Name, City, Court Limit).'
            : 'Set up facility details and generate the first admin manager credentials in a single step.'}
        </Text>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form form={form} layout="vertical" initialValues={{ courtLimit: 4, subscriptionPlan: 'pro' }}>
          <Divider titlePlacement="left" style={{ margin: '8px 0 16px', fontSize: 13, color: '#8c8c8c' }}>
            FACILITY INFORMATION
          </Divider>

          <Form.Item
            name="name"
            label="Facility Name"
            rules={[{ required: true, message: 'Please enter facility name' }]}
          >
            <Input placeholder="e.g. Smash Padel Club" prefix={<BankOutlined style={{ color: '#bfbfbf' }} />} />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: isEditMode ? '1fr 1fr' : '1fr 1fr 1.2fr', gap: 12 }}>
            <Form.Item
              name="city"
              label="City"
              rules={[{ required: true, message: 'Please enter city' }]}
            >
              <Input placeholder="e.g. Karachi" />
            </Form.Item>

            <Form.Item
              name="courtLimit"
              label="Court Limit"
              rules={[{ required: true, message: 'Enter court limit' }]}
            >
              <InputNumber min={1} max={50} style={{ width: '100%' }} />
            </Form.Item>

            {!isEditMode && (
              <Form.Item
                name="subscriptionPlan"
                label="Subscription Plan"
                rules={[{ required: true, message: 'Select subscription plan' }]}
              >
                <Select
                  options={[
                    { value: 'starter', label: 'Starter (10k PKR/mo)' },
                    { value: 'pro', label: 'Pro (15k PKR/mo)' },
                    { value: 'enterprise', label: 'Enterprise (25k PKR/mo)' },
                  ]}
                />
              </Form.Item>
            )}
          </div>

          {!isEditMode && (
            <>
              <Divider titlePlacement="left" style={{ margin: '16px 0', fontSize: 13, color: '#8c8c8c' }}>
                FIRST ADMIN ACCOUNT
              </Divider>

              <Form.Item
                name="adminName"
                label="Manager Full Name"
                rules={[{ required: true, message: 'Please enter manager name' }]}
              >
                <Input placeholder="e.g. Tariq Khan" prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} />
              </Form.Item>

              <Form.Item
                name="adminEmail"
                label="Manager Email Address"
                rules={[
                  { required: true, message: 'Please enter manager email' },
                  { type: 'email', message: 'Enter a valid email address' },
                ]}
              >
                <Input placeholder="e.g. tariq@smashpadel.pk" prefix={<MailOutlined style={{ color: '#bfbfbf' }} />} />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* One-Time Temporary Password Display Modal */}
      <Modal
        open={!!createdData}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#52c41a' }}>
            <CheckCircleFilled style={{ fontSize: 22 }} />
            <span style={{ color: '#1f1f1f' }}>Facility Successfully Created</span>
          </div>
        }
        onCancel={() => setCreatedData(null)}
        footer={[
          <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={handleCopyCredentials}>
            Copy Credentials
          </Button>,
          <Button key="close" onClick={() => setCreatedData(null)}>
            Done
          </Button>,
        ]}
        width={480}
      >
        <Paragraph>
          The facility <strong>{createdData?.facility.name}</strong> is now active with a 30-day trial subscription.
        </Paragraph>

        <Alert
          type="info"
          showIcon
          message="One-Time Admin Credentials"
          description={
            <div style={{ marginTop: 8, fontSize: 13 }}>
              <div><strong>Email:</strong> {createdData?.admin.email}</div>
              <div style={{ marginTop: 4 }}>
                <strong>Temporary Password: </strong>
                <code style={{ background: '#e6f4ff', padding: '2px 8px', borderRadius: 4, color: '#0958d9', fontWeight: 600 }}>
                  {createdData?.admin.tempPassword}
                </code>
              </div>
            </div>
          }
          style={{ marginTop: 12 }}
        />
      </Modal>
    </>
  );
};
