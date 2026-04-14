const normalizeBranchCode = (branchCode: string | null | undefined) =>
  String(branchCode ?? "").trim().toLowerCase();

export const getOutletLogoForBranchCode = (
  branchCode: string | null | undefined,
) => {
  const normalized = normalizeBranchCode(branchCode);
  if (normalized.startsWith("karo")) {
    return "/Karo.jpg";
  }
  return "/logo.png";
};
