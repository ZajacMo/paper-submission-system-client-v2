const stageDefinitions = [
  {
    key: 'submission',
    label: '收稿',
    statusFields: ['submission_status', 'submission_stage'],
    timeFields: ['submission_time'],
    alwaysShow: true
  },
  {
    key: 'initial_review',
    label: '初审',
    statusFields: ['initial_review_status', 'initial_review_stage'],
    timeFields: ['initial_review_time'],
    alwaysShow: true
  },
  {
    key: 'expert_assignment',
    label: '指派专家',
    statusFields: ['expert_assignment_status'],
    timeFields: ['expert_assignment_time']
  },
  {
    key: 'review',
    label: '外审',
    statusFields: ['review_status', 'review_stage'],
    timeFields: ['review_time'],
    alwaysShow: true
  },
  {
    key: 'revision',
    label: '作者修改',
    statusFields: ['revision_status', 'revision_stage'],
    timeFields: ['revision_time'],
    alwaysShow: true
  },
  {
    key: 're_review',
    label: '复审',
    statusFields: ['re_review_status', 're_review_stage'],
    timeFields: ['re_review_time'],
    alwaysShow: true
  },
  {
    key: 'editing',
    label: '编辑处理',
    statusFields: ['editing_status'],
    timeFields: ['editing_time']
  },
  {
    key: 'quality_check',
    label: '质量检查',
    statusFields: ['quality_check_status'],
    timeFields: ['quality_check_time']
  },
  {
    key: 'acceptance',
    label: '录用',
    statusFields: ['acceptance_status', 'acceptance_stage'],
    timeFields: ['acceptance_time'],
    alwaysShow: true
  },
  {
    key: 'payment',
    label: '支付版面费',
    statusFields: ['payment_status', 'payment_stage'],
    timeFields: ['payment_time'],
    alwaysShow: true
  },
  {
    key: 'schedule',
    label: '排期',
    statusFields: ['schedule_status', 'schedule_stage'],
    timeFields: ['schedule_time'],
    alwaysShow: true
  },
  {
    key: 'publication',
    label: '出版',
    statusFields: ['publication_status', 'publication_stage'],
    timeFields: ['publication_time']
  }
];

const statusTextMap = {
  processing: '处理中',
  finished: '已完成'
};

const statusColorMap = {
  processing: 'blue',
  finished: 'green'
};

function toDate(value) {
  if (!value) {
    return null;
  }
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const result = new Date(normalized);
  return Number.isNaN(result.getTime()) ? null : result;
}

function resolveStatus(progress, key) {
  return progress?.[`${key}_status`] || progress?.[`${key}_stage`] || 'processing';
}

function resolveTime(progress, key) {
  return progress?.[`${key}_time`] || null;
}

function pickField(progress, fields = []) {
  if (!fields || fields.length === 0) {
    return undefined;
  }
  for (const field of fields) {
    const value = progress?.[field];
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
}

function shouldIncludeStage(progress, stage) {
  if (stage.alwaysShow) {
    return true;
  }
  return Boolean(
    pickField(progress, stage.statusFields) !== undefined ||
      pickField(progress, stage.timeFields) !== undefined
  );
}

export function mapProgressToStages(progress = {}) {
  return stageDefinitions
    .map((stage) => {
      const status =
        pickField(progress, stage.statusFields) ??
        resolveStatus(progress, stage.key);
      const time =
        pickField(progress, stage.timeFields) ?? resolveTime(progress, stage.key);
      return {
        ...stage,
        status,
        statusText: statusTextMap[status] || status,
        color: statusColorMap[status] || 'gray',
        time
      };
    })
    .filter((stage) => shouldIncludeStage(progress, stage));
}

export function deriveCurrentStage(progress = {}) {
  const stages = mapProgressToStages(progress);
  const nextStage = stages.find((stage) => stage.status !== 'finished');
  return nextStage ? nextStage.label : stages[stages.length - 1]?.label;
}

export function deriveLastUpdatedAt(progress = {}) {
  const dates = mapProgressToStages(progress)
    .map((stage) => stage.time)
    .filter(Boolean)
    .map((value) => toDate(value))
    .filter((date) => date && !Number.isNaN(date.getTime()));
  if (dates.length === 0) {
    return null;
  }
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

export function getProgressStatusText(status) {
  return statusTextMap[status] || status || '未知';
}
