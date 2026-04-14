import * as React from "react";

const ACTIVE_BRANCH_STORAGE_KEY = "tabletap_active_branch_code_v1";
const ACTIVE_BRANCH_CHANGED_EVENT = "tabletap:active-branch-changed";

const sanitizeBranchCode = (value: string) => value.trim().toLowerCase();

export const getActiveBranchCode = (fallbackBranchCode: string) => {
  if (typeof window === "undefined") {
    return sanitizeBranchCode(fallbackBranchCode);
  }

  const stored = window.localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);
  const normalizedStored = sanitizeBranchCode(String(stored ?? ""));
  if (normalizedStored) {
    return normalizedStored;
  }

  return sanitizeBranchCode(fallbackBranchCode);
};

export const setActiveBranchCode = (branchCode: string) => {
  const normalized = sanitizeBranchCode(branchCode);
  if (!normalized || typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, normalized);
  window.dispatchEvent(
    new CustomEvent(ACTIVE_BRANCH_CHANGED_EVENT, {
      detail: { branchCode: normalized },
    }),
  );
};

export const useActiveBranchCode = (fallbackBranchCode: string) => {
  const [activeBranchCode, setActiveBranchCodeState] = React.useState(() =>
    getActiveBranchCode(fallbackBranchCode),
  );

  React.useEffect(() => {
    setActiveBranchCodeState(getActiveBranchCode(fallbackBranchCode));
    if (typeof window === "undefined") {
      return;
    }

    const handleBranchChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ branchCode?: string }>;
      const nextBranchCode = sanitizeBranchCode(
        String(customEvent.detail?.branchCode ?? ""),
      );
      if (nextBranchCode) {
        setActiveBranchCodeState(nextBranchCode);
        return;
      }
      setActiveBranchCodeState(getActiveBranchCode(fallbackBranchCode));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== ACTIVE_BRANCH_STORAGE_KEY) return;
      setActiveBranchCodeState(getActiveBranchCode(fallbackBranchCode));
    };

    window.addEventListener(ACTIVE_BRANCH_CHANGED_EVENT, handleBranchChanged);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(
        ACTIVE_BRANCH_CHANGED_EVENT,
        handleBranchChanged,
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, [fallbackBranchCode]);

  return activeBranchCode;
};

