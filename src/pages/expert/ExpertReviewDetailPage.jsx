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
  Title,
  Table,
} from "@mantine/core";
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, zodResolver } from "@mantine/form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import api from "../../api/axios.js";
import { endpoints } from "../../api/endpoints.js";
import { notifications } from "@mantine/notifications";

const statusLabelMap = {
  Assigned: "待审中",
  Pending: "待审中",
  Overdue: "已逾期",
  Completed: "已完成",
};

const statusColorMap = {
  Assigned: "orange",
  Pending: "orange",
  Overdue: "red",
  Completed: "green",
};

const formatDate = (value, format = "YYYY-MM-DD HH:mm") =>
  value ? dayjs(value).format(format) : "—";

const schema = z.object({
  conclusion: z.enum(["Accept", "Minor Revision", "Major Revision", "Reject"], {
    required_error: "请选择结论",
  }),
  positive_comments: z.string().min(20, "不少于20字").max(1000, "不超过1000字"),
  negative_comments: z.string().min(20, "不少于20字").max(1000, "不超过1000字"),
  modification_advice: z
    .string()
    .min(20, "不少于20字")
    .max(1000, "不超过1000字"),
});

export default function ExpertReviewDetailPage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: assignments,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["reviews", "assignments"],
    queryFn: async () => {
      const response = await api.get(endpoints.reviews.assignments);
      return response.data ?? [];
    },
    placeholderData: () =>
      queryClient.getQueryData(["reviews", "assignments"]) || [],
  });

  const assignment = (assignments || []).find(
    (item) => String(item.assignment_id) === String(assignmentId)
  );

  // 论文详情：用于展示更完整的信息与时间
  const paperId = assignment?.paper_id;
  const { data: paper } = useQuery({
    queryKey: ["paper", paperId],
    enabled: Boolean(paperId),
    queryFn: async () => {
      const response = await api.get(endpoints.papers.detail(paperId));
      return response.data;
    },
  });

  const form = useForm({
    initialValues: {
      conclusion: "Accept",
      positive_comments: "",
      negative_comments: "",
      modification_advice: "",
    },
    validate: zodResolver(schema),
  });

  useEffect(() => {
    if (assignment) {
      form.setValues({
        conclusion: assignment.conclusion || "Accept",
        positive_comments: assignment.positive_comments || "",
        negative_comments: assignment.negative_comments || "",
        modification_advice: assignment.modification_advice || "",
      });
    }
  }, [assignment, form]);

  const mutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        ...values,
      };
      const response = await api.put(
        endpoints.reviews.assignment(assignmentId),
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      notifications.show({
        title: "审稿意见提交成功",
        message: "感谢您的审稿",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["reviews", "assignments"] });
      navigate("/expert/reviews");
    },
    onError: (error) => {
      const fieldErrors = error.response?.data?.errors;
      if (fieldErrors) {
        form.setErrors(fieldErrors);
      }
    },
  });

  const conclusionLabelMap = {
    Accept: "接受",
    "Minor Revision": "小修",
    "Major Revision": "大修",
    "Not Reviewed": "待审",
    Reject: "拒稿",
  };

  const normalizeKeywords = (list) => {
    if (!Array.isArray(list)) return [];
    return list
      .map((item) => (Array.isArray(item) ? item[1] : item))
      .filter(Boolean);
  };

  const handleDownload = async () => {
    if (!paperId) return;
    const parseFilename = (disposition) => {
      if (!disposition) return null;
      const star = /filename\*=(?:UTF-8''|)([^;\n]+)/i.exec(disposition);
      if (star && star[1]) {
        try {
          return decodeURIComponent(star[1].replace(/\"/g, "").trim());
        } catch (_) {
          return star[1].replace(/\"/g, "").trim();
        }
      }
      const normal = /filename=("?)([^";\n]+)\1/i.exec(disposition);
      if (normal && normal[2]) return normal[2].trim();
      return null;
    };
    const extFromMime = (mime) => {
      const m = (mime || "").toLowerCase();
      if (m.includes("pdf")) return "pdf";
      if (m.includes("msword")) return "doc";
      if (m.includes("officedocument.wordprocessingml.document")) return "docx";
      if (m.includes("zip")) return "zip";
      if (m.includes("rar")) return "rar";
      if (m.includes("7z")) return "7z";
      if (m.includes("jpeg")) return "jpg";
      if (m.includes("jpg")) return "jpg";
      if (m.includes("png")) return "png";
      if (m.includes("gif")) return "gif";
      if (m.includes("plain")) return "txt";
      return "bin";
    };

    try {
      const resp = await api.get(endpoints.papers.download(paperId), {
        responseType: "blob",
      });
      const disposition =
        resp.headers["content-disposition"] ||
        resp.headers["Content-Disposition"];
      const blob = resp.data;
      const mime =
        blob?.type ||
        resp.headers["content-type"] ||
        resp.headers["Content-Type"] ||
        "";

      let filename = parseFilename(disposition) || `paper-${paperId}`;
      if (!/\.[a-z0-9]+$/i.test(filename)) {
        const ext = extFromMime(mime);
        filename = `${filename}.${ext}`;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      notifications.show({
        title: "下载失败",
        message: error.friendlyMessage || "文件下载失败",
        color: "red",
      });
    }
  };

  const translatedConclusion =
    conclusionLabelMap[assignment?.conclusion] || "待审";

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>审稿任务详情</Title>
        <Button variant="light" onClick={() => navigate(-1)}>
          返回列表
        </Button>
      </Group>

      <Card withBorder shadow="sm" radius="md">
        <LoadingOverlay
          visible={isLoading || isFetching}
          overlayProps={{ blur: 2 }}
        />
        {!assignment && !(isLoading || isFetching) ? (
          <Text>未找到对应的审稿任务。</Text>
        ) : (
          <Stack gap="sm">
            <Group gap="xs" wrap="wrap">
              {assignment?.paper_id && (
                <Badge color="blue">论文ID：{assignment.paper_id}</Badge>
              )}
              <Badge color="green">结论：{translatedConclusion}</Badge>
            </Group>
            <Stack gap={4}>
              <Text fw={600}>中文标题</Text>
              <Text>{assignment?.title_zh || paper?.title_zh || "—"}</Text>
            </Stack>
            <Stack gap={4}>
              <Text fw={600}>英文标题</Text>
              <Text>{assignment?.title_en || paper?.title_en || "—"}</Text>
            </Stack>
            <Group gap="xl" align="flex-start" wrap="wrap">
              <Stack gap={4} w={200}>
                <Text c="dimmed">投稿时间</Text>
                <Text>{formatDate(paper?.submission_date)}</Text>
              </Stack>
              <Stack gap={4} w={200}>
                <Text c="dimmed">初审时间</Text>
                <Text>{formatDate(paper?.check_time)}</Text>
              </Stack>
              <Stack gap={4} w={200}>
                <Text c="dimmed">指派时间</Text>
                <Text>{formatDate(assignment?.assigned_date)}</Text>
              </Stack>
              <Stack gap={4} w={200}>
                <Text c="dimmed">截止时间</Text>
                <Text>{formatDate(assignment?.assigned_due_date)}</Text>
              </Stack>
            </Group>

            <Stack gap={4}>
              <Text fw={600}>中文摘要</Text>
              <Text>{paper?.abstract_zh || "—"}</Text>
            </Stack>
            <Stack gap={4}>
              <Text fw={600}>英文摘要</Text>
              <Text>{paper?.abstract_en || "—"}</Text>
            </Stack>

            <Group gap="xl" align="flex-start" wrap="wrap">
              <Stack gap={4} w={280}>
                <Text fw={600}>中文关键词</Text>
                <Group gap="xs">
                  {normalizeKeywords(paper?.keywords_zh).map((kw, idx) => (
                    <Badge key={`zh-${idx}`} color="blue" variant="light">
                      {kw}
                    </Badge>
                  ))}
                  {normalizeKeywords(paper?.keywords_zh).length === 0 && (
                    <Text c="dimmed">—</Text>
                  )}
                </Group>
              </Stack>
              <Stack gap={4} w={280}>
                <Text fw={600}>英文关键词</Text>
                <Group gap="xs">
                  {normalizeKeywords(paper?.keywords_en).map((kw, idx) => (
                    <Badge key={`en-${idx}`} color="grape" variant="light">
                      {kw}
                    </Badge>
                  ))}
                  {normalizeKeywords(paper?.keywords_en).length === 0 && (
                    <Text c="dimmed">—</Text>
                  )}
                </Group>
              </Stack>
            </Group>

            <Text fw={600}>资助资金</Text>
            {Array.isArray(paper?.funds) && paper.funds.length > 0 ? (
              <Table striped withBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>项目名称</Table.Th>
                    <Table.Th>项目编号</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {paper.funds.map((fund) => (
                    <Table.Tr
                      key={
                        fund.fund_id ||
                        `${fund.project_name}-${fund.project_number}`
                      }
                    >
                      <Table.Td>{fund.project_name || "—"}</Table.Td>
                      <Table.Td>{fund.project_number || "—"}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Text>—</Text>
            )}

            <Group gap="xl" align="flex-start" wrap="wrap">
              <Stack gap={4} w={160}>
                <Text c="dimmed">专家ID</Text>
                <Text>{assignment?.expert_id ?? "—"}</Text>
              </Stack>
              <Stack gap={4} w={160}>
                <Text c="dimmed">编辑ID</Text>
                <Text>{assignment?.editor_id ?? "—"}</Text>
              </Stack>
            </Group>

            <Text fw={600}>作者列表</Text>
            <Stack gap={4}>
              {(paper?.authors || []).map((author) => (
                <Text key={`${author.author_id}-${author.institution_id}`}>
                  {author.name} - {author.institution_name}
                </Text>
              ))}
              {(paper?.authors || []).length === 0 && <Text c="dimmed">—</Text>}
            </Stack>

            <Text fw={600}>附件</Text>
            <Button onClick={handleDownload}>下载附件</Button>
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
              !assignment ? { pointerEvents: "none", opacity: 0.5 } : undefined
            }
          >
            <Radio.Group
              label="审稿结论"
              required
              {...form.getInputProps("conclusion")}
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
              {...form.getInputProps("positive_comments")}
            />
            <Textarea
              label="不足之处"
              minRows={4}
              required
              {...form.getInputProps("negative_comments")}
            />
            <Textarea
              label="修改建议"
              minRows={4}
              required
              {...form.getInputProps("modification_advice")}
            />
            <Group justify="flex-end">
              <Button
                type="submit"
                loading={mutation.isPending}
                disabled={!assignment}
              >
                提交意见
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}
