import {
  Badge,
  Button,
  Card,
  Group,
  LoadingOverlay,
  Radio,
  Stack,
  Text,
  Textarea,
  Title
} from '@mantine/core';
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, zodResolver } from '@mantine/form';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../api/axios.js';
import { endpoints } from '../../api/endpoints.js';
import { notifications } from '@mantine/notifications';

const statusLabelMap = {
  Assigned: '待审中',
  Pending: '待审中',
  Overdue: '已逾期',
  Completed: '已完成'
};

const statusColorMap = {
  Assigned: 'orange',
  Pending: 'orange',
  Overdue: 'red',
  Completed: 'green'
};

const formatDate = (value, format = 'YYYY-MM-DD HH:mm') =>
  value ? dayjs(value).format(format) : '—';

const schema = z.object({
  conclusion: z.enum(['Accept', 'Minor Revision', 'Major Revision', 'Reject'], {
    required_error: '请选择结论'
  }),
  positive_comments: z
    .string()
    .min(20, '不少于20字')
    .max(1000, '不超过1000字'),
  negative_comments: z
    .string()
    .min(20, '不少于20字')
    .max(1000, '不超过1000字'),
  modification_advice: z
    .string()
    .min(20, '不少于20字')
    .max(1000, '不超过1000字')
});

export default function ExpertReviewDetailPage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: assignments, isLoading, isFetching } = useQuery({
    queryKey: ['reviews', 'assignments'],
    queryFn: async () => {
      const response = await api.get(endpoints.reviews.assignments);
      return response.data ?? [];
    },
    placeholderData: () => queryClient.getQueryData(['reviews', 'assignments']) || []
  });

  const assignment = (assignments || []).find(
    (item) => String(item.assignment_id) === String(assignmentId)
  );

  const form = useForm({
    initialValues: {
      conclusion: 'Accept',
      positive_comments: '',
      negative_comments: '',
      modification_advice: ''
    },
    validate: zodResolver(schema)
  });

  useEffect(() => {
    if (assignment) {
      form.setValues({
        conclusion: assignment.conclusion || 'Accept',
        positive_comments: assignment.positive_comments || '',
        negative_comments: assignment.negative_comments || '',
        modification_advice: assignment.modification_advice || ''
      });
    }
  }, [assignment, form]);

  const mutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        ...values
      };
      const response = await api.put(endpoints.reviews.assignment(assignmentId), payload);
      return response.data;
    },
    onSuccess: () => {
      notifications.show({
        title: '审稿意见提交成功',
        message: '感谢您的审稿',
        color: 'green'
      });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'assignments'] });
      navigate('/expert/reviews');
    },
    onError: (error) => {
      const fieldErrors = error.response?.data?.errors;
      if (fieldErrors) {
        form.setErrors(fieldErrors);
      }
    }
  });

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>审稿任务详情</Title>
        <Button variant="light" onClick={() => navigate(-1)}>
          返回列表
        </Button>
      </Group>

      <Card withBorder shadow="sm" radius="md">
        <LoadingOverlay visible={isLoading || isFetching} overlayProps={{ blur: 2 }} />
        {!assignment && !(isLoading || isFetching) ? (
          <Text>未找到对应的审稿任务。</Text>
        ) : (
          <Stack gap="sm">
            <Group gap="xs" wrap="wrap">
              {assignment?.paper_id && <Badge color="blue">论文ID：{assignment.paper_id}</Badge>}
              <Badge color={statusColorMap[assignment?.status] || 'orange'}>
                状态：{statusLabelMap[assignment?.status] || '待审中'}
              </Badge>
              {assignment?.conclusion && (
                <Badge color="green">结论：{assignment.conclusion}</Badge>
              )}
            </Group>
            <Stack gap={4}>
              <Text fw={600}>中文标题</Text>
              <Text>{assignment?.title_zh || '—'}</Text>
            </Stack>
            <Stack gap={4}>
              <Text fw={600}>英文标题</Text>
              <Text>{assignment?.title_en || '—'}</Text>
            </Stack>
            <Group gap="xl" align="flex-start" wrap="wrap">
              <Stack gap={4} w={180}>
                <Text c="dimmed">指派时间</Text>
                <Text>{formatDate(assignment?.assigned_date)}</Text>
              </Stack>
              <Stack gap={4} w={180}>
                <Text c="dimmed">截止时间</Text>
                <Text>{formatDate(assignment?.assigned_due_date)}</Text>
              </Stack>
              <Stack gap={4} w={200}>
                <Text c="dimmed">提交时间</Text>
                <Text>{formatDate(assignment?.submission_date)}</Text>
              </Stack>
            </Group>
            <Group gap="xl" align="flex-start" wrap="wrap">
              <Stack gap={4} w={160}>
                <Text c="dimmed">专家ID</Text>
                <Text>{assignment?.expert_id ?? '—'}</Text>
              </Stack>
              <Stack gap={4} w={160}>
                <Text c="dimmed">编辑ID</Text>
                <Text>{assignment?.editor_id ?? '—'}</Text>
              </Stack>
            </Group>
            <Text fw={600}>稿件附件</Text>
            {assignment?.attachment_url ? (
              <Button component="a" href={assignment.attachment_url} target="_blank">
                下载稿件
              </Button>
            ) : (
              <Text>暂无附件</Text>
            )}
          </Stack>
        )}
      </Card>

      <Card withBorder shadow="sm" radius="md">
        <Title order={4} mb="md">
          提交审稿意见
        </Title>
        {!assignment && !(isLoading || isFetching) && (
          <Text c="red" mb="sm">
            当前未找到对应任务，暂无法提交审稿意见。
          </Text>
        )}
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack
            gap="md"
            style={
              !assignment
                ? { pointerEvents: 'none', opacity: 0.5 }
                : undefined
            }
          >
            <Radio.Group
              label="审稿结论"
              required
              {...form.getInputProps('conclusion')}
            >
              <Group>
                <Radio value="Accept" label="接受" />
                <Radio value="Minor Revision" label="小修" />
                <Radio value="Major Revision" label="大修" />
                <Radio value="Reject" label="拒稿" />
              </Group>
            </Radio.Group>
            <Textarea
              label="积极意见"
              minRows={4}
              required
              {...form.getInputProps('positive_comments')}
            />
            <Textarea
              label="不足之处"
              minRows={4}
              required
              {...form.getInputProps('negative_comments')}
            />
            <Textarea
              label="修改建议"
              minRows={4}
              required
              {...form.getInputProps('modification_advice')}
            />
            <Group justify="flex-end">
              <Button type="submit" loading={mutation.isPending} disabled={!assignment}>
                提交意见
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}
