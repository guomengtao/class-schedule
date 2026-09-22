# Logo 圆圈虚线数量分析：为什么是 9 根而不是 8 根

## 问题描述

Logo 生成的圆圈虚线（dashed circle）预期是 8 根，但实际渲染出来是 9 根，多了一根。

## 根因分析

### 直接原因

问题出在 [scripts/generate-logo.py](file:///Users/Banner/Documents/guomengtao/tom/class/class/scripts/generate-logo.py#L14) 第 14 行：

```python
dash_count = 9
```

变量 `dash_count` 被**硬编码为 9**，而不是期望的 8。后续的循环直接使用这个值来绘制虚线弧段：

```python
dash_count = 9
dash_ratio = 0.7
segment_angle = 360.0 / dash_count    # 360 / 9 = 40°
dash_angle = segment_angle * dash_ratio  # 40 * 0.7 = 28°
for i in range(dash_count):            # 循环 9 次，绘制 9 段弧线
    start_angle = i * segment_angle
    end_angle = start_angle + dash_angle
    draw.arc([cx - R, cy - R, cx + R, cy + R],
             start=start_angle, end=end_angle,
             fill="#7ec8e3", width=12)
```

### 数学分析

| 参数 | dash_count = 9 (当前) | dash_count = 8 (期望) |
|------|----------------------|----------------------|
| 每段角度 segment_angle | 360° / 9 = **40°** | 360° / 8 = **45°** |
| 虚线弧长 dash_angle | 40° × 0.7 = **28°** | 45° × 0.7 = **31.5°** |
| 间隙角度 gap | 40° × 0.3 = **12°** | 45° × 0.3 = **13.5°** |
| 虚线总覆盖角度 | 9 × 28° = **252°** | 8 × 31.5° = **252°** |
| 间隙总覆盖角度 | 9 × 12° = **108°** | 8 × 13.5° = **108°** |
| 虚线数量 | **9 根** | **8 根** |

### 关键发现

1. 两种方案的虚线总覆盖角度相同（都是 252°），因为 `dash_ratio = 0.7` 保持不变
2. 9 根虚线中，每根更短（28°），间隙也更小（12°）
3. 8 根虚线中，每根更长（31.5°），间隙也更大（13.5°）
4. 视觉上，9 根会让圆圈看起来更"密集"，8 根更"稀疏"

## 修复方案

将 [generate-logo.py](file:///Users/Banner/Documents/guomengtao/tom/class/class/scripts/generate-logo.py#L14) 第 14 行的 `dash_count` 从 `9` 改为 `8`：

```python
# 修改前
dash_count = 9

# 修改后
dash_count = 8
```

修改后重新运行脚本生成 Logo：

```bash
cd scripts
python generate-logo.py
```

## 总结

| 项目 | 说明 |
|------|------|
| 根因 | `dash_count` 硬编码为 `9`，而非期望的 `8` |
| 文件 | `scripts/generate-logo.py` 第 14 行 |
| 修复 | 将 `dash_count = 9` 改为 `dash_count = 8` |
| 影响 | 仅影响 Logo 圆圈虚线的数量，不影响其他视觉元素 |