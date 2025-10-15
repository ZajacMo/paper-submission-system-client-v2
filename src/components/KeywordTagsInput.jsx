import { useMemo, useState } from 'react';
import { TagsInput, Loader } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import api from '../api/axios.js';
import { endpoints } from '../api/endpoints.js';

/**
 * 关键词标签输入组件
 * - 支持根据输入联想中/英文关键词（后端搜索接口）
 * - 当用户添加的标签在数据库中不存在时，自动调用创建接口
 */
export default function KeywordTagsInput({
  value,
  onChange,
  label,
  description,
  required = false,
  type = 'zh', // 'zh' | 'en'
  error = null,
}) {
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchValue, 300);

  const searchEndpoint = useMemo(() => {
    return type === 'en' ? endpoints.keywords.searchEn : endpoints.keywords.searchZh;
  }, [type]);

  // 搜索联想
  const { data: suggestions = [], isFetching } = useQuery({
    queryKey: ['keywords-search', type, debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.trim().length === 0) return [];
      const response = await api.get(searchEndpoint, { params: { query: debouncedSearch } });
      const list = Array.isArray(response.data) ? response.data : [];
      return list.map((item) => item.keyword_name).filter(Boolean);
    },
    enabled: Boolean(debouncedSearch && debouncedSearch.trim().length > 0),
  });

  // 仅更新表单值，不进行创建；创建延后到表单总提交阶段
  const handleChange = (nextValues) => {
    onChange(nextValues);
  };

  return (
    <TagsInput
      label={label}
      description={description}
      required={required}
      value={value}
      onChange={handleChange}
      data={suggestions}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      maxTags={8}
      rightSection={isFetching ? <Loader size={16} /> : null}
      error={error}
    />
  );
}

KeywordTagsInput.propTypes = {
  value: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
  description: PropTypes.string,
  required: PropTypes.bool,
  type: PropTypes.oneOf(['zh', 'en']),
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
};