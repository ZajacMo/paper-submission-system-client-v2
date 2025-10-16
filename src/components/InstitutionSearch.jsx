import { useState, useEffect, useMemo } from "react";
import { Combobox, InputBase, useCombobox, Text, Loader, Paper, Stack, Button, ScrollArea } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import api from "../api/axios.js";
import { endpoints } from "../api/endpoints.js";
import PropTypes from "prop-types";

/**
 * 单位搜索组件
 * 支持启用/禁用状态和基于作者ID的机构查询
 */
export default function InstitutionSearch({
  value,
  onChange,
  label = "所属单位",
  placeholder = "选择工作单位",
  required = false,
  disabled = false,
  authorId = null,
  institutionInfo = null, // 新增：机构信息对象
  error = null,
}) {
  const [searchValue, setSearchValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setShowDropdown(false);
    },
  });

  // 查询机构列表 - 基于作者ID
  const { data: institutions = [], isLoading } = useQuery({
    queryKey: ["institutions-by-author", authorId],
    queryFn: async () => {
      if (!authorId) return [];
      const response = await api.get(endpoints.institutions.my, {
        params: { author_id: authorId },
      });
      return response.data;
    },
    enabled: Boolean(authorId),
  });

  // 当前选中的机构信息
  const selectedInstitution = useMemo(() => {
    if (!value) return null;
    
    // 优先使用传入的机构信息
    if (institutionInfo && institutionInfo.institution_id === value) {
      return institutionInfo;
    }
    
    // 从查询结果中查找
    return (
      institutions.find((inst) => inst.institution_id === value) ||
      (typeof value === "object" ? value : null)
    );
  }, [value, institutions, institutionInfo]);

  // 显示文本
  const displayValue = useMemo(() => {
    if (!selectedInstitution) return "";
    return selectedInstitution.name;
  }, [selectedInstitution]);

  // 处理选择
  const handleSelect = (institution) => {
    onChange(institution.institution_id);
    setSearchValue("");
    setShowDropdown(false);
    combobox.closeDropdown();
  };

  // 处理清空
  const handleClear = () => {
    onChange(null);
  };

  // 选项列表
  const options = institutions.map((institution) => (
    <Combobox.Option
      value={institution.institution_id.toString()}
      key={institution.institution_id}
    >
      <div>
        <Text size="sm">{institution.name}</Text>
        <Text size="xs" c="dimmed">
          {institution.city} {institution.zip_code}
        </Text>
      </div>
    </Combobox.Option>
  ));

  const isDisabled = !authorId || disabled;

  // 是否显示联想建议
  const showSuggestions = !isDisabled && institutions.length > 0 && showDropdown;

  return (
    <Stack gap="sm">
      <Combobox
        store={combobox}
        withinPortal={false}
        onOptionSubmit={() => {}} // 禁用默认的选择行为
      >
        <Combobox.Target>
          <InputBase
            label={label}
            placeholder={placeholder}
            value={displayValue || searchValue}
            onChange={(event) => {
              if (isDisabled) {
                return;
              }
              const newValue = event.currentTarget.value;
              setSearchValue(newValue);

              // 如果用户清空了输入框或者修改了已选择的内容，清除选择
              if (
                selectedInstitution &&
                (newValue === "" || newValue !== displayValue)
              ) {
                onChange(null);
              }

              combobox.openDropdown();
              combobox.updateSelectedOptionIndex();
              setShowDropdown(true);
            }}
            onKeyDown={(event) => {
              if (isDisabled) {
                return;
              }

              // 处理退格键和删除键
              if (
                (event.key === "Backspace" || event.key === "Delete") &&
                selectedInstitution
              ) {
                // 如果有选中的机构且输入框为空或等于显示值，清除选择
                const currentValue = event.currentTarget.value;
                if (currentValue === displayValue || currentValue === "") {
                  event.preventDefault();
                  onChange(null);
                  setSearchValue("");
                  setShowDropdown(true);
                  combobox.openDropdown();
                }
              }
            }}
            onClick={() => {
              if (!isDisabled) {
                setShowDropdown(true);
                combobox.openDropdown();
              }
            }}
            onFocus={() => {
              if (!isDisabled) {
                setShowDropdown(true);
                combobox.openDropdown();
              }
            }}
            onBlur={() => {
              // 延迟关闭以允许点击建议项
              setTimeout(() => {
                setShowDropdown(false);
                combobox.closeDropdown();
                setSearchValue("");
              }, 200);
            }}
            rightSection={isLoading ? <Loader size={18} /> : <Combobox.Chevron />}
            rightSectionPointerEvents="none"
            clearable={!isDisabled && Boolean(selectedInstitution)}
            onClear={handleClear}
            disabled={isDisabled}
            required={required}
            error={error}
          />
        </Combobox.Target>
      </Combobox>

      {/* 独立的联想建议卡片 */}
      {showSuggestions && (
        <Paper withBorder radius="md" p="sm">
          <Stack gap={8}>
            <Text size="sm" fw={500} lh={1.4}>
              可选择的工作单位
            </Text>
            <ScrollArea.Autosize mah={240} scrollbarSize={6}>
              <Stack gap={6}>
                {institutions.map((institution) => (
                  <Button
                    key={institution.institution_id}
                    variant="subtle"
                    color="gray"
                    fullWidth
                    justify="flex-start"
                    onClick={() => handleSelect(institution)}
                    radius="md"
                    styles={() => ({
                      root: {
                        padding: "10px 12px",
                        height: "auto",
                        alignItems: "flex-start",
                      },
                      label: { width: "100%" },
                    })}
                  >
                    <Stack gap={2} align="flex-start">
                      <Text size="sm" fw={600} lh={1.4}>
                        {institution.name}
                      </Text>
                      <Text size="xs" c="dimmed" lh={1.2}>
                        {institution.city} {institution.zip_code}
                      </Text>
                    </Stack>
                  </Button>
                ))}
              </Stack>
            </ScrollArea.Autosize>
          </Stack>
        </Paper>
      )}

      {/* 无结果提示 */}
      {!isDisabled && institutions.length === 0 && !isLoading && authorId && (
        <Text size="sm" c="dimmed">
          该作者暂无关联机构
        </Text>
      )}

      {/* 未选择作者提示 */}
      {!authorId && (
        <Text size="sm" c="dimmed">
          请先选择作者
        </Text>
      )}
    </Stack>
  );
}

InstitutionSearch.propTypes = {
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  authorId: PropTypes.number,
  institutionInfo: PropTypes.object, // 新增：机构信息对象
  error: PropTypes.string,
};
