/**
 * Chuẩn hóa và format tiền tệ Việt Nam (VND).
 * Ví dụ:
 *  - 500000 -> "500.000 đ"
 *  - "500000.00" -> "500.000 đ"
 *  - formatMoney(500000, false) -> "500.000"
 */
export const formatMoney = (
  value: number | string | null | undefined,
  includeSuffix = true,
  suffix = "đ"
): string => {
  if (value === null || value === undefined || value === "") {
    return includeSuffix ? `0 ${suffix}` : "0";
  }

  const num =
    typeof value === "string"
      ? parseFloat(value.replace(/[^\d.-]/g, ""))
      : Number(value);

  if (isNaN(num)) {
    return includeSuffix ? `0 ${suffix}` : "0";
  }

  const rounded = Math.round(num);
  const formatted = rounded.toLocaleString("vi-VN");

  return includeSuffix ? `${formatted} ${suffix}` : formatted;
};

/**
 * Hiển thị giá kèm đuôi đ (ví dụ: "500.000 đ")
 */
export const formatPrice = (
  value: number | string | null | undefined,
  suffix = "đ"
): string => formatMoney(value, true, suffix);

/**
 * Hiển thị chỉ số tiền có dấu chấm phân cách hàng nghìn (ví dụ: "500.000")
 */
export const formatPriceNumber = (
  value: number | string | null | undefined
): string => formatMoney(value, false);
